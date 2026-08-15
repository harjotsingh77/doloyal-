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
  Req,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/current-user.decorator';
import { FastifyRequest } from 'fastify';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SupportService } from './support.service';
import { SupportRealtimeService } from './support-realtime.service';

class CreateTicketDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() category: string;
  @IsString() @IsOptional() priority?: string;
  @IsString() @IsNotEmpty() description: string;
}

class SendMessageDto {
  @IsString() @IsOptional() message?: string;
  @IsString() @IsOptional() attachmentUrl?: string;
  @IsString() @IsOptional() attachmentName?: string;
  @IsString() @IsOptional() attachmentMimeType?: string;
  @IsBoolean() @IsOptional() isLink?: boolean;
}

@Controller('support')
export class SupportController {
  constructor(
    private readonly support: SupportService,
    private readonly realtime: SupportRealtimeService,
  ) {}

  @Sse('events')
  events(@CurrentUser() user: any): Observable<MessageEvent> {
    return this.realtime.stream(user.activeTenantId);
  }

  // ─── help articles ───────────────────────────────────────────────────────

  @Get('articles')
  articles(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('faq') faq?: string,
    @Query('limit') limit?: string,
  ) {
    return this.support.listArticles({ search, category, faq, limit });
  }

  @Get('articles/:id')
  article(@Param('id') id: string) {
    return this.support.getArticle(id);
  }

  // ─── tickets ─────────────────────────────────────────────────────────────

  @Get('tickets')
  list(@CurrentUser() user: any) {
    return this.support.listTickets(user);
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    return this.support.createTicket(user, dto);
  }

  @Get('tickets/:id')
  get(@Param('id') id: string, @CurrentUser() user: any) {
    return this.support.getTicket(user, id);
  }

  @Get('tickets/:id/messages')
  messages(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('after') after?: string,
  ) {
    return this.support.getMessages(user, id, after);
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
    return this.support.sendMessage(user, id, dto);
  }

  @Post('tickets/:id/messages/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Param('id') id: string, @CurrentUser() user: any) {
    return this.support.markConversationRead(user, id);
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
    return this.support.uploadFile(user, id, {
      fileName: file.filename,
      url: dataUrl,
      mimeType: file.mimetype,
      sizeBytes: buffer.length,
    });
  }
}