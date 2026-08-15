import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminIntegrationsService } from './admin-integrations.service';

@Controller('admin/integrations')
@UseGuards(AdminGuard)
export class AdminIntegrationsController {
  constructor(private readonly integrations: AdminIntegrationsService) {}

  @Get('overview')
  @AdminPermission('integrations:view')
  overview() {
    return this.integrations.overview();
  }
}