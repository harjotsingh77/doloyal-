import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignAiService } from './campaign-ai.service';
import { CampaignSchedulerService } from './campaign-scheduler.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignSchedulerService, CampaignAiService],
  exports: [CampaignsService, CampaignSchedulerService],
})
export class CampaignsModule {}
