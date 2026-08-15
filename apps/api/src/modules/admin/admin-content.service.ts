import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

@Injectable()
export class AdminContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // ─── Feedback & feature requests ──────────────────────────────────────────

  async listFeedback(query: {
    type?: string;
    status?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.type && query.type !== 'ALL') where.type = query.type;
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { description: { contains: query.search.trim(), mode: 'insensitive' as const } },
      ];
    }
    const [items0, total] = await Promise.all([
      this.prisma.feedbackRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: { select: { name: true } },
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.feedbackRequest.count({ where }),
    ]);
    const items = items0.map((f) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      description: f.description,
      category: f.category,
      status: f.status,
      votes: f.votes,
      businessName: f.tenant?.name ?? null,
      userName: f.user ? `${f.user.firstName ?? ''} ${f.user.lastName ?? ''}`.trim() || f.user.email : null,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async updateFeedbackStatus(actor: any, id: string, status: string) {
    const allowed = ['NEW', 'REVIEWING', 'PLANNED', 'IN_PROGRESS', 'RELEASED', 'REJECTED'];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    const item = await this.prisma.feedbackRequest.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Feedback not found');
    const updated = await this.prisma.feedbackRequest.update({
      where: { id },
      data: { status: status as any },
    });
    await this.audit.record(actor, 'feedback.statusUpdated', 'CONTENT', {
      targetType: 'feedback',
      targetId: id,
      targetName: updated.title,
      metadata: { from: item.status, to: status },
    });
    return { ok: true, status: updated.status };
  }

  // ─── Announcements ────────────────────────────────────────────────────────

  async listAnnouncements(query: { published?: string; page?: string; pageSize?: string }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.published && query.published !== 'ALL') where.published = query.published === 'true';
    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        type: a.type,
        audience: a.audience,
        selectedTenantIds: a.selectedTenantIds,
        publishDate: a.publishDate?.toISOString() ?? null,
        expiryDate: a.expiryDate?.toISOString() ?? null,
        published: a.published,
        createdByName: a.createdByName,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async createAnnouncement(actor: any, data: any) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required');
    if (!data.message?.trim()) throw new BadRequestException('Message is required');
    const item = await this.prisma.announcement.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        type: data.type ?? 'FEATURE',
        audience: data.audience ?? 'ALL',
        selectedTenantIds: data.selectedTenantIds ?? [],
        publishDate: data.publishDate ? new Date(data.publishDate) : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        published: data.published ?? false,
        createdById: actor?.id,
        createdByName: actor?.firstName ? `${actor.firstName} ${actor.lastName ?? ''}`.trim() : actor?.email,
      },
    });
    await this.audit.record(actor, 'announcement.created', 'CONTENT', {
      targetType: 'announcement',
      targetId: item.id,
      targetName: item.title,
    });
    return { ok: true, id: item.id };
  }

  async updateAnnouncement(actor: any, id: string, data: any) {
    const item = await this.prisma.announcement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Announcement not found');
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.message !== undefined) patch.message = data.message;
    if (data.type !== undefined) patch.type = data.type;
    if (data.audience !== undefined) patch.audience = data.audience;
    if (data.selectedTenantIds !== undefined) patch.selectedTenantIds = data.selectedTenantIds;
    if (data.publishDate !== undefined) patch.publishDate = data.publishDate ? new Date(data.publishDate) : null;
    if (data.expiryDate !== undefined) patch.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;
    if (data.published !== undefined) patch.published = data.published;
    const updated = await this.prisma.announcement.update({ where: { id }, data: patch });
    await this.audit.record(actor, 'announcement.updated', 'CONTENT', {
      targetType: 'announcement',
      targetId: id,
      targetName: updated.title,
    });
    return { ok: true, id };
  }

  async toggleAnnouncementPublished(actor: any, id: string, published: boolean) {
    const item = await this.prisma.announcement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.update({ where: { id }, data: { published } });
    await this.audit.record(actor, published ? 'announcement.published' : 'announcement.unpublished', 'CONTENT', {
      targetType: 'announcement',
      targetId: id,
      targetName: item.title,
    });
    return { ok: true, published };
  }

  async deleteAnnouncement(actor: any, id: string) {
    const item = await this.prisma.announcement.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Announcement not found');
    await this.prisma.announcement.delete({ where: { id } });
    await this.audit.record(actor, 'announcement.deleted', 'CONTENT', {
      targetType: 'announcement',
      targetId: id,
      targetName: item.title,
    });
    return { ok: true };
  }

  // ─── Help center ──────────────────────────────────────────────────────────

  async listArticles(query: { category?: string; published?: string; search?: string; page?: string; pageSize?: string }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.category && query.category !== 'ALL') where.category = query.category;
    if (query.published && query.published !== 'ALL') where.published = query.published === 'true';
    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { description: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { keywords: { has: query.search.trim() } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.supportArticle.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.supportArticle.count({ where }),
    ]);
    return {
      items: items.map((a) => ({
        id: a.id,
        slug: a.slug,
        title: a.title,
        description: a.description,
        category: a.category,
        keywords: a.keywords,
        faq: a.faq,
        published: a.published,
        sortOrder: a.sortOrder,
        views: 0,
        updatedAt: a.updatedAt.toISOString(),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getArticle(id: string) {
    const article = await this.prisma.supportArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    return article;
  }

  async createArticle(actor: any, data: any) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required');
    if (!data.content?.trim()) throw new BadRequestException('Content is required');
    const slug = data.slug?.trim() || data.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await this.prisma.supportArticle.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException('Slug already exists');
    const article = await this.prisma.supportArticle.create({
      data: {
        slug,
        title: data.title.trim(),
        description: data.description ?? null,
        content: data.content,
        category: data.category ?? 'Getting Started',
        keywords: data.keywords ?? [],
        faq: data.faq ?? false,
        published: data.published ?? false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
    await this.audit.record(actor, 'helpArticle.created', 'CONTENT', {
      targetType: 'help_article',
      targetId: article.id,
      targetName: article.title,
    });
    return { ok: true, id: article.id };
  }

  async updateArticle(actor: any, id: string, data: any) {
    const article = await this.prisma.supportArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.slug !== undefined) patch.slug = data.slug;
    if (data.description !== undefined) patch.description = data.description;
    if (data.content !== undefined) patch.content = data.content;
    if (data.category !== undefined) patch.category = data.category;
    if (data.keywords !== undefined) patch.keywords = data.keywords;
    if (data.faq !== undefined) patch.faq = data.faq;
    if (data.published !== undefined) patch.published = data.published;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    const updated = await this.prisma.supportArticle.update({ where: { id }, data: patch });
    await this.audit.record(actor, 'helpArticle.updated', 'CONTENT', {
      targetType: 'help_article',
      targetId: id,
      targetName: updated.title,
    });
    return { ok: true, id };
  }

  async deleteArticle(actor: any, id: string) {
    const article = await this.prisma.supportArticle.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');
    await this.prisma.supportArticle.delete({ where: { id } });
    await this.audit.record(actor, 'helpArticle.deleted', 'CONTENT', {
      targetType: 'help_article',
      targetId: id,
      targetName: article.title,
    });
    return { ok: true };
  }
}