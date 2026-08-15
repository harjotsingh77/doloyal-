import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminOpsService } from './admin-ops.service';

@Controller('admin/ops')
@UseGuards(AdminGuard)
export class AdminOpsController {
  constructor(private readonly ops: AdminOpsService) {}

  @Get('health')
  @AdminPermission('ops:view', 'dashboard:view')
  health() {
    return this.ops.systemHealth();
  }

  @Get('logs')
  @AdminPermission('ops:view')
  logs(
    @Query('severity') severity?: string,
    @Query('service') service?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.listLogs({ severity, service, date, page, pageSize });
  }

  @Get('security')
  @AdminPermission('security:view')
  security(
    @Query('type') type?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.securityEvents({ type, severity, page, pageSize });
  }

  @Get('sessions')
  @AdminPermission('security:view')
  sessions() {
    return this.ops.adminSessions();
  }

  @Post('sessions/:userId/terminate')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('security:manage')
  terminate(@Param('userId') userId: string, @CurrentUser() user: any) {
    return this.ops.terminateSession(user, userId);
  }

  @Get('audit-logs')
  @AdminPermission('audit:view', 'security:view')
  auditLogs(
    @Query('category') category?: string,
    @Query('action') action?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.ops.auditLogs({ category, action, search, page, pageSize });
  }
}