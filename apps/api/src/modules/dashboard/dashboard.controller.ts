import { Controller, Get, Param, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { PrismaService } from '../../common/prisma.service';
import { principalTenantState } from '../../common/auth-principal';

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly dashboardMetricsService: DashboardMetricsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * When the active business was created (onboarded). Dashboards only count
   * data from that day on. Authentication already read it; the lookup is a
   * fallback for mock/dev auth.
   */
  private async onboardedAt(user: any): Promise<Date | null> {
    const known = principalTenantState(user);
    if (known?.createdAt) return known.createdAt;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.activeTenantId },
      select: { createdAt: true },
    });
    return tenant?.createdAt ?? null;
  }

  @Get('overview')
  async getOverview(
    @CurrentUser() user: any,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardService.getOverview(
      user.activeTenantId,
      { days, from, to },
      await this.onboardedAt(user),
    );
  }

  @Get('metrics/:metric')
  async getMetricDetail(
    @CurrentUser() user: any,
    @Param('metric') metric: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.dashboardMetricsService.getMetricDetail(
      user.activeTenantId,
      metric,
      from,
      to,
      await this.onboardedAt(user),
    );
  }
}
