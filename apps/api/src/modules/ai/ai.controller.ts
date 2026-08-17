import {
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
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AiService, ChatAttachmentInput } from './ai.service';
import { CurrentUser } from '../../common/current-user.decorator';
import { resolveCorsOrigin } from '../../common/helpers';
import { IsString, IsOptional, MaxLength, MinLength, IsArray, IsIn, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AttachmentDto {
  @IsString() fileName: string;
  @IsString() mimeType: string;
  @IsOptional() sizeBytes?: number;
  @IsString() @IsOptional() textExtract?: string;
  @IsString() @IsOptional() previewUrl?: string;
  @IsString() @IsOptional() contentBase64?: string;
}

class ChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  message: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];
}

class RenameDto {
  @IsString() @MinLength(1) @MaxLength(120) title: string;
}

class PinDto {
  @IsBoolean() pinned: boolean;
}

class FeedbackDto {
  @IsString() messageId: string;
  @IsIn(['like', 'dislike']) rating: 'like' | 'dislike';
  @IsString() @IsOptional() @MaxLength(500) comment?: string;
}

class RegenerateDto {
  @IsString() conversationId: string;
  @IsString() messageId: string;
}

@Controller('assistant')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  @Get('conversations')
  listConversations(@CurrentUser() user: any) {
    return this.aiService.listConversations(user.activeTenantId, user.id);
  }

  @Get('conversations/:id')
  getConversation(@Param('id') id: string, @CurrentUser() user: any) {
    return this.aiService.getConversation(user.activeTenantId, user.id, id);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  createConversation(@Body() body: { title?: string }, @CurrentUser() user: any) {
    return this.aiService.createConversation(user.activeTenantId, user.id, body?.title);
  }

  @Patch('conversations/:id')
  rename(
    @Param('id') id: string,
    @Body() dto: RenameDto,
    @CurrentUser() user: any,
  ) {
    return this.aiService.renameConversation(user.activeTenantId, user.id, id, dto.title);
  }

  @Post('conversations/:id/pin')
  @HttpCode(HttpStatus.OK)
  pin(@Param('id') id: string, @Body() dto: PinDto, @CurrentUser() user: any) {
    return this.aiService.pinConversation(user.activeTenantId, user.id, id, dto.pinned);
  }

  @Delete('conversations/:id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.aiService.deleteConversation(user.activeTenantId, user.id, id);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() dto: ChatDto, @CurrentUser() user: any) {
    return this.aiService.chat(
      user.activeTenantId,
      user.id,
      dto.message,
      dto.conversationId,
      (dto.attachments || []) as ChatAttachmentInput[],
    );
  }

  @Post('chat/stream')
  @HttpCode(HttpStatus.OK)
  async chatStream(
    @Body() dto: ChatDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const requestId = randomUUID();
    const raw = reply.raw;
    const corsOrigin = resolveCorsOrigin(req.headers.origin as string | undefined);
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...(corsOrigin
        ? {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        : {}),
      Vary: 'Origin',
    });

    const write = (event: string, data: unknown) => {
      if (raw.writableEnded) return;
      raw.write(`event: ${event}\n`);
      raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const abort = new AbortController();
    raw.on('close', () => abort.abort());

    try {
      write('status', { thinking: true });
      const result = await this.aiService.streamChat(
        user.activeTenantId,
        user.id,
        dto.message,
        dto.conversationId,
        (dto.attachments || []) as ChatAttachmentInput[],
        {
          signal: abort.signal,
          onToken: (token) => write('token', { token }),
          onMeta: (meta) => write('meta', meta),
        },
      );
      write('done', result);
    } catch (err: any) {
      this.logError('POST /assistant/chat/stream', requestId, user, err);
      write('error', {
        requestId,
        message: 'Unable to generate a response. Please try again.',
      });
    } finally {
      if (!raw.writableEnded) raw.end();
    }
  }

  @Post('regenerate')
  @HttpCode(HttpStatus.OK)
  async regenerate(
    @Body() dto: RegenerateDto,
    @CurrentUser() user: any,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const requestId = randomUUID();
    const raw = reply.raw;
    const corsOrigin = resolveCorsOrigin(req.headers.origin as string | undefined);
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...(corsOrigin
        ? {
            'Access-Control-Allow-Origin': corsOrigin,
            'Access-Control-Allow-Credentials': 'true',
          }
        : {}),
      Vary: 'Origin',
    });
    const write = (event: string, data: unknown) => {
      if (raw.writableEnded) return;
      raw.write(`event: ${event}\n`);
      raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    const abort = new AbortController();
    raw.on('close', () => abort.abort());
    try {
      write('status', { thinking: true });
      const result = await this.aiService.regenerate(
        user.activeTenantId,
        user.id,
        dto.conversationId,
        dto.messageId,
        {
          signal: abort.signal,
          onToken: (token) => write('token', { token }),
          onMeta: (meta) => write('meta', meta),
        },
      );
      write('done', result);
    } catch (err: any) {
      this.logError('POST /assistant/regenerate', requestId, user, err);
      write('error', { requestId, message: 'Unable to regenerate. Please try again.' });
    } finally {
      if (!raw.writableEnded) raw.end();
    }
  }

  /**
   * Log AI request failures with request context for production debugging.
   * Never logs secrets (API keys are never in these objects).
   */
  private logError(route: string, requestId: string, user: any, err: any) {
    this.logger.error(
      JSON.stringify({
        requestId,
        route,
        tenantId: user?.activeTenantId ?? null,
        userId: user?.id ?? null,
        provider: err?.provider ?? null,
        model: err?.model ?? null,
        status: err?.status ?? err?.statusCode ?? null,
        code: err?.code ?? err?.name ?? null,
        message: err?.message ?? String(err),
        stack: err?.stack,
      }),
    );
  }

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  feedback(@Body() dto: FeedbackDto, @CurrentUser() user: any) {
    return this.aiService.submitFeedback(
      user.activeTenantId,
      user.id,
      dto.messageId,
      dto.rating,
      dto.comment,
    );
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('conversationId') conversationId: string | undefined,
    @CurrentUser() user: any,
  ) {
    if (!conversationId) throw new BadRequestException('conversationId is required');
    if (!q?.trim()) return [];
    return this.aiService.getConversation(user.activeTenantId, user.id, conversationId).then((conv) =>
      conv.messages
        .filter((m) => m.content.toLowerCase().includes(q.trim().toLowerCase()))
        .map((m) => ({ id: m.id, role: m.role, content: m.content.slice(0, 240), createdAt: m.createdAt })),
    );
  }
}
