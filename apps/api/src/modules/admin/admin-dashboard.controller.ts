import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('overview')
  @AdminPermission('dashboard:view')
  overview(@Query('range') range?: string) {
    return this.dashboard.overview(range);
  }
}