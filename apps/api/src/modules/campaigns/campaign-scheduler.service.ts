import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SchedulerLockService } from '../../common/scheduler-lock.service';
import { CampaignsService } from './campaigns.service';

/**
 * Dispatches due SCHEDULED campaigns. Runs server-side only; a Postgres
 * expiring database lease guarantees a single dispatcher across API replicas.
 */
@Injectable()
export class CampaignSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CampaignSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private ticking = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly lock: SchedulerLockService,
    private readonly campaigns: CampaignsService,
  ) {}

  onModuleInit() {
    // Vercel Functions scale to zero and may be frozen immediately after a
    // response. Timers are therefore neither reliable nor unique there.
    // Supabase Cron calls runOnce() through the protected internal endpoint.
    if (process.env.VERCEL) return;
    this.timer = setInterval(() => void this.runOnce(), 60_000);
    setTimeout(() => void this.runOnce(), 20_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<{ dispatched: number; skipped: boolean }> {
    if (this.ticking) return { dispatched: 0, skipped: true };
    const lockKey = 'scheduler:campaigns:dispatch';
    if (!(await this.lock.tryAcquire(lockKey))) {
      return { dispatched: 0, skipped: true };
    }
    this.ticking = true;
    let dispatched = 0;
    try {
      const due = await this.prisma.campaign.findMany({
        where: { status: 'SCHEDULED', scheduleDate: { lte: new Date() } },
        select: { id: true },
        take: 25,
      });
      for (const { id } of due) {
        try {
          await this.campaigns.sendByScheduler(id);
          dispatched += 1;
        } catch (err: any) {
          this.logger.warn(`Scheduled campaign ${id} dispatch failed: ${err?.message}`);
          await this.prisma.campaign.update({
            where: { id },
            data: { status: 'FAILED' },
          }).catch(() => undefined);
        }
      }
      if (due.length > 0) {
        this.logger.log(`Dispatched ${dispatched} scheduled campaign(s)`);
      }
    } catch (err: any) {
      this.logger.warn(`Campaign scheduler tick failed: ${err?.message}`);
    } finally {
      this.ticking = false;
      await this.lock.release(lockKey);
    }
    return { dispatched, skipped: false };
  }
}
