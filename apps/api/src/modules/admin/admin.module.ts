import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditService } from '../../common/admin-audit.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminBusinessesService } from './admin-businesses.service';
import { AdminBusinessesController } from './admin-businesses.controller';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminBillingService } from './admin-billing.service';
import { AdminBillingController } from './admin-billing.controller';
import { AdminEngagementService } from './admin-engagement.service';
import { AdminEngagementController } from './admin-engagement.controller';
import { AdminAiService } from './admin-ai.service';
import { AdminAiController } from './admin-ai.controller';
import { AdminWebsitesService } from './admin-websites.service';
import { AdminWebsitesController } from './admin-websites.controller';
import { AdminIntegrationsService } from './admin-integrations.service';
import { AdminIntegrationsController } from './admin-integrations.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminContentService } from './admin-content.service';
import { AdminContentController } from './admin-content.controller';
import { AdminOpsService } from './admin-ops.service';
import { AdminOpsController } from './admin-ops.controller';
import { AdminTeamService } from './admin-team.service';
import { AdminTeamController } from './admin-team.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminCommService } from './admin-comm.service';
import { AdminCommController } from './admin-comm.controller';

@Module({
  imports: [AuthModule],
  providers: [
    AdminAuditService,
    AdminDashboardService,
    AdminBusinessesService,
    AdminUsersService,
    AdminBillingService,
    AdminEngagementService,
    AdminAiService,
    AdminWebsitesService,
    AdminIntegrationsService,
    AdminAnalyticsService,
    AdminContentService,
    AdminOpsService,
    AdminTeamService,
    AdminSettingsService,
    AdminCommService,
  ],
  controllers: [
    AdminDashboardController,
    AdminBusinessesController,
    AdminUsersController,
    AdminBillingController,
    AdminEngagementController,
    AdminAiController,
    AdminWebsitesController,
    AdminIntegrationsController,
    AdminAnalyticsController,
    AdminContentController,
    AdminOpsController,
    AdminTeamController,
    AdminSettingsController,
    AdminCommController,
  ],
})
export class AdminModule {}
