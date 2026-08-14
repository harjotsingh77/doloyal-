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
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { FastifyRequest } from 'fastify';
import { WebsiteProjectsService } from './website-projects.service';
import { WebsiteProjectsRealtimeService } from './website-projects-realtime.service';

class UpdateProjectDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() websiteType?: string;
  @IsString() @IsOptional() goal?: string;
  @IsString() @IsOptional() liveUrl?: string;
}

class UpdateStatusDto {
  @IsString() @IsNotEmpty() status: string;
  @IsString() @IsOptional() note?: string;
}

class SendMessageDto {
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() attachmentUrl?: string;
  @IsString() @IsOptional() attachmentName?: string;
  @IsString() @IsOptional() attachmentMimeType?: string;
  @IsBoolean() @IsOptional() isLink?: boolean;
}

class AssignDto {
  @IsString() @IsOptional() adminId?: string;
}

class AddNoteDto {
  @IsString() @IsNotEmpty() note: string;
}

@Controller('admin/website-projects')
@UseGuards(AdminGuard)
export class AdminWebsiteProjectsController {
  constructor(
    private readonly projects: WebsiteProjectsService,
    private readonly realtime: WebsiteProjectsRealtimeService,
  ) {}

  @Sse('events')
  events(): Observable<MessageEvent> {
    return this.realtime.streamAdmin();
  }

  @Get()
  list(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.projects.adminListProjects({ status, search, page, pageSize });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.projects.adminGetProject(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projects.adminUpdateProject(id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: any,
  ) {
    return this.projects.adminUpdateStatus(user, id, dto);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  assign(
    @Param('id') id: string,
    @Body() dto: AssignDto,
    @CurrentUser() user: any,
  ) {
    return this.projects.adminAssign(user, id, dto.adminId);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string) {
    return this.projects.adminGetMessages(id);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    if (!dto.message?.trim()) throw new BadRequestException('message is required');
    return this.projects.adminSendMessage(user, id, dto);
  }

  @Get(':id/notes')
  notes(@Param('id') id: string) {
    return this.projects.adminListNotes(id);
  }

  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  addNote(@Param('id') id: string, @Body() dto: AddNoteDto, @CurrentUser() user: any) {
    return this.projects.adminAddNote(user, id, dto.note);
  }

  @Post(':id/upload')
  @HttpCode(HttpStatus.OK)
  async multipartUpload(
    @Param('id') id: string,
    @Query('category') category: string,
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
    return this.projects.adminUploadFile(user, id, {
      fileName: file.filename,
      url: dataUrl,
      category: category || 'CHAT_ATTACHMENT',
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
  }
}
