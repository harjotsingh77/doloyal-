import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardMetricsService } from './dashboard-metrics.service';
import { DashboardController } from './dashboard.controller';
@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardMetricsService],
  exports: [DashboardService],
})
export class DashboardModule {}
