import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { ReferralsRealtimeService } from './referrals-realtime.service';

const APP_BASE =
  process.env.PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://doloyal.ai';

function genCode(len = 8) {
  return randomBytes(12)
    .toString('base64url')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, len);
}

function detectSource(referrerUrl?: string, utmSource?: string, channel?: string) {
  if (channel) return channel.toLowerCase();
  const s = (utmSource || referrerUrl || '').toLowerCase();
  if (s.includes('whatsapp') || s.includes('wa.me')) return 'whatsapp';
  if (s.includes('instagram')) return 'instagram';
  if (s.includes('facebook') || s.includes('fb.') || s.includes('messenger')) return 'facebook';
  if (s.includes('messenger')) return 'messenger';
  if (s.includes('telegram') || s.includes('t.me')) return 'telegram';
  if (s.includes('qr')) return 'qr';
  if (s.includes('mail') || s.includes('email')) return 'email';
  if (s.includes('sms') || s.includes('twilio')) return 'sms';
  if (s.includes('google')) return 'google';
  if (!s) return 'direct';
  return 'unknown';
}

function detectDeviceType(ua = '') {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'desktop';
}

function parseRange(range?: string, from?: string, to?: string) {
  const end = to ? new Date(to) : new Date();
  let start: Date;
  if (from) start = new Date(from);
  else {
    const days =
      range === 'today' ? 0 : range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30;
    start = new Date(end);
    start.setDate(start.getDate() - days);
    if (days === 0) start.setHours(0, 0, 0, 0);
  }
  return { start, end };
}

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional()
    @Inject(forwardRef(() => ReferralsRealtimeService))
    private readonly realtime?: ReferralsRealtimeService,
  ) {}

  private linkUrl(code: string) {
    return `${APP_BASE.replace(/\/$/, '')}/r/${code}`;
  }

  private async emit(
    tenantId: string,
    type: string,
    opts: {
      campaignId?: string;
      linkId?: string;
      conversionId?: string;
      customerId?: string;
      metadata?: unknown;
      ipAddress?: string;
    } = {},
  ) {
    await this.prisma.referralEvent.create({
      data: {
        tenantId,
        type,
        campaignId: opts.campaignId,
        linkId: opts.linkId,
        conversionId: opts.conversionId,
        customerId: opts.customerId,
        metadata: (opts.metadata as any) ?? undefined,
        ipAddress: opts.ipAddress,
      },
    });
    this.realtime?.publish(tenantId, type, {
      campaignId: opts.campaignId,
      linkId: opts.linkId,
      conversionId: opts.conversionId,
      customerId: opts.customerId,
      ...(typeof opts.metadata === 'object' && opts.metadata ? (opts.metadata as object) : {}),
    });
  }

  // ─── Overview / Analytics ──────────────────────────────────────────────────

  async getOverview(tenantId: string, range = '30d', from?: string, to?: string) {
    const { start, end } = parseRange(range, from, to);
    const dateFilter = { gte: start, lte: end };

    const [
      links,
      shares,
      clicks,
      visits,
      conversions,
      pending,
      rewards,
      revenueAgg,
      topReferrer,
    ] = await Promise.all([
      this.prisma.referralLink.count({ where: { tenantId, deletedAt: null, createdAt: dateFilter } }),
      this.prisma.referralShare.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.referralVisit.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.referralVisit.count({
        where: { tenantId, createdAt: dateFilter, isUnique: true },
      }),
      this.prisma.referralConversion.count({
        where: {
          tenantId,
          status: { in: ['CONVERTED', 'REWARD_SENT'] },
          convertedAt: dateFilter,
        },
      }),
      this.prisma.referralConversion.count({
        where: {
          tenantId,
          status: { in: ['PENDING', 'VISITED', 'SIGNED_UP', 'BOOKED'] },
        },
      }),
      this.prisma.referralRewardRecord.count({
        where: { tenantId, createdAt: dateFilter },
      }),
      this.prisma.referralConversion.aggregate({
        where: {
          tenantId,
          status: { in: ['CONVERTED', 'REWARD_SENT'] },
          convertedAt: dateFilter,
        },
        _sum: { orderValue: true, bookingValue: true },
      }),
      this.prisma.referralConversion.groupBy({
        by: ['referrerId'],
        where: {
          tenantId,
          referrerId: { not: null },
          status: { in: ['CONVERTED', 'REWARD_SENT'] },
        },
        _count: { _all: true },
        _sum: { orderValue: true, bookingValue: true },
        orderBy: { _count: { referrerId: 'desc' } },
        take: 1,
      }),
    ]);

    const revenue =
      (revenueAgg._sum.orderValue || 0) + (revenueAgg._sum.bookingValue || 0);
    const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

    let topReferrerName = '—';
    if (topReferrer[0]?.referrerId) {
      const c = await this.prisma.customer.findUnique({
        where: { id: topReferrer[0].referrerId },
      });
      topReferrerName = c ? `${c.firstName} ${c.lastName}` : '—';
    }

    return {
      referralRevenue: revenue,
      totalLinks: links,
      totalShares: shares,
      totalClicks: clicks,
      landingVisits: visits,
      successfulReferrals: conversions,
      pendingReferrals: pending,
      rewardsGiven: rewards,
      conversionRate: Math.round(conversionRate * 10) / 10,
      topReferrer: topReferrerName,
      range: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  async getAnalytics(tenantId: string, range = '30d', from?: string, to?: string) {
    const { start, end } = parseRange(range, from, to);
    const conversions = await this.prisma.referralConversion.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: {
        createdAt: true,
        status: true,
        orderValue: true,
        bookingValue: true,
        convertedAt: true,
      },
    });
    const visits = await this.prisma.referralVisit.findMany({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      select: { createdAt: true, source: true, isUnique: true },
    });

    const dailyMap = new Map<string, number>();
    const monthlyMap = new Map<string, number>();
    const revenueDaily = new Map<string, number>();
    const conversionsDaily = new Map<string, number>();
    const clicksDaily = new Map<string, number>();
    const visitsDaily = new Map<string, number>();

    for (const c of conversions) {
      const d = c.createdAt.toISOString().slice(0, 10);
      const m = d.slice(0, 7);
      if (['SIGNED_UP', 'BOOKED', 'CONVERTED', 'REWARD_SENT'].includes(c.status)) {
        dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
        monthlyMap.set(m, (monthlyMap.get(m) || 0) + 1);
      }
      if (c.status === 'CONVERTED' || c.status === 'REWARD_SENT') {
        conversionsDaily.set(d, (conversionsDaily.get(d) || 0) + 1);
        revenueDaily.set(
          d,
          (revenueDaily.get(d) || 0) + (c.orderValue || 0) + (c.bookingValue || 0),
        );
      }
    }

    for (const v of visits) {
      const d = v.createdAt.toISOString().slice(0, 10);
      clicksDaily.set(d, (clicksDaily.get(d) || 0) + 1);
      if (v.isUnique) {
        visitsDaily.set(d, (visitsDaily.get(d) || 0) + 1);
      }
    }

    const sourceMap = new Map<string, number>();
    for (const v of visits) {
      sourceMap.set(v.source, (sourceMap.get(v.source) || 0) + 1);
    }

    const campaigns = await this.prisma.referralCampaign.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { conversionCount: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        conversionCount: true,
        clickCount: true,
        revenueTotal: true,
        status: true,
      },
    });

    const days: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalClicks = [...clicksDaily.values()].reduce((a, b) => a + b, 0);
    const totalVisits = [...visitsDaily.values()].reduce((a, b) => a + b, 0);
    const totalConversions = [...conversionsDaily.values()].reduce((a, b) => a + b, 0);
    const totalRevenue = [...revenueDaily.values()].reduce((a, b) => a + b, 0);
    const totalReferrals = [...dailyMap.values()].reduce((a, b) => a + b, 0);
    const rewardCostAgg = await this.prisma.referralRewardRecord.aggregate({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const rewardCost = rewardCostAgg._sum.amount || 0;
    const topLink = await this.prisma.referralLink.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: [{ shareCount: 'desc' }, { clickCount: 'desc' }],
      select: { code: true, name: true, shareCount: true, revenue: true },
    });
    const topRevenueLink = await this.prisma.referralLink.findFirst({
      where: { tenantId, deletedAt: null },
      orderBy: { revenue: 'desc' },
      select: { code: true, name: true, revenue: true },
    });

    return {
      series: days.map((d) => ({
        date: d,
        referrals: dailyMap.get(d) || 0,
        conversions: conversionsDaily.get(d) || 0,
        revenue: revenueDaily.get(d) || 0,
        clicks: clicksDaily.get(d) || 0,
        visits: visitsDaily.get(d) || 0,
      })),
      // Alias used by older UI clients
      timeseries: days.map((d) => ({
        date: d,
        referrals: dailyMap.get(d) || 0,
        conversions: conversionsDaily.get(d) || 0,
        revenue: revenueDaily.get(d) || 0,
        clicks: clicksDaily.get(d) || 0,
        visits: visitsDaily.get(d) || 0,
      })),
      dailyReferrals: days.map((d) => ({ date: d, value: dailyMap.get(d) || 0 })),
      monthlyReferrals: [...monthlyMap.entries()].map(([date, value]) => ({ date, value })),
      referralRevenue: days.map((d) => ({ date: d, value: revenueDaily.get(d) || 0 })),
      conversionRate: days.map((d) => {
        const dayClicks = clicksDaily.get(d) || 0;
        const dayConv = conversionsDaily.get(d) || 0;
        return { date: d, value: dayClicks ? Math.round((dayConv / dayClicks) * 1000) / 10 : 0 };
      }),
      sources: [...sourceMap.entries()]
        .map(([source, clicks]) => ({ source, clicks }))
        .sort((a, b) => b.clicks - a.clicks),
      topCampaigns: campaigns,
      summary: {
        revenue: totalRevenue,
        referrals: totalReferrals,
        conversions: totalConversions,
        clicks: totalClicks,
        visits: totalVisits,
        conversionRate: totalClicks
          ? Math.round((totalConversions / totalClicks) * 1000) / 10
          : 0,
        clickThroughRate: totalClicks
          ? Math.round((totalVisits / totalClicks) * 1000) / 10
          : 0,
        visitRate: totalClicks
          ? Math.round((totalVisits / totalClicks) * 1000) / 10
          : 0,
        averageReferralValue: totalConversions
          ? Math.round((totalRevenue / totalConversions) * 100) / 100
          : 0,
        referralRoi:
          rewardCost > 0
            ? Math.round(((totalRevenue - rewardCost) / rewardCost) * 1000) / 10
            : totalRevenue > 0
              ? 100
              : 0,
        topCampaign: campaigns[0]?.name || null,
        topCustomer: null as string | null,
        mostSharedLink: topLink
          ? { code: topLink.code, name: topLink.name, shares: topLink.shareCount }
          : null,
        mostRevenueLink: topRevenueLink
          ? {
              code: topRevenueLink.code,
              name: topRevenueLink.name,
              revenue: topRevenueLink.revenue,
            }
          : null,
      },
    };
  }

  async getFunnel(tenantId: string, range = '30d', from?: string, to?: string) {
    const { start, end } = parseRange(range, from, to);
    const dateFilter = { gte: start, lte: end };
    const [landingVisits, linkClicks, signups, converted, rewarded] = await Promise.all([
      this.prisma.referralVisit.count({
        where: { tenantId, createdAt: dateFilter, isUnique: true },
      }),
      this.prisma.referralVisit.count({ where: { tenantId, createdAt: dateFilter } }),
      this.prisma.referralConversion.count({
        where: {
          tenantId,
          status: { in: ['SIGNED_UP', 'BOOKED', 'CONVERTED', 'REWARD_SENT'] },
          signedUpAt: dateFilter,
        },
      }),
      this.prisma.referralConversion.count({
        where: {
          tenantId,
          status: { in: ['CONVERTED', 'REWARD_SENT'] },
          convertedAt: dateFilter,
        },
      }),
      this.prisma.referralRewardRecord.count({ where: { tenantId, createdAt: dateFilter } }),
    ]);

    const stages = [
      { key: 'visits', stage: 'Landing Visit', label: 'Landing Visit', count: landingVisits },
      { key: 'clicks', stage: 'Link Click', label: 'Link Click', count: linkClicks },
      { key: 'signups', stage: 'Signup', label: 'Signup', count: signups },
      { key: 'converted', stage: 'First Purchase', label: 'First Purchase', count: converted },
      { key: 'rewarded', stage: 'Reward Issued', label: 'Reward Issued', count: rewarded },
    ];

    const base = stages[0].count || 1;
    return stages.map((s, i) => {
      const prev = i === 0 ? s.count : stages[i - 1].count || 1;
      const dropRate = i === 0 ? 0 : Math.round(((prev - s.count) / prev) * 1000) / 10;
      const conversionFromPrevious =
        i === 0 ? 100 : Math.round((s.count / (prev || 1)) * 1000) / 10;
      return {
        ...s,
        percentage: Math.round((s.count / base) * 1000) / 10,
        dropRate: Math.max(0, dropRate),
        conversionFromPrevious,
        successRate: Math.round((s.count / base) * 1000) / 10,
      };
    });
  }

  async getLeaderboard(tenantId: string, limit = 20) {
    const cached = await this.prisma.referralLeaderboard.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: [{ conversions: 'desc' }, { revenueGenerated: 'desc' }],
      take: limit,
    });
    if (cached.length > 0) {
      return cached.map((row, i) => ({
        rank: i + 1,
        customerId: row.customerId,
        name: `${row.customer.firstName} ${row.customer.lastName}`,
        referrals: row.referrals,
        revenue: row.revenueGenerated,
        rewardEarned: row.rewardEarned,
      }));
    }

    const grouped = await this.prisma.referralConversion.groupBy({
      by: ['referrerId'],
      where: {
        tenantId,
        referrerId: { not: null },
        status: { in: ['CONVERTED', 'REWARD_SENT', 'BOOKED', 'SIGNED_UP'] },
      },
      _count: { _all: true },
      _sum: { orderValue: true, bookingValue: true, rewardValue: true },
      orderBy: { _count: { referrerId: 'desc' } },
      take: limit,
    });

    const ids = grouped.map((g) => g.referrerId).filter((id): id is string => !!id);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));

    return grouped.map((g, i) => {
      const id = g.referrerId as string;
      const c = byId.get(id);
      return {
        rank: i + 1,
        customerId: id,
        name: c ? `${c.firstName} ${c.lastName}` : 'Unknown',
        referrals: g._count._all,
        revenue: (g._sum.orderValue || 0) + (g._sum.bookingValue || 0),
        rewardEarned: g._sum.rewardValue || 0,
      };
    });
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  async listCampaigns(tenantId: string) {
    const campaigns = await this.prisma.referralCampaign.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true, conversions: true } },
      },
    });
    return campaigns.map((c) => ({
      ...c,
      totalLinksCount: c._count.links,
      totalConversions: c._count.conversions,
    }));
  }

  async getCampaign(tenantId: string, id: string) {
    const campaign = await this.prisma.referralCampaign.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async createCampaign(tenantId: string, data: Record<string, any>, createdBy?: string) {
    const name = String(data.name || '').trim();
    if (!name || name.length < 2) {
      throw new BadRequestException('Campaign name must be at least 2 characters');
    }
    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      throw new BadRequestException('Start date must be before end date');
    }
    const rewardValue = Number(data.rewardValue ?? 100);
    if (Number.isNaN(rewardValue) || rewardValue < 0) {
      throw new BadRequestException('Reward value must be a non-negative number');
    }
    const allowedStatuses = ['DRAFT', 'ACTIVE', 'PAUSED', 'SCHEDULED', 'ENDED', 'ARCHIVED'];
    if (data.status && !allowedStatuses.includes(String(data.status).toUpperCase())) {
      throw new BadRequestException('Invalid campaign status');
    }

    const campaign = await this.prisma.referralCampaign.create({
      data: {
        tenantId,
        name,
        description: data.description,
        campaignType: data.campaignType || 'STANDARD',
        rewardType: data.rewardType || 'POINTS',
        rewardValue,
        friendRewardType: data.friendRewardType || 'POINTS',
        friendRewardValue: Number(data.friendRewardValue ?? 50),
        minPurchase: Number(data.minPurchase ?? 0),
        minAppointmentValue: Number(data.minAppointmentValue ?? 0),
        maxRewardLimit: data.maxRewardLimit != null ? Number(data.maxRewardLimit) : null,
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        status: (data.status as any) || 'DRAFT',
        usageLimit: data.usageLimit != null ? Number(data.usageLimit) : null,
        referralExpiryDays: Number(data.referralExpiryDays ?? 30),
        terms: data.terms,
        createdBy: createdBy || data.createdBy || null,
      },
    });
    await this.emit(tenantId, 'CAMPAIGN_CREATED', { campaignId: campaign.id });
    return campaign;
  }

  async updateCampaign(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await this.prisma.referralCampaign.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Campaign not found');
    const updated = await this.prisma.referralCampaign.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.campaignType !== undefined ? { campaignType: data.campaignType } : {}),
        ...(data.rewardType !== undefined ? { rewardType: data.rewardType } : {}),
        ...(data.rewardValue !== undefined ? { rewardValue: Number(data.rewardValue) } : {}),
        ...(data.friendRewardType !== undefined ? { friendRewardType: data.friendRewardType } : {}),
        ...(data.friendRewardValue !== undefined
          ? { friendRewardValue: Number(data.friendRewardValue) }
          : {}),
        ...(data.minPurchase !== undefined ? { minPurchase: Number(data.minPurchase) } : {}),
        ...(data.minAppointmentValue !== undefined
          ? { minAppointmentValue: Number(data.minAppointmentValue) }
          : {}),
        ...(data.maxRewardLimit !== undefined
          ? { maxRewardLimit: data.maxRewardLimit == null ? null : Number(data.maxRewardLimit) }
          : {}),
        ...(data.startsAt !== undefined
          ? { startsAt: data.startsAt ? new Date(data.startsAt) : null }
          : {}),
        ...(data.endsAt !== undefined ? { endsAt: data.endsAt ? new Date(data.endsAt) : null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.usageLimit !== undefined
          ? { usageLimit: data.usageLimit == null ? null : Number(data.usageLimit) }
          : {}),
        ...(data.referralExpiryDays !== undefined
          ? { referralExpiryDays: Number(data.referralExpiryDays) }
          : {}),
        ...(data.terms !== undefined ? { terms: data.terms } : {}),
      },
    });
    await this.emit(tenantId, 'CAMPAIGN_UPDATED', { campaignId: id });
    return updated;
  }

  async setCampaignStatus(tenantId: string, id: string, status: string) {
    const allowed = ['DRAFT', 'ACTIVE', 'PAUSED', 'SCHEDULED', 'ENDED', 'ARCHIVED'];
    const next = String(status || '').toUpperCase();
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Status must be one of: ${allowed.join(', ')}`);
    }
    return this.updateCampaign(tenantId, id, { status: next });
  }

  async setLinkStatus(tenantId: string, id: string, status: string) {
    const allowed = ['ACTIVE', 'DISABLED', 'EXPIRED', 'ARCHIVED'];
    const next = String(status || '').toUpperCase();
    if (!allowed.includes(next)) {
      throw new BadRequestException(`Link status must be one of: ${allowed.join(', ')}`);
    }
    const link = await this.prisma.referralLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!link) throw new NotFoundException('Link not found');
    const updated = await this.prisma.referralLink.update({
      where: { id },
      data: { status: next },
      include: { customer: true, campaign: true },
    });
    await this.emit(tenantId, 'LINK_UPDATED', { linkId: id, metadata: { status: next } });
    return {
      ...this.mapLink(updated),
      customerName: updated.customer
        ? `${updated.customer.firstName} ${updated.customer.lastName}`
        : updated.name || 'Generic Link',
      campaignName: updated.campaign?.name || null,
    };
  }

  async duplicateCampaign(tenantId: string, id: string) {
    const c = await this.prisma.referralCampaign.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Campaign not found');
    return this.createCampaign(tenantId, {
      ...c,
      name: `${c.name} (Copy)`,
      status: 'DRAFT',
      startsAt: c.startsAt?.toISOString(),
      endsAt: c.endsAt?.toISOString(),
    });
  }

  async deleteCampaign(tenantId: string, id: string) {
    const c = await this.prisma.referralCampaign.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!c) throw new NotFoundException('Campaign not found');
    await this.prisma.referralCampaign.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.emit(tenantId, 'CAMPAIGN_DELETED', { campaignId: id });
    return { ok: true };
  }

  // ─── Links ─────────────────────────────────────────────────────────────────

  async checkSlug(tenantId: string, rawSlug: string) {
    if (!rawSlug) return { available: false, message: 'Slug is required' };
    const slug = rawSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { available: false, message: 'Only lowercase letters, numbers, and hyphens allowed' };
    }
    if (slug.length < 3 || slug.length > 30) {
      return { available: false, message: 'Slug must be between 3 and 30 characters' };
    }

    const existing = await this.prisma.referralLink.findFirst({
      where: {
        OR: [
          { code: slug },
          { customSlug: slug },
        ],
      },
    });

    if (existing) {
      return { available: false, message: 'This referral URL is already taken.' };
    }
    return { available: true, message: 'Available!' };
  }

  private async findLinkByCode(code: string) {
    const normalized = code.trim().toLowerCase();
    return this.prisma.referralLink.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { code },
          { code: code.toUpperCase() },
          { customSlug: normalized },
        ],
      },
      include: {
        customer: true,
        campaign: true,
        tenant: true,
      },
    });
  }

  async generateLink(
    tenantId: string,
    opts: {
      name?: string;
      customerId?: string;
      campaignId?: string;
      customSlug?: string;
    },
  ) {
    const { name, customerId, campaignId, customSlug } = opts;

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
      });
      if (!customer) throw new NotFoundException('Customer not found');
    }

    if (campaignId) {
      const campaign = await this.prisma.referralCampaign.findFirst({
        where: { id: campaignId, tenantId },
      });
      if (!campaign) throw new NotFoundException('Campaign not found');
    }

    let code = '';
    let slug: string | null = null;
    if (customSlug && customSlug.trim()) {
      slug = customSlug.trim().toLowerCase();
      const check = await this.checkSlug(tenantId, slug);
      if (!check.available) {
        throw new BadRequestException(check.message);
      }
      code = slug;
    } else {
      code = genCode();
      for (let i = 0; i < 8; i++) {
        const clash = await this.prisma.referralLink.findFirst({
          where: { OR: [{ code }, { customSlug: code.toLowerCase() }] },
        });
        if (!clash) break;
        code = genCode();
      }
    }

    const secureToken = randomBytes(16).toString('hex');
    const linkUrl = this.linkUrl(code);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(linkUrl)}`;

    const link = await this.prisma.referralLink.create({
      data: {
        tenantId,
        customerId: customerId || null,
        campaignId: campaignId || null,
        name: name?.trim() || undefined,
        code,
        customSlug: slug,
        secureToken,
        referralUrl: linkUrl,
        shortUrl: linkUrl,
        qrCode: qrCodeUrl,
        expiresAt:
          opts && (opts as any).expiresAt ? new Date((opts as any).expiresAt) : null,
      },
      include: { customer: true, campaign: true },
    });

    await this.emit(tenantId, 'LINK_CREATED', {
      linkId: link.id,
      campaignId,
      customerId,
    });

    return {
      ...this.mapLink(link),
      customerName: link.customer
        ? `${link.customer.firstName} ${link.customer.lastName}`
        : name || 'Generic Link',
      campaignName: link.campaign?.name || null,
    };
  }

  async listLinks(tenantId: string, customerId?: string) {
    const links = await this.prisma.referralLink.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(customerId ? { customerId } : {}),
      },
      include: {
        customer: true,
        campaign: true,
        _count: {
          select: {
            visits: true,
            shares: true,
            conversions: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const linkIds = links.map((l) => l.id);
    const conversionStats = linkIds.length
      ? await this.prisma.referralConversion.groupBy({
          by: ['linkId', 'status'],
          where: { tenantId, linkId: { in: linkIds } },
          _count: true,
        })
      : [];

    const statsByLink = new Map<string, Record<string, number>>();
    for (const row of conversionStats) {
      if (!row.linkId) continue;
      const cur = statsByLink.get(row.linkId) || {};
      cur[row.status] = row._count;
      statsByLink.set(row.linkId, cur);
    }

    return links.map((l) => {
      const st = statsByLink.get(l.id) || {};
      const registrations =
        (st.SIGNED_UP || 0) + (st.BOOKED || 0) + (st.CONVERTED || 0) + (st.REWARD_SENT || 0);
      const bookings = (st.BOOKED || 0) + (st.CONVERTED || 0) + (st.REWARD_SENT || 0);
      const orders = (st.CONVERTED || 0) + (st.REWARD_SENT || 0);
      const conversionRate =
        l.clickCount > 0 ? Math.round((orders / l.clickCount) * 1000) / 10 : 0;
      return {
        ...this.mapLink(l),
        customerName: l.customer
          ? `${l.customer.firstName} ${l.customer.lastName}`
          : l.name || 'Generic Link',
        campaignName: l.campaign?.name || null,
        landingViews: l._count.visits,
        registrations,
        bookings,
        orders,
        conversionRate,
        lastActivity: l.updatedAt?.toISOString?.() || l.updatedAt,
      };
    });
  }

  async recordShare(tenantId: string, linkId: string, channel: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, tenantId },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.prisma.$transaction([
      this.prisma.referralShare.create({
        data: { tenantId, linkId, channel: channel.toLowerCase() },
      }),
      this.prisma.referralLink.update({
        where: { id: linkId },
        data: { shareCount: { increment: 1 } },
      }),
      ...(link.campaignId
        ? [
            this.prisma.referralCampaign.update({
              where: { id: link.campaignId },
              data: { shareCount: { increment: 1 } },
            }),
          ]
        : []),
    ]);
    await this.emit(tenantId, 'LINK_SHARED', {
      linkId,
      campaignId: link.campaignId || undefined,
      metadata: { channel },
    });
    return { ok: true };
  }

  // ─── Public tracking ───────────────────────────────────────────────────────

  async validateAndTrack(
    code: string,
    meta: {
      ip?: string;
      userAgent?: string;
      fingerprint?: string;
      referrerUrl?: string;
      language?: string;
      timezone?: string;
      landingPage?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      channel?: string;
      sessionId?: string;
    },
  ) {
    const link = await this.findLinkByCode(code);
    if (!link || link.status !== 'ACTIVE') {
      throw new NotFoundException('Invalid or inactive referral link');
    }

    if (link.campaign) {
      if (link.campaign.status === 'PAUSED' || link.campaign.status === 'ARCHIVED') {
        throw new ForbiddenException('Campaign is not accepting referrals');
      }
      if (link.campaign.endsAt && link.campaign.endsAt < new Date()) {
        throw new ForbiddenException('Campaign has expired');
      }
      if (link.campaign.usageLimit != null && link.campaign.usageCount >= link.campaign.usageLimit) {
        throw new ForbiddenException('Campaign usage limit reached');
      }
    }

    const sessionId = meta.sessionId || randomBytes(16).toString('hex');
    const fingerprint =
      meta.fingerprint ||
      createHash('sha256')
        .update(`${meta.ip || ''}|${meta.userAgent || ''}|${meta.language || ''}`)
        .digest('hex')
        .slice(0, 32);

    const prior = await this.prisma.referralVisit.findFirst({
      where: { linkId: link.id, fingerprint },
    });
    const isUnique = !prior;
    const source = detectSource(meta.referrerUrl, meta.utmSource, meta.channel);
    const ua = meta.userAgent || '';
    const browser = /edg\//i.test(ua)
      ? 'Edge'
      : /chrome/i.test(ua)
        ? 'Chrome'
        : /safari/i.test(ua)
          ? 'Safari'
          : /firefox/i.test(ua)
            ? 'Firefox'
            : 'Other';
    const os = /windows/i.test(ua)
      ? 'Windows'
      : /mac os|macintosh/i.test(ua)
        ? 'macOS'
        : /android/i.test(ua)
          ? 'Android'
          : /iphone|ipad/i.test(ua)
            ? 'iOS'
            : 'Other';

    const deviceType = detectDeviceType(ua);

    await this.prisma.$transaction([
      this.prisma.referralVisit.create({
        data: {
          tenantId: link.tenantId,
          linkId: link.id,
          campaignId: link.campaignId,
          referrerCustomerId: link.customerId,
          sessionId,
          ip: meta.ip,
          fingerprint,
          browser,
          os,
          deviceType,
          language: meta.language,
          timezone: meta.timezone,
          userAgent: meta.userAgent,
          referrerUrl: meta.referrerUrl,
          source,
          utmSource: meta.utmSource,
          utmMedium: meta.utmMedium,
          utmCampaign: meta.utmCampaign,
          utmContent: meta.utmContent,
          landingPage: meta.landingPage || this.linkUrl(code),
          isUnique,
        },
      }),
      this.prisma.referralLink.update({
        where: { id: link.id },
        data: {
          clickCount: { increment: 1 },
          ...(isUnique ? { uniqueVisitors: { increment: 1 } } : {}),
        },
      }),
      ...(link.campaignId
        ? [
            this.prisma.referralCampaign.update({
              where: { id: link.campaignId },
              data: {
                clickCount: { increment: 1 },
                visitCount: { increment: 1 },
              },
            }),
          ]
        : []),
    ]);

    await this.bumpSource(link.tenantId, link.id, source, { clicks: 1 });
    await this.emit(link.tenantId, 'LINK_OPENED', {
      linkId: link.id,
      campaignId: link.campaignId || undefined,
      customerId: link.customerId || undefined,
      ipAddress: meta.ip,
      metadata: { source, sessionId, isUnique },
    });
    await this.emit(link.tenantId, 'LANDING_VIEWED', {
      linkId: link.id,
      campaignId: link.campaignId || undefined,
      ipAddress: meta.ip,
    });

    // Ensure a conversion shell in VISITED state
    let conversion = await this.prisma.referralConversion.findFirst({
      where: {
        tenantId: link.tenantId,
        linkId: link.id,
        status: { in: ['PENDING', 'VISITED'] },
        friendId: null,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!conversion) {
      conversion = await this.prisma.referralConversion.create({
        data: {
          tenantId: link.tenantId,
          campaignId: link.campaignId,
          linkId: link.id,
          referrerId: link.customerId || null,
          status: 'VISITED',
          source,
          visitedAt: new Date(),
          rewardType: link.campaign?.rewardType,
          rewardValue: link.campaign?.rewardValue || 0,
          friendRewardType: link.campaign?.friendRewardType,
          friendRewardValue: link.campaign?.friendRewardValue || 0,
        },
      });
    }

    return {
      valid: true,
      sessionId,
      code: link.code,
      tenantId: link.tenantId,
      businessName: link.tenant.name,
      businessLogo: link.tenant.logoUrl,
      brandColor: link.tenant.brandColor,
      referrerName: link.customer ? `${link.customer.firstName} ${link.customer.lastName}`.trim() : (link.name || 'Partner'),
      campaign: link.campaign
        ? {
            id: link.campaign.id,
            name: link.campaign.name,
            description: link.campaign.description,
            rewardType: link.campaign.rewardType,
            rewardValue: link.campaign.rewardValue,
            friendRewardType: link.campaign.friendRewardType,
            friendRewardValue: link.campaign.friendRewardValue,
            terms: link.campaign.terms,
            minPurchase: link.campaign.minPurchase,
          }
        : null,
      conversionId: conversion.id,
      bookingUrl: link.tenant.slug ? `/book/${link.tenant.slug}` : null,
    };
  }

  async claimReferral(data: {
    code: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    sessionId?: string;
    fingerprint?: string;
  }) {
    const link = await this.findLinkByCode(data.code);
    if (!link) throw new NotFoundException('Invalid referral code');

    // Fraud: existing customer
    const existing = await this.prisma.customer.findFirst({
      where: {
        tenantId: link.tenantId,
        OR: [
          ...(data.email ? [{ email: data.email }] : []),
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.id === link.customerId) {
        await this.reject(link.tenantId, link.id, 'SELF_REFERRAL');
        throw new BadRequestException('Self referrals are not allowed');
      }
      await this.reject(link.tenantId, link.id, 'EXISTING_CUSTOMER', {
        friendEmail: data.email,
        friendPhone: data.phone,
      });
      return { status: 'REJECTED', reason: 'EXISTING_CUSTOMER' };
    }

    // Create friend customer
    const friend = await this.prisma.customer.create({
      data: {
        tenantId: link.tenantId,
        firstName: data.firstName || 'Friend',
        lastName: data.lastName || '',
        email: data.email,
        phone: data.phone || `ref-${genCode(10)}`,
        tags: ['referral'],
      },
    });

    const conversion = await this.prisma.referralConversion.create({
      data: {
        tenantId: link.tenantId,
        campaignId: link.campaignId,
        linkId: link.id,
        referrerId: link.customerId || null,
        friendId: friend.id,
        friendEmail: data.email,
        friendPhone: data.phone,
        status: 'SIGNED_UP',
        signedUpAt: new Date(),
        visitedAt: new Date(),
        rewardType: link.campaign?.rewardType || 'POINTS',
        rewardValue: link.campaign?.rewardValue || 100,
        friendRewardType: link.campaign?.friendRewardType || 'POINTS',
        friendRewardValue: link.campaign?.friendRewardValue || 50,
      },
    });

    await this.prisma.referralRegistration.create({
      data: {
        tenantId: link.tenantId,
        campaignId: link.campaignId,
        linkId: link.id,
        referrerId: link.customerId || null,
        newCustomerId: friend.id,
      },
    });

    if (link.id) {
      await this.bumpSource(link.tenantId, link.id, conversion.source || 'direct', {
        registrations: 1,
      });
    }

    await this.prisma.activity.create({
      data: {
        tenantId: link.tenantId,
        customerId: friend.id,
        type: 'CUSTOMER_CREATED',
        message: `${friend.firstName} joined via referral${link.customerId ? '' : ' link'}`,
        metadata: { conversionId: conversion.id, linkId: link.id },
      },
    });

    await this.emit(link.tenantId, 'REGISTRATION_COMPLETED', {
      conversionId: conversion.id,
      linkId: link.id,
      campaignId: link.campaignId || undefined,
      customerId: friend.id,
    });

    if (link.customerId) {
      await this.prisma.notification.create({
        data: {
          tenantId: link.tenantId,
          customerId: link.customerId,
          type: 'REFERRAL_SIGNED_UP',
          channel: 'EMAIL',
          subject: 'Your friend joined via your referral',
          body: `${friend.firstName} signed up using your referral link.`,
          status: 'PENDING',
        },
      });
    }

    await this.recomputeLeaderboard(link.tenantId);

    return {
      status: 'SIGNED_UP',
      conversionId: conversion.id,
      friendId: friend.id,
    };
  }

  async markBooked(
    tenantId: string,
    conversionId: string,
    data: { appointmentId?: string; bookingValue?: number },
  ) {
    const conversion = await this.prisma.referralConversion.findFirst({
      where: { id: conversionId, tenantId },
    });
    if (!conversion) throw new NotFoundException('Referral not found');

    const campaign = conversion.campaignId
      ? await this.prisma.referralCampaign.findUnique({ where: { id: conversion.campaignId } })
      : null;

    const bookingValue = Number(data.bookingValue || 0);
    if (campaign && campaign.minAppointmentValue > 0 && bookingValue < campaign.minAppointmentValue) {
      return this.updateConversion(tenantId, conversionId, {
        status: 'REJECTED',
        rejectReason: 'BELOW_MINIMUM_APPOINTMENT',
        bookingValue,
        appointmentId: data.appointmentId,
      });
    }

    const updated = await this.updateConversion(tenantId, conversionId, {
      status: 'BOOKED',
      bookedAt: new Date(),
      bookingValue,
      appointmentId: data.appointmentId,
    });
    await this.emit(tenantId, 'APPOINTMENT_BOOKED', { conversionId });
    return updated;
  }

  async markConverted(
    tenantId: string,
    conversionId: string,
    data: { invoiceId?: string; orderValue?: number; paymentSuccessful?: boolean },
  ) {
    if (data.paymentSuccessful === false) {
      return this.updateConversion(tenantId, conversionId, {
        status: 'REJECTED',
        rejectReason: 'FAILED_PAYMENT',
      });
    }

    const conversion = await this.prisma.referralConversion.findFirst({
      where: { id: conversionId, tenantId },
      include: { campaign: true },
    });
    if (!conversion) throw new NotFoundException('Referral not found');

    const orderValue = Number(data.orderValue || conversion.bookingValue || 0);
    if (
      conversion.campaign &&
      conversion.campaign.minPurchase > 0 &&
      orderValue < conversion.campaign.minPurchase
    ) {
      return this.updateConversion(tenantId, conversionId, {
        status: 'REJECTED',
        rejectReason: 'BELOW_MINIMUM_PURCHASE',
        orderValue,
      });
    }

    await this.updateConversion(tenantId, conversionId, {
      status: 'CONVERTED',
      convertedAt: new Date(),
      orderValue,
      invoiceId: data.invoiceId,
    });

    return this.creditRewards(tenantId, conversionId);
  }

  async creditRewards(tenantId: string, conversionId: string) {
    const conversion = await this.prisma.referralConversion.findFirst({
      where: { id: conversionId, tenantId },
      include: { campaign: true, referrer: true, friend: true },
    });
    if (!conversion) throw new NotFoundException('Referral not found');
    if (conversion.rewardStatus === 'CREDITED') return conversion;
    if (conversion.status === 'REJECTED') {
      throw new BadRequestException('Cannot reward rejected referral');
    }

    const rewardType = conversion.rewardType || 'POINTS';
    const rewardValue = conversion.rewardValue || 0;
    const friendType = conversion.friendRewardType || 'POINTS';
    const friendValue = conversion.friendRewardValue || 0;

    // Credit referrer (skipped for generic / public links without a customer)
    if (conversion.referrerId && conversion.referrer) {
      if (rewardType === 'POINTS' && rewardValue > 0) {
        const bal = conversion.referrer.pointsBalance + Math.round(rewardValue);
        await this.prisma.customer.update({
          where: { id: conversion.referrerId },
          data: { pointsBalance: bal },
        });
        await this.prisma.pointsLedger.create({
          data: {
            tenantId,
            customerId: conversion.referrerId,
            amount: Math.round(rewardValue),
            balanceAfter: bal,
            reason: `Referral reward`,
          },
        });
      } else if (rewardType === 'CASHBACK' && rewardValue > 0) {
        await this.prisma.customer.update({
          where: { id: conversion.referrerId },
          data: { cashbackBalance: { increment: rewardValue } },
        });
      }

      await this.prisma.referralRewardRecord.create({
        data: {
          tenantId,
          conversionId,
          customerId: conversion.referrerId,
          role: 'REFERRER',
          rewardType,
          amount: rewardValue,
          status: 'CREDITED',
          creditedAt: new Date(),
          walletTransactionId:
            rewardType === 'POINTS' || rewardType === 'CASHBACK' ? `wallet:${conversion.referrerId}` : null,
        },
      });
    }

    if (conversion.friendId && friendValue > 0) {
      if (friendType === 'POINTS') {
        const friend = conversion.friend!;
        const bal = friend.pointsBalance + Math.round(friendValue);
        await this.prisma.customer.update({
          where: { id: conversion.friendId },
          data: { pointsBalance: bal },
        });
        await this.prisma.pointsLedger.create({
          data: {
            tenantId,
            customerId: conversion.friendId,
            amount: Math.round(friendValue),
            balanceAfter: bal,
            reason: `Referral friend bonus`,
          },
        });
      }
      await this.prisma.referralRewardRecord.create({
        data: {
          tenantId,
          conversionId,
          customerId: conversion.friendId,
          role: 'FRIEND',
          rewardType: friendType,
          amount: friendValue,
          status: 'CREDITED',
        },
      });
    }

    if (conversion.linkId) {
      const earned = (conversion.orderValue || 0) + (conversion.bookingValue || 0);
      await this.prisma.referralLink.update({
        where: { id: conversion.linkId },
        data: {
          conversionCount: { increment: 1 },
          revenue: { increment: earned },
        },
      });
    }
    if (conversion.campaignId) {
      await this.prisma.referralCampaign.update({
        where: { id: conversion.campaignId },
        data: {
          conversionCount: { increment: 1 },
          usageCount: { increment: 1 },
          rewardsGiven: { increment: 1 },
          revenueTotal: {
            increment: (conversion.orderValue || 0) + (conversion.bookingValue || 0),
          },
        },
      });
    }

    const updated = await this.updateConversion(tenantId, conversionId, {
      status: 'REWARD_SENT',
      rewardStatus: 'CREDITED',
      rewardedAt: new Date(),
    });

    if (conversion.linkId) {
      await this.bumpSource(
        tenantId,
        conversion.linkId,
        conversion.source || 'direct',
        { conversions: 1 },
      );
    }
    await this.recomputeLeaderboard(tenantId);

    await this.emit(tenantId, 'REWARD_CREDITED', {
      conversionId,
      customerId: conversion.referrerId || undefined,
    });

    if (conversion.referrerId) {
      await this.prisma.notification.create({
        data: {
          tenantId,
          customerId: conversion.referrerId,
          type: 'REFERRAL_REWARD',
          channel: 'EMAIL',
          subject: 'Referral reward credited',
          body: `You earned ${rewardValue} ${rewardType.toLowerCase()} for a successful referral.`,
          status: 'PENDING',
        },
      });

      await this.prisma.activity.create({
        data: {
          tenantId,
          customerId: conversion.referrerId,
          type: 'POINTS_EARNED',
          message: `Referral reward credited (${rewardType} ${rewardValue})`,
          metadata: { conversionId },
        },
      });
    }

    return updated;
  }

  // ─── Conversions list ──────────────────────────────────────────────────────

  async listConversions(
    tenantId: string,
    opts: { status?: string; search?: string; page?: number; pageSize?: number } = {},
  ) {
    const page = opts.page || 1;
    const pageSize = Math.min(opts.pageSize || 25, 100);
    const where: any = { tenantId };
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      const q = opts.search.trim();
      where.OR = [
        { referrer: { firstName: { contains: q, mode: 'insensitive' } } },
        { referrer: { lastName: { contains: q, mode: 'insensitive' } } },
        { friend: { firstName: { contains: q, mode: 'insensitive' } } },
        { friend: { lastName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.referralConversion.findMany({
        where,
        include: { referrer: true, friend: true, campaign: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.referralConversion.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        referrer: c.referrer
          ? `${c.referrer.firstName} ${c.referrer.lastName}`
          : 'Business / Public',
        friend: c.friend
          ? `${c.friend.firstName} ${c.friend.lastName}`
          : c.friendEmail || c.friendPhone || '—',
        source: c.source,
        orderValue: c.orderValue,
        bookingValue: c.bookingValue,
        reward: `${c.rewardValue} ${c.rewardType || ''}`.trim(),
        campaign: c.campaign?.name || '—',
        date: c.createdAt.toISOString(),
        status: c.status,
        rewardStatus: c.rewardStatus,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getRewardHistory(tenantId: string) {
    const rows = await this.prisma.referralRewardRecord.findMany({
      where: { tenantId },
      include: { customer: true, conversion: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      role: r.role,
      rewardType: r.rewardType,
      amount: r.amount,
      status: r.status,
      conversionId: r.conversionId,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async exportReport(tenantId: string, format: 'csv' | 'excel' | 'pdf' = 'csv') {
    const [overview, campaigns, conversions, rewards, links] = await Promise.all([
      this.getOverview(tenantId, '90d'),
      this.listCampaigns(tenantId),
      this.listConversions(tenantId, { page: 1, pageSize: 5000 }),
      this.getRewardHistory(tenantId),
      this.listLinks(tenantId),
    ]);

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const sections: string[] = [];

    sections.push('## Revenue Summary');
    sections.push(['Metric', 'Value'].map(escape).join(','));
    sections.push(
      ['Referral Revenue', overview.referralRevenue].map(escape).join(','),
      ['Successful Referrals', overview.successfulReferrals].map(escape).join(','),
      ['Conversion Rate %', overview.conversionRate].map(escape).join(','),
      ['Rewards Given', overview.rewardsGiven].map(escape).join(','),
    );
    sections.push('');

    sections.push('## Campaigns');
    sections.push(
      ['Name', 'Status', 'Reward Type', 'Reward Value', 'Conversions', 'Revenue']
        .map(escape)
        .join(','),
    );
    for (const c of campaigns) {
      sections.push(
        [c.name, c.status, c.rewardType, c.rewardValue, c.conversionCount, c.revenueTotal]
          .map(escape)
          .join(','),
      );
    }
    sections.push('');

    sections.push('## Referrals / Conversions');
    sections.push(
      [
        'Referrer',
        'Friend',
        'Source',
        'Order Value',
        'Booking Value',
        'Reward',
        'Campaign',
        'Date',
        'Status',
        'Reward Status',
      ]
        .map(escape)
        .join(','),
    );
    for (const r of conversions.items) {
      sections.push(
        [
          r.referrer,
          r.friend,
          r.source || '',
          r.orderValue,
          r.bookingValue,
          r.reward,
          r.campaign,
          r.date,
          r.status,
          r.rewardStatus,
        ]
          .map(escape)
          .join(','),
      );
    }
    sections.push('');

    sections.push('## Rewards');
    sections.push(
      ['Customer', 'Role', 'Type', 'Amount', 'Status', 'Date'].map(escape).join(','),
    );
    for (const r of rewards as any[]) {
      sections.push(
        [r.customerName, r.role, r.rewardType, r.amount, r.status, r.createdAt]
          .map(escape)
          .join(','),
      );
    }
    sections.push('');

    sections.push('## Links');
    sections.push(
      ['Code', 'Owner', 'Campaign', 'Clicks', 'Conversions', 'Revenue', 'Status']
        .map(escape)
        .join(','),
    );
    for (const l of links as any[]) {
      sections.push(
        [
          l.code,
          l.customerName,
          l.campaignName || 'Default',
          l.clickCount,
          l.conversionCount,
          l.revenue,
          l.status,
        ]
          .map(escape)
          .join(','),
      );
    }

    const body = sections.join('\n');
    if (format === 'pdf') {
      const text = body.replace(/^## /gm, '\n').replace(/","/g, ' | ').replace(/"/g, '');
      return {
        csv: text,
        content: text,
        filename: 'referrals-report.pdf.txt',
        mimeType: 'text/plain;charset=utf-8',
        format: 'pdf',
      };
    }
    if (format === 'excel') {
      return {
        csv: body,
        content: body,
        filename: 'referrals-report.xls',
        mimeType: 'application/vnd.ms-excel;charset=utf-8',
        format: 'excel',
      };
    }
    return {
      csv: body,
      content: body,
      filename: 'referrals-report.csv',
      mimeType: 'text/csv;charset=utf-8',
      format: 'csv',
    };
  }

  async getLink(tenantId: string, id: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { customer: true, campaign: true },
    });
    if (!link) throw new NotFoundException('Link not found');
    return {
      ...this.mapLink(link),
      customerName: link.customer
        ? `${link.customer.firstName} ${link.customer.lastName}`
        : link.name || 'Generic Link',
      campaignName: link.campaign?.name || null,
    };
  }

  async deleteLink(tenantId: string, id: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!link) throw new NotFoundException('Link not found');
    await this.prisma.referralLink.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.emit(tenantId, 'LINK_DELETED', { linkId: id });
    return { ok: true };
  }

  async regenerateLink(tenantId: string, id: string) {
    const existing = await this.prisma.referralLink.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Link not found');
    await this.deleteLink(tenantId, id);
    return this.generateLink(tenantId, {
      name: existing.name || undefined,
      customerId: existing.customerId || undefined,
      campaignId: existing.campaignId || undefined,
      customSlug: existing.customSlug || undefined,
    });
  }

  async ensureQr(tenantId: string, linkId: string) {
    const link = await this.prisma.referralLink.findFirst({
      where: { id: linkId, tenantId, deletedAt: null },
    });
    if (!link) throw new NotFoundException('Link not found');
    const url = link.referralUrl || this.linkUrl(link.code);
    const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    if (link.qrCode !== qrCode) {
      await this.prisma.referralLink.update({
        where: { id: linkId },
        data: { qrCode },
      });
    }
    await this.emit(tenantId, 'QR_GENERATED', { linkId });
    return { qrUrl: qrCode, url };
  }

  async getRevenue(tenantId: string, range = '30d', from?: string, to?: string) {
    const { start, end } = parseRange(range, from, to);
    const agg = await this.prisma.referralConversion.aggregate({
      where: {
        tenantId,
        status: { in: ['CONVERTED', 'REWARD_SENT'] },
        convertedAt: { gte: start, lte: end },
      },
      _sum: { orderValue: true, bookingValue: true, rewardValue: true },
      _count: true,
    });
    const rewardCost = await this.prisma.referralRewardRecord.aggregate({
      where: { tenantId, createdAt: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return {
      revenue: (agg._sum.orderValue || 0) + (agg._sum.bookingValue || 0),
      conversions: agg._count,
      rewardCost: rewardCost._sum.amount || 0,
      range: { start: start.toISOString(), end: end.toISOString() },
    };
  }

  getDashboard(tenantId: string, range = '30d', from?: string, to?: string) {
    return this.getOverview(tenantId, range, from, to);
  }

  async getStoredSources(tenantId: string) {
    const rows = await this.prisma.referralSource.findMany({
      where: { tenantId },
      orderBy: { clicks: 'desc' },
    });
    if (rows.length) {
      const bySource = new Map<string, { source: string; clicks: number; registrations: number; conversions: number }>();
      for (const r of rows) {
        const cur = bySource.get(r.source) || {
          source: r.source,
          clicks: 0,
          registrations: 0,
          conversions: 0,
        };
        cur.clicks += r.clicks;
        cur.registrations += r.registrations;
        cur.conversions += r.conversions;
        bySource.set(r.source, cur);
      }
      return Array.from(bySource.values()).sort((a, b) => b.clicks - a.clicks);
    }
    const analytics = await this.getAnalytics(tenantId, '30d');
    return analytics.sources;
  }

  async bumpSource(
    tenantId: string,
    linkId: string,
    source: string,
    delta: { clicks?: number; registrations?: number; conversions?: number },
  ) {
    const existing = await this.prisma.referralSource.findFirst({
      where: { tenantId, linkId, source },
    });
    if (existing) {
      await this.prisma.referralSource.update({
        where: { id: existing.id },
        data: {
          clicks: { increment: delta.clicks || 0 },
          registrations: { increment: delta.registrations || 0 },
          conversions: { increment: delta.conversions || 0 },
        },
      });
    } else {
      await this.prisma.referralSource.create({
        data: {
          tenantId,
          linkId,
          source,
          clicks: delta.clicks || 0,
          registrations: delta.registrations || 0,
          conversions: delta.conversions || 0,
        },
      });
    }
  }

  async aggregateSources(tenantId: string) {
    const visits = await this.prisma.referralVisit.groupBy({
      by: ['linkId', 'source'],
      where: { tenantId },
      _count: true,
    });
    for (const v of visits) {
      const existing = await this.prisma.referralSource.findFirst({
        where: { tenantId, linkId: v.linkId, source: v.source },
      });
      if (existing) {
        await this.prisma.referralSource.update({
          where: { id: existing.id },
          data: { clicks: v._count },
        });
      } else {
        await this.prisma.referralSource.create({
          data: {
            tenantId,
            linkId: v.linkId,
            source: v.source,
            clicks: v._count,
          },
        });
      }
    }
  }

  async recomputeLeaderboard(tenantId: string) {
    const grouped = await this.prisma.referralConversion.groupBy({
      by: ['referrerId'],
      where: {
        tenantId,
        referrerId: { not: null },
        status: { in: ['SIGNED_UP', 'BOOKED', 'CONVERTED', 'REWARD_SENT'] },
      },
      _count: { _all: true },
      _sum: { orderValue: true, bookingValue: true, rewardValue: true },
    });

    for (const g of grouped) {
      if (!g.referrerId) continue;
      const conversions = await this.prisma.referralConversion.count({
        where: {
          tenantId,
          referrerId: g.referrerId,
          status: { in: ['CONVERTED', 'REWARD_SENT'] },
        },
      });
      const data = {
        referrals: g._count._all,
        conversions,
        revenueGenerated: (g._sum.orderValue || 0) + (g._sum.bookingValue || 0),
        rewardEarned: g._sum.rewardValue || 0,
      };
      const existing = await this.prisma.referralLeaderboard.findUnique({
        where: {
          tenantId_customerId: { tenantId, customerId: g.referrerId },
        },
      });
      if (existing) {
        await this.prisma.referralLeaderboard.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await this.prisma.referralLeaderboard.create({
          data: { tenantId, customerId: g.referrerId, ...data },
        });
      }
    }
  }

  async evaluateFraudFlags(tenantId: string, conversionId: string): Promise<string[]> {
    const conversion = await this.prisma.referralConversion.findFirst({
      where: { id: conversionId, tenantId },
      include: { friend: true, referrer: true, link: true },
    });
    if (!conversion) return [];
    const flags: string[] = [];

    if (
      conversion.referrerId &&
      conversion.friendId &&
      conversion.referrerId === conversion.friendId
    ) {
      flags.push('SELF_REFERRAL');
    }

    if (conversion.friendEmail && conversion.referrer?.email === conversion.friendEmail) {
      flags.push('SAME_EMAIL');
    }
    if (conversion.friendPhone && conversion.referrer?.phone === conversion.friendPhone) {
      flags.push('SAME_PHONE');
    }

    if (conversion.friendId) {
      const dup = await this.prisma.referralConversion.count({
        where: {
          tenantId,
          friendId: conversion.friendId,
          id: { not: conversion.id },
          status: { not: 'REJECTED' },
        },
      });
      if (dup > 0) flags.push('DUPLICATE_REFERRAL');
    }

    if (conversion.linkId) {
      const recentVisits = await this.prisma.referralVisit.findMany({
        where: { linkId: conversion.linkId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const fps = recentVisits.map((v) => v.fingerprint).filter(Boolean);
      if (fps.length !== new Set(fps).size) flags.push('REPEAT_DEVICE');
    }

    if (conversion.campaignId) {
      const campaign = await this.prisma.referralCampaign.findUnique({
        where: { id: conversion.campaignId },
      });
      if (campaign?.endsAt && campaign.endsAt < new Date()) flags.push('EXPIRED_CAMPAIGN');
      if (campaign?.status === 'EXPIRED' || campaign?.status === 'ARCHIVED') {
        flags.push('INACTIVE_CAMPAIGN');
      }
    }

    return flags;
  }

  async trackBooking(
    tenantId: string,
    data: { customerId: string; appointmentId?: string; bookingValue?: number },
  ) {
    return this.onFriendAppointmentBooked(
      tenantId,
      data.customerId,
      data.appointmentId || `manual-${Date.now()}`,
      data.bookingValue || 0,
    );
  }

  async trackPayment(
    tenantId: string,
    data: {
      customerId: string;
      invoiceId?: string;
      orderValue?: number;
      paymentSuccessful?: boolean;
    },
  ) {
    if (data.paymentSuccessful === false) {
      const open = await this.findOpenConversionForFriend(tenantId, data.customerId, [
        'BOOKED',
        'SIGNED_UP',
        'VISITED',
        'PENDING',
      ]);
      if (open) {
        return this.updateConversion(tenantId, open.id, {
          status: 'REJECTED',
          rejectReason: 'FAILED_PAYMENT',
        });
      }
      return null;
    }
    return this.onFriendConverted(tenantId, data.customerId, {
      invoiceId: data.invoiceId,
      orderValue: data.orderValue,
    });
  }

  /**
   * Auto-hook: friend books an appointment → mark referral BOOKED.
   */
  async onFriendAppointmentBooked(
    tenantId: string,
    friendCustomerId: string,
    appointmentId: string,
    bookingValue = 0,
  ) {
    const conversion = await this.findOpenConversionForFriend(tenantId, friendCustomerId, [
      'SIGNED_UP',
      'VISITED',
      'PENDING',
    ]);
    if (!conversion) return null;
    return this.markBooked(tenantId, conversion.id, { appointmentId, bookingValue });
  }

  /**
   * Auto-hook: appointment completed OR invoice paid → convert + credit rewards.
   */
  async onFriendConverted(
    tenantId: string,
    friendCustomerId: string,
    opts: {
      appointmentId?: string;
      invoiceId?: string;
      orderValue?: number;
      bookingValue?: number;
    } = {},
  ) {
    const conversion = await this.findOpenConversionForFriend(tenantId, friendCustomerId, [
      'BOOKED',
      'SIGNED_UP',
      'VISITED',
      'PENDING',
      'CONVERTED',
    ]);
    if (!conversion) return null;

    if (
      ['SIGNED_UP', 'VISITED', 'PENDING'].includes(conversion.status) &&
      (opts.appointmentId || opts.bookingValue)
    ) {
      await this.markBooked(tenantId, conversion.id, {
        appointmentId: opts.appointmentId || conversion.appointmentId || undefined,
        bookingValue: opts.bookingValue || conversion.bookingValue || 0,
      });
    }

    return this.markConverted(tenantId, conversion.id, {
      invoiceId: opts.invoiceId,
      orderValue: opts.orderValue ?? opts.bookingValue ?? 0,
      paymentSuccessful: true,
    });
  }

  private async findOpenConversionForFriend(
    tenantId: string,
    friendCustomerId: string,
    statuses: string[],
  ) {
    return this.prisma.referralConversion.findFirst({
      where: {
        tenantId,
        friendId: friendCustomerId,
        status: { in: statuses as any },
        rewardStatus: { not: 'CREDITED' },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private mapLink(link: any) {
    const code = link.code || link.customSlug || link.id;
    const url = link.referralUrl || this.linkUrl(code);
    const qrUrl =
      link.qrCode ||
      `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    return {
      id: link.id,
      tenantId: link.tenantId,
      customerId: link.customerId,
      campaignId: link.campaignId,
      name: link.name || null,
      code,
      customSlug: link.customSlug || null,
      secureToken: link.secureToken || code,
      url,
      shortUrl: link.shortUrl || url,
      qrUrl,
      clickCount: link.clickCount || 0,
      uniqueVisitors: link.uniqueVisitors || 0,
      shareCount: link.shareCount || 0,
      conversionCount: link.conversionCount || 0,
      revenue: link.revenue || 0,
      status: link.status || 'ACTIVE',
      expiresAt: link.expiresAt?.toISOString?.() || link.expiresAt || null,
      createdAt: link.createdAt?.toISOString?.() || link.createdAt,
    };
  }

  private async updateConversion(tenantId: string, id: string, data: Record<string, any>) {
    const existing = await this.prisma.referralConversion.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Referral not found');
    return this.prisma.referralConversion.update({ where: { id }, data: data as any });
  }

  private async reject(
    tenantId: string,
    linkId: string,
    reason: string,
    extra: Record<string, any> = {},
  ) {
    const link = await this.prisma.referralLink.findUnique({ where: { id: linkId } });
    if (!link) return;
    await this.prisma.referralConversion.create({
      data: {
        tenantId,
        linkId,
        campaignId: link.campaignId,
        referrerId: link.customerId || null,
        status: 'REJECTED',
        rejectReason: reason,
        fraudFlags: { reason, ...extra },
        ...extra,
      },
    });
    await this.emit(tenantId, 'REFERRAL_REJECTED', {
      linkId,
      metadata: { reason },
    });
  }
}
