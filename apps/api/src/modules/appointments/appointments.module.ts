import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentReminderService } from './appointment-reminder.service';
import { ReferralsModule } from '../referrals/referrals.module';
import { WorkflowsModule } from '../workflows/workflow.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { BookingLinksModule } from '../booking-links/booking-links.module';

@Module({
  imports: [ReferralsModule, WorkflowsModule, IntegrationsModule, BookingLinksModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentReminderService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}