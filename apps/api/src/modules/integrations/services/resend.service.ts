import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class ResendIntegrationService {
  constructor(private readonly integrations: IntegrationsService) {}

  async validateCredentials(apiKey: string): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      const resend = new Resend(apiKey);
      await resend.domains.list();
      return { valid: true, accountName: 'Resend Account' };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getClient(tenantId: string): Promise<Resend | null> {
    const integration = await this.integrations.get(tenantId, 'RESEND' as any);
    if (!integration || !integration.connected || !integration.token) return null;

    const raw = integration.token as any;
    const apiKey = raw.apiKey;
    if (!apiKey) return null;

    return new Resend(apiKey);
  }

  async sendEmail(tenantId: string, to: string | string[], subject: string, html: string, from?: string) {
    const resend = await this.getClient(tenantId);
    if (!resend) throw new Error('Resend not connected');

    const fromAddress = from || process.env.RESEND_FROM || 'noreply@doloyal.ai';
    return resend.emails.send({
      from: fromAddress,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
  }
}
