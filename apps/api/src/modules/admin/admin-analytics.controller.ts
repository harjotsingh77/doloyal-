import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminAnalyticsService } from './admin-analytics.service';

@Controller('admin/analytics')
@UseGuards(AdminGuard)
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('overview')
  @AdminPermission('analytics:view', 'dashboard:view')
  overview(@Query('range') range?: string) {
    return this.analytics.overview(range);
  }
}