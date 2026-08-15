import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ReferralsModule } from '../referrals/referrals.module';
import { WorkflowsModule } from '../workflows/workflow.module';

@Module({
  imports: [ReferralsModule, WorkflowsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
