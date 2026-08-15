import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { ReferralsRealtimeService } from './referrals-realtime.service';
import { ReferralsJobsService } from './referrals-jobs.service';

@Module({
  controllers: [ReferralsController],
  providers: [
    ReferralsService,
    ReferralsRealtimeService,
    ReferralsJobsService,
  ],
  exports: [ReferralsService, ReferralsRealtimeService],
})
export class ReferralsModule {}
