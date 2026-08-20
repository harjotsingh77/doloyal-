import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { ResendIntegrationService } from './resend.service';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
}

export interface SendBusinessEmailInput {
  tenantId: string;
  to: string;
  from?: string;
  replyTo?: string;
  subject?: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  customerId?: string;
  workflowId?: string;
  campaignId?: string;
  appointmentId?: string;
  notificationType?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  id?: string;
  providerMessageId?: string;
  status: 'SENT' | 'FAILED';
  to: string;
  subject?: string;
  error?: string;
  from?: string;
}

/**
 * Central outbound email service. Every automated email — workflow actions,
 * campaigns and booking notifications — sends through the business's own
 * connected Resend OAuth account and is recorded in EmailLog.
 *
 * Never throws for send-level failures: returns a FAILED result so callers
 * can decide how to surface it (fail a workflow step, log a notification,
 * etc.). The only exceptions are programmatic errors (e.g. no tenant).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resend: ResendIntegrationService,
  ) {}

  async sendBusinessEmail(input: SendBusinessEmailInput): Promise<EmailSendResult> {
    const { tenantId, to, subject, customerId, workflowId, campaignId, appointmentId, notificationType, metadata } = input;
    if (!to) {
      return this.fail({ tenantId, to, subject, customerId, workflowId, campaignId, appointmentId, notificationType, metadata }, 'Recipient email is required.');
    }

    let from = input.from;
    if (!from) {
      from = await this.resolveDefaultSender(tenantId);
    }
    if (!from) {
      return this.fail(
        { tenantId, to, subject, customerId, workflowId, campaignId, appointmentId, notificationType, metadata },
        'No verified sender is configured for this workspace. Add a verified sending domain to your Resend account, then set a default sender.',
      );
    }

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'RESEND', status: { in: ['CONNECTED', 'REAUTH_REQUIRED'] } },
    });

    const sendResult = await this.resend.sendEmail({
      tenantId,
      to,
      from,
      replyTo: input.replyTo,
      subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments,
    });

    const record = await this.prisma.emailLog.create({
      data: {
        tenantId,
        integrationId: integration?.id || null,
        customerId: customerId || null,
        provider: 'RESEND',
        providerMessageId: sendResult.id || null,
        fromEmail: from,
        toEmail: to,
        subject: subject || null,
        status: sendResult.status,
        error: sendResult.error || null,
        workflowId: workflowId || null,
        campaignId: campaignId || null,
        appointmentId: appointmentId || null,
        notificationType: notificationType || null,
        metadata: (metadata as any) || undefined,
      },
    });

    if (sendResult.status === 'FAILED') {
      this.logger.warn(`Email send failed (tenant=${tenantId} to=${to}): ${sendResult.error}`);
      return {
        id: record.id,
        providerMessageId: undefined,
        status: 'FAILED',
        to,
        subject,
        error: sendResult.error,
        from,
      };
    }

    return {
      id: record.id,
      providerMessageId: sendResult.id,
      status: 'SENT',
      to,
      subject,
      from,
    };
  }

  private async fail(
    ctx: Pick<SendBusinessEmailInput, 'tenantId' | 'to' | 'subject' | 'customerId' | 'workflowId' | 'campaignId' | 'appointmentId' | 'notificationType' | 'metadata'>,
    error: string,
  ): Promise<EmailSendResult> {
    try {
      const integration = await this.prisma.integration.findFirst({
        where: { tenantId: ctx.tenantId, type: 'RESEND', status: { in: ['CONNECTED', 'REAUTH_REQUIRED'] } },
      });
      await this.prisma.emailLog.create({
        data: {
          tenantId: ctx.tenantId,
          integrationId: integration?.id || null,
          customerId: ctx.customerId || null,
          provider: 'RESEND',
          toEmail: ctx.to,
          subject: ctx.subject || null,
          status: 'FAILED',
          error,
          workflowId: ctx.workflowId || null,
          campaignId: ctx.campaignId || null,
          appointmentId: ctx.appointmentId || null,
          notificationType: ctx.notificationType || null,
          metadata: (ctx.metadata as any) || undefined,
        },
      });
    } catch (logErr: any) {
      this.logger.warn(`Failed to record failed EmailLog: ${logErr?.message}`);
    }
    return { status: 'FAILED', to: ctx.to, subject: ctx.subject, error };
  }

  /**
   * Resolve a default sender for the tenant, in priority order:
   * 1. A default verified ResendDomain owned by the tenant.
   * 2. A sender stored on the tenant's Resend integration metadata.
   * 3. The RESEND_FROM env fallback (only works if that domain is verified
   *    on the business's own Resend account).
   */
  private async resolveDefaultSender(tenantId: string): Promise<string | undefined> {
    const defaultDomain = await this.prisma.resendDomain.findFirst({
      where: { tenantId, isDefault: true, status: 'VERIFIED' },
    });
    if (defaultDomain) {
      return `Doloyal <noreply@${defaultDomain.domain}>`;
    }

    const integration = await this.prisma.integration.findFirst({
      where: { tenantId, type: 'RESEND' },
    });
    const metadata = (integration?.metadata as Record<string, any>) || {};
    if (typeof metadata.fromEmail === 'string' && metadata.fromEmail) {
      return metadata.fromEmail;
    }
    if (metadata.fromDomain) {
      return `Doloyal <noreply@${metadata.fromDomain}>`;
    }

    return process.env.RESEND_FROM || undefined;
  }
}