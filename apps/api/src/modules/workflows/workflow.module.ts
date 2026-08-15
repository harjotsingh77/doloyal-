import { Module, OnModuleInit } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { WorkflowAiService } from './workflow-ai.service';
import { WorkflowEngineService } from './workflow-engine.service';
import { WorkflowSchedulerService } from './workflow-scheduler.service';
import { WorkflowValidationService } from './workflow-validation.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowService,
    WorkflowAiService,
    WorkflowEngineService,
    WorkflowSchedulerService,
    WorkflowValidationService,
  ],
  exports: [WorkflowService, WorkflowEngineService],
})
export class WorkflowsModule implements OnModuleInit {
  constructor(private readonly workflows: WorkflowService) {}
  async onModuleInit() {
    await this.workflows.seedTemplatesIfEmpty().catch(() => undefined);
  }
}
