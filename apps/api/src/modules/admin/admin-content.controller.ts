import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { AdminContentService } from './admin-content.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminContentController {
  constructor(private readonly content: AdminContentService) {}

  // ─── Feedback ─────────────────────────────────────────────────────────────

  @Get('feedback')
  @AdminPermission('content:view', 'audit:view')
  feedback(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.content.listFeedback({ type, status, search, page, pageSize });
  }

  @Patch('feedback/:id/status')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  feedbackStatus(
    @Param('id') id: string,
    @Body() dto: { status: string },
    @CurrentUser() user: any,
  ) {
    if (!dto.status) throw new BadRequestException('status is required');
    return this.content.updateFeedbackStatus(user, id, dto.status);
  }

  // ─── Announcements ────────────────────────────────────────────────────────

  @Get('announcements')
  @AdminPermission('content:view')
  announcements(@Query('published') published?: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.content.listAnnouncements({ published, page, pageSize });
  }

  @Post('announcements')
  @HttpCode(HttpStatus.CREATED)
  @AdminPermission('content:manage')
  createAnnouncement(@Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.content.createAnnouncement(user, dto);
  }

  @Patch('announcements/:id')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  updateAnnouncement(@Param('id') id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.content.updateAnnouncement(user, id, dto);
  }

  @Patch('announcements/:id/publish')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  publishAnnouncement(@Param('id') id: string, @Body() dto: { published: boolean }, @CurrentUser() user: any) {
    return this.content.toggleAnnouncementPublished(user, id, dto.published === true);
  }

  @Delete('announcements/:id')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  deleteAnnouncement(@Param('id') id: string, @CurrentUser() user: any) {
    return this.content.deleteAnnouncement(user, id);
  }

  // ─── Help center ──────────────────────────────────────────────────────────

  @Get('help/articles')
  @AdminPermission('content:view')
  articles(
    @Query('category') category?: string,
    @Query('published') published?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.content.listArticles({ category, published, search, page, pageSize });
  }

  @Get('help/articles/:id')
  @AdminPermission('content:view')
  article(@Param('id') id: string) {
    return this.content.getArticle(id);
  }

  @Post('help/articles')
  @HttpCode(HttpStatus.CREATED)
  @AdminPermission('content:manage')
  createArticle(@Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.content.createArticle(user, dto);
  }

  @Patch('help/articles/:id')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  updateArticle(@Param('id') id: string, @Body() dto: Record<string, unknown>, @CurrentUser() user: any) {
    return this.content.updateArticle(user, id, dto);
  }

  @Delete('help/articles/:id')
  @HttpCode(HttpStatus.OK)
  @AdminPermission('content:manage')
  deleteArticle(@Param('id') id: string, @CurrentUser() user: any) {
    return this.content.deleteArticle(user, id);
  }
}