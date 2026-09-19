import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma.module';
import { SupabaseModule } from './common/supabase.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './common/health.module';
import { MockAuthGuard } from './common/mock-auth.guard';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { RateLimitGuard } from './common/rate-limit.guard';
import { TenantContextGuard } from './common/tenant-context.guard';
import { RolesGuard } from './common/roles.guard';
import { StaffOnlyGuard } from './common/staff-only.guard';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { StaffModule } from './modules/staff/staff.module';
import { BranchesModule } from './modules/branches/branches.module';
import { CustomersModule } from './modules/customers/customers.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AiModule } from './modules/ai/ai.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BookingLinksModule } from './modules/booking-links/booking-links.module';
import { WebsitesModule } from './modules/websites/websites.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { WebsiteConnectionsModule } from './modules/website-connections/website-connections.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { WebsiteProjectsModule } from './modules/website-projects/website-projects.module';
import { SupportModule } from './modules/support/support.module';
import { AdminModule } from './modules/admin/admin.module';
import { WorkflowsModule } from './modules/workflows/workflow.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InternalCronModule } from './modules/internal-cron/internal-cron.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    SupabaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    StaffModule,
    BranchesModule,
    CustomersModule,
    FeatureFlagsModule,
    LoyaltyModule,
    RewardsModule,
    ReferralsModule,
    MembershipsModule,
    DashboardModule,
    AiModule,
    AppointmentsModule,
    InvoicesModule,
    BookingLinksModule,
    WebsitesModule,
    IntegrationsModule,
    WebsiteConnectionsModule,
    WebsiteProjectsModule,
    SupportModule,
    AdminModule,
    WorkflowsModule,
    CampaignsModule,
    CheckoutModule,
    ReviewsModule,
    ProductsModule,
    OrdersModule,
    InternalCronModule,
  ],
  providers: [
    Reflector,
    { provide: APP_GUARD, useClass: MockAuthGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: StaffOnlyGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
