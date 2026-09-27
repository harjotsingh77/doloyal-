import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { EncryptionService } from '../../../common/encryption.service';
import { toWhatsAppNumber, formatWhatsAppNumber } from '../../../common/phone';
import { ensureWhatsAppSchema } from '../../../common/whatsapp-schema';
import { describeConfigProblem, readEmbeddedSignupConfig } from './meta-embedded-signup';
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

const STATUS_RANK: Record<string, number> = { QUEUED: 0, SENT: 1, DELIVERED: 2, READ: 3 };

export const WHATSAPP_NOT_CONNECTED_MESSAGE =
  'WhatsApp connection is incomplete. Please reconnect your account in Integrations.';
export const WHATSAPP_INVALID_RECIPIENT_MESSAGE =
  'Message could not be sent. Please verify the customer’s WhatsApp number.';
const WHATSAPP_GENERIC_ERROR = 'WhatsApp API returned an error. Please try again.';
const WHATSAPP_NETWORK_ERROR = 'Could not reach WhatsApp. Check your internet connection and try again.';

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
  /** Meta `message_status` from the send response (accepted / held_for_quality_assessment / paused). */
  messageStatus?: string;
  error?: string;
  errorCode?: number | string;
  demo?: boolean;
}

export interface WhatsAppCustomerSendResult {
  ok: boolean;
  demo?: boolean;
  notificationId?: string;
  activityId?: string;
  providerMessageId?: string;
  deliveryStatus: WhatsAppDeliveryStatus;
  recipient?: string;
  error?: string;
  errorCode?: number | string;
  message?: string;
}

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status?: string;
  category?: string;
  components?: any[];
}

interface MetaError {
  code?: number | string;
  error_subcode?: number | string;
  message?: string;
  title?: string;
  error_user_msg?: string;
  error_data?: { details?: string } | string;
}

/**
 * Maps a Meta Graph / WhatsApp Cloud API error (send response or webhook
 * status error) to a user-facing message. Never echoes tokens or raw payloads.
 */
export function describeWhatsAppError(err: MetaError | null | undefined, httpStatus?: number): string {
  const code = Number(err?.code);
  const subcode = Number(err?.error_subcode);
  const details = String(
    (typeof err?.error_data === 'object' ? err?.error_data?.details : err?.error_data) || err?.message || '',
  ).toLowerCase();
  const suffix = Number.isFinite(code) && code > 0 ? ` (WhatsApp error ${code})` : '';

  if (httpStatus === 429 || [4, 80007, 130429, 131048, 131056].includes(code)) {
    return `WhatsApp rate limit reached. Please wait a moment and try again.${suffix}`;
  }
  if ([190, 102, 463, 467].includes(code) || httpStatus === 401) {
    return `Your WhatsApp access token is invalid or has expired. Please reconnect WhatsApp in Integrations.${suffix}`;
  }
  if (code === 3 || code === 10 || code === 131005 || (code >= 200 && code <= 299)) {
    return `WhatsApp permission is missing. Make sure whatsapp_business_messaging is granted for this account, then reconnect.${suffix}`;
  }
  if (code === 131030) {
    return `This number isn’t in your Meta test recipient list. Add it under WhatsApp → API Setup in your Meta app, or use a production business number.${suffix}`;
  }
  if (code === 131047) {
    return `More than 24 hours have passed since this customer last messaged you. Send an approved template instead of free-form text.${suffix}`;
  }
  if (code === 131026 || code === 131021) {
    return `${WHATSAPP_INVALID_RECIPIENT_MESSAGE}${suffix}`;
  }
  if (code === 132000) {
    return `The template parameters don’t match the approved template. Fill every placeholder and try again.${suffix}`;
  }
  if (code === 132001) {
    return `This template doesn’t exist in the selected language or isn’t approved yet.${suffix}`;
  }
  if ([132005, 132007, 132012].includes(code)) {
    return `WhatsApp rejected the template content. Check the template parameters and try again.${suffix}`;
  }
  if (code === 132015 || code === 132016) {
    return `This template is paused or disabled in Meta Business Manager.${suffix}`;
  }
  if (code === 133010) {
    return `Your business phone number isn’t registered with WhatsApp Cloud API. Please reconnect your account.${suffix}`;
  }
  if (code === 131031 || code === 368) {
    return `Your WhatsApp Business account is restricted by Meta. Check Meta Business Manager for details.${suffix}`;
  }
  if (code === 131042) {
    return `There is a billing issue on your WhatsApp Business account. Check the payment method in Meta Business Manager.${suffix}`;
  }
  if (code === 100 || code === 131009 || code === 131008) {
    if (subcode === 33 || /phone number id|does not exist|unsupported get request|unsupported post request/.test(details)) {
      return `The WhatsApp Phone Number ID is invalid or not accessible with this token. Please reconnect your account.${suffix}`;
    }
    if (/\bto\b|recipient|phone number|whatsapp id/.test(details)) {
      return `${WHATSAPP_INVALID_RECIPIENT_MESSAGE}${suffix}`;
    }
    return `WhatsApp rejected the request. Please check the message and try again.${suffix}`;
  }
  return `${WHATSAPP_GENERIC_ERROR}${suffix}`;
}

