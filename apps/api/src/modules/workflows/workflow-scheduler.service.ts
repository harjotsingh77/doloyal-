import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';

/**
 * Drives the workflow scheduler: resumes due delays/retries and evaluates
 * scan-style triggers (inactive / birthday / membership expiring).
 * Runs server-side only — never in the browser.
 */
@Injectable()
export class WorkflowSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly engine: WorkflowEngineService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 60_000);
    setTimeout(() => void this.tick(), 10_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await this.engine.processDueRuns();
      if (result.resumed > 0 || result.enqueued > 0) {
        this.logger.log(`Workflow scheduler: resumed ${result.resumed}, enqueued ${result.enqueued}`);
      }
    } catch (err: any) {
      this.logger.warn(`Workflow scheduler tick failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }
}
