import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { CurrentUser } from '../../common/current-user.decorator';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardMetricsService: DashboardMetricsService,
  ) {}

  @Get('overview')
  async getOverview(
    @CurrentUser() user: any,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getOverview(user.activeTenantId, { days, from, to });
  }

  @Get('metrics/:metric')
  async getMetricDetail(
    @CurrentUser() user: any,
    @Param('metric') metric: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardMetricsService.getMetricDetail(user.activeTenantId, metric, from, to);
  }
}
