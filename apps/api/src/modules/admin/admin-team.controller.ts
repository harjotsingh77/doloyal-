import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminTeamService } from './admin-team.service';

@Controller('admin/team')
@UseGuards(AdminGuard)
export class AdminTeamController {
  constructor(private readonly team: AdminTeamService) {}

  @Get()
  @AdminPermission('team:manage', 'settings:view')
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.team.list({ status, search, page, pageSize });
  }

  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  @AdminPermission('team:manage')
  invite(@Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) throw new BadRequestException('email is required');
    if (!dto.role) throw new BadRequestException('role is required');
    return this.team.invite(user, dto as any);
  }

  @Patch(':userId/role')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('team:manage')
  changeRole(@Param('userId') userId: string, @Body() dto: { role: string }, @CurrentUser() user: any) {
    if (!dto.role) throw new BadRequestException('role is required');
    return this.team.changeRole(user, userId, dto.role);
  }

  @Patch(':userId/status')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('team:manage')
  setStatus(@Param('userId') userId: string, @Body() dto: { status: 'ACTIVE' | 'SUSPENDED' }, @CurrentUser() user: any) {
    if (!dto.status || !['ACTIVE', 'SUSPENDED'].includes(dto.status)) {
      throw new BadRequestException('status must be ACTIVE or SUSPENDED');
    }
    return this.team.setStatus(user, userId, dto.status);
  }
}