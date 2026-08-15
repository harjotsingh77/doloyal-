import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminWebsitesService } from './admin-websites.service';

@Controller('admin/websites')
@UseGuards(AdminGuard)
export class AdminWebsitesController {
  constructor(private readonly websites: AdminWebsitesService) {}

  @Get('builder/overview')
  @AdminPermission('websites:view')
  builderOverview() {
    return this.websites.builderOverview();
  }

  @Get('connections')
  @AdminPermission('websites:view')
  connections(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.websites.listConnections({ status, search, page, pageSize });
  }
}