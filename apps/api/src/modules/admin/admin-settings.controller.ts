import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminSettingsService } from './admin-settings.service';

@Controller('admin/settings')
@UseGuards(AdminGuard)
export class AdminSettingsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  @AdminPermission('settings:view')
  get() {
    return this.settings.getAll();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @AdminPermission('settings:manage')
  update(@Body() dto: Record<string, Record<string, unknown>>, @CurrentUser() user: any) {
    return this.settings.update(user, dto);
  }
}

@Controller('admin/feature-flags')
@UseGuards(AdminGuard)
export class AdminFeatureFlagsController {
  constructor(private readonly settings: AdminSettingsService) {}

  @Get()
  @AdminPermission('settings:view', 'engagement:view')
  overview() {
    return this.settings.featureFlagOverview();
  }

  @Get('tenant')
  @AdminPermission('settings:view', 'engagement:view')
  tenantFlags(@Query('tenantId') tenantId: string) {
    return this.settings.listTenantFeatureFlags(tenantId);
  }

  @Patch(':tenantId/:featureKey')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('settings:manage')
  setFlag(
    @Param('tenantId') tenantId: string,
    @Param('featureKey') featureKey: string,
    @Body() dto: { enabled: boolean },
    @CurrentUser() user: any,
  ) {
    return this.settings.setTenantFeatureFlag(user, tenantId, featureKey, dto.enabled === true);
  }
}
