import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { SchedulerLockService } from '../../common/scheduler-lock.service';

/**
 * Drives the workflow scheduler: resumes due delays/retries and evaluates
 * scan-style triggers (inactive / birthday / membership expiring).
 * Runs server-side only — never in the browser. A database-backed lease
 * keeps exactly one dispatcher active across API replicas.
 */
@Injectable()
export class WorkflowSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly engine: WorkflowEngineService,
    private readonly lock: SchedulerLockService,
  ) {}

  onModuleInit() {
    if (process.env.VERCEL) return;
    this.timer = setInterval(() => void this.runOnce(), 60_000);
    setTimeout(() => void this.runOnce(), 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async runOnce(): Promise<{ resumed: number; enqueued: number; skipped: boolean }> {
    if (this.running) return { resumed: 0, enqueued: 0, skipped: true };
    const lockKey = 'scheduler:workflows:tick';
    if (!(await this.lock.tryAcquire(lockKey))) {
      return { resumed: 0, enqueued: 0, skipped: true };
    }
    this.running = true;
    let result = { resumed: 0, enqueued: 0 };
    try {
      result = await this.engine.processDueRuns();
      if (result.resumed > 0 || result.enqueued > 0) {
        this.logger.log(`Workflow scheduler: resumed ${result.resumed}, enqueued ${result.enqueued}`);
      }
    } catch (err: any) {
      this.logger.warn(`Workflow scheduler tick failed: ${err?.message}`);
      throw err;
    } finally {
      this.running = false;
      await this.lock.release(lockKey);
    }
    return { ...result, skipped: false };
  }
}
