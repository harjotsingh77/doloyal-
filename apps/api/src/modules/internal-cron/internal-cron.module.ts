import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { WorkflowsModule } from '../workflows/workflow.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { InternalCronController } from './internal-cron.controller';

@Module({
  imports: [
    CampaignsModule,
    WorkflowsModule,
    ReferralsModule,
    AppointmentsModule,
  ],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
