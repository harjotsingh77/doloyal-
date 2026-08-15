import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

@Injectable()
export class AdminWebsitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async builderOverview() {
    const [websites, generations] = await Promise.all([
      this.prisma.website.findMany({
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.aIWebsiteGeneration.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { website: { select: { name: true, tenant: { select: { name: true } } } } },
      }),
    ]);

    const byStatus = { DRAFT: 0, GENERATING: 0, PUBLISHED: 0, ARCHIVED: 0 };
    for (const w of websites) {
      byStatus[w.status] = (byStatus[w.status] ?? 0) + 1;
    }
    const failed = generations.filter((g) => g.status === 'FAILED').length;

    return {
      totalProjects: websites.length,
      generated: websites.filter((w) => w.draftVersion > 0 || w.liveVersion > 0).length,
      draft: byStatus.DRAFT + byStatus.GENERATING,
      published: byStatus.PUBLISHED,
      failed,
      history: generations.map((g) => ({
        id: g.id,
        name: g.website.name,
        businessName: g.website.tenant?.name ?? 'Unknown',
        status: g.status,
        model: g.model,
        createdAt: g.createdAt.toISOString(),
        completedAt: g.completedAt?.toISOString() ?? null,
      })),
    };
  }

  async listConnections(query: {
    status?: string;
    search?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const search = query.search?.trim() || undefined;
    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (search) {
      where.OR = [
        { websiteName: { contains: search, mode: 'insensitive' as const } },
        { websiteUrl: { contains: search, mode: 'insensitive' as const } },
        { tenant: { name: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [items0, total] = await Promise.all([
      this.prisma.connectedWebsite.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.connectedWebsite.count({ where }),
    ]);

    const items = await Promise.all(
      items0.map(async (c) => {
        const [events30d, errors30d, lastError] = await Promise.all([
          this.prisma.connectionLog.count({
            where: { connectedWebsiteId: c.id, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
          }),
          this.prisma.connectionLog.count({
            where: { connectedWebsiteId: c.id, level: 'ERROR', createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
          }),
          this.prisma.connectionLog.findFirst({
            where: { connectedWebsiteId: c.id, level: 'ERROR' },
            orderBy: { createdAt: 'desc' },
          }),
        ]);
        return {
          id: c.id,
          businessName: c.tenant.name,
          websiteName: c.name,
          domain: c.websiteUrl,
          framework: c.framework,
          status: c.status,
          lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
          events30d,
          errors30d,
          lastError: lastError?.message ?? null,
        };
      }),
    );

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }
}