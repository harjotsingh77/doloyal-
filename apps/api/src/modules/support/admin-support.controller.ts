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
  Req,
  Sse,
  MessageEvent,
  UseGuards,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/current-user.decorator';
import { AdminGuard } from '../../common/admin.guard';
import { FastifyRequest } from 'fastify';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SupportService } from './support.service';
import { SupportRealtimeService } from './support-realtime.service';
import { adminAiAssistLimiter } from './support-rate-limit';

class UpdateTicketDto {
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() priority?: string;
}

class UpdateStatusDto {
  @IsString() @IsNotEmpty() status: string;
  @IsString() @IsOptional() note?: string;
}

class AssignDto {
  @IsString() @IsOptional() adminId?: string;
}

class SendMessageDto {
  @IsString() @IsOptional() message?: string;
  @IsString() @IsOptional() attachmentUrl?: string;
  @IsString() @IsOptional() attachmentName?: string;
  @IsString() @IsOptional() attachmentMimeType?: string;
  @IsBoolean() @IsOptional() isLink?: boolean;
}

class AddNoteDto {
  @IsString() @IsNotEmpty() note: string;
}

@Controller('admin/support')
@UseGuards(AdminGuard)
export class AdminSupportController {
  constructor(
    private readonly support: SupportService,
    private readonly realtime: SupportRealtimeService,
  ) {}

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.realtime.streamAdmin();
  }

  @Get('stats')
  stats() {
    return this.support.adminGetStats();
  }

  @Get('analytics')
  analytics() {
    return this.support.adminGetAnalytics();
  }

  @Get('conversations/:id')
  conversation(@Param('id') id: string) {
    return this.support.adminGetConversation(id);
  }

  @Get('agents')
  agents() {
    return this.support.adminListAgents();
  }

  @Post('tickets/:id/ai-assist')
  @HttpCode(HttpStatus.OK)
  aiAssist(@Param('id') id: string, @CurrentUser() user: any) {
    if (!adminAiAssistLimiter.allow(`ai-assist:${user.id}`)) {
      throw new BadRequestException('Too many AI assist requests. Please try again in a moment.');
    }
    return this.support.adminAiAssist(user, id);
  }

  @Get('tickets')
  list(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('assignedAgent') assignedAgent?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.support.adminListTickets({
      status,
      priority,
      category,
      assignedAgent,
      search,
      page,
      pageSize,
    });
  }

  @Get('tickets/:id')
  get(@Param('id') id: string) {
    return this.support.adminGetTicket(id);
  }

  @Patch('tickets/:id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto, @CurrentUser() user: any) {
    return this.support.adminUpdateTicket(user, id, dto);
  }

  @Patch('tickets/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.support.adminUpdateStatus(user, id, dto);
  }

  @Post('tickets/:id/assign')
  @HttpCode(HttpStatus.OK)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: any,
  ) {
    return this.support.adminAssign(user, id, dto.adminId);
  }

  @Get('tickets/:id/messages')
  messages(@Param('id') id: string) {
    return this.support.adminGetMessages(id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    if (!dto.message?.trim() && !dto.attachmentUrl) {
      throw new BadRequestException('message or attachment is required');
    }
    return this.support.adminSendMessage(user, id, dto);
  }

  @Post('tickets/:id/messages/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string) {
    return this.support.adminMarkRead(id);
  }

  @Get('tickets/:id/notes')
  notes(@Param('id') id: string) {
    return this.support.adminListNotes(id);
  }

  @Post('tickets/:id/notes')
  @HttpCode(HttpStatus.CREATED)
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @CurrentUser() user: any) {
    return this.support.adminAddNote(user, id, dto.note);
  }

  @Post('tickets/:id/upload')
  @HttpCode(HttpStatus.OK)
  async multipartUpload(
    @Param('id') id: string,
    @Req() req: FastifyRequest & { file: () => Promise<any> },
    @CurrentUser() user: any,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file uploaded');
    const buffer = await file.toBuffer();
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('File must be under 5MB');
    }
    const dataUrl = `data:${file.mimetype};base64,${buffer.toString('base64')}`;
    return this.support.adminUploadFile(user, id, {
      fileName: file.filename,
      url: dataUrl,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
  }
}