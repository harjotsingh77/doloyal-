import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmailService } from '../integrations/services/email.service';

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
    });
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
    });
  }

  /**
   * Send a campaign through the business's own Resend OAuth account (EMAIL
   * channel). SMS/WhatsApp remain simulated until those providers ship.
   */
  async send(tenantId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.channel !== 'EMAIL') {
      await this.prisma.campaign.update({
        where: { id },
        data: { status: 'COMPLETED', sentAt: new Date(), sentCount: campaign.recipients },
      });
      return {
        channel: campaign.channel,
        status: 'COMPLETED',
        sent: campaign.recipients,
        message: `${campaign.channel} campaigns are simulated in this build.`,
      };
    }

    await this.requireResendConnected(tenantId);

    const customers = await this.prisma.customer.findMany({
      where: { tenantId, ...AUDIENCE_WHERE[campaign.audience || 'All'] },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const withEmail = customers.filter((c: any) => c.email);

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    let sent = 0;
    let failed = 0;
    const batchSize = 20;
    for (let i = 0; i < withEmail.length; i += batchSize) {
      const batch = withEmail.slice(i, i + batchSize);
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
      // Simple pacing so bursts stay within provider rate limits.
      if (i + batchSize < withEmail.length) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }

    const status = failed > 0 && sent === 0 ? 'FAILED' : 'COMPLETED';
    await this.prisma.campaign.update({
      where: { id },
      data: { status, sentAt: new Date(), sentCount: sent, failedCount: failed },
    });

    this.logger.log(`Campaign ${id} sent: ${sent} delivered, ${failed} failed (tenant=${tenantId})`);
    return {
      channel: 'EMAIL',
      status,
      audience: campaign.audience,
      recipients: withEmail.length,
      sent,
      failed,
      message:
        failed > 0 && sent === 0
          ? 'Campaign failed to send. Check your Resend connection and sender.'
          : `Campaign sent to ${sent} customer${sent === 1 ? '' : 's'} via Resend.`,
    };
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