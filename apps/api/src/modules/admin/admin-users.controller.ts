import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminUsersService } from './admin-users.service';

@Controller('admin/users')
@UseGuards(AdminGuard)
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  @AdminPermission('users:view')
  list(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.users.list({ role, status, search, page, pageSize });
  }

  @Get(':id')
  @AdminPermission('users:view')
  detail(@Param('id') id: string) {
    return this.users.detail(id);
  }

  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('users:manage')
  suspend(
    @Param('id') id: string,
    @Body() dto: { suspended: boolean },
    @CurrentUser() user: any,
  ) {
    return this.users.suspend(user, id, dto.suspended !== false);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('users:manage')
  changeRole(
    @Param('id') id: string,
    @Body() dto: { role: string; tenantId?: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.role) throw new BadRequestException('role is required');
    if (!dto.tenantId) throw new BadRequestException('tenantId is required');
    return this.users.changeRole(user, id, dto.tenantId, dto.role);
  }
}