import { Module } from '@nestjs/common';
import { BookingLinksController } from './booking-links.controller';
import { BookingLinksService } from './booking-links.service';
import { BookingNotificationsService } from './booking-notifications.service';
import { BookingAnalyticsService } from './booking-analytics.service';
import { BookingOrchestratorService } from './booking-orchestrator.service';
import { AiSchedulingService } from './ai-scheduling.service';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [IntegrationsModule],
  controllers: [BookingLinksController],
  providers: [
    BookingLinksService,
    BookingNotificationsService,
    BookingAnalyticsService,
    BookingOrchestratorService,
    AiSchedulingService,
  ],
  exports: [
    BookingLinksService,
    BookingNotificationsService,
    BookingAnalyticsService,
    BookingOrchestratorService,
    AiSchedulingService,
  ],
})
export class BookingLinksModule {}
