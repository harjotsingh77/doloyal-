import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
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

  @Get('errors')
  @AdminPermission('integrations:view')
  errors(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('businessId') businessId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.integrations.listErrors({ status, type, businessId, page, pageSize });
  }

  @Post('errors/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('integrations:view')
  resolve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.integrations.resolveError(user, id);
  }

  @Post('errors/:id/retry')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('integrations:view')
  retry(@Param('id') id: string, @CurrentUser() user: any) {
    return this.integrations.retryError(user, id);
  }

  @Get('webhooks')
  @AdminPermission('integrations:view')
  webhooks(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('businessId') businessId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.integrations.listWebhookEvents({ status, type, businessId, page, pageSize });
  }

  @Get('webhooks/:id')
  @AdminPermission('integrations:view')
  webhook(@Param('id') id: string) {
    return this.integrations.getWebhookEvent(id);
  }
}