/** Delivery states only move forward (Queued → Sent → Delivered → Read); Failed is terminal. */
export function nextDeliveryStatus(
  current: string | null | undefined,
  incoming: WhatsAppDeliveryStatus,
): WhatsAppDeliveryStatus {
  const cur = String(current || '').toUpperCase();
  if (cur === 'DEMO') return 'DEMO';
  if (incoming === 'FAILED' || cur === 'FAILED') return 'FAILED';
  const curRank = STATUS_RANK[cur] ?? -1;
  const inRank = STATUS_RANK[incoming] ?? -1;
  return inRank > curRank ? incoming : (cur as WhatsAppDeliveryStatus);
}

/** Maps a Meta webhook `statuses[].status` value. Unknown values return null (never guessed). */
export function mapWebhookStatus(raw: unknown): WhatsAppDeliveryStatus | null {
  const state = String(raw || '').toLowerCase();
  if (state === 'failed') return 'FAILED';
  if (state === 'read') return 'READ';
  if (state === 'delivered') return 'DELIVERED';
  if (state === 'sent') return 'SENT';
  if (state === 'accepted' || state === 'pending' || state === 'queued' || state === 'held_for_quality_assessment') {
    return 'QUEUED';
  }
  return null;
}

/** Highest `{{n}}` placeholder index in a template text component. */
function placeholderCount(text: string | undefined): number {
  let max = 0;
  for (const m of String(text || '').matchAll(/\{\{\s*(\d+)\s*\}\}/g)) {
    max = Math.max(max, Number(m[1]));
  }
  return max;
}

export function renderTemplateBody(template: WhatsAppTemplate, params: string[] = []): string | null {
  const body = (template.components || []).find((c: any) => String(c?.type).toUpperCase() === 'BODY');
  if (!body?.text) return null;
  return String(body.text).replace(/\{\{\s*(\d+)\s*\}\}/g, (_m, n) => params[Number(n) - 1] ?? `{{${n}}}`);
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
    await ensureWhatsAppSchema(this.prisma);
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

  private metaAppCheck: { key: string; at: number; result: { ok: boolean; error?: string } } | null = null;

  /** App access token (`{app-id}|{app-secret}`) for server-to-Meta calls. Never logged or returned. */
  private appAccessToken(): string | null {
    const config = readEmbeddedSignupConfig();
    const secret = process.env.META_APP_SECRET?.trim();
    if (!config.appId || !secret) return null;
    return `${config.appId}|${secret}`;
  }

  /**
   * Confirms META_APP_ID + META_APP_SECRET are a matching pair by reading the
   * app with its app access token. Cached for 10 minutes per instance.
   */
  async verifyMetaApp(): Promise<{ ok: boolean; error?: string }> {
    const config = readEmbeddedSignupConfig();
    const token = this.appAccessToken();
    if (!config.appId || !token) return { ok: false, error: describeConfigProblem(config) || undefined };
    const key = crypto.createHash('sha256').update(token).digest('hex');
    if (this.metaAppCheck && this.metaAppCheck.key === key && Date.now() - this.metaAppCheck.at < 10 * 60 * 1000) {
      return this.metaAppCheck.result;
    }
    let result: { ok: boolean; error?: string };
    try {
      const url = new URL(`${GRAPH_BASE}/${config.appId}`);
      url.searchParams.set('fields', 'id,name');
      url.searchParams.set('access_token', token);
      const res = await fetch(url.toString());
      const body: any = await res.json().catch(() => null);
      if (res.ok && String(body?.id) === config.appId) {
        result = { ok: true };
      } else {
        this.logger.warn(`Meta app check failed: status=${res.status} code=${body?.error?.code ?? '?'}`);
        result = {
          ok: false,
          error: 'META_APP_ID and META_APP_SECRET do not match a Meta app. Copy both from Meta App Dashboard → App settings → Basic.',
        };
      }
    } catch {
      // Network trouble is not a configuration error — don't cache it.
      return { ok: true };
    }
    this.metaAppCheck = { key, at: Date.now(), result };
    return result;
  }

  /** Meta `debug_token` for a user/business token, using the app access token. */
  async debugToken(inputToken: string): Promise<any | null> {
    const appToken = this.appAccessToken();
    if (!appToken) return null;
    try {
      const url = new URL(`${GRAPH_BASE}/debug_token`);
      url.searchParams.set('input_token', inputToken);
      url.searchParams.set('access_token', appToken);
      const res = await fetch(url.toString());
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`debug_token failed: status=${res.status} code=${body?.error?.code ?? '?'}`);
        return null;
      }
      return body?.data ?? null;
    } catch {
      return null;
    }
  }

  /** Phone numbers on a WABA, as seen by the given token. */
  async listWabaPhoneNumbers(
    accessToken: string,
    wabaId: string,
  ): Promise<{ ok: boolean; phones?: Array<Record<string, any>>; error?: string }> {
    try {
      const res = await fetch(
        `${GRAPH_BASE}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,platform_type,code_verification_status`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`WABA phone list failed: status=${res.status} code=${body?.error?.code ?? '?'}`);
        return { ok: false, error: describeWhatsAppError(body?.error, res.status) };
      }
      return { ok: true, phones: Array.isArray(body?.data) ? body.data : [] };
    } catch {
      return { ok: false, error: WHATSAPP_NETWORK_ERROR };
    }
  }

  /** Public connection summary — never includes tokens or secrets. */
  async getConnectionSummary(tenantId: string): Promise<{
    connected: boolean;
    demoModeAvailable: boolean;
    embeddedSignupAvailable: boolean;
    /** Why Meta login can't be used right now (server configuration), or null. */
    embeddedSignupProblem: string | null;
    phoneRegistered: boolean | null;
    webhookConfigured: boolean;
    metaAppId?: string | null;
    embeddedSignupConfigId?: string | null;
    graphVersion: string;
    displayPhoneNumber?: string | null;
    verifiedName?: string | null;
    phoneNumberId?: string | null;
    wabaId?: string | null;
    connectedAt?: string | null;
    label?: string | null;
  }> {
    await ensureWhatsAppSchema(this.prisma);
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'WHATSAPP' },
      include: { tokens: { select: { webhookSecret: true } } },
    });
    const connected = integration?.status === 'CONNECTED';
    const meta = ((integration?.metadata as Record<string, any>) || {});
    const creds = connected ? await this.getCredentials(tenantId) : null;
    const config = readEmbeddedSignupConfig();
    let embeddedSignupProblem = describeConfigProblem(config);
    if (!embeddedSignupProblem) {
      const appCheck = await this.verifyMetaApp();
      if (!appCheck.ok) embeddedSignupProblem = appCheck.error || 'Meta login is misconfigured on the server.';
    }
    const metaAppId = config.appId;
    const embeddedSignupConfigId = config.configId;
    const platformAppSecret = config.hasAppSecret;
    return {
      connected: Boolean(connected && creds),
      demoModeAvailable: this.isDemoModeEnabled(),
      embeddedSignupAvailable: !embeddedSignupProblem,
      embeddedSignupProblem,
      phoneRegistered: typeof meta.phoneRegistered === 'boolean' ? meta.phoneRegistered : null,
      webhookConfigured: Boolean(
        connected && (platformAppSecret || integration?.tokens?.some((t) => Boolean(t.webhookSecret))),
      ),
      metaAppId: embeddedSignupProblem ? null : metaAppId,
      embeddedSignupConfigId: embeddedSignupProblem ? null : embeddedSignupConfigId,
      graphVersion: GRAPH_VERSION,
      displayPhoneNumber: creds?.displayPhoneNumber || meta.displayPhoneNumber || null,
      verifiedName: creds?.verifiedName || meta.verifiedName || integration?.label || null,
      phoneNumberId: creds?.phoneNumberId || meta.phoneNumberId || null,
      wabaId: creds?.wabaId || meta.wabaId || null,
      connectedAt: meta.connectedAt || integration?.updatedAt?.toISOString?.() || null,
      label: integration?.label || null,
    };
  }

  /**
   * Exchanges an Embedded Signup one-time code for a customer business token.
   * Per Meta docs: client_id + client_secret + code only (no redirect_uri).
   * The code expires in ~30s — call this immediately after FB.login.
   */
  async exchangeEmbeddedSignupCode(code: string): Promise<{ accessToken: string }> {
    const config = readEmbeddedSignupConfig();
    const problem = describeConfigProblem(config);
    const appId = config.appId;
    const appSecret = process.env.META_APP_SECRET?.trim();
    if (problem || !appId || !appSecret) {
      throw new BadRequestException(problem || 'Meta login is not configured on the server.');
    }
    const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('client_secret', appSecret);
    url.searchParams.set('code', code);

    let res: Response;
    try {
      res = await fetch(url.toString());
    } catch {
      throw new BadRequestException(WHATSAPP_NETWORK_ERROR);
    }
    const body: any = await res.json().catch(() => null);
    if (!res.ok || !body?.access_token) {
      this.logger.warn(
        `Embedded Signup token exchange failed: status=${res.status} code=${body?.error?.code ?? '?'}`,
      );
      const expired = body?.error?.code === 100 && /expired|already been used/i.test(String(body?.error?.message || ''));
      throw new BadRequestException(
        expired
          ? 'The Meta login session expired before it could be completed. Please click Continue with Meta again.'
          : 'Could not complete Meta login. Please try Continue with Meta again.',
      );
    }
    return { accessToken: String(body.access_token) };
  }

  /** Subscribes Doloyal's Meta app to the customer's WABA webhook events. Returns whether it succeeded. */
  async subscribeWaba(accessToken: string, wabaId: string): Promise<boolean> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${wabaId}/subscribed_apps`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const body: any = await res.json().catch(() => null);
        this.logger.warn(`WABA subscribe failed (waba=${wabaId}): code=${body?.error?.code ?? res.status}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`WABA subscribe error (waba=${wabaId}): ${err?.name || 'network'}`);
      return false;
    }
  }

  /**
   * Registers the business phone for Cloud API messaging. Meta requires a
   * 6-digit PIN (it becomes the number's two-step verification PIN).
   */
  async registerPhoneNumber(
    accessToken: string,
    phoneNumberId: string,
    pin: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', pin }),
      });
      if (res.ok) return { ok: true };
      const body: any = await res.json().catch(() => null);
      const code = Number(body?.error?.code);
      this.logger.warn(`Phone register failed (phone=${phoneNumberId}): code=${code || res.status}`);
      if (code === 133005) {
        return { ok: false, error: 'That PIN does not match the two-step verification PIN already set on this number.' };
      }
      if (code === 133016 || code === 133009) {
        return { ok: false, error: 'Too many registration attempts for this number. Please wait and try again later.' };
      }
      return { ok: false, error: describeWhatsAppError(body?.error, res.status) };
    } catch {
      return { ok: false, error: WHATSAPP_NETWORK_ERROR };
    }
  }

  /** Registers the workspace's connected number with Cloud API and records the result. */
  async registerConnectedPhone(tenantId: string, pin: string): Promise<{ phoneRegistered: true }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) throw new BadRequestException(WHATSAPP_NOT_CONNECTED_MESSAGE);
    const result = await this.registerPhoneNumber(creds.accessToken, creds.phoneNumberId, pin);
    if (!result.ok) throw new BadRequestException(result.error || 'Could not register this phone number.');

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'WHATSAPP' },
      select: { id: true, metadata: true },
    });
    if (integration) {
      await this.prisma.integration.update({
        where: { id: integration.id },
        data: {
          metadata: {
            ...((integration.metadata as Record<string, any>) || {}),
            phoneRegistered: true,
            phoneRegisteredAt: new Date().toISOString(),
          },
        },
      });
    }
    return { phoneRegistered: true };
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
        this.logger.warn(
          `WhatsApp credential check failed: status=${res.status} code=${body?.error?.code ?? '?'} subcode=${body?.error?.error_subcode ?? '?'}`,
        );
        return { valid: false, error: describeWhatsAppError(body?.error, res.status) };
      }
      return {
        valid: true,
        displayPhoneNumber: body?.display_phone_number || undefined,
        verifiedName: body?.verified_name || undefined,
      };
    } catch {
      return { valid: false, error: WHATSAPP_NETWORK_ERROR };
    }
  }

  private async tenantCountry(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { country: true } });
    return tenant?.country || null;
  }

  private async post(
    tenantId: string,
    creds: WhatsAppCredentials,
    payload: Record<string, any>,
  ): Promise<WhatsAppSendResult> {
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
        // Never log tokens or payloads — only safe Meta error identifiers.
        this.logger.warn(
          `WhatsApp send failed (tenant=${tenantId}): code=${err?.code ?? '?'} subcode=${err?.error_subcode ?? '?'} status=${res.status}`,
        );
        return { ok: false, error: describeWhatsAppError(err, res.status), errorCode: err?.code };
      }
      const messageId: string | undefined = body?.messages?.[0]?.id;
      if (!messageId) {
        return { ok: false, error: WHATSAPP_GENERIC_ERROR };
      }
      return {
        ok: true,
        providerMessageId: messageId,
        messageStatus: body?.messages?.[0]?.message_status || 'accepted',
      };
    } catch (err: any) {
      this.logger.warn(`WhatsApp send network error (tenant=${tenantId}): ${err?.name || 'error'}`);
      return { ok: false, error: WHATSAPP_NETWORK_ERROR };
    }
  }

  private async resolveRecipient(tenantId: string, to: string): Promise<string | null> {
    return toWhatsAppNumber(to, await this.tenantCountry(tenantId));
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
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { ok: false, error: WHATSAPP_NOT_CONNECTED_MESSAGE };
    const recipient = await this.resolveRecipient(tenantId, to);
    if (!recipient) return { ok: false, error: WHATSAPP_INVALID_RECIPIENT_MESSAGE };
    return this.postTemplate(tenantId, creds, recipient, templateName, options);
  }

  private postTemplate(
    tenantId: string,
    creds: WhatsAppCredentials,
    recipient: string,
    templateName: string,
    options?: { languageCode?: string; bodyParams?: string[] },
  ): Promise<WhatsAppSendResult> {
    const components =
      options?.bodyParams && options.bodyParams.length > 0
        ? [
            {
              type: 'body',
              parameters: options.bodyParams.map((text) => ({ type: 'text', text })),
            },
          ]
        : undefined;

    return this.post(tenantId, creds, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: options?.languageCode || 'en' },
        ...(components ? { components } : {}),
      },
    });
  }

  /** Sends a free-form session text (only delivered inside a 24h customer-service window). */
  async sendSessionText(tenantId: string, to: string, text: string): Promise<WhatsAppSendResult> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { ok: false, error: WHATSAPP_NOT_CONNECTED_MESSAGE };
    const recipient = await this.resolveRecipient(tenantId, to);
    if (!recipient) return { ok: false, error: WHATSAPP_INVALID_RECIPIENT_MESSAGE };
    return this.postText(tenantId, creds, recipient, text);
  }

  private postText(
    tenantId: string,
    creds: WhatsAppCredentials,
    recipient: string,
    text: string,
  ): Promise<WhatsAppSendResult> {
    return this.post(tenantId, creds, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: { preview_url: false, body: text },
    });
  }

  /** International WhatsApp number for a customer phone, using the business country for national numbers. */
  async customerWhatsAppNumber(tenantId: string, phone: string | null | undefined) {
    const digits = toWhatsAppNumber(phone, await this.tenantCountry(tenantId));
    return { digits, display: formatWhatsAppNumber(digits) };
  }

  /**
   * Sends a 1:1 retention message to an existing customer and records
   * Notification + Activity for the customer timeline.
   *
   * The initial status is QUEUED ("accepted by WhatsApp"). SENT / DELIVERED /
   * READ / FAILED only come from Meta webhooks.
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
      sentByUserId?: string;
    },
  ): Promise<WhatsAppCustomerSendResult> {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, firstName: true, lastName: true, phone: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found in this workspace.');
    }
    if (!customer.phone?.trim()) {
      throw new BadRequestException('This customer does not have a phone / WhatsApp number.');
    }
    const recipient = await this.resolveRecipient(tenantId, customer.phone);
    if (!recipient) {
      throw new BadRequestException(WHATSAPP_INVALID_RECIPIENT_MESSAGE);
    }

    const messageType = input.messageType === 'template' ? 'template' : 'text';
    const templateName = String(input.templateName || '').trim();
    const templateLanguage = String(input.templateLanguage || '').trim() || 'en_US';
    const templateParams = (Array.isArray(input.templateParams) ? input.templateParams : [])
      .map((p) => String(p ?? '').trim())
      .slice(0, 20);
    const textBody = String(input.body || '').trim();

    if (messageType === 'text' && !textBody) {
      throw new BadRequestException('Message text is required.');
    }
    if (messageType === 'text' && textBody.length > 4096) {
      throw new BadRequestException('WhatsApp messages can be at most 4096 characters.');
    }
    if (messageType === 'template' && !templateName) {
      throw new BadRequestException('An approved template name is required.');
    }

    const useDemo = Boolean(input.demo) && this.isDemoModeEnabled();
    const creds = await this.getCredentials(tenantId);

    if (!creds && !useDemo) {
      return { ok: false, deliveryStatus: 'FAILED', error: WHATSAPP_NOT_CONNECTED_MESSAGE };
    }

    let bodyText = textBody;
    if (messageType === 'template') {
      const template = creds ? await this.findTemplate(creds, templateName, templateLanguage) : null;
      if (template) {
        this.assertTemplateSendable(template, templateParams);
        bodyText = renderTemplateBody(template, templateParams) || `Template: ${templateName}`;
      } else {
        bodyText = `Template: ${templateName}`;
      }
    }

    let result: WhatsAppSendResult;
    if (useDemo || !creds) {
      // Explicit demo path — never contacts Meta and never invents a provider message id.
      result = { ok: true, demo: true };
    } else if (messageType === 'template') {
      result = await this.postTemplate(tenantId, creds, recipient, templateName, {
        languageCode: templateLanguage,
        bodyParams: templateParams.length ? templateParams : undefined,
      });
    } else {
      result = await this.postText(tenantId, creds, recipient, bodyText);
    }

    const deliveryStatus: WhatsAppDeliveryStatus = result.demo ? 'DEMO' : result.ok ? 'QUEUED' : 'FAILED';
    const now = new Date();

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        customerId: customer.id,
        type: 'RETENTION_WHATSAPP',
        channel: 'WHATSAPP',
        recipient: `+${recipient}`,
        subject: result.demo
          ? 'WhatsApp Message (Demo)'
          : messageType === 'template'
            ? `Template: ${templateName}`
            : 'WhatsApp Message',
        body: bodyText,
        status: result.ok ? 'SENT' : 'FAILED',
        sentAt: result.ok && !result.demo ? now : null,
        metadata: {
          providerMessageId: result.providerMessageId || null,
          deliveryStatus,
          metaMessageStatus: result.messageStatus || null,
          statusTimestamps: { [deliveryStatus]: now.toISOString() },
          messageType,
          templateName: messageType === 'template' ? templateName : null,
          templateLanguage: messageType === 'template' ? templateLanguage : null,
          demo: Boolean(result.demo),
          purpose: 'customer_retention',
          sentByUserId: input.sentByUserId || null,
          error: result.error || null,
          errorCode: result.errorCode ?? null,
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
            : `WhatsApp message: ${bodyText.slice(0, 160)}`,
          metadata: {
            notificationId: notification.id,
            providerMessageId: result.providerMessageId || null,
            deliveryStatus,
            statusTimestamps: { [deliveryStatus]: now.toISOString() },
            demo: Boolean(result.demo),
            messageType,
            templateName: messageType === 'template' ? templateName : null,
            body: bodyText.slice(0, 1000),
            sentByUserId: input.sentByUserId || null,
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
        recipient: formatWhatsAppNumber(recipient) || undefined,
        error: result.error || WHATSAPP_GENERIC_ERROR,
        errorCode: result.errorCode,
      };
    }

    return {
      ok: true,
      demo: Boolean(result.demo),
      notificationId: notification.id,
      activityId,
      providerMessageId: result.providerMessageId,
      deliveryStatus,
      recipient: formatWhatsAppNumber(recipient) || undefined,
      message: result.demo
        ? 'Demo message recorded. No message was sent through WhatsApp Business Messaging.'
        : 'Accepted by WhatsApp. Waiting for delivery confirmation.',
    };
  }

  private assertTemplateSendable(template: WhatsAppTemplate, params: string[]) {
    const components = template.components || [];
    const header = components.find((c: any) => String(c?.type).toUpperCase() === 'HEADER');
    if (header) {
      const format = String(header.format || 'TEXT').toUpperCase();
      if (format !== 'TEXT' || placeholderCount(header.text) > 0) {
        throw new BadRequestException(
          'Templates with media or header variables can’t be sent from here yet. Choose a text-only template.',
        );
      }
    }
    const body = components.find((c: any) => String(c?.type).toUpperCase() === 'BODY');
    const needed = placeholderCount(body?.text);
    const provided = params.slice(0, needed).filter(Boolean).length;
    if (provided < needed) {
      throw new BadRequestException(
        `This template needs ${needed} value${needed === 1 ? '' : 's'}. Fill in every placeholder before sending.`,
      );
    }
  }

  private async findTemplate(
    creds: WhatsAppCredentials,
    name: string,
    language: string,
  ): Promise<WhatsAppTemplate | null> {
    if (!creds.wabaId) return null;
    const result = await this.listTemplates(creds);
    if (!result.ok) return null;
    return (
      result.templates?.find((t) => t.name === name && t.language === language) ||
      null
    );
  }

  private async listTemplates(
    creds: WhatsAppCredentials,
  ): Promise<{ ok: boolean; templates?: WhatsAppTemplate[]; error?: string }> {
    if (!creds.wabaId) {
      return {
        ok: false,
        error: 'Add your WhatsApp Business Account ID in the connection settings to browse templates.',
      };
    }
    try {
      const res = await fetch(
        `${GRAPH_BASE}/${creds.wabaId}/message_templates?fields=name,status,category,language,components&limit=200`,
        { headers: { Authorization: `Bearer ${creds.accessToken}` } },
      );
      const body: any = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.warn(`WhatsApp template list failed: status=${res.status} code=${body?.error?.code ?? '?'}`);
        return { ok: false, error: describeWhatsAppError(body?.error, res.status) };
      }
      const templates: WhatsAppTemplate[] = (body?.data || [])
        .filter((t: any) => String(t.status || '').toUpperCase() === 'APPROVED')
        .map((t: any) => ({
          name: String(t.name),
          language: String(t.language || 'en_US'),
          status: t.status,
          category: t.category,
          components: Array.isArray(t.components) ? t.components : [],
        }));
      return { ok: true, templates };
    } catch {
      return { ok: false, error: WHATSAPP_NETWORK_ERROR };
    }
  }

  /** Lists approved templates from the tenant's WABA. */
  async fetchTemplates(
    tenantId: string,
  ): Promise<{ ok: boolean; templates?: WhatsAppTemplate[]; error?: string }> {
    const creds = await this.getCredentials(tenantId);
    if (!creds) return { ok: false, error: WHATSAPP_NOT_CONNECTED_MESSAGE };
    return this.listTemplates(creds);
  }

  /** Current delivery state of one outbound WhatsApp message in this workspace. */
  async getMessageStatus(tenantId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, channel: 'WHATSAPP' },
      select: { id: true, customerId: true, status: true, metadata: true, createdAt: true },
    });
    if (!notification) throw new NotFoundException('Message not found.');
    const meta = (notification.metadata as Record<string, any>) || {};
    return {
      notificationId: notification.id,
      customerId: notification.customerId,
      deliveryStatus: String(meta.deliveryStatus || (notification.status === 'FAILED' ? 'FAILED' : 'QUEUED')),
      providerMessageId: meta.providerMessageId || null,
      statusTimestamps: (meta.statusTimestamps as Record<string, string>) || {},
      error: meta.error || null,
      errorCode: meta.errorCode ?? null,
      lastWebhookAt: meta.lastWebhookAt || null,
      createdAt: notification.createdAt.toISOString(),
    };
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
    if (!signatureHeader || !appSecret) return false;
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = String(signatureHeader).replace(/^sha256=/, '');
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  }

  /**
   * Applies one verified webhook `change.value` (already routed to the tenant
   * owning `value.metadata.phone_number_id`): delivery statuses update the
   * matching Notification + timeline Activity; inbound messages become
   * WHATSAPP_RECEIVED activities.
   */
  async processWebhookChange(tenantId: string, value: any): Promise<{ statuses: number; messages: number }> {
    let statuses = 0;
    let messages = 0;
    if (!value) return { statuses, messages };

    for (const status of Array.isArray(value.statuses) ? value.statuses : []) {
      if (await this.applyStatusUpdate(tenantId, status)) statuses += 1;
    }

    for (const message of Array.isArray(value.messages) ? value.messages : []) {
      if (await this.recordInboundMessage(tenantId, message)) messages += 1;
    }

    return { statuses, messages };
  }

  private async applyStatusUpdate(tenantId: string, status: any): Promise<boolean> {
    const messageId = status?.id ? String(status.id) : '';
    const incoming = mapWebhookStatus(status?.status);
    if (!messageId || !incoming) return false;

    const existing = await this.prisma.notification.findFirst({
      where: {
        tenantId,
        channel: 'WHATSAPP',
        metadata: { path: ['providerMessageId'], equals: messageId },
      },
      select: { id: true, metadata: true, customerId: true, sentAt: true },
    });
    if (!existing) return false;

    const prevMeta = ((existing.metadata as Record<string, any>) || {});
    const next = nextDeliveryStatus(prevMeta.deliveryStatus, incoming);
    const at = new Date(status?.timestamp ? Number(status.timestamp) * 1000 : Date.now());
    const atIso = Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString();
    const statusTimestamps = {
      ...((prevMeta.statusTimestamps as Record<string, string>) || {}),
    };
    if (!statusTimestamps[incoming]) statusTimestamps[incoming] = atIso;

    const metaError = incoming === 'FAILED' ? status?.errors?.[0] : null;
    const errorMessage = metaError ? describeWhatsAppError(metaError) : null;
    const statusFields = {
      deliveryStatus: next,
      statusTimestamps,
      webhookStatus: status?.status || null,
      lastWebhookAt: new Date().toISOString(),
      ...(errorMessage ? { error: errorMessage, errorCode: metaError?.code ?? null } : {}),
    };

    await this.prisma.notification.update({
      where: { id: existing.id },
      data: {
        status: next === 'FAILED' ? 'FAILED' : 'SENT',
        ...(!existing.sentAt && incoming === 'SENT' ? { sentAt: new Date(atIso) } : {}),
        metadata: { ...prevMeta, ...statusFields },
      },
    });

    if (existing.customerId) {
      const activity = await this.prisma.activity.findFirst({
        where: {
          tenantId,
          customerId: existing.customerId,
          type: 'WHATSAPP_SENT',
          metadata: { path: ['notificationId'], equals: existing.id },
        },
        select: { id: true, metadata: true },
      });
      if (activity) {
        await this.prisma.activity.update({
          where: { id: activity.id },
          data: {
            metadata: { ...((activity.metadata as Record<string, any>) || {}), ...statusFields },
          },
        });
      }
    }
    return true;
  }

  private async recordInboundMessage(tenantId: string, message: any): Promise<boolean> {
    // Inbound customer replies are recorded when the sender matches a customer by phone.
    const fromDigits = String(message?.from || '').replace(/[^\d]/g, '');
    if (!fromDigits) return false;
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
    if (!customer) return false;
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
        metadata: {
          providerMessageId: message?.id,
          type: message?.type,
          body: String(text).slice(0, 1000),
        },
      },
    });
    return true;
  }
}
