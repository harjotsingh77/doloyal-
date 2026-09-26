import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EncryptionService } from '../../../common/encryption.service';
import * as crypto from 'crypto';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type WhatsAppDeliveryStatus =
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'DEMO';

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string | null;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
}

export interface WhatsAppSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  demo?: boolean;
}

export interface WhatsAppCustomerSendResult {
  ok: boolean;
  demo?: boolean;
  notificationId?: string;
  activityId?: string;
  providerMessageId?: string;
  deliveryStatus: WhatsAppDeliveryStatus;
  error?: string;
  message?: string;
}

/**
 * REAL WhatsApp Business Cloud API (Meta Graph) integration.
 *
 * Credentials live on the tenant's WHATSAPP Integration row: an encrypted
 * permanent access token plus the phone number id (and optional WABA id)
 * stored in token / integration metadata. Outbound template/session messages
 * go through `/{phone-number-id}/messages`; delivery statuses arrive via the
 * webhook route and are matched back to Notification rows by provider message id.
 */
@Injectable()
export class WhatsAppIntegrationService {
  private readonly logger = new Logger(WhatsAppIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** True when WHATSAPP_DEMO_MODE=true — allows labeled demo sends without Meta. */
  isDemoModeEnabled(): boolean {
    return String(process.env.WHATSAPP_DEMO_MODE || '').toLowerCase() === 'true';
  }

  async getCredentials(tenantId: string): Promise<WhatsAppCredentials | null> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'WHATSAPP', status: 'CONNECTED' },
      include: { tokens: true },
    });
    const raw = (integration?.tokens?.[0] as any) || null;
    if (!raw?.accessToken) return null;

    let accessToken: string;
    try {
      accessToken = this.encryption.decrypt(raw.accessToken);
    } catch {
      return null;
    }

    // Prefer token metadata; fall back to Integration.metadata (older connects).
    const tokenMeta = (raw.metadata || {}) as Record<string, any>;
    const integMeta = ((integration?.metadata as Record<string, any>) || {});
    const phoneNumberId = String(tokenMeta.phoneNumberId || integMeta.phoneNumberId || '').trim();
    if (!phoneNumberId) return null;

    return {
      accessToken,
      phoneNumberId,
      wabaId: tokenMeta.wabaId || integMeta.wabaId
        ? String(tokenMeta.wabaId || integMeta.wabaId)
        : null,
      displayPhoneNumber: tokenMeta.displayPhoneNumber || integMeta.displayPhoneNumber
        ? String(tokenMeta.displayPhoneNumber || integMeta.displayPhoneNumber)
        : null,
      verifiedName: tokenMeta.verifiedName || integMeta.verifiedName
        ? String(tokenMeta.verifiedName || integMeta.verifiedName)
        : null,
    };
  }

  /** Public connection summary — never includes tokens or secrets. */
  async getConnectionSummary(tenantId: string): Promise<{
    connected: boolean;
    demoModeAvailable: boolean;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    phoneNumberId?: string | null;
    wabaId?: string | null;
    connectedAt?: string | null;
    label?: string | null;
  }> {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'WHATSAPP' },
    });
    const connected = integration?.status === 'CONNECTED';
    const meta = ((integration?.metadata as Record<string, any>) || {});
    const creds = connected ? await this.getCredentials(tenantId) : null;
    return {
      connected: Boolean(connected && creds),
      demoModeAvailable: this.isDemoModeEnabled(),
      displayPhoneNumber: creds?.displayPhoneNumber || meta.displayPhoneNumber || null,
      verifiedName: creds?.verifiedName || meta.verifiedName || integration?.label || null,
      phoneNumberId: creds?.phoneNumberId || meta.phoneNumberId || null,
      wabaId: creds?.wabaId || meta.wabaId || null,
      connectedAt: integration?.updatedAt?.toISOString?.() || null,
      label: integration?.label || null,
    };
  }

  /** Validates credentials against the live Graph API and returns the phone info. */
  async verifyCredentials(
    accessToken: string,
    phoneNumberId: string,
  ): Promise<{ valid: boolean; displayPhoneNumber?: string; verifiedName?: string; error?: string }> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = body?.error?.message || `Meta API returned ${res.status}`;
        return { valid: false, error: msg };
      }
      return {
        valid: true,
        displayPhoneNumber: body?.display_phone_number || undefined,
        verifiedName: body?.verified_name || undefined,
      };
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Failed to reach Meta Graph API' };
    }
  }

  private normalizePhone(to: string): string {
    const digits = String(to).replace(/[^\d]/g, '');
    if (!digits || digits.length < 8) {
      throw new BadRequestException(`Invalid recipient phone number: ${to}`);
    }
    return digits;
  }

  private mapMetaError(err: any, statusCode: number): string {
    const code = err?.code;
    const subcode = err?.error_subcode;
    const userMsg = err?.error_user_msg || err?.message;
    if (statusCode === 429 || code === 4 || code === 80007) {
      return 'WhatsApp rate limit reached. Please wait a moment and try again.';
    }
    if (code === 190 || code === 102 || statusCode === 401) {
      return 'WhatsApp credentials are invalid or expired. Reconnect WhatsApp in Integrations.';
    }
    if (code === 100 || code === 33) {
      return 'Invalid Phone Number ID or WhatsApp Business setup. Check your connection settings.';
    }
    if (code === 10 || code === 200 || subcode === 2018142) {
      return 'WhatsApp permission missing. Ensure whatsapp_business_messaging is granted on your Meta app.';
    }
    return (
      userMsg ||
      `WhatsApp message could not be sent. Please check your WhatsApp Business connection and permissions.`
    );
  }

  private async post(tenantId: string, payload: Record<string, any>): Promise<WhatsAppSendResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) {
      return { ok: false, error: 'WhatsApp is not connected. Connect it in Integrations first.' };
    }
    try {
      const res = await fetch(`${GRAPH_BASE}/${creds.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        const err = body?.error;
        const message = this.mapMetaError(err, res.status);
        // Never log tokens — only safe Meta error identifiers.
        this.logger.warn(
          `WhatsApp send failed (tenant=${tenantId}): code=${err?.code ?? '?'} subcode=${err?.error_subcode ?? '?'} status=${res.status}`,
        );
        return { ok: false, error: message };
      }
      const messageId: string | undefined = body?.messages?.[0]?.id;
      return { ok: true, providerMessageId: messageId };
    } catch (err: any) {
      this.logger.warn(`WhatsApp send error (tenant=${tenantId}): ${err?.message}`);
      return {
        ok: false,
        error:
          'WhatsApp message could not be sent. Please check your WhatsApp Business connection and permissions.',
      };
    }
  }

  /**
   * Sends an approved template message. Required for business-initiated
   * messages outside the 24h customer service window.
   */
  async sendTemplate(
    tenantId: string,
    to: string,
    templateName: string,
    options?: { languageCode?: string; bodyParams?: string[] },
  ): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhone(to);
    const components =
      options?.bodyParams && options.bodyParams.length > 0
        ? [
            {
              type: 'body',
              parameters: options.bodyParams.map((text) => ({ type: 'text', text })),
            },
          ]
        : undefined;

    return this.post(tenantId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'template',
      template: {
        name: templateName,
        language: { code: options?.languageCode || 'en' },
        ...(components ? { components } : {}),
      },
    });
  }

  /** Sends a free-form session text (only inside a 24h user-service window). */
  async sendSessionText(tenantId: string, to: string, text: string): Promise<WhatsAppSendResult> {
    const normalizedTo = this.normalizePhone(to);
    return this.post(tenantId, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedTo,
      type: 'text',
      text: { preview_url: false, body: text },
    });
  }

  /**
   * Sends a 1:1 retention message to an existing customer and records
   * Notification + Activity for the customer timeline.
   */
  async sendToCustomer(
    tenantId: string,
    customerId: string,
    input: {
      messageType: 'text' | 'template';
      body?: string;
      templateName?: string;
      templateLanguage?: string;
      templateParams?: string[];
      /** Only honored when WHATSAPP_DEMO_MODE=true. */
      demo?: boolean;
    },
  ): Promise<WhatsAppCustomerSendResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    if (!customer) {
      throw new BadRequestException('Customer not found in this workspace.');
    }
    if (!customer.phone?.trim()) {
      throw new BadRequestException('This customer does not have a phone / WhatsApp number.');
    }

    const messageType = input.messageType === 'template' ? 'template' : 'text';
    const bodyText =
      messageType === 'text'
        ? String(input.body || '').trim()
        : `[Template: ${String(input.templateName || '').trim()}]`;

    if (messageType === 'text' && !bodyText) {
      throw new BadRequestException('Message text is required.');
    }
    if (messageType === 'template' && !String(input.templateName || '').trim()) {
      throw new BadRequestException('An approved template name is required.');
    }

    const useDemo = Boolean(input.demo) && this.isDemoModeEnabled();
    const creds = await this.getCredentials(tenantId);

    if (!creds && !useDemo) {
      return {
        ok: false,
        deliveryStatus: 'FAILED',
        error:
          'WhatsApp is not connected. Connect your WhatsApp Business account in Integrations first.',
      };
    }

    let result: WhatsAppSendResult;
    if (useDemo || !creds) {
      // Explicit demo path — never claims a real Meta delivery.
      result = {
        ok: true,
        demo: true,
        providerMessageId: `demo_${Date.now()}`,
      };
    } else if (messageType === 'template') {
      result = await this.sendTemplate(tenantId, customer.phone, String(input.templateName).trim(), {
        languageCode: input.templateLanguage || 'en',
        bodyParams: input.templateParams,
      });
    } else {
      result = await this.sendSessionText(tenantId, customer.phone, bodyText);
    }

    const deliveryStatus: WhatsAppDeliveryStatus = result.demo
      ? 'DEMO'
      : result.ok
        ? 'SENT'
        : 'FAILED';

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        customerId: customer.id,
        type: 'RETENTION_WHATSAPP',
        channel: 'WHATSAPP',
        recipient: customer.phone,
        subject: result.demo
          ? 'WhatsApp Message (Demo)'
          : messageType === 'template'
            ? `Template: ${input.templateName}`
            : 'WhatsApp Message',
        body: messageType === 'text' ? bodyText : bodyText,
        status: result.ok ? (result.demo ? 'SENT' : 'SENT') : 'FAILED',
        sentAt: result.ok ? new Date() : null,
        metadata: {
          providerMessageId: result.providerMessageId || null,
          deliveryStatus,
          messageType,
          templateName: messageType === 'template' ? input.templateName : null,
          demo: Boolean(result.demo),
          purpose: 'customer_retention',
          error: result.error || null,
        },
      },
    });

    let activityId: string | undefined;
    if (result.ok) {
      const activity = await this.prisma.activity.create({
        data: {
          tenantId,
          customerId: customer.id,
          type: 'WHATSAPP_SENT',
          message: result.demo
            ? `Demo WhatsApp message (not sent to Meta): ${bodyText.slice(0, 160)}`
            : `WhatsApp message sent: ${bodyText.slice(0, 160)}`,
          metadata: {
            notificationId: notification.id,
            providerMessageId: result.providerMessageId || null,
            deliveryStatus,
            demo: Boolean(result.demo),
            messageType,
          },
        },
      });
      activityId = activity.id;
    }

    if (!result.ok) {
      return {
        ok: false,
        notificationId: notification.id,
        deliveryStatus: 'FAILED',
        error:
          result.error ||
          'WhatsApp message could not be sent. Please check your WhatsApp Business connection and permissions.',
      };
    }

    return {
      ok: true,
      demo: Boolean(result.demo),
      notificationId: notification.id,
      activityId,
      providerMessageId: result.providerMessageId,
      deliveryStatus,
      message: result.demo
        ? 'Demo message recorded. No message was sent through WhatsApp Business Messaging.'
        : 'WhatsApp message sent to your customer.',
    };
  }

  /** Lists approved templates from the tenant's WABA. */
  async fetchTemplates(
    tenantId: string,
  ): Promise<{ ok: boolean; templates?: any[]; error?: string }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { ok: false, error: 'WhatsApp is not connected.' };
    if (!creds.wabaId) {
      return {
        ok: false,
        error: 'Add your WhatsApp Business Account ID in the connection settings to browse templates.',
      };
    }
    try {
      const res = await fetch(`${GRAPH_BASE}/${creds.wabaId}/message_templates?fields=name,status,category,components&limit=100`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
      });
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        return { ok: false, error: body?.error?.message || `Meta API returned ${res.status}` };
      }
      const templates = (body?.data || []).filter(
        (t: any) => String(t.status || '').toUpperCase() === 'APPROVED',
      );
      return { ok: true, templates };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to reach Meta Graph API' };
    }
  }

  /**
   * Webhook verification handshake (hub.challenge echo).
   */
  static verifyWebhookHandshake(query: Record<string, any>, expectedToken: string): string | null {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    if (mode === 'subscribe' && token && challenge && token === expectedToken) {
      return String(challenge);
    }
    return null;
  }

  /**
   * Verifies `x-hub-signature-256` against the app secret.
   */
  static verifySignature(rawBody: string, signatureHeader: string | undefined, appSecret: string): boolean {
    if (!signatureHeader) return false;
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = String(signatureHeader).replace(/^sha256=/, '');
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  }

  private mapWebhookStatus(raw: string): WhatsAppDeliveryStatus {
    const state = String(raw || '').toLowerCase();
    if (state === 'failed') return 'FAILED';
    if (state === 'read') return 'READ';
    if (state === 'delivered') return 'DELIVERED';
    if (state === 'sent') return 'SENT';
    if (state === 'accepted' || state === 'pending' || state === 'queued') return 'QUEUED';
    return 'SENT';
  }

  /**
   * Processes a verified webhook payload: updates Notification rows with
   * delivery statuses and records inbound messages. Returns processed ids so
   * callers can dedupe redeliveries by (integration + event ids).
   */
  async processWebhookPayload(tenantId: string, payload: any): Promise<{ statuses: number; messages: number }> {
    let statuses = 0;
    let messages = 0;

    const entries = Array.isArray(payload?.entry) ? payload.entry : [];
    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
          const messageId = status?.id;
          if (!messageId) continue;
          const deliveryStatus = this.mapWebhookStatus(status?.status);
          const failed = deliveryStatus === 'FAILED';
          const errorMessage = failed
            ? status?.errors?.[0]?.error_user_msg || status?.errors?.[0]?.title || 'Delivery failed'
            : null;

          const existing = await this.prisma.notification.findFirst({
            where: {
              tenantId,
              channel: 'WHATSAPP',
              metadata: { path: ['providerMessageId'], equals: messageId },
            },
            select: { id: true, metadata: true, customerId: true },
          });
          if (!existing) continue;

          const prevMeta = ((existing.metadata as Record<string, any>) || {});
          const updated = await this.prisma.notification.update({
            where: { id: existing.id },
            data: {
              status: failed ? 'FAILED' : 'SENT',
              ...(deliveryStatus === 'SENT' || deliveryStatus === 'DELIVERED' || deliveryStatus === 'READ'
                ? { sentAt: new Date(status?.timestamp ? Number(status.timestamp) * 1000 : Date.now()) }
                : {}),
              ...(errorMessage ? { subject: errorMessage } : {}),
              metadata: {
                ...prevMeta,
                providerMessageId: messageId,
                deliveryStatus,
                webhookStatus: status?.status || null,
                lastWebhookAt: new Date().toISOString(),
                ...(errorMessage ? { error: errorMessage } : {}),
              },
            },
          }).catch(() => null);

          if (updated) {
            statuses += 1;
            // Keep the matching activity description in sync when possible.
            if (existing.customerId) {
              await this.prisma.activity.updateMany({
                where: {
                  tenantId,
                  customerId: existing.customerId,
                  type: 'WHATSAPP_SENT',
                  metadata: { path: ['notificationId'], equals: existing.id },
                },
                data: {
                  message:
                    deliveryStatus === 'FAILED'
                      ? `WhatsApp message failed${errorMessage ? `: ${errorMessage}` : ''}`
                      : `WhatsApp message ${deliveryStatus.toLowerCase()}`,
                  metadata: {
                    notificationId: existing.id,
                    providerMessageId: messageId,
                    deliveryStatus,
                  },
                },
              }).catch(() => undefined);
            }
          }
        }

        for (const message of Array.isArray(value.messages) ? value.messages : []) {
          messages += 1;
          // Inbound customer replies are recorded as activities when we can
          // match the sender to a customer by phone.
          const fromDigits = String(message?.from || '').replace(/[^\d]/g, '');
          if (!fromDigits) continue;
          const customer = await this.prisma.customer.findFirst({
            where: {
              tenantId,
              OR: [
                { phone: { contains: fromDigits.slice(-10) } },
                { phone: `+${fromDigits}` },
                { phone: fromDigits },
              ],
            },
            select: { id: true },
          });
          if (!customer) continue;
          const text =
            message?.text?.body ||
            message?.button?.text ||
            message?.interactive?.button_reply?.title ||
            `[${message?.type || 'media'}]`;
          await this.prisma.activity.create({
            data: {
              tenantId,
              customerId: customer.id,
              type: 'WHATSAPP_RECEIVED',
              message: `Customer replied on WhatsApp: ${String(text).slice(0, 200)}`,
              metadata: { providerMessageId: message?.id, type: message?.type },
            },
          }).catch(() => undefined);
        }
      }
    }

    return { statuses, messages };
  }
}
