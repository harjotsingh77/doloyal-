import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard, AdminPermission } from '../../common/admin.guard';
import { AdminCommService } from './admin-comm.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminCommController {
  constructor(private readonly comm: AdminCommService) {}

  @Get('notifications')
  @AdminPermission('dashboard:view')
  notifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.comm.listNotifications(user, { unreadOnly, limit });
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('dashboard:view')
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.comm.markNotificationRead(user, id);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('dashboard:view')
  markAllRead(@CurrentUser() user: any) {
    return this.comm.markAllNotificationsRead(user);
  }

  @Get('search')
  @AdminPermission('dashboard:view')
  search(@Query('q') q?: string) {
    if (!q?.trim()) throw new BadRequestException('q is required');
    return this.comm.search(q);
  }

  @Post('impersonate')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('impersonate')
  impersonate(@Body() dto: { tenantId: string }, @CurrentUser() user: any) {
    if (!dto.tenantId) throw new BadRequestException('tenantId is required');
    return this.comm.impersonate(user, dto.tenantId);
  }

  @Get('exports/:entity')
  @AdminPermission('audit:view', 'businesses:view')
  export(@Param('entity') entity: string, @CurrentUser() user: any) {
    return this.comm.exportCsv(user, entity);
  }
}