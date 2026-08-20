import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { IntegrationsService } from '../integrations.service';

interface SendEmailInput {
  tenantId: string;
  to: string;
  from?: string;
  replyTo?: string;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
}

interface SendEmailResult {
  id?: string;
  status: 'SENT' | 'FAILED';
  error?: string;
}

const RESEND_API_URL = 'https://api.resend.com';

/**
 * Sends email through a business's own connected Resend OAuth account.
 * No Doloyal API key is used — the OAuth access token (refreshed on demand)
 * authorizes every request.
 */
@Injectable()
export class ResendIntegrationService {
  private readonly logger = new Logger(ResendIntegrationService.name);

  constructor(private readonly integrations: IntegrationsService) {}

  /** Resolve a valid OAuth access token for the tenant's Resend connection. */
  async getValidAccessToken(tenantId: string): Promise<string> {
    const integration = await this.integrations.get(tenantId, 'RESEND' as any);
    if (!integration || !integration.connected) {
      throw new BadRequestException('Resend is not connected. Connect Resend to send emails.');
    }
    if (!integration.id) {
      throw new BadRequestException('Resend connection is missing. Please reconnect.');
    }
    return this.integrations.getValidResendAccessToken(integration.id);
  }

  /** The OAuth scope currently granted on the tenant's Resend connection. */
  async getGrantedScope(tenantId: string): Promise<string[]> {
    const integration = await this.integrations.get(tenantId, 'RESEND' as any);
    if (!integration?.token?.scope) return [];
    return integration.token.scope.split(/\s+/).filter(Boolean);
  }

  private async request(path: string, init: RequestInit & { token: string }, retryOnce = true): Promise<any> {
    const res = await fetch(`${RESEND_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${init.token}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (res.status === 401 && retryOnce) {
      throw new Error('AUTHORIZATION_REQUIRED');
    }

    const body: any = res.status === 204 ? null : await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (body && (body.message || body.error)) ||
        `Resend API returned ${res.status} ${res.statusText}`;
      const err: any = new Error(message);
      err.status = res.status;
      throw err;
    }
    return body;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const { tenantId, to, from, replyTo, subject, html, text, attachments } = input;
    if (!to) {
      return { status: 'FAILED', error: 'Recipient email is required.' };
    }
    if (!from) {
      return { status: 'FAILED', error: 'A verified sender (from) address is required.' };
    }
    if (!subject && !html && !text) {
      return { status: 'FAILED', error: 'Email must have a subject or body.' };
    }

    let token: string;
    try {
      token = await this.getValidAccessToken(tenantId);
    } catch (err: any) {
      this.logger.warn(`Resend send blocked (tenant=${tenantId}): ${err?.message}`);
      return { status: 'FAILED', error: err?.message || 'Resend is not connected.' };
    }

    const payload: Record<string, any> = {
      from,
      to,
      subject,
    };
    if (html) payload.html = html;
    if (text) payload.text = text;
    if (replyTo) payload.reply_to = replyTo;
    if (attachments?.length) {
      payload.attachments = attachments.map((a) => ({
        filename: a.filename,
        content: a.content instanceof Buffer ? a.content.toString('base64') : a.content,
      }));
    }

    try {
      const result = await this.request('/emails', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });
      return { id: result?.id, status: 'SENT' };
    } catch (err: any) {
      if (err?.message === 'AUTHORIZATION_REQUIRED' || err?.status === 401) {
        return { status: 'FAILED', error: 'Resend access expired. Reconnect Resend to keep sending.' };
      }
      const message = err?.message || 'Failed to send email.';
      this.logger.warn(`Resend send failed (tenant=${tenantId} to=${to}): ${message}`);
      return { status: 'FAILED', error: message };
    }
  }

  // ── Sending-domain management (architecture for the upgrade flow) ─────────
  // The `emails:send` scope does NOT cover domain-management routes. These
  // methods work against the business's Resend account but require a grant
  // that includes `full_access`. Rather than silently requesting excessive
  // permissions, we surface a clear upgrade prompt instead.

  private assertFullAccess(scope: string[]) {
    if (!scope.includes('full_access')) {
      throw new BadRequestException(
        'Managing sending domains requires full Resend access. Reconnect Resend with full_access to manage domains.',
      );
    }
  }

  async listDomains(tenantId: string): Promise<any[]> {
    const scope = await this.getGrantedScope(tenantId);
    this.assertFullAccess(scope);
    const token = await this.getValidAccessToken(tenantId);
    const result = await this.request('/domains', { method: 'GET', token });
    return result?.data || [];
  }

  async createDomain(tenantId: string, domain: string, region?: string): Promise<any> {
    const scope = await this.getGrantedScope(tenantId);
    this.assertFullAccess(scope);
    const token = await this.getValidAccessToken(tenantId);
    return this.request('/domains', {
      method: 'POST',
      token,
      body: JSON.stringify({ name: domain, region }),
    });
  }

  async getDomain(tenantId: string, domainId: string): Promise<any> {
    const scope = await this.getGrantedScope(tenantId);
    this.assertFullAccess(scope);
    const token = await this.getValidAccessToken(tenantId);
    return this.request(`/domains/${domainId}`, { method: 'GET', token });
  }

  async verifyDomain(tenantId: string, domainId: string): Promise<any> {
    const scope = await this.getGrantedScope(tenantId);
    this.assertFullAccess(scope);
    const token = await this.getValidAccessToken(tenantId);
    return this.request(`/domains/${domainId}/verify`, { method: 'POST', token });
  }
}