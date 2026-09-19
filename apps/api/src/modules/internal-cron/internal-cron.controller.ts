import {
  Controller,
  Get,
  Headers,
  Param,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { Public } from '../auth/public.decorator';
import { CampaignSchedulerService } from '../campaigns/campaign-scheduler.service';
import { WorkflowSchedulerService } from '../workflows/workflow-scheduler.service';
import {
  ReferralJobName,
  ReferralsJobsService,
} from '../referrals/referrals-jobs.service';
import { AppointmentReminderService } from '../appointments/appointment-reminder.service';

const REFERRAL_JOBS = new Set<ReferralJobName>([
  'expire-campaigns',
  'expire-links',
  'leaderboards',
  'pending-rewards',
  'aggregate-sources',
  'fraud-scan',
]);

/**
 * Serverless scheduler entrypoints.
 *
 * Supabase Cron invokes these routes because a Vercel Hobby function cannot
 * keep setInterval timers alive. They are public only at Nest's auth layer;
 * every request still requires a timing-safe CRON_SECRET comparison.
 */
@Public()
@Controller('internal/cron')
export class InternalCronController {
  constructor(
    private readonly campaigns: CampaignSchedulerService,
    private readonly workflows: WorkflowSchedulerService,
    private readonly referrals: ReferralsJobsService,
    private readonly reminders: AppointmentReminderService,
  ) {}

  @Get('campaigns')
  runCampaigns(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.campaigns.runOnce();
  }

  @Get('workflows')
  runWorkflows(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.workflows.runOnce();
  }

  @Get('appointments')
  runAppointments(@Headers('authorization') authorization?: string) {
    this.authorize(authorization);
    return this.reminders.runOnce();
  }

  @Get('referrals/:job')
  runReferral(
    @Param('job') job: string,
    @Headers('authorization') authorization?: string,
  ) {
    this.authorize(authorization);
    if (!REFERRAL_JOBS.has(job as ReferralJobName)) {
      throw new UnauthorizedException('Unknown scheduled job.');
    }
    return this.referrals.runJob(job as ReferralJobName);
  }

  private authorize(authorization?: string): void {
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected) {
      throw new ServiceUnavailableException('Scheduled jobs are not configured.');
    }

    const supplied = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';
    const expectedBytes = Buffer.from(expected);
    const suppliedBytes = Buffer.from(supplied);

    if (
      expectedBytes.length !== suppliedBytes.length ||
      !timingSafeEqual(expectedBytes, suppliedBytes)
    ) {
      throw new UnauthorizedException('Invalid scheduled-job credentials.');
    }
  }
}
