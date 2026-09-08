import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../integrations/services/email.service';
import { WhatsAppIntegrationService } from '../integrations/services/whatsapp.service';

export interface CreateCampaignInput {
  name: string;
  subject?: string;
  body: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  audience?: 'All' | 'VIP' | 'At Risk' | 'Inactive';
  scheduleDate?: string;
}

const AUDIENCE_WHERE: Record<string, Record<string, unknown>> = {
  'All': {},
  'VIP': { tags: { has: 'VIP' } },
  'At Risk': { status: 'AT_RISK' },
  'Inactive': { status: 'INACTIVE' },
};

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsapp: WhatsAppIntegrationService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.campaign.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, input: CreateCampaignInput) {
    if (!input.name || !input.body) {
      throw new BadRequestException('Campaign name and message are required.');
    }
    const audience = input.audience || 'All';
    const recipients = await this.countAudience(tenantId, audience);

    return this.prisma.campaign.create({
      data: {
        tenantId,
        name: input.name,
        subject: input.subject || input.name,
        body: input.body,
        channel: input.channel,
        audience,
        recipients,
        status: input.scheduleDate ? 'SCHEDULED' : 'DRAFT',
        scheduleDate: input.scheduleDate ? new Date(input.scheduleDate) : null,
      },
    }).then(async (campaign) => {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'NOTE_ADDED',
          message: `Campaign "${campaign.name}" created (${campaign.status.toLowerCase()}, ${recipients} in audience)`,
        },
      });
      return campaign;
    });
  }

  /** Scheduler entry point — resolves the tenant from the campaign row. */
  async sendByScheduler(id: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.status !== 'SCHEDULED') return;
    return this.send(campaign.tenantId, id);
  }

  async setStatus(tenantId: string, id: string, status: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    const allowed = ['DRAFT', 'SCHEDULED', 'PAUSED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Unsupported campaign status.');
    }
    if (campaign.channel === 'EMAIL' && status !== 'PAUSED') {
      await this.requireResendConnected(tenantId);
    }

    return this.prisma.campaign.update({
      where: { id },
      data: { status: status as any },
    }).then(async (updated) => {
      await this.prisma.activity.create({
        data: {
          tenantId,
          type: 'NOTE_ADDED',
          message: `Campaign "${updated.name}" ${status === 'PAUSED' ? 'paused' : `set to ${status.toLowerCase()}`}`,
        },
      });
      return updated;
    });
  }

  /**
   * Send a campaign through a REAL provider channel:
   *  - EMAIL via the business's own Resend OAuth account
   *  - WHATSAPP via the Meta Cloud API (template name goes in `subject`)
   * SMS remains unavailable until a Twilio integration ships — it fails
   * loudly instead of pretending to succeed.
   */
  async send(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.channel === 'SMS') {
      throw new BadRequestException(
        'SMS sending is not available yet. Use the EMAIL or WHATSAPP channels.',
      );
    }

    const audienceWhere = AUDIENCE_WHERE[campaign.audience || 'All'] || {};

    let customers: any[];
    if (campaign.channel === 'EMAIL') {
      await this.requireResendConnected(tenantId);
      customers = await this.prisma.customer.findMany({
        where: { tenantId, ...audienceWhere },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      customers = customers.filter((c) => c.email);
    } else {
      // WHATSAPP
      customers = await this.prisma.customer.findMany({
        where: { tenantId, ...audienceWhere },
        select: { id: true, firstName: true, lastName: true, phone: true },
      });
      customers = customers.filter((c) => c.phone);
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    let sent = 0;
    let failed = 0;
    const batchSize = 20;

    for (let i = 0; i < customers.length; i += batchSize) {
      const batch = customers.slice(i, i + batchSize);

      if (campaign.channel === 'EMAIL') {
        const results = await Promise.all(
          batch.map((c: any) =>
            this.emailService.sendBusinessEmail({
              tenantId,
              to: c.email,
              subject: campaign.subject,
              html: campaign.body,
              customerId: c.id,
              campaignId: campaign.id,
              notificationType: 'CAMPAIGN',
            }),
          ),
        );
        for (const r of results) {
          if (r.status === 'SENT') sent += 1;
          else failed += 1;
        }
      } else {
        // WHATSAPP — real sends through the tenant's connected Cloud API.
        const templateName = (campaign.subject || '').trim();
        const firstName = null as string | null;
        void firstName;
        for (const c of batch) {
          try {
            let result;
            if (templateName) {
              result = await this.whatsapp.sendTemplate(tenantId, c.phone, templateName, {
                bodyParams: [c.firstName || 'there'].slice(0, 5),
              });
            } else {
              result = await this.whatsapp.sendSessionText(
                tenantId,
                c.phone,
                this.renderCampaignBody(campaign.body, c),
              );
            }
            await this.prisma.notification.create({
              data: {
                tenantId,
                customerId: c.id,
                type: 'CAMPAIGN',
                channel: 'WHATSAPP',
                recipient: c.phone,
                subject: campaign.name,
                body: campaign.body,
                status: result.ok ? 'SENT' : 'FAILED',
                sentAt: result.ok ? new Date() : null,
                metadata: {
                  campaignId: campaign.id,
                  ...(result.providerMessageId ? { providerMessageId: result.providerMessageId } : {}),
                  ...(result.error ? { error: result.error } : {}),
                },
              },
            }).catch(() => undefined);
            if (result.ok) sent += 1;
            else failed += 1;
          } catch (err: any) {
            failed += 1;
            this.logger.warn(`WhatsApp campaign send failed (${c.id}): ${err?.message}`);
          }
        }
      }

      // Simple pacing so bursts stay within provider rate limits.
      if (i + batchSize < customers.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const status = failed > 0 && sent === 0 ? 'FAILED' : 'COMPLETED';
    await this.prisma.campaign.update({
      where: { id },
      data: { status, sentAt: new Date(), sentCount: sent, failedCount: failed },
    });

    this.logger.log(`Campaign ${id} (${campaign.channel}) sent: ${sent} delivered, ${failed} failed (tenant=${tenantId})`);
    await this.prisma.activity.create({
      data: {
        tenantId,
        type: 'CAMPAIGN_SENT',
        message: `Campaign "${campaign.name}" sent to ${sent} customer${sent === 1 ? '' : 's'} (${failed} failed)`,
      },
    });
    return {
      channel: campaign.channel,
      status,
      audience: campaign.audience,
      recipients: customers.length,
      sent,
      failed,
      message:
        failed > 0 && sent === 0
          ? campaign.channel === 'EMAIL'
            ? 'Campaign failed to send. Check your Resend connection and sender.'
            : 'WhatsApp delivery failed. Check your WhatsApp connection, phone number and templates.'
          : `Campaign sent to ${sent} customer${sent === 1 ? '' : 's'} via ${campaign.channel === 'EMAIL' ? 'Resend' : 'WhatsApp'}.`,
    };
  }

  private renderCampaignBody(body: string, customer: { firstName?: string | null; lastName?: string | null }): string {
    return String(body)
      .replace(/\{\{\s*firstName\s*\}\}/gi, customer.firstName || 'there')
      .replace(/\{\{\s*lastName\s*\}\}/gi, customer.lastName || '')
      .replace(/\{\{\s*name\s*\}\}/gi, [customer.firstName, customer.lastName].filter(Boolean).join(' ') || 'there');
  }

  private async countAudience(tenantId: string, audience: string): Promise<number> {
    return this.prisma.customer.count({
      where: { tenantId, ...AUDIENCE_WHERE[audience] },
    });
  }

  private async requireResendConnected(tenantId: string) {
    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'RESEND', status: 'CONNECTED' },
    });
    if (!integration) {
      throw new BadRequestException(
        'Connect Resend to send email campaigns. Open Integrations and connect your Resend account.',
      );
    }
  }
}