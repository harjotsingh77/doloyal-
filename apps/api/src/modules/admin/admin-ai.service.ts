import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { dateRangeFor, fillDays, labelForDate, dayKey } from './admin-util';

@Injectable()
export class AdminAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview(range = '30d') {
    const { start, end } = dateRangeFor(range);
    const days = fillDays(start, end);

    const [usage, errors30d, conversations, generations, tenants] = await Promise.all([
      this.prisma.aiUsage.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.systemLog.count({
        where: { service: 'AI', severity: { in: ['ERROR', 'CRITICAL'] }, createdAt: { gte: start } },
      }),
      this.prisma.aiConversation.count({ where: { createdAt: { gte: start } } }),
      this.prisma.aIWebsiteGeneration.count({ where: { createdAt: { gte: start } } }),
      this.prisma.tenant.findMany({ select: { id: true, name: true } }),
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t.name]));
    const totalQueries = usage.length;

    // Estimate cost: gpt-4o-mini ≈ $0.15/M in + $0.60/M out; treat as INR.
    const costIn = (usage.reduce((s, u) => s + u.tokensIn, 0) / 1_000_000) * 0.15;
    const costOut = (usage.reduce((s, u) => s + u.tokensOut, 0) / 1_000_000) * 0.6;
    const costEstimate = Math.round((costIn + costOut) * 87 * 100) / 100;

    const byDay = new Map<string, number>();
    for (const u of usage) {
      const key = dayKey(new Date(u.createdAt));
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const aiRequestVolume = days.map((d) => ({
      date: d.toISOString(),
      label: labelForDate(d, range),
      newUsers: byDay.get(dayKey(d)) ?? 0,
      newBusinesses: 0,
      activeUsers: 0,
      activeBusinesses: 0,
    }));

    const byPlan: Record<string, { queries: number; tokens: number }> = {};
    const usageByTenant: Record<string, { business: string; queries: number; tokens: number }> = {};
    for (const u of usage) {
      const tenantName = tenantMap.get(u.tenantId) ?? 'Unknown';
      usageByTenant[u.tenantId] = usageByTenant[u.tenantId] ?? {
        business: tenantName,
        queries: 0,
        tokens: 0,
      };
      usageByTenant[u.tenantId].queries += 1;
      usageByTenant[u.tenantId].tokens += u.tokensIn + u.tokensOut;
    }
    // Usage by plan requires subscription lookup per tenant.
    const subs = await this.prisma.subscription.findMany();
    for (const s of subs) {
      const entry = usageByTenant[s.tenantId];
      if (!entry) continue;
      const p = byPlan[s.plan] ?? { queries: 0, tokens: 0 };
      p.queries += entry.queries;
      p.tokens += entry.tokens;
      byPlan[s.plan] = p;
    }

    return {
      aiQueries30d: totalQueries,
      assistantUsage30d: conversations,
      retentionAiUsage30d: usage.filter((u) => u.model?.toLowerCase().includes('retention')).length,
      websiteGenerationUsage30d: generations,
      aiErrors30d: errors30d,
      aiRequestVolume,
      usageByPlan: Object.entries(byPlan).map(([plan, v]) => ({ plan, queries: v.queries, tokens: v.tokens })),
      costEstimate,
      topBusinesses: Object.values(usageByTenant)
        .sort((a, b) => b.queries - a.queries)
        .slice(0, 10),
    };
  }
}