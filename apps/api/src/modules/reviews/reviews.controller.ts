import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { CurrentUser } from '../../common/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { RateLimit } from '../../common/rate-limit.guard';
import { ReviewsService } from './reviews.service';

class ListReviewsQuery {
  @IsString()
  @IsOptional()
  search?: string;

  @IsIn(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'TEXT', 'VIDEO'])
  @IsOptional()
  filter?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'TEXT' | 'VIDEO';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  customerId?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  cursor?: string;
}

class SubmitReviewDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(40)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  body?: string;

  @IsIn(['TEXT', 'VIDEO'])
  @IsOptional()
  type?: 'TEXT' | 'VIDEO';

  @IsString()
  @IsOptional()
  honeypot?: string;

  @IsString()
  @IsOptional()
  authorAvatarUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}

class CreateReviewDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  body?: string;

  @IsIn(['TEXT', 'VIDEO'])
  @IsOptional()
  type?: 'TEXT' | 'VIDEO';

  @IsIn(['PENDING', 'APPROVED'])
  @IsOptional()
  status?: 'PENDING' | 'APPROVED';

  @IsString()
  @IsOptional()
  authorAvatarUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}

class RejectReviewDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

class LookupQuery {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class MediaQuery {
  @IsIn(['video', 'thumb'])
  @IsOptional()
  kind?: 'video' | 'thumb';
}

type UploadedPart = { buffer: Buffer; mime: string; filename: string };

async function readMultipart(
  req: FastifyRequest & { parts?: () => AsyncIterable<any>; file?: () => Promise<any> },
): Promise<{ fields: Record<string, string>; video?: UploadedPart; avatar?: UploadedPart }> {
  const fields: Record<string, string> = {};
  let video: UploadedPart | undefined;
  let avatar: UploadedPart | undefined;

  if (typeof req.parts === 'function') {
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        const file = { buffer, mime: part.mimetype, filename: part.filename || 'upload' };
        const field = String(part.fieldname || 'file');
        if (field === 'avatar' || field === 'photo') avatar = file;
        else video = file;
      } else if (part.value != null) {
        fields[String(part.fieldname)] = String(part.value);
      }
    }
    return { fields, video, avatar };
  }

  const file = await req.file?.();
  if (!file) throw new BadRequestException('No file uploaded');
  video = { buffer: await file.toBuffer(), mime: file.mimetype, filename: file.filename || 'upload' };
  const extra = (file.fields || {}) as Record<string, { value?: unknown } | undefined>;
  for (const [key, val] of Object.entries(extra)) {
    if (val && typeof val === 'object' && 'value' in val && val.value != null) {
      fields[key] = String(val.value);
    }
  }
  return { fields, video, avatar };
}

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('reviews/summary')
  summary(@CurrentUser() user: { activeTenantId: string }) {
    return this.reviews.summary(user.activeTenantId);
  }

  @Get('reviews')
  list(@CurrentUser() user: { activeTenantId: string }, @Query() query: ListReviewsQuery) {
    return this.reviews.list(user.activeTenantId, query);
  }

  @Post('reviews')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: string; activeTenantId: string },
    @Body() body: CreateReviewDto,
  ) {
    return this.reviews.createOwner(user.activeTenantId, user.id, body);
  }

  @Post('reviews/video')
  @HttpCode(HttpStatus.CREATED)
  async createVideo(
    @CurrentUser() user: { id: string; activeTenantId: string },
    @Req() req: FastifyRequest & { parts?: () => AsyncIterable<any>; file?: () => Promise<any> },
  ) {
    const parsed = await readMultipart(req);
    return this.reviews.createOwner(
      user.activeTenantId,
      user.id,
      {
        name: parsed.fields.name,
        rating: Number(parsed.fields.rating),
        body: parsed.fields.body,
        type: 'VIDEO',
        status: parsed.fields.status === 'PENDING' ? 'PENDING' : 'APPROVED',
        authorAvatarUrl: parsed.fields.authorAvatarUrl,
        thumbnailUrl: parsed.fields.thumbnailUrl,
        customerId: parsed.fields.customerId,
      },
      { video: parsed.video },
    );
  }

  @Get('reviews/:id')
  getOne(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.reviews.getOne(user.activeTenantId, id);
  }

  @Post('reviews/:id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@CurrentUser() user: { id: string; activeTenantId: string }, @Param('id') id: string) {
    return this.reviews.approve(user.activeTenantId, id, user.id);
  }

  @Post('reviews/:id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Body() dto: RejectReviewDto,
  ) {
    return this.reviews.reject(user.activeTenantId, id, dto.reason);
  }

  @Post('reviews/:id/unpublish')
  @HttpCode(HttpStatus.OK)
  unpublish(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.reviews.unpublish(user.activeTenantId, id);
  }

  @Delete('reviews/:id')
  remove(@CurrentUser() user: { activeTenantId: string }, @Param('id') id: string) {
    return this.reviews.remove(user.activeTenantId, id);
  }

  @Get('reviews/:id/media')
  async ownerMedia(
    @CurrentUser() user: { activeTenantId: string },
    @Param('id') id: string,
    @Query() query: MediaQuery,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const media = await this.reviews.openMedia({
      reviewId: id,
      tenantId: user.activeTenantId,
      kind: query.kind || 'video',
    });
    return this.sendMedia(reply, media, 'private, max-age=3600');
  }

  @Public()
  @Get('public/reviews/:slug')
  publicPage(@Param('slug') slug: string) {
    return this.reviews.publicPage(slug);
  }

  @Public()
  @RateLimit(30, 60)
  @Get('public/reviews/:slug/lookup')
  lookup(@Param('slug') slug: string, @Query() query: LookupQuery) {
    return this.reviews.lookupCustomer(slug, query.phone, query.name);
  }

  @Public()
  @Get('public/reviews/:slug/media/:id')
  async publicMedia(
    @Param('slug') slug: string,
    @Param('id') id: string,
    @Query() query: MediaQuery,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const media = await this.reviews.openMedia({
      reviewId: id,
      slug,
      kind: query.kind || 'video',
      publicOnly: true,
    });
    return this.sendMedia(reply, media, 'public, max-age=3600');
  }

  /**
   * Review media comes back as a stream from local disk and as a buffer from
   * remote object storage, so both shapes have to be handled here.
   */
  private sendMedia(
    reply: FastifyReply,
    media: { mime: string; stream?: NodeJS.ReadableStream; buffer?: Buffer },
    cacheControl: string,
  ) {
    reply.header('Content-Type', media.mime);
    reply.header('Cache-Control', cacheControl);
    if (media.buffer) return new StreamableFile(media.buffer);
    if (media.stream) return new StreamableFile(media.stream as any);
    throw new NotFoundException('Media not found');
  }

  @Public()
  @RateLimit(8, 3600)
  @Post('public/reviews/:slug')
  @HttpCode(HttpStatus.CREATED)
  submit(@Param('slug') slug: string, @Body() dto: SubmitReviewDto) {
    return this.reviews.submitPublic(slug, { ...dto, type: dto.type || 'TEXT' });
  }

  @Public()
  @RateLimit(8, 3600)
  @Post('public/reviews/:slug/video')
  @HttpCode(HttpStatus.CREATED)
  async submitVideo(
    @Param('slug') slug: string,
    @Req() req: FastifyRequest & { parts?: () => AsyncIterable<any>; file?: () => Promise<any> },
  ) {
    const parsed = await readMultipart(req);
    return this.reviews.submitPublic(
      slug,
      {
        name: parsed.fields.name,
        phone: parsed.fields.phone,
        email: parsed.fields.email,
        rating: Number(parsed.fields.rating),
        body: parsed.fields.body,
        type: 'VIDEO',
        honeypot: parsed.fields.honeypot,
        authorAvatarUrl: parsed.fields.authorAvatarUrl,
        thumbnailUrl: parsed.fields.thumbnailUrl,
      },
      { video: parsed.video, avatar: parsed.avatar },
    );
  }
}
