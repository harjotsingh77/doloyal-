import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards } from '@nestjs/common';
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