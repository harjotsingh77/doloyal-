import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { StaffService } from './staff.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { Roles } from '../../common/roles.decorator';
import { Public } from '../auth/public.decorator';
import {
  ListStaffQuery,
  InviteMemberDto,
  UpdateStaffDto,
  SetTwoFactorDto,
  NoteDto,
  BulkActionDto,
  AcceptInvitationDto,
} from './staff.dto';

@Controller('staff')
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  private requestMeta(req: FastifyRequest) {
    const forwarded = req.headers['x-forwarded-for'] as string | undefined;
    const ip = forwarded?.split(',')[0].trim() || (req as any).ip || null;
    return { ip, userAgent: (req.headers['user-agent'] as string) || undefined };
  }

  @Get('stats')
  @Roles('OWNER', 'MANAGER')
  async stats(@CurrentUser() user: any) {
    return this.staff.getStats(user.activeTenantId);
  }

  @Get('members')
  @Roles('OWNER', 'MANAGER')
  async listMembers(
    @Query() query: ListStaffQuery,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.listMembers(user.activeTenantId, query, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Get('members/:id')
  @Roles('OWNER', 'MANAGER')
  async getMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.staff.getMemberDetail(user.activeTenantId, id, user);
  }

  @Patch('members/:id')
  @Roles('OWNER', 'MANAGER')
  async updateMember(
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.updateMember(user.activeTenantId, id, dto as any, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Patch('members/:id/role')
  @Roles('OWNER')
  async changeRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.changeRole(user.activeTenantId, id, role, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Patch('members/:id/permissions')
  @Roles('OWNER')
  async updatePermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.updatePermissions(user.activeTenantId, id, permissions || [], {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Patch('members/:id/status')
  @Roles('OWNER', 'MANAGER')
  async setStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.setStatus(user.activeTenantId, id, status, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Patch('members/:id/two-factor')
  @Roles('OWNER')
  async setTwoFactor(
    @Param('id') id: string,
    @Body() dto: SetTwoFactorDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.setTwoFactor(user.activeTenantId, id, dto.action, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Delete('members/:id')
  @Roles('OWNER')
  async removeMember(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.removeMember(user.activeTenantId, id, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Post('members/:id/photo')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async uploadPhoto(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { file: () => Promise<any> },
    @CurrentUser() user: any,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('No image uploaded');
    const buffer = await file.toBuffer();
    return this.staff.uploadPhoto(
      user.activeTenantId,
      id,
      buffer,
      file.mimetype || 'application/octet-stream',
      file.filename || 'photo.png',
      user,
    );
  }

  @Delete('members/:id/photo')
  @Roles('OWNER', 'MANAGER')
  async removePhoto(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.staff.removePhoto(user.activeTenantId, id, user);
  }

  @Post('members/:id/notes')
  @Roles('OWNER', 'MANAGER')
  async addNote(
    @Param('id') id: string,
    @Body() dto: NoteDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.addNote(user.activeTenantId, id, dto.body, dto.category, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Delete('members/:id/notes/:noteId')
  @Roles('OWNER', 'MANAGER')
  async deleteNote(
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: any,
  ) {
    return this.staff.deleteNote(user.activeTenantId, id, noteId, user);
  }

  // ─── Presence ────────────────────────────────────────────────────────────

  @Patch('presence')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF')
  async heartbeat(@CurrentUser() user: any) {
    return this.staff.heartbeat(user.activeTenantId, user.id);
  }

  @Post('presence/offline')
  @Roles('OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF')
  @HttpCode(HttpStatus.OK)
  async markOffline(@CurrentUser() user: any) {
    return this.staff.markOffline(user.activeTenantId, user.id);
  }

  // ─── Invitations ─────────────────────────────────────────────────────────

  @Get('invitations')
  @Roles('OWNER', 'MANAGER')
  async listInvitations(
    @Query() query: ListStaffQuery,
    @CurrentUser() user: any,
  ) {
    return this.staff.listInvitations(user.activeTenantId, {
      status: query.status,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Post('invitations')
  @Roles('OWNER', 'MANAGER')
  async invite(
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.inviteMember(user.activeTenantId, dto as any, {
      ...user,
      ...this.requestMeta(req),
    }, this.requestMeta(req).ip || undefined);
  }

  @Post('invitations/:id/resend')
  @Roles('OWNER', 'MANAGER')
  async resendInvitation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.resendInvitation(user.activeTenantId, id, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Post('invitations/:id/cancel')
  @Roles('OWNER', 'MANAGER')
  async cancelInvitation(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.cancelInvitation(user.activeTenantId, id, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  @Get('invitations/:id/link')
  @Roles('OWNER', 'MANAGER')
  async invitationLink(@Param('id') id: string, @CurrentUser() user: any) {
    return this.staff.getInvitationLink(user.activeTenantId, id);
  }

  @Get('invitations/by-token/:token')
  @Public()
  async invitationForAccept(@Param('token') token: string) {
    return this.staff.getInvitationForAccept(token);
  }

  @Post('invitations/by-token/:token/accept')
  @Public()
  @HttpCode(HttpStatus.OK)
  async acceptInvitation(
    @Param('token') token: string,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.staff.acceptInvitation(token, dto as any);
  }

  // ─── Bulk actions ────────────────────────────────────────────────────────

  @Post('bulk')
  @Roles('OWNER', 'MANAGER')
  @HttpCode(HttpStatus.OK)
  async bulkAction(
    @Body() dto: BulkActionDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
  ) {
    return this.staff.bulkAction(user.activeTenantId, dto as any, {
      ...user,
      ...this.requestMeta(req),
    });
  }

  // ─── Export ──────────────────────────────────────────────────────────────

  @Get('export')
  @Roles('OWNER', 'MANAGER')
  async export(
    @Res({ passthrough: true }) res: FastifyReply,
    @CurrentUser() user: any,
    @Query('format') format: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
  ) {
    const file = await this.staff.exportMembers(
      user.activeTenantId,
      { search, role, status, branchId, sortBy, sortDir } as any,
      format === 'xlsx' ? 'xlsx' : 'csv',
      { id: user.id, email: user.email, activeRole: user.activeRole },
    );
    res.header('Content-Type', file.mimeType);
    res.header(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    return new StreamableFile(file.buffer);
  }
}
