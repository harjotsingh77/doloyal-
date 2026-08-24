import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { CustomersModule } from '../customers/customers.module';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { BookingLinksModule } from '../booking-links/booking-links.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { ReferralsModule } from '../referrals/referrals.module';
import { RewardsModule } from '../rewards/rewards.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { BranchesModule } from '../branches/branches.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { WorkflowsModule } from '../workflows/workflow.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    CustomersModule,
    CampaignsModule,
    BookingLinksModule,
    AppointmentsModule,
    ReferralsModule,
    RewardsModule,
    MembershipsModule,
    BranchesModule,
    InvoicesModule,
    WorkflowsModule,
    LoyaltyModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
