import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EncryptionService } from '../../../common/encryption.service';

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export interface WhatsAppCredentials {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string | null;
  displayPhoneNumber?: string | null;
}

export interface WhatsAppSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * REAL WhatsApp Business Cloud API (Meta Graph) integration.
 *
 * Credentials live on the tenant's WHATSAPP Integration row: an encrypted
 * permanent access token plus the phone number id (and optional WABA id)
 * stored in token metadata. Outbound template/session messages go through
 * `/{phone-number-id}/messages`; delivery statuses arrive via the webhook
 * route and are matched back to Notification rows by provider message id.
 */
@Injectable()
export class WhatsAppIntegrationService {
  private readonly logger = new Logger(WhatsAppIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

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
    const metadata = (raw.metadata || {}) as Record<string, any>;
    if (!metadata.phoneNumberId) return null;

    return {
      accessToken,
      phoneNumberId: String(metadata.phoneNumberId),
      wabaId: metadata.wabaId ? String(metadata.wabaId) : null,
      displayPhoneNumber: metadata.displayPhoneNumber ? String(metadata.displayPhoneNumber) : null,
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
        const message =
          err?.error_user_msg ||
          err?.message ||
          `Meta API returned ${res.status}`;
        // Surface subcodes that mean the token/number setup is broken.
        this.logger.warn(`WhatsApp send failed (tenant=${tenantId}): ${message} [code=${err?.code ?? '?'}]`);
        return { ok: false, error: message };
      }
      const messageId: string | undefined = body?.messages?.[0]?.id;
      return { ok: true, providerMessageId: messageId };
    } catch (err: any) {
      this.logger.warn(`WhatsApp send error (tenant=${tenantId}): ${err?.message}`);
      return { ok: false, error: err?.message || 'Failed to reach Meta Graph API' };
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
      return { ok: true, templates: body?.data || [] };
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
    const crypto = require('crypto') as typeof import('crypto');
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = String(signatureHeader).replace(/^sha256=/, '');
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
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
          const state = String(status?.status || '').toUpperCase(); // sent|delivered|read|failed
          const failed = state === 'FAILED';
          const dbStatus = failed ? 'FAILED' : state === 'DELIVERED' || state === 'READ' ? 'SENT' : 'SENT';
          const errorMessage = failed
            ? status?.errors?.[0]?.error_user_msg || status?.errors?.[0]?.title || 'Delivery failed'
            : null;

          const updated = await this.prisma.notification.updateMany({
            where: {
              tenantId,
              channel: 'WHATSAPP',
              metadata: { path: ['providerMessageId'], equals: messageId },
            },
            data: {
              status: dbStatus,
              ...(state === 'SENT' || state === 'DELIVERED' || state === 'READ'
                ? { sentAt: new Date(status?.timestamp ? Number(status.timestamp) * 1000 : Date.now()) }
                : {}),
              ...(errorMessage ? {} : {}),
            },
          }).catch(() => ({ count: 0 }));
          statuses += updated?.count || 0;
          if (errorMessage) {
            await this.prisma.notification.updateMany({
              where: {
                tenantId,
                channel: 'WHATSAPP',
                metadata: { path: ['providerMessageId'], equals: messageId },
              },
              data: { subject: errorMessage },
            }).catch(() => undefined);
          }
        }

        for (const message of Array.isArray(value.messages) ? value.messages : []) {
          messages += 1;
          // Inbound customer replies are recorded as activities when we can
          // match the sender to a customer by phone.
          const fromPhone = message?.from ? `+${String(message.from).replace(/^\+/, '')}` : null;
          if (!fromPhone) continue;
          const customer = await this.prisma.customer.findFirst({
            where: { tenantId, phone: { in: [fromPhone, String(message.from)] } },
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
