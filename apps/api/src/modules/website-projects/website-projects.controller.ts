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
  Req,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/current-user.decorator';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FastifyRequest } from 'fastify';
import { WebsiteProjectsService } from './website-projects.service';
import { WebsiteProjectsRealtimeService } from './website-projects-realtime.service';

class RequirementDto {
  @IsString() @IsOptional() businessName?: string;
  @IsString() @IsOptional() businessType?: string;
  @IsString() @IsOptional() businessLocation?: string;
  @IsString() @IsOptional() businessPhone?: string;
  @IsString() @IsOptional() businessEmail?: string;
  @IsString() @IsOptional() existingWebsiteUrl?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() websiteTypes?: string[];
  @IsArray() @IsString({ each: true }) @IsOptional() designStyle?: string[];
  @IsString() @IsOptional() designPreference?: string;
  @IsString() @IsOptional() referenceUrl?: string;
  @IsBoolean() @IsOptional() hasLogo?: boolean;
  @IsString() @IsOptional() logoUrl?: string;
  @IsString() @IsOptional() pageCount?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() requiredFeatures?: string[];
  @IsString() @IsOptional() additionalRequirements?: string;
}

class CreateProjectDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() websiteType: string;
  @IsString() @IsOptional() goal?: string;
  @IsObject() @IsOptional() @ValidateNested() @Type(() => RequirementDto)
  requirements?: RequirementDto;
}

class UpdateProjectDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() websiteType?: string;
  @IsString() @IsOptional() goal?: string;
  @IsObject() @IsOptional() @ValidateNested() @Type(() => RequirementDto)
  requirements?: RequirementDto;
}

class SendMessageDto {
  @IsString() @IsNotEmpty() message: string;
  @IsString() @IsOptional() attachmentUrl?: string;
  @IsString() @IsOptional() attachmentName?: string;
  @IsString() @IsOptional() attachmentMimeType?: string;
  @IsBoolean() @IsOptional() isLink?: boolean;
}

class UploadFileDto {
  @IsString() @IsNotEmpty() fileName: string;
  @IsString() @IsNotEmpty() url: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() mimeType?: string;
  @IsInt() @IsOptional() sizeBytes?: number;
}

@Controller('website-projects')
export class WebsiteProjectsController {
  constructor(
    private readonly projects: WebsiteProjectsService,
    private readonly realtime: WebsiteProjectsRealtimeService,
  ) {}

  @Sse('events')
  events(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.realtime.stream(user.activeTenantId);
  }

  @Get()
  list(@CurrentUser() user: any) {
    return this.projects.listProjects(user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projects.createProject(user, dto);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projects.getProject(user, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto, @CurrentUser() user: any) {
    return this.projects.updateProject(user, id, dto);
  }

  @Get(':id/status-history')
  statusHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projects.getStatusHistory(user, id);
  }

  @Get(':id/messages')
  messages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('after') after?: string,
  ) {
    return this.projects.getMessages(user, id, after);
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.CREATED)
  sendMessage(
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    if (!dto.message?.trim()) throw new BadRequestException('message is required');
    return this.projects.sendMessage(user, id, dto);
  }

  @Post(':id/messages/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projects.markConversationRead(user, id);
  }

  @Post(':id/files')
  @HttpCode(HttpStatus.CREATED)
  uploadFile(
    @Param('id') id: string,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: any,
  ) {
    if (!dto.url?.trim()) throw new BadRequestException('url is required');
    return this.projects.uploadFile(user, id, dto);
  }

  @Delete(':id/files/:fileId')
  deleteFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: any,
  ) {
    return this.projects.deleteFile(user, id, fileId);
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
    return this.projects.uploadFile(user, id, {
      fileName: file.filename,
      url: dataUrl,
      category: category || 'CHAT_ATTACHMENT',
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
  }
}
