import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewStatus, ReviewType } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { logActivity } from '../../common/customer-commerce';
import { randomUUID } from 'crypto';
import {
  createSignedUpload,
  deleteObject,
  getObjectSize,
  storageBucketName,
} from '../../common/object-storage';
import {
  VIDEO_MAX_BYTES,
  IMAGE_MAX_BYTES,
  deleteReviewMedia,
  extForMime,
  isImageMime,
  isStoredMediaKey,
  isVideoMime,
  mimeFromKey,
  openMedia,
  saveReviewMedia,
} from './review-media';

const BODY_MAX = 4000;
const NAME_MAX = 120;
const THUMB_MAX = 400_000;

function digitsPhone(value: string): string {
  return value.replace(/\D/g, '');
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || fullName.trim() || 'Customer';
  const lastName = parts.slice(1).join(' ') || '-';
  return { firstName, lastName };
}

function isAllowedGoogleReviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'g.page' ||
      host.endsWith('.g.page') ||
      host === 'google.com' ||
      host.endsWith('.google.com') ||
      host === 'goo.gl' ||
      host.endsWith('.goo.gl') ||
      host === 'maps.app.goo.gl'
    );
  } catch {
    return false;
  }
}

export function resolveGoogleReviewUrl(tenant: {
  googleReviewUrl?: string | null;
  googlePlaceId?: string | null;
  socialLinks?: unknown;
}): string | null {
  const direct = tenant.googleReviewUrl?.trim();
  if (direct && isAllowedGoogleReviewUrl(direct)) return direct;
  const placeId = tenant.googlePlaceId?.trim();
  if (placeId) {
    return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
  }
  const social = (tenant.socialLinks && typeof tenant.socialLinks === 'object'
    ? (tenant.socialLinks as Record<string, unknown>).googleBusiness
    : null) as string | null | undefined;
  const gbp = social?.trim();
  if (gbp && isAllowedGoogleReviewUrl(gbp)) return gbp;
  return null;
}

type ReviewRow = {
  id: string;
  tenantId: string;
  customerId: string | null;
  source: string;
  type: ReviewType;
  status: ReviewStatus;
  rating: number;
  body: string;
  authorName: string;
  authorAvatarUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  rejectionReason: string | null;
  publishedAt: Date;
  approvedAt: Date | null;
  rejectedAt: Date | null;
  createdAt: Date;
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
};

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveTenantFromSlug(slug: string) {
    const bookingLink = await this.prisma.bookingLink.findUnique({
      where: { slug },
      include: { tenant: true },
    });
    if (bookingLink?.tenant) return bookingLink.tenant;
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) throw new NotFoundException('Business not found');
    return tenant;
  }

  private approvedWhere(tenantId: string): Prisma.ReviewWhereInput {
    return { tenantId, status: 'APPROVED' };
  }

  mapReview(row: ReviewRow, opts?: { public?: boolean; slug?: string }) {
    const customerName = row.customer
      ? `${row.customer.firstName} ${row.customer.lastName}`.trim()
      : row.authorName;
    const hasVideo = Boolean(row.videoUrl);
    const mediaPath = opts?.public && opts.slug
      ? `/public/reviews/${encodeURIComponent(opts.slug)}/media/${row.id}`
      : `/reviews/${row.id}/media`;
    const thumbPath = row.thumbnailUrl
      ? isStoredMediaKey(row.thumbnailUrl)
        ? `${mediaPath}?kind=thumb`
        : row.thumbnailUrl
      : null;

    const base = {
      id: row.id,
      tenantId: row.tenantId,
      customerId: row.customerId,
      type: row.type === 'VIDEO' ? 'VIDEO' : 'TEXT',
      rating: row.rating,
      body: row.body,
      authorName: customerName || row.authorName,
      authorAvatarUrl: row.customer?.avatarUrl || row.authorAvatarUrl,
      hasVideo,
      mediaUrl: hasVideo ? mediaPath : null,
      thumbnailUrl: thumbPath,
      publishedAt: (row.approvedAt || row.publishedAt).toISOString(),
      createdAt: row.createdAt.toISOString(),
    };

    if (opts?.public) {
      return { ...base, status: 'APPROVED' as const };
    }

    return {
      ...base,
      status: row.status,
      rejectionReason: row.rejectionReason,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
    };
  }

  async summary(tenantId: string) {
    type SumRow = {
      approved_count: number;
      avg_rating: number | null;
      total: number;
      pending: number;
      rejected: number;
      video: number;
      approved_video: number;
      r1: number;
      r2: number;
      r3: number;
      r4: number;
      r5: number;
    };
    const [row] = await this.prisma.$queryRaw<SumRow[]>`
      SELECT
        COUNT(*) FILTER (WHERE status = 'APPROVED')::int AS approved_count,
        AVG(rating) FILTER (WHERE status = 'APPROVED')::float8 AS avg_rating,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected,
        COUNT(*) FILTER (WHERE type = 'VIDEO')::int AS video,
        COUNT(*) FILTER (WHERE type = 'VIDEO' AND status = 'APPROVED')::int AS approved_video,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND rating = 1)::int AS r1,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND rating = 2)::int AS r2,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND rating = 3)::int AS r3,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND rating = 4)::int AS r4,
        COUNT(*) FILTER (WHERE status = 'APPROVED' AND rating = 5)::int AS r5
      FROM "Review"
      WHERE "tenantId" = ${tenantId}
    `;

    const approvedCount = Number(row?.approved_count || 0);
    const total = Number(row?.total || 0);
    const video = Number(row?.video || 0);
    return {
      averageRating: approvedCount
        ? Math.round((Number(row?.avg_rating || 0)) * 10) / 10
        : 0,
      approvedCount,
      totalReviews: total,
      pendingCount: Number(row?.pending || 0),
      rejectedCount: Number(row?.rejected || 0),
      videoCount: video,
      approvedVideoCount: Number(row?.approved_video || 0),
      textCount: total - video,
      breakdown: {
        1: Number(row?.r1 || 0),
        2: Number(row?.r2 || 0),
        3: Number(row?.r3 || 0),
        4: Number(row?.r4 || 0),
        5: Number(row?.r5 || 0),
      },
    };
  }

  async list(
    tenantId: string,
    query: {
      search?: string;
      filter?: 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'TEXT' | 'VIDEO';
      rating?: number;
      customerId?: string;
      limit?: number;
      cursor?: string;
    },
  ) {
    const limit = Math.min(Math.max(query.limit || 30, 1), 100);
    const where: Prisma.ReviewWhereInput = { tenantId };
    if (query.filter === 'PENDING' || query.filter === 'APPROVED' || query.filter === 'REJECTED') {
      where.status = query.filter;
    }
    if (query.filter === 'TEXT' || query.filter === 'VIDEO') {
      where.type = query.filter;
    }
    if (query.rating && query.rating >= 1 && query.rating <= 5) {
      where.rating = query.rating;
    }
    if (query.customerId) where.customerId = query.customerId;
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { authorName: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const items = await this.prisma.review.findMany({
      where,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page.map((row) => this.mapReview(row)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
      hasMore,
    };
  }

  async publicPage(slug: string) {
    const tenant = await this.resolveTenantFromSlug(slug);
    const stats = await this.summary(tenant.id);
    const reviews = await this.prisma.review.findMany({
      where: this.approvedWhere(tenant.id),
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: [{ approvedAt: 'desc' }, { publishedAt: 'desc' }],
      take: 60,
    });
    return {
      businessName: tenant.name,
      logoUrl: tenant.logoUrl,
      brandColor: tenant.brandColor || '#2563EB',
      averageRating: stats.averageRating,
      totalReviews: stats.approvedCount,
      videoCount: stats.approvedVideoCount,
      breakdown: stats.breakdown,
      reviews: reviews.map((row) => this.mapReview(row, { public: true, slug })),
    };
  }

  async lookupCustomer(slug: string, phone: string, name?: string) {
    const tenant = await this.resolveTenantFromSlug(slug);
    const digits = digitsPhone(phone);
    if (digits.length < 7) return { customer: null as null };

    const last = digits.slice(-10);
    const candidates = await this.prisma.customer.findMany({
      where: { tenantId: tenant.id, phone: { contains: last } },
      select: { id: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
      take: 25,
    });
    const match = candidates.find((c) => digitsPhone(c.phone) === digits)
      || (name?.trim()
        ? candidates.find(
            (c) => `${c.firstName} ${c.lastName}`.trim().toLowerCase() === name.trim().toLowerCase(),
          )
        : undefined);

    if (!match) return { customer: null as null };
    return {
      customer: {
        id: match.id,
        name: `${match.firstName} ${match.lastName}`.trim(),
        avatarUrl: match.avatarUrl,
      },
    };
  }

  private async findOrCreateCustomer(
    tenantId: string,
    name: string,
    phone?: string,
    email?: string,
  ) {
    const { firstName, lastName } = splitName(name);
    const digits = phone ? digitsPhone(phone) : '';
    const emailNorm = email?.trim().toLowerCase() || null;

    if (digits.length >= 7 || emailNorm) {
      const last = digits.slice(-10);
      const existing = await this.prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            ...(digits.length >= 7 ? [{ phone: { contains: last } }] : []),
            ...(emailNorm ? [{ email: { equals: emailNorm, mode: 'insensitive' as const } }] : []),
          ],
        },
        select: { id: true, phone: true, email: true, firstName: true, lastName: true, avatarUrl: true },
        take: 25,
      });
      let customer = digits.length >= 7
        ? existing.find((c) => digitsPhone(c.phone) === digits) ?? null
        : null;
      if (!customer && emailNorm) {
        customer = existing.find((c) => c.email?.toLowerCase() === emailNorm) ?? null;
      }
      if (customer) return customer;
    }

    return this.prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone: phone?.trim() || `review-${Date.now()}`,
        email: emailNorm,
        notes: 'Created from a Client Page review',
        tags: ['review'],
      },
      select: { id: true, phone: true, email: true, firstName: true, lastName: true, avatarUrl: true },
    });
  }

  private validateSubmission(dto: {
    name: string;
    rating: number;
    body?: string;
    type?: 'TEXT' | 'VIDEO';
    hasVideo?: boolean;
  }) {
    const name = dto.name?.trim() || '';
    const body = dto.body?.trim() || '';
    const rating = Number(dto.rating);
    const type = dto.type === 'VIDEO' || dto.hasVideo ? 'VIDEO' : 'TEXT';

    if (name.length < 2 || name.length > NAME_MAX) {
      throw new BadRequestException('Enter your name.');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Choose a rating from 1 to 5 stars.');
    }
    if (type === 'TEXT' && (body.length < 8 || body.length > BODY_MAX)) {
      throw new BadRequestException('Write a review of at least 8 characters.');
    }
    if (type === 'VIDEO' && body.length > BODY_MAX) {
      throw new BadRequestException('Caption is too long.');
    }
    if (type === 'VIDEO' && !dto.hasVideo) {
      throw new BadRequestException('Upload a short video to continue.');
    }
    return { name, body, rating, type: type as ReviewType };
  }

  async submitPublic(
    slug: string,
    dto: {
      name: string;
      phone?: string;
      email?: string;
      rating: number;
      body?: string;
      type?: 'TEXT' | 'VIDEO';
      honeypot?: string;
      authorAvatarUrl?: string;
      thumbnailUrl?: string;
      videoStorageKey?: string;
      videoMime?: string;
    },
    files?: { video?: { buffer: Buffer; mime: string; filename: string }; avatar?: { buffer: Buffer; mime: string; filename: string } },
  ) {
    if (dto.honeypot) throw new BadRequestException('Invalid request');

    const parsed = this.validateSubmission({
      name: dto.name,
      rating: dto.rating,
      body: dto.body,
      type: dto.type,
      hasVideo: Boolean(files?.video || dto.videoStorageKey),
    });

    const tenant = await this.resolveTenantFromSlug(slug);
    const customer = dto.phone?.trim() || dto.email?.trim()
      ? await this.findOrCreateCustomer(tenant.id, parsed.name, dto.phone, dto.email)
      : null;

    let videoUrl: string | null = null;
    let thumbnailUrl = dto.thumbnailUrl?.trim() || null;
    if (thumbnailUrl && thumbnailUrl.length > THUMB_MAX) thumbnailUrl = null;
    if (thumbnailUrl && !thumbnailUrl.startsWith('data:image/')) thumbnailUrl = null;

    let authorAvatarUrl = dto.authorAvatarUrl?.trim() || null;
    if (authorAvatarUrl && !authorAvatarUrl.startsWith('data:image/')) authorAvatarUrl = null;

    if (files?.video) {
      if (!isVideoMime(files.video.mime)) {
        throw new BadRequestException('Upload an MP4 or WebM video.');
      }
      if (files.video.buffer.length > VIDEO_MAX_BYTES) {
        throw new BadRequestException('Video must be under 40MB.');
      }
      const saved = await saveReviewMedia({
        tenantId: tenant.id,
        buffer: files.video.buffer,
        mime: files.video.mime,
        filename: files.video.filename,
      });
      videoUrl = saved.key;
    } else if (dto.videoStorageKey) {
      videoUrl = await this.validateStoredVideo(
        tenant.id,
        dto.videoStorageKey,
        dto.videoMime || '',
      );
    }

    if (files?.avatar) {
      if (!isImageMime(files.avatar.mime)) {
        throw new BadRequestException('Avatar must be a PNG, JPEG, or WebP image.');
      }
      if (files.avatar.buffer.length > IMAGE_MAX_BYTES) {
        throw new BadRequestException('Avatar must be under 2MB.');
      }
      authorAvatarUrl = `data:${files.avatar.mime};base64,${files.avatar.buffer.toString('base64')}`;
    }

    const created = await this.prisma.review.create({
      data: {
        tenantId: tenant.id,
        customerId: customer?.id ?? null,
        source: 'DOLOYAL',
        type: parsed.type,
        status: 'PENDING',
        rating: parsed.rating,
        body: parsed.body,
        authorName: parsed.name,
        authorAvatarUrl,
        videoUrl,
        thumbnailUrl,
        publishedAt: new Date(),
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await logActivity(this.prisma, {
      tenantId: tenant.id,
      customerId: customer?.id ?? null,
      type: 'NOTE_ADDED',
      message: `${parsed.name} submitted a ${parsed.rating}-star review (pending approval)`,
    });

    return {
      message: 'Thank you! Your review has been submitted and is waiting for approval.',
      review: this.mapReview(created),
    };
  }

  async createVideoUpload(
    tenantId: string,
    input: { mime: string; filename: string; size: number },
  ) {
    const mime = (input.mime || '').toLowerCase();
    if (!isVideoMime(mime)) {
      throw new BadRequestException('Upload an MP4 or WebM video.');
    }
    if (!Number.isFinite(input.size) || input.size < 1 || input.size > VIDEO_MAX_BYTES) {
      throw new BadRequestException('Video must be under 40MB.');
    }
    const key = `reviews/${tenantId}/${randomUUID()}${extForMime(mime, input.filename)}`;
    const signed = await createSignedUpload(key);
    return { ...signed, key, bucket: storageBucketName() };
  }

  async createPublicVideoUpload(
    slug: string,
    input: { mime: string; filename: string; size: number },
  ) {
    const tenant = await this.resolveTenantFromSlug(slug);
    return this.createVideoUpload(tenant.id, input);
  }

  private async validateStoredVideo(
    tenantId: string,
    key: string,
    mime: string,
  ): Promise<string> {
    if (!key.startsWith(`reviews/${tenantId}/`) || !isVideoMime(mime)) {
      throw new BadRequestException('Invalid review video upload.');
    }
    const size = await getObjectSize(key);
    if (size === null || size < 1 || size > VIDEO_MAX_BYTES) {
      await deleteObject(key);
      throw new BadRequestException('Uploaded video is missing or exceeds 40MB.');
    }
    return key;
  }

  async createOwner(
    tenantId: string,
    userId: string,
    dto: {
      name: string;
      rating: number;
      body?: string;
      type?: 'TEXT' | 'VIDEO';
      status?: 'PENDING' | 'APPROVED';
      authorAvatarUrl?: string;
      thumbnailUrl?: string;
      customerId?: string;
      videoStorageKey?: string;
      videoMime?: string;
    },
    files?: { video?: { buffer: Buffer; mime: string; filename: string } },
  ) {
    const parsed = this.validateSubmission({
      name: dto.name,
      rating: dto.rating,
      body: dto.body,
      type: dto.type,
      hasVideo: Boolean(files?.video || dto.videoStorageKey) || dto.type === 'VIDEO',
    });
    if (parsed.type === 'VIDEO' && !files?.video && !dto.videoStorageKey) {
      throw new BadRequestException('Upload a short video to continue.');
    }

    let videoUrl: string | null = null;
    if (files?.video) {
      if (!isVideoMime(files.video.mime)) {
        throw new BadRequestException('Upload an MP4 or WebM video.');
      }
      if (files.video.buffer.length > VIDEO_MAX_BYTES) {
        throw new BadRequestException('Video must be under 40MB.');
      }
      const saved = await saveReviewMedia({
        tenantId,
        buffer: files.video.buffer,
        mime: files.video.mime,
        filename: files.video.filename,
      });
      videoUrl = saved.key;
    } else if (dto.videoStorageKey) {
      videoUrl = await this.validateStoredVideo(
        tenantId,
        dto.videoStorageKey,
        dto.videoMime || '',
      );
    }

    const status: ReviewStatus = dto.status === 'PENDING' ? 'PENDING' : 'APPROVED';
    const now = new Date();
    const created = await this.prisma.review.create({
      data: {
        tenantId,
        customerId: dto.customerId || null,
        source: 'DOLOYAL',
        type: parsed.type,
        status,
        rating: parsed.rating,
        body: parsed.body,
        authorName: parsed.name,
        authorAvatarUrl: dto.authorAvatarUrl?.startsWith('data:image/') ? dto.authorAvatarUrl : null,
        videoUrl,
        thumbnailUrl: dto.thumbnailUrl?.startsWith('data:image/') ? dto.thumbnailUrl : dto.thumbnailUrl || null,
        publishedAt: now,
        approvedAt: status === 'APPROVED' ? now : null,
        approvedBy: status === 'APPROVED' ? userId : null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    return this.mapReview(created);
  }

  private async getOwned(tenantId: string, id: string) {
    const row = await this.prisma.review.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    if (!row) throw new NotFoundException('Review not found');
    return row;
  }

  async approve(tenantId: string, id: string, userId: string) {
    const row = await this.getOwned(tenantId, id);
    const updated = await this.prisma.review.update({
      where: { id: row.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: userId,
        rejectedAt: null,
        rejectionReason: null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    await this.awardReviewBonus(tenantId, updated.customerId);
    await logActivity(this.prisma, {
      tenantId,
      customerId: updated.customerId,
      type: 'NOTE_ADDED',
      message: `Review from ${updated.authorName} approved (${updated.rating} stars)`,
    });
    return this.mapReview(updated);
  }

  private async awardReviewBonus(tenantId: string, customerId: string | null) {
    if (!customerId) return;
    const config = await this.prisma.loyaltyConfig.findUnique({ where: { tenantId } });
    const settings = (config?.settings && typeof config.settings === 'object'
      ? (config.settings as Record<string, unknown>)
      : {}) as Record<string, unknown>;
    const bonus = Number(settings.reviewBonus ?? 50);
    if (!Number.isFinite(bonus) || bonus <= 0) return;
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true, firstName: true, lastName: true, pointsBalance: true },
    });
    if (!customer) return;
    const reason = 'Review approval bonus';
    const already = await this.prisma.pointsLedger.findFirst({
      where: { tenantId, customerId, reason },
    });
    if (already) return;
    const newBalance = customer.pointsBalance + bonus;
    await this.prisma.pointsLedger.create({
      data: { tenantId, customerId, amount: bonus, balanceAfter: newBalance, reason },
    });
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { pointsBalance: newBalance },
    });
    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId,
        type: 'POINTS_EARNED',
        message: `${customer.firstName} ${customer.lastName} earned ${bonus} points — ${reason}`,
      },
    });
  }

  async reject(tenantId: string, id: string, reason?: string) {
    const row = await this.getOwned(tenantId, id);
    const updated = await this.prisma.review.update({
      where: { id: row.id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason?.trim() || null,
        approvedAt: null,
        approvedBy: null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    await logActivity(this.prisma, {
      tenantId,
      customerId: updated.customerId,
      type: 'NOTE_ADDED',
      message: `Review from ${updated.authorName} rejected`,
    });
    return this.mapReview(updated);
  }

  async unpublish(tenantId: string, id: string) {
    const row = await this.getOwned(tenantId, id);
    if (row.status !== 'APPROVED') {
      throw new BadRequestException('Only approved reviews can be unpublished.');
    }
    const updated = await this.prisma.review.update({
      where: { id: row.id },
      data: {
        status: 'PENDING',
        approvedAt: null,
        approvedBy: null,
      },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
    return this.mapReview(updated);
  }

  async remove(tenantId: string, id: string) {
    const row = await this.getOwned(tenantId, id);
    if (row.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected reviews can be deleted.');
    }
    await deleteReviewMedia(row.videoUrl);
    if (row.thumbnailUrl && isStoredMediaKey(row.thumbnailUrl)) {
      await deleteReviewMedia(row.thumbnailUrl);
    }
    await this.prisma.review.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async getOne(tenantId: string, id: string) {
    return this.mapReview(await this.getOwned(tenantId, id));
  }

  async openMedia(opts: {
    reviewId: string;
    tenantId?: string;
    slug?: string;
    kind?: 'video' | 'thumb';
    publicOnly?: boolean;
  }) {
    const where: Prisma.ReviewWhereInput = { id: opts.reviewId };
    if (opts.tenantId) where.tenantId = opts.tenantId;
    if (opts.publicOnly) where.status = 'APPROVED';
    if (opts.slug) {
      const tenant = await this.resolveTenantFromSlug(opts.slug);
      where.tenantId = tenant.id;
    }
    const row = await this.prisma.review.findFirst({ where });
    if (!row) throw new NotFoundException('Review not found');
    if (opts.publicOnly && row.status !== 'APPROVED') {
      throw new NotFoundException('Review not found');
    }

    if (opts.kind === 'thumb') {
      if (!row.thumbnailUrl) throw new NotFoundException('Thumbnail not found');
      if (!isStoredMediaKey(row.thumbnailUrl)) {
        throw new BadRequestException('Thumbnail is inline');
      }
      const media = await openMedia(row.thumbnailUrl);
      if (!media) throw new NotFoundException('Thumbnail not found');
      return { ...media, mime: mimeFromKey(row.thumbnailUrl, 'image/jpeg') };
    }

    if (!row.videoUrl || !isStoredMediaKey(row.videoUrl)) {
      throw new NotFoundException('Video not found');
    }
    const media = await openMedia(row.videoUrl);
    if (!media) throw new NotFoundException('Video not found');
    return { ...media, mime: mimeFromKey(row.videoUrl, 'video/mp4') };
  }

  async averageForTenant(tenantId: string): Promise<number | null> {
    const agg = await this.prisma.review.aggregate({
      where: this.approvedWhere(tenantId),
      _avg: { rating: true },
      _count: { _all: true },
    });
    if (!agg._count._all) return null;
    return Math.round((agg._avg.rating || 0) * 10) / 10;
  }
}
