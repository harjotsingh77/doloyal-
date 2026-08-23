import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SchedulerLockService } from '../../common/scheduler-lock.service';
import { CampaignsService } from './campaigns.service';

/**
 * Dispatches due SCHEDULED campaigns. Runs server-side only; a Postgres
 * advisory lock guarantees a single dispatcher across API replicas.
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
    this.timer = setInterval(() => void this.tick(), 60_000);
    setTimeout(() => void this.tick(), 20_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.ticking) return;
    const lockKey = 'scheduler:campaigns:dispatch';
    if (!(await this.lock.tryAcquire(lockKey))) return;
    this.ticking = true;
    try {
      const due = await this.prisma.campaign.findMany({
        where: { status: 'SCHEDULED', scheduleDate: { lte: new Date() } },
        select: { id: true },
        take: 25,
      });
      for (const { id } of due) {
        try {
          await this.campaigns.sendByScheduler(id);
        } catch (err: any) {
          this.logger.warn(`Scheduled campaign ${id} dispatch failed: ${err?.message}`);
          await this.prisma.campaign.update({
            where: { id },
            data: { status: 'FAILED' },
          }).catch(() => undefined);
        }
      }
      if (due.length > 0) {
        this.logger.log(`Dispatched ${due.length} scheduled campaign(s)`);
      }
    } catch (err: any) {
      this.logger.warn(`Campaign scheduler tick failed: ${err?.message}`);
    } finally {
      this.ticking = false;
      await this.lock.release(lockKey);
    }
  }
}
