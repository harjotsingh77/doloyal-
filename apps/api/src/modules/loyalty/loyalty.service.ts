import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import {
  prismaConfigToShared,
  prismaPointsLedgerToShared,
  prismaRedemptionToShared,
  mapModeToPrisma,
  DEFAULT_LOYALTY_SETTINGS,
  computeChurnRisk,
  prismaCustomerToShared,
} from '../../common/helpers';

const SPARK = (seed: number, len = 8) =>
  Array.from({ length: len }, (_, i) =>
    Math.max(0, Math.round(seed * (0.7 + ((i * 17 + seed) % 30) / 100))),
  );

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  // ─── Config ───────────────────────────────────────────────────────────────

  async getConfig(tenantId: string) {
    let config = await this.prisma.loyaltyConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await this.prisma.loyaltyConfig.create({
        data: { tenantId, settings: DEFAULT_LOYALTY_SETTINGS },
      });
    }
    return prismaConfigToShared(config);
  }

  async updateConfig(tenantId: string, data: Record<string, unknown>) {
    const existing = await this.ensureConfig(tenantId);
    const updateData: any = {};

    if (data.mode) updateData.mode = mapModeToPrisma(data.mode as string);
    if (data.pointsPerCurrency != null) updateData.pointsPerUnit = data.pointsPerCurrency;
    if (data.pointsPerVisit != null) updateData.pointsPerVisit = data.pointsPerVisit;
    if (data.currencyPerPoint != null) updateData.currencyUnit = data.currencyPerPoint;
    if (data.expiryDays != null) updateData.expiryDays = data.expiryDays;
    if (data.welcomeBonus != null) updateData.signupBonus = data.welcomeBonus;
    if (data.referralBonus != null) updateData.referralBonus = data.referralBonus;
    if (data.settings && typeof data.settings === 'object') {
      const prev =
        existing.settings && typeof existing.settings === 'object'
          ? (existing.settings as object)
          : {};
      updateData.settings = { ...DEFAULT_LOYALTY_SETTINGS, ...prev, ...(data.settings as object) };
    }

    await this.prisma.loyaltyConfigVersion.create({
      data: {
        tenantId,
        snapshot: prismaConfigToShared(existing) as any,
        note: 'Pre-update snapshot',
      },
    });

    const updated = await this.prisma.loyaltyConfig.update({
      where: { tenantId },
      data: updateData,
    });
    return prismaConfigToShared(updated);
  }

  async getConfigVersions(tenantId: string) {
    const versions = await this.prisma.loyaltyConfigVersion.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return versions.map((v) => ({
      id: v.id,
      snapshot: v.snapshot,
      note: v.note,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async restoreConfigVersion(tenantId: string, versionId: string) {
    const version = await this.prisma.loyaltyConfigVersion.findFirst({
      where: { id: versionId, tenantId },
    });
    if (!version) throw new NotFoundException('Version not found');
    const snap = version.snapshot as any;
    return this.updateConfig(tenantId, {
      mode: snap.mode,
      pointsPerCurrency: snap.pointsPerCurrency,
      pointsPerVisit: snap.pointsPerVisit,
      currencyPerPoint: snap.currencyPerPoint,
      expiryDays: snap.expiryDays,
      welcomeBonus: snap.welcomeBonus,
      referralBonus: snap.referralBonus,
      settings: snap.settings,
    });
  }

  // ─── Overview KPIs ────────────────────────────────────────────────────────

  async getOverview(tenantId: string) {
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const [
      totalMembers,
      activeMembers,
      prevActive,
      pointsIssuedAgg,
      pointsRedeemedAgg,
      prevIssued,
      prevRedeemed,
      revenueAgg,
      prevRevenue,
      repeatCustomers,
      totalWithVisits,
      referralCount,
      avgLtv,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({
        where: { tenantId, lastVisitAt: { gte: monthAgo } },
      }),
      this.prisma.customer.count({
        where: { tenantId, lastVisitAt: { gte: twoMonthsAgo, lt: monthAgo } },
      }),
      this.prisma.pointsLedger.aggregate({
        where: { tenantId, amount: { gt: 0 }, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      this.prisma.pointsLedger.aggregate({
        where: { tenantId, amount: { lt: 0 }, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      this.prisma.pointsLedger.aggregate({
        where: {
          tenantId,
          amount: { gt: 0 },
          createdAt: { gte: twoMonthsAgo, lt: monthAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.pointsLedger.aggregate({
        where: {
          tenantId,
          amount: { lt: 0 },
          createdAt: { gte: twoMonthsAgo, lt: monthAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: monthAgo }, status: 'PAID' as any },
        _sum: { total: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: twoMonthsAgo, lt: monthAgo },
          status: 'PAID' as any,
        },
        _sum: { total: true },
      }),
      this.prisma.customer.count({
        where: { tenantId, totalVisits: { gte: 2 } },
      }),
      this.prisma.customer.count({
        where: { tenantId, totalVisits: { gte: 1 } },
      }),
      this.prisma.loyaltyReferral.count({
        where: { tenantId, status: { in: ['COMPLETED', 'REWARDED'] } },
      }),
      this.prisma.customer.aggregate({
        where: { tenantId },
        _avg: { totalSpent: true },
      }),
    ]);

    const pct = (cur: number, prev: number) =>
      prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 1000) / 10;

    const issued = pointsIssuedAgg._sum.amount || 0;
    const redeemed = Math.abs(pointsRedeemedAgg._sum.amount || 0);
    const prevIss = prevIssued._sum.amount || 0;
    const prevRed = Math.abs(prevRedeemed._sum.amount || 0);
    const revenue = revenueAgg._sum.total || 0;
    const prevRev = prevRevenue._sum.total || 0;
    const repeatRate =
      totalWithVisits > 0 ? Math.round((repeatCustomers / totalWithVisits) * 1000) / 10 : 0;
    const referralRevenue = Math.round(referralCount * ((avgLtv._avg.totalSpent || 0) * 0.4));
    const clv = Math.round((avgLtv._avg.totalSpent || 0) * 100) / 100;

    const kpis = [
      {
        key: 'members',
        label: 'Total Loyalty Members',
        value: totalMembers,
        previousValue: Math.max(0, totalMembers - activeMembers),
        changePercent: pct(totalMembers, Math.max(1, totalMembers - Math.round(totalMembers * 0.08))),
        format: 'number' as const,
        sparkline: SPARK(totalMembers || 10),
      },
      {
        key: 'active',
        label: 'Active Members',
        value: activeMembers,
        previousValue: prevActive,
        changePercent: pct(activeMembers, prevActive),
        format: 'number' as const,
        sparkline: SPARK(activeMembers || 8),
      },
      {
        key: 'issued',
        label: 'Points Issued',
        value: issued,
        previousValue: prevIss,
        changePercent: pct(issued, prevIss),
        format: 'points' as const,
        sparkline: SPARK(issued || 100),
      },
      {
        key: 'redeemed',
        label: 'Points Redeemed',
        value: redeemed,
        previousValue: prevRed,
        changePercent: pct(redeemed, prevRed),
        format: 'points' as const,
        sparkline: SPARK(redeemed || 50),
      },
      {
        key: 'revenue',
        label: 'Revenue Generated',
        value: revenue,
        previousValue: prevRev,
        changePercent: pct(revenue, prevRev),
        format: 'currency' as const,
        sparkline: SPARK(Math.round(revenue) || 1000),
      },
      {
        key: 'repeat',
        label: 'Repeat Customer Rate',
        value: repeatRate,
        previousValue: Math.max(0, repeatRate - 4),
        changePercent: 4.2,
        format: 'percent' as const,
        sparkline: SPARK(Math.round(repeatRate) || 40),
      },
      {
        key: 'referral',
        label: 'Referral Revenue',
        value: referralRevenue,
        previousValue: Math.round(referralRevenue * 0.85),
        changePercent: 15.3,
        format: 'currency' as const,
        sparkline: SPARK(referralRevenue || 200),
      },
      {
        key: 'clv',
        label: 'Avg Customer LTV',
        value: clv,
        previousValue: Math.round(clv * 0.92),
        changePercent: 8.7,
        format: 'currency' as const,
        sparkline: SPARK(Math.round(clv) || 500),
      },
    ];

    return { kpis, generatedAt: now.toISOString() };
  }

  // ─── AI Copilot ───────────────────────────────────────────────────────────

  async copilot(tenantId: string, message: string, conversationId?: string) {
    const overview = await this.getOverview(tenantId);
    const churn = await this.getChurnPredictions(tenantId, 5);
    const recommendations = await this.getRecommendations(tenantId);
    const convId = conversationId || `loy_${Date.now()}`;

    const insights = [
      {
        id: 'i1',
        type: 'warning' as const,
        text: `Repeat purchases trend: ${overview.kpis.find((k) => k.key === 'repeat')?.changePercent ?? 0}% vs last month`,
      },
      {
        id: 'i2',
        type: 'warning' as const,
        text: `${churn.length} customers likely to churn soon`,
      },
      {
        id: 'i3',
        type: 'opportunity' as const,
        text: 'Referral program underperforming — consider raising referral bonus',
      },
      {
        id: 'i4',
        type: 'insight' as const,
        text: 'Recommend Double Points Weekend to lift weekend visits',
      },
    ];

    let reply = this.buildCopilotReply(message, overview, churn, recommendations);

    const openaiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: openaiKey });
        const completion = await openai.chat.completions.create({
          model: this.config.get<string>('OPENAI_MODEL') || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are Doloyal Loyalty Copilot. Be concise, actionable, and data-driven. Context KPIs: ${JSON.stringify(overview.kpis.map((k) => ({ label: k.label, value: k.value, change: k.changePercent })))}. At-risk: ${churn.map((c) => c.name).join(', ') || 'none'}.`,
            },
            { role: 'user', content: message },
          ],
          max_tokens: 500,
        });
        reply = completion.choices[0]?.message?.content || reply;
      } catch (err: any) {
        this.logger.warn(`Loyalty copilot OpenAI failed: ${err.message}`);
      }
    }

    return { reply, insights, recommendations: recommendations.slice(0, 4), conversationId: convId };
  }

  private buildCopilotReply(
    message: string,
    overview: Awaited<ReturnType<LoyaltyService['getOverview']>>,
    churn: Awaited<ReturnType<LoyaltyService['getChurnPredictions']>>,
    recommendations: Awaited<ReturnType<LoyaltyService['getRecommendations']>>,
  ) {
    const lower = message.toLowerCase();
    if (lower.includes('churn') || lower.includes('at risk')) {
      return `${churn.length} customers show elevated churn risk. Top concern: ${churn[0]?.name || 'n/a'} (${churn[0]?.reason || 'inactivity'}). I recommend offering double points and a personal WhatsApp check-in.`;
    }
    if (lower.includes('referral')) {
      return `Your referral revenue is ${overview.kpis.find((k) => k.key === 'referral')?.value ?? 0}. Increase the referral bonus and share QR loyalty cards — estimated +12–18% referred signups.`;
    }
    if (lower.includes('campaign') || lower.includes('weekend')) {
      return `Launch a Double Points Weekend. Based on current redemption rates, expected lift is ~${recommendations[0]?.estimatedRevenue ?? 15000} in incremental revenue.`;
    }
    const issued = overview.kpis.find((k) => k.key === 'issued');
    const repeat = overview.kpis.find((k) => k.key === 'repeat');
    return `Retention snapshot: ${repeat?.value ?? 0}% repeat rate (${repeat?.changePercent ?? 0}% MoM), ${issued?.value ?? 0} points issued this month, ${churn.length} at-risk customers. Top move: ${recommendations[0]?.title || 'Enable weekend bonus'}.`;
  }

  async getRecommendations(tenantId: string) {
    const config = await this.getConfig(tenantId);
    const churn = await this.getChurnPredictions(tenantId, 20);
    const recs = [
      {
        id: 'rec-double',
        title: 'Enable Double Points Weekend',
        description: 'Boost weekend footfall with 2× points Friday–Sunday.',
        impact: 'High engagement lift',
        estimatedRevenue: 18000,
        retentionLift: 8,
        action: 'enable_weekend_bonus',
        actionLabel: 'Apply Suggestion',
        priority: 'high' as const,
      },
      {
        id: 'rec-referral',
        title: 'Increase Referral Bonus',
        description: `Current bonus is ${config.referralBonus} pts. Raise to ${config.referralBonus + 100} to accelerate acquisition.`,
        impact: 'Acquisition growth',
        estimatedRevenue: 12000,
        retentionLift: 5,
        action: 'boost_referral',
        actionLabel: 'Apply Suggestion',
        priority: 'high' as const,
      },
      {
        id: 'rec-churn',
        title: `Rescue ${churn.length} At-Risk Customers`,
        description: 'Send a personalized win-back offer with bonus points.',
        impact: 'Churn reduction',
        estimatedRevenue: Math.round(churn.length * 1500),
        retentionLift: 12,
        action: 'winback_campaign',
        actionLabel: 'Create Campaign',
        priority: 'high' as const,
      },
      {
        id: 'rec-vip',
        title: 'Reward VIP Customers',
        description: 'Auto-grant exclusive badges and priority booking to top 10 spenders.',
        impact: 'LTV expansion',
        estimatedRevenue: 9000,
        retentionLift: 6,
        action: 'reward_vip',
        actionLabel: 'Apply Suggestion',
        priority: 'medium' as const,
      },
      {
        id: 'rec-cashback',
        title: 'Offer Cashback Reward',
        description: 'Add a cashback marketplace reward at 500 points to improve redemption velocity.',
        impact: 'Engagement',
        estimatedRevenue: 7000,
        retentionLift: 4,
        action: 'add_cashback',
        actionLabel: 'Generate Campaign',
        priority: 'medium' as const,
      },
    ];
    return recs;
  }

  async applyRecommendation(tenantId: string, action: string) {
    const config = await this.getConfig(tenantId);
    switch (action) {
      case 'enable_weekend_bonus':
        return this.updateConfig(tenantId, {
          settings: { ...config.settings, weekendBonus: true, doublePoints: true },
        });
      case 'boost_referral':
        return this.updateConfig(tenantId, {
          referralBonus: config.referralBonus + 100,
        });
      case 'winback_campaign': {
        const campaign = await this.prisma.campaign.create({
          data: {
            tenantId,
            name: 'Win-back: Double Points',
            subject: 'We miss you — double points this week',
            body: 'Come back this week and earn 2× points on every visit.',
            channel: 'EMAIL',
            status: 'DRAFT',
          },
        });
        return { applied: true, campaignId: campaign.id };
      }
      case 'reward_vip': {
        await this.ensureDefaultBadges(tenantId);
        return { applied: true, message: 'VIP reward flow queued for top customers' };
      }
      case 'add_cashback': {
        const reward = await this.prisma.reward.create({
          data: {
            tenantId,
            name: '₹100 Cashback',
            description: 'Redeem for store credit cashback',
            pointsCost: 500,
            category: 'CASHBACK',
            status: 'ACTIVE',
          },
        });
        return { applied: true, rewardId: reward.id };
      }
      default:
        throw new BadRequestException(`Unknown action: ${action}`);
    }
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────

  async getLeaderboard(
    tenantId: string,
    opts: { period?: string; metric?: string; limit?: number } = {},
  ) {
    const limit = opts.limit || 25;
    const metric = opts.metric || 'points';
    const period = opts.period || 'monthly';

    const since = new Date();
    if (period === 'weekly') since.setDate(since.getDate() - 7);
    else if (period === 'monthly') since.setDate(since.getDate() - 30);
    else if (period === 'yearly') since.setFullYear(since.getFullYear() - 1);
    else since.setFullYear(2000);

    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: {
        memberships: { include: { tier: true } },
        badges: { include: { badge: true } },
        _count: { select: { redemptions: true, referralsMade: true } },
      },
      take: 200,
    });

    const sorted = [...customers].sort((a, b) => {
      switch (metric) {
        case 'visits':
          return b.totalVisits - a.totalVisits;
        case 'spend':
          return b.totalSpent - a.totalSpent;
        case 'referrals':
          return b._count.referralsMade - a._count.referralsMade;
        case 'rewards':
          return b._count.redemptions - a._count.redemptions;
        default:
          return b.pointsBalance - a.pointsBalance;
      }
    });

    return sorted.slice(0, limit).map((c, i) => ({
      rank: i + 1,
      customerId: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(),
      avatarUrl: c.avatarUrl,
      points: c.pointsBalance,
      visits: c.totalVisits,
      referrals: c._count.referralsMade,
      membership: c.memberships[0]?.tier?.name ?? null,
      growthPercent: Math.round(((c.totalVisits % 17) + 3) * 1.7),
      badges: c.badges.map((b) => b.badge.name),
      totalSpent: c.totalSpent,
      rewardsRedeemed: c._count.redemptions,
    }));
  }

  async rewardTopCustomers(tenantId: string, count = 10, points = 200) {
    const board = await this.getLeaderboard(tenantId, { limit: count, metric: 'points' });
    const results = [];
    for (const entry of board) {
      const ledger = await this.adjust(
        tenantId,
        entry.customerId,
        points,
        `Leaderboard top ${count} reward`,
      );
      results.push(ledger);
    }
    return { rewarded: results.length, pointsEach: points };
  }

  // ─── Challenges ───────────────────────────────────────────────────────────

  async listChallenges(tenantId: string) {
    let challenges = await this.prisma.loyaltyChallenge.findMany({
      where: { tenantId },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    });
    if (challenges.length === 0) {
      await this.seedDefaultChallenges(tenantId);
      challenges = await this.prisma.loyaltyChallenge.findMany({
        where: { tenantId },
        include: { participants: true },
        orderBy: { createdAt: 'desc' },
      });
    }
    const now = Date.now();
    return challenges.map((c) => {
      const completed = c.participants.filter((p) => p.completedAt).length;
      const total = c.participants.length || 1;
      const avgProgress =
        c.participants.reduce((s, p) => s + p.progress, 0) / (c.participants.length || 1);
      return {
        id: c.id,
        title: c.title,
        description: c.description,
        type: c.type,
        targetValue: c.targetValue,
        rewardPoints: c.rewardPoints,
        rewardLabel: c.rewardLabel,
        startsAt: c.startsAt.toISOString(),
        endsAt: c.endsAt?.toISOString() ?? null,
        status: c.status,
        aiGenerated: c.aiGenerated,
        participants: c.participants.length,
        completionRate: Math.round((completed / total) * 100),
        avgProgress: Math.min(100, Math.round((avgProgress / c.targetValue) * 100)),
        remainingDays: c.endsAt
          ? Math.max(0, Math.ceil((c.endsAt.getTime() - now) / 86400000))
          : null,
      };
    });
  }

  async createChallenge(tenantId: string, data: any) {
    const challenge = await this.prisma.loyaltyChallenge.create({
      data: {
        tenantId,
        title: data.title,
        description: data.description,
        type: data.type || 'VISITS',
        targetValue: data.targetValue || 1,
        rewardPoints: data.rewardPoints || 100,
        rewardLabel: data.rewardLabel,
        endsAt: data.endsAt ? new Date(data.endsAt) : null,
        aiGenerated: !!data.aiGenerated,
        status: 'ACTIVE',
      },
    });
    return challenge;
  }

  async generateChallenge(tenantId: string) {
    const templates = [
      {
        title: 'Visit 5 times',
        type: 'VISITS',
        targetValue: 5,
        rewardPoints: 250,
        rewardLabel: '250 bonus points',
      },
      {
        title: 'Spend ₹5,000',
        type: 'SPEND',
        targetValue: 5000,
        rewardPoints: 500,
        rewardLabel: '₹200 voucher',
      },
      {
        title: 'Refer 3 friends',
        type: 'REFERRALS',
        targetValue: 3,
        rewardPoints: 300,
        rewardLabel: 'Referral master badge',
      },
      {
        title: 'Leave a Google review',
        type: 'REVIEW',
        targetValue: 1,
        rewardPoints: 100,
        rewardLabel: 'Review hero badge',
      },
      {
        title: 'Complete your profile',
        type: 'PROFILE',
        targetValue: 1,
        rewardPoints: 50,
        rewardLabel: '50 welcome points',
      },
    ];
    const pick = templates[Math.floor(Math.random() * templates.length)];
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30);
    return this.createChallenge(tenantId, {
      ...pick,
      description: `AI-generated mission: ${pick.title}`,
      endsAt: endsAt.toISOString(),
      aiGenerated: true,
    });
  }

  private async seedDefaultChallenges(tenantId: string) {
    const ends = new Date();
    ends.setDate(ends.getDate() + 30);
    await this.prisma.loyaltyChallenge.createMany({
      data: [
        {
          tenantId,
          title: 'Visit 5 times',
          description: 'Come back 5 times this month',
          type: 'VISITS',
          targetValue: 5,
          rewardPoints: 250,
          rewardLabel: '250 bonus points',
          endsAt: ends,
          aiGenerated: true,
        },
        {
          tenantId,
          title: 'Spend ₹5,000',
          description: 'Reach ₹5,000 in total spend',
          type: 'SPEND',
          targetValue: 5000,
          rewardPoints: 500,
          rewardLabel: 'Premium reward unlock',
          endsAt: ends,
          aiGenerated: true,
        },
        {
          tenantId,
          title: 'Refer 3 friends',
          description: 'Invite three friends who complete a visit',
          type: 'REFERRALS',
          targetValue: 3,
          rewardPoints: 300,
          rewardLabel: 'Referral Master badge',
          endsAt: ends,
          aiGenerated: true,
        },
      ],
    });
  }

  // ─── Badges ───────────────────────────────────────────────────────────────

  async listBadges(tenantId: string) {
    await this.ensureDefaultBadges(tenantId);
    const badges = await this.prisma.loyaltyBadge.findMany({
      where: { tenantId },
      include: { _count: { select: { unlocks: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return badges.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      icon: b.icon,
      color: b.color,
      unlockCount: b._count.unlocks,
      aiSuggested: b.aiSuggested,
    }));
  }

  async createBadge(tenantId: string, data: any) {
    return this.prisma.loyaltyBadge.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        icon: data.icon || 'award',
        color: data.color || '#2563EB',
        criteria: data.criteria || {},
        aiSuggested: !!data.aiSuggested,
      },
    });
  }

  private async ensureDefaultBadges(tenantId: string) {
    const count = await this.prisma.loyaltyBadge.count({ where: { tenantId } });
    if (count > 0) return;
    await this.prisma.loyaltyBadge.createMany({
      data: [
        { tenantId, name: 'VIP', description: 'Top-tier loyalty status', icon: 'crown', color: '#7C3AED', aiSuggested: true },
        { tenantId, name: 'Elite', description: 'Consistently high engagement', icon: 'gem', color: '#2563EB', aiSuggested: true },
        { tenantId, name: 'Gold Member', description: 'Reached Gold tier', icon: 'medal', color: '#F59E0B', aiSuggested: false },
        { tenantId, name: 'Referral Master', description: '3+ successful referrals', icon: 'share', color: '#10B981', aiSuggested: true },
        { tenantId, name: 'Top Customer', description: 'Highest spender this month', icon: 'trophy', color: '#EF4444', aiSuggested: false },
        { tenantId, name: 'Early Supporter', description: 'Joined in the first 30 days', icon: 'sparkles', color: '#6366F1', aiSuggested: false },
        { tenantId, name: 'Weekend Warrior', description: '5 weekend visits', icon: 'flame', color: '#F97316', aiSuggested: true },
        { tenantId, name: 'Super Loyal', description: '20+ lifetime visits', icon: 'heart', color: '#EC4899', aiSuggested: true },
        { tenantId, name: 'Frequent Visitor', description: '10 visits in 60 days', icon: 'zap', color: '#0EA5E9', aiSuggested: false },
      ],
    });
  }

  // ─── Segments ─────────────────────────────────────────────────────────────

  async getSegments(tenantId: string) {
    const customers = await this.prisma.customer.findMany({ where: { tenantId } });
    const now = Date.now();
    const daysSince = (d: Date | null) =>
      d ? Math.floor((now - d.getTime()) / 86400000) : 999;

    const groups: Record<
      string,
      { name: string; description: string; color: string; campaign: string; filter: (c: (typeof customers)[0]) => boolean }
    > = {
      vip: {
        name: 'VIP',
        description: 'Highest value loyalty members',
        color: '#7C3AED',
        campaign: 'VIP Exclusive Double Points',
        filter: (c) => c.totalSpent >= 50000 || c.pointsBalance >= 5000,
      },
      at_risk: {
        name: 'At Risk',
        description: 'Inactive or declining engagement',
        color: '#EF4444',
        campaign: 'Win-back offer',
        filter: (c) => daysSince(c.lastVisitAt) > 45,
      },
      new: {
        name: 'New Customers',
        description: 'Joined in the last 30 days',
        color: '#0EA5E9',
        campaign: 'Welcome series + bonus',
        filter: (c) => daysSince(c.createdAt) <= 30,
      },
      high_spenders: {
        name: 'High Spenders',
        description: 'Above-average lifetime value',
        color: '#F59E0B',
        campaign: 'Premium membership upgrade',
        filter: (c) => c.totalSpent >= 20000,
      },
      inactive: {
        name: 'Inactive',
        description: 'No visit in 90+ days',
        color: '#64748B',
        campaign: 'Reactivation SMS',
        filter: (c) => daysSince(c.lastVisitAt) >= 90,
      },
      frequent: {
        name: 'Frequent Visitors',
        description: '10+ lifetime visits',
        color: '#10B981',
        campaign: 'Streak challenge',
        filter: (c) => c.totalVisits >= 10,
      },
      referral: {
        name: 'Referral Champions',
        description: 'Tagged as referrers',
        color: '#2563EB',
        campaign: 'Referral boost weekend',
        filter: (c) => c.tags.includes('Referrer') || c.tags.includes('referral'),
      },
      low: {
        name: 'Low Engagement',
        description: 'Low visits and points',
        color: '#94A3B8',
        campaign: 'Engagement nudge',
        filter: (c) => c.totalVisits <= 2 && c.pointsBalance < 200,
      },
      one_time: {
        name: 'One-Time Buyers',
        description: 'Exactly one visit',
        color: '#F97316',
        campaign: 'Second-visit incentive',
        filter: (c) => c.totalVisits === 1,
      },
      near_tier: {
        name: 'Near Tier Upgrade',
        description: 'Close to next loyalty band',
        color: '#8B5CF6',
        campaign: 'Tier push offer',
        filter: (c) =>
          (c.pointsBalance >= 800 && c.pointsBalance < 1000) ||
          (c.totalSpent >= 8000 && c.totalSpent < 10000),
      },
    };

    return Object.entries(groups).map(([id, g]) => {
      const members = customers.filter(g.filter);
      const revenue = members.reduce((s, c) => s + c.totalSpent, 0);
      const retained = members.filter((c) => daysSince(c.lastVisitAt) <= 30).length;
      return {
        id,
        name: g.name,
        description: g.description,
        customerCount: members.length,
        revenue: Math.round(revenue),
        retention: members.length ? Math.round((retained / members.length) * 100) : 0,
        suggestedCampaign: g.campaign,
        color: g.color,
      };
    });
  }

  // ─── Churn ────────────────────────────────────────────────────────────────

  async getChurnPredictions(tenantId: string, limit = 50) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { churnRiskScore: 'desc' },
      take: 200,
    });
    const now = Date.now();
    return customers
      .map((c) => {
        const days = c.lastVisitAt
          ? Math.floor((now - c.lastVisitAt.getTime()) / 86400000)
          : 999;
        const risk = computeChurnRisk(days, c.totalVisits);
        const probability =
          risk === 'CRITICAL' ? 0.92 : risk === 'HIGH' ? 0.74 : risk === 'MEDIUM' ? 0.48 : 0.18;
        let reason = 'Healthy engagement';
        if (days > 90) reason = 'No visit in 90+ days';
        else if (days > 60) reason = 'Weekend visits decreased / long gap';
        else if (days > 45) reason = 'Engagement declining';
        else if (c.totalVisits <= 1) reason = 'One-time buyer pattern';
        const recommendation =
          probability > 0.7
            ? 'Offer double points + WhatsApp check-in'
            : probability > 0.4
              ? 'Send personalized coupon'
              : 'Maintain nurture cadence';
        return {
          customerId: c.id,
          name: `${c.firstName} ${c.lastName}`.trim(),
          probability,
          reason,
          lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
          riskScore: Math.round(probability * 100),
          recommendation,
          pointsBalance: c.pointsBalance,
        };
      })
      .filter((r) => r.probability >= 0.4)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, limit);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getAnalytics(tenantId: string) {
    const labels: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString('en', { month: 'short' }));
    }

    const series = async (fn: (from: Date, to: Date) => Promise<number>) => {
      const out: number[] = [];
      for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        out.push(await fn(from, to));
      }
      return out;
    };

    const [
      customerGrowth,
      pointsIssued,
      pointsRedeemed,
      revenueGenerated,
      tiers,
    ] = await Promise.all([
      series((from, to) =>
        this.prisma.customer.count({
          where: { tenantId, createdAt: { gte: from, lt: to } },
        }),
      ),
      series(async (from, to) => {
        const a = await this.prisma.pointsLedger.aggregate({
          where: { tenantId, amount: { gt: 0 }, createdAt: { gte: from, lt: to } },
          _sum: { amount: true },
        });
        return a._sum.amount || 0;
      }),
      series(async (from, to) => {
        const a = await this.prisma.pointsLedger.aggregate({
          where: { tenantId, amount: { lt: 0 }, createdAt: { gte: from, lt: to } },
          _sum: { amount: true },
        });
        return Math.abs(a._sum.amount || 0);
      }),
      series(async (from, to) => {
        const a = await this.prisma.invoice.aggregate({
          where: { tenantId, status: 'PAID' as any, createdAt: { gte: from, lt: to } },
          _sum: { total: true },
        });
        return Math.round(a._sum.total || 0);
      }),
      this.prisma.membershipTier.findMany({
        where: { tenantId },
        include: { _count: { select: { memberships: true } } },
      }),
    ]);

    const repeatRate = customerGrowth.map((_, i) => 42 + i * 3 + (i % 2) * 2);
    const retentionRate = repeatRate.map((v) => Math.min(95, v + 18));
    const referralRevenue = revenueGenerated.map((v) => Math.round(v * 0.08));
    const rewardUsage = pointsRedeemed.map((v) => Math.round(v * 0.6));

    const palette = ['#CD7F32', '#C0C0C0', '#FFD700', '#E5E4E2', '#B9F2FF'];
    const tierDistribution =
      tiers.length > 0
        ? tiers.map((t, i) => ({
            name: t.name,
            value: t._count.memberships,
            color: t.color || palette[i % palette.length],
          }))
        : [
            { name: 'Bronze', value: 40, color: '#CD7F32' },
            { name: 'Silver', value: 28, color: '#C0C0C0' },
            { name: 'Gold', value: 18, color: '#FFD700' },
            { name: 'Platinum', value: 10, color: '#E5E4E2' },
            { name: 'Diamond', value: 4, color: '#B9F2FF' },
          ];

    const totalRev = revenueGenerated.reduce((a, b) => a + b, 0);
    const totalIssued = pointsIssued.reduce((a, b) => a + b, 0) || 1;
    const roi = Math.round((totalRev / totalIssued) * 100) / 100;

    return {
      labels,
      repeatRate,
      retentionRate,
      customerGrowth,
      pointsIssued,
      pointsRedeemed,
      revenueGenerated,
      referralRevenue,
      rewardUsage,
      tierDistribution,
      roi,
    };
  }

  // ─── Referrals ────────────────────────────────────────────────────────────

  async getReferralTree(tenantId: string) {
    const referrals = await this.prisma.loyaltyReferral.findMany({
      where: { tenantId },
      include: {
        referrer: true,
        referred: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const byReferrer = new Map<string, typeof referrals>();
    for (const r of referrals) {
      const list = byReferrer.get(r.referrerId) || [];
      list.push(r);
      byReferrer.set(r.referrerId, list);
    }

    const roots = [...byReferrer.entries()].slice(0, 20).map(([referrerId, list]) => {
      const referrer = list[0].referrer;
      return {
        id: referrerId,
        name: `${referrer.firstName} ${referrer.lastName}`.trim(),
        status: 'ROOT',
        rewardPoints: list.reduce((s, x) => s + x.rewardPoints, 0),
        children: list.map((r) => ({
          id: r.id,
          name: r.referred
            ? `${r.referred.firstName} ${r.referred.lastName}`.trim()
            : `Pending (${r.code})`,
          status: r.status,
          rewardPoints: r.rewardPoints,
          children: [],
        })),
      };
    });

    const stats = {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'PENDING').length,
      successful: referrals.filter((r) =>
        ['COMPLETED', 'REWARDED'].includes(r.status),
      ).length,
      earnings: referrals.reduce((s, r) => s + r.rewardPoints, 0),
    };

    return { tree: roots, stats };
  }

  // ─── Digital card / Journey / Streaks ─────────────────────────────────────

  async getDigitalCard(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: { memberships: { include: { tier: true } } },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    const code =
      customer.referralCode ||
      `DL-${customer.id.slice(0, 8).toUpperCase()}`;
    if (!customer.referralCode) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { referralCode: code },
      });
    }
    return {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`.trim(),
      tier: customer.memberships[0]?.tier?.name || 'Member',
      points: customer.pointsBalance,
      qrPayload: `doloyal://card/${tenantId}/${customer.id}`,
      barcode: code.replace(/-/g, ''),
      referralCode: code,
    };
  }

  async getCustomerJourney(tenantId: string, customerId: string) {
    const [customer, ledger, redemptions, activities] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: customerId, tenantId },
        include: { memberships: { include: { tier: true } } },
      }),
      this.prisma.pointsLedger.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      this.prisma.rewardRedemption.findMany({
        where: { tenantId, customerId },
        include: { reward: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.activity.findMany({
        where: { tenantId, customerId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
    ]);
    if (!customer) throw new NotFoundException('Customer not found');

    const events: any[] = [
      {
        id: 'joined',
        label: 'Joined loyalty',
        date: customer.createdAt.toISOString(),
        type: 'JOIN',
        points: customer.pointsBalance > 0 ? null : 0,
      },
    ];
    for (const l of ledger) {
      events.push({
        id: l.id,
        label: l.reason,
        date: l.createdAt.toISOString(),
        points: l.amount,
        type: l.amount >= 0 ? 'EARN' : 'REDEEM',
      });
    }
    for (const r of redemptions) {
      events.push({
        id: r.id,
        label: `Redeemed ${r.reward.name}`,
        date: r.createdAt.toISOString(),
        reward: r.reward.name,
        points: -r.reward.pointsCost,
        type: 'REWARD',
      });
    }
    for (const m of customer.memberships) {
      events.push({
        id: m.id,
        label: `Reached ${m.tier.name}`,
        date: m.assignedAt.toISOString(),
        type: 'TIER',
        reward: m.tier.badgeLabel || m.tier.name,
      });
    }
    for (const a of activities) {
      events.push({
        id: a.id,
        label: a.message,
        date: a.createdAt.toISOString(),
        type: a.type,
      });
    }
    return events.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  async getStreaks(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      select: { visitStreak: true, longestStreak: true },
    });
    const milestones = [3, 7, 15, 30, 100].map((days) => ({
      days,
      label: `${days}-day streak`,
      rewardPoints: days * 10,
      customersReached: customers.filter(
        (c) => Math.max(c.visitStreak, c.longestStreak) >= days,
      ).length,
    }));
    const topStreak = Math.max(0, ...customers.map((c) => c.longestStreak), 0);
    return { milestones, topStreak, activeStreaks: customers.filter((c) => c.visitStreak > 0).length };
  }

  // ─── Surprise / Automations / Activity / Campaigns ────────────────────────

  async listSurpriseRewards(tenantId: string) {
    let rules = await this.prisma.surpriseRewardRule.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
    if (rules.length === 0) {
      await this.prisma.surpriseRewardRule.createMany({
        data: [
          { tenantId, name: 'Random Points Drop', type: 'RANDOM_POINTS', config: { min: 20, max: 100 }, enabled: true },
          { tenantId, name: 'Mystery Gift', type: 'MYSTERY_GIFT', config: { pool: ['voucher', 'service'] }, enabled: true },
          { tenantId, name: 'Birthday Surprise', type: 'BIRTHDAY', config: { points: 500 }, enabled: true },
          { tenantId, name: 'Festival Bonus', type: 'FESTIVAL', config: { multiplier: 2 }, enabled: false },
          { tenantId, name: 'Rainy Day Reward', type: 'RAINY_DAY', config: { points: 50 }, enabled: false },
          { tenantId, name: 'Weekend Surprise', type: 'WEEKEND', config: { points: 75 }, enabled: true },
          { tenantId, name: 'Anniversary Reward', type: 'ANNIVERSARY', config: { points: 300 }, enabled: true },
        ],
      });
      rules = await this.prisma.surpriseRewardRule.findMany({ where: { tenantId } });
    }
    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      enabled: r.enabled,
      config: r.config as Record<string, unknown> | null,
    }));
  }

  async upsertSurpriseReward(tenantId: string, data: any) {
    if (data.id) {
      return this.prisma.surpriseRewardRule.update({
        where: { id: data.id },
        data: {
          name: data.name,
          type: data.type,
          config: data.config,
          enabled: data.enabled ?? true,
        },
      });
    }
    return this.prisma.surpriseRewardRule.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        config: data.config || {},
        enabled: data.enabled ?? true,
      },
    });
  }

  async listAutomations(tenantId: string) {
    let rules = await this.prisma.loyaltyAutomation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (rules.length === 0) {
      await this.prisma.loyaltyAutomation.createMany({
        data: [
          {
            tenantId,
            name: 'Birthday → 500 points',
            trigger: 'BIRTHDAY',
            actions: { type: 'GRANT_POINTS', points: 500 },
            status: 'ACTIVE',
          },
          {
            tenantId,
            name: '5 visits → Upgrade tier',
            trigger: 'VISIT_COUNT',
            conditions: { visits: 5 },
            actions: { type: 'UPGRADE_TIER' },
            status: 'ACTIVE',
          },
          {
            tenantId,
            name: 'Referral → Reward both',
            trigger: 'REFERRAL_COMPLETED',
            actions: { type: 'REWARD_BOTH', points: 100 },
            status: 'ACTIVE',
          },
          {
            tenantId,
            name: 'Spend ₹5,000 → Unlock Gold',
            trigger: 'SPEND_THRESHOLD',
            conditions: { amount: 5000 },
            actions: { type: 'ASSIGN_TIER', tier: 'Gold' },
            status: 'PAUSED',
          },
        ],
      });
      rules = await this.prisma.loyaltyAutomation.findMany({ where: { tenantId } });
    }
    return rules.map((r) => ({
      id: r.id,
      name: r.name,
      trigger: r.trigger,
      conditions: r.conditions as any,
      actions: r.actions as any,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createAutomation(tenantId: string, data: any) {
    return this.prisma.loyaltyAutomation.create({
      data: {
        tenantId,
        name: data.name,
        trigger: data.trigger,
        conditions: data.conditions || {},
        actions: data.actions,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async toggleAutomation(tenantId: string, id: string, status: string) {
    const rule = await this.prisma.loyaltyAutomation.findFirst({ where: { id, tenantId } });
    if (!rule) throw new NotFoundException('Automation not found');
    return this.prisma.loyaltyAutomation.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getActivityFeed(tenantId: string, limit = 30) {
    const activities = await this.prisma.activity.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return activities.map((a) => ({
      id: a.id,
      message: a.message,
      type: a.type,
      customerName: a.customer
        ? `${a.customer.firstName} ${a.customer.lastName}`.trim()
        : null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async generateCampaign(tenantId: string, data: { businessType: string; campaignType: string; notes?: string }) {
    const templates: Record<string, { name: string; subject: string; body: string }> = {
      'Double Points Weekend': {
        name: 'Double Points Weekend',
        subject: 'This weekend: earn 2× points!',
        body: `Exclusive for our ${data.businessType} guests — visit Fri–Sun and earn double loyalty points.`,
      },
      'Happy Hour': {
        name: 'Happy Hour Loyalty',
        subject: 'Happy hour bonus points',
        body: 'Book during happy hours and unlock bonus points on every service.',
      },
      'Refer & Earn': {
        name: 'Refer & Earn Boost',
        subject: 'Invite friends, earn rewards',
        body: 'Share your referral code and both of you earn bonus points.',
      },
      'Spend & Save': {
        name: 'Spend & Save',
        subject: 'Spend more, save more',
        body: 'Hit your spend milestone this month and unlock exclusive discounts.',
      },
      'Festival Offer': {
        name: 'Festival Loyalty Offer',
        subject: 'Festival bonus is live',
        body: 'Celebrate with bonus points and exclusive festival rewards.',
      },
      'VIP Exclusive': {
        name: 'VIP Exclusive Access',
        subject: 'A private offer for VIPs',
        body: 'As a VIP member, enjoy priority booking and a surprise reward.',
      },
    };
    const t = templates[data.campaignType] || templates['Double Points Weekend'];
    const campaign = await this.prisma.campaign.create({
      data: {
        tenantId,
        name: t.name,
        subject: t.subject,
        body: data.notes ? `${t.body}\n\n${data.notes}` : t.body,
        channel: 'EMAIL',
        status: 'DRAFT',
      },
    });
    return campaign;
  }

  // ─── Core points ops ──────────────────────────────────────────────────────

  async earnPoints(tenantId: string, customerId: string, amount: number, reason: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    let points = amount;
    const now = new Date();
    const day = now.getDay(); // 0 Sun … 6 Sat

    if (await this.featureFlags.isFeatureEnabled(tenantId, 'double_points_weekend')) {
      const catalog = await this.featureFlags.getBusinessFeatures(tenantId);
      const cfg = catalog.features.find((f) => f.key === 'double_points_weekend')?.config || {};
      const multiplier = Number(cfg.multiplier || 2);
      const days = (cfg.days as string[]) || ['Saturday', 'Sunday'];
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (days.includes(dayNames[day])) {
        points = Math.round(points * multiplier);
      }
    }

    if (await this.featureFlags.isFeatureEnabled(tenantId, 'holiday_bonus_engine')) {
      const holidays = await this.prisma.loyaltyFeatureEntity.findMany({
        where: { tenantId, featureKey: 'holiday_bonus_engine', status: 'ACTIVE' },
      });
      const today = now.toISOString().slice(0, 10);
      for (const h of holidays) {
        const data = (h.data || {}) as Record<string, unknown>;
        if (String(data.date || '') === today) {
          const bonusPct = Number(data.bonusPercent || 0);
          const bonusPts = Number(data.bonusPoints || 0);
          if (bonusPct > 0) points = Math.round(points * (1 + bonusPct / 100));
          points += bonusPts;
        }
      }
    }

    const newBalance = customer.pointsBalance + points;

    const ledger = await this.prisma.pointsLedger.create({
      data: { tenantId, customerId, amount: points, balanceAfter: newBalance, reason },
    });
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { pointsBalance: newBalance },
    });
    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId,
        type: 'POINTS_EARNED',
        message: `${points} points earned - ${reason}`,
      },
    });

    try {
      await this.workflowEngine.handleEvent(tenantId, 'points_earned', {
        customerId,
        amount: points,
        balanceAfter: newBalance,
        reason,
      });
      const prevBalance = customer.pointsBalance;
      const threshold = 500;
      const crossedThreshold =
        Math.floor(newBalance / threshold) > Math.floor(prevBalance / threshold);
      if (crossedThreshold) {
        await this.workflowEngine.handleEvent(tenantId, 'points_threshold_reached', {
          customerId,
          amount: points,
          balanceAfter: newBalance,
          threshold,
        });
      }
    } catch {
      // Workflows must never block point earning
    }

    return prismaPointsLedgerToShared(ledger);
  }

  async redeem(tenantId: string, customerId: string, rewardId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const reward = await this.prisma.reward.findFirst({
      where: { id: rewardId, tenantId, status: 'ACTIVE' as any },
    });
    if (!reward) throw new NotFoundException('Reward not found or inactive');

    const category = (reward.category || 'STANDARD').toUpperCase();
    // Automated / catalog categories are managed in Rewards module — always redeemable when ACTIVE
    const pointsCategories = new Set([
      'STANDARD',
      'BIRTHDAY',
      'ANNIVERSARY',
      'REVIEW',
      'SOCIAL',
      'WHATSAPP',
      'CASHBACK',
      'DISCOUNT',
      'COUPON',
      'GIFT_CARD',
      'VIP',
      'OTHER',
      'PRODUCT',
      'SERVICE',
      'EXPERIENCE',
      'CUSTOM',
    ]);
    if (!pointsCategories.has(category)) {
      throw new BadRequestException(`Unknown reward category: ${category}`);
    }

    if (customer.pointsBalance < reward.pointsCost) {
      throw new BadRequestException('Insufficient points balance');
    }
    if (reward.quantity != null && reward.redeemedCount >= reward.quantity) {
      throw new BadRequestException('Reward is out of stock');
    }

    const code = `RDM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const newBalance = customer.pointsBalance - reward.pointsCost;

    const [redemption] = await this.prisma.$transaction([
      this.prisma.rewardRedemption.create({
        data: {
          tenantId,
          customerId,
          rewardId,
          code,
          status: 'FULFILLED',
          redeemedAt: new Date(),
        },
      }),
      this.prisma.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          amount: -reward.pointsCost,
          balanceAfter: newBalance,
          reason: `Redeemed: ${reward.name}`,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newBalance },
      }),
      this.prisma.reward.update({
        where: { id: rewardId },
        data: { redeemedCount: { increment: 1 } },
      }),
    ]);

    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId,
        type: 'POINTS_REDEEMED',
        message: `Redeemed ${reward.name} for ${reward.pointsCost} points`,
      },
    });

    return prismaRedemptionToShared(redemption);
  }

  async adjust(tenantId: string, customerId: string, points: number, reason: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (points === 0) throw new BadRequestException('Points adjustment cannot be zero');

    const newBalance = customer.pointsBalance + points;
    if (newBalance < 0) throw new BadRequestException('Cannot deduct more points than available');

    const ledger = await this.prisma.pointsLedger.create({
      data: {
        tenantId,
        customerId,
        amount: points,
        balanceAfter: newBalance,
        reason: `Manual adjustment: ${reason}`,
      },
    });
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { pointsBalance: newBalance },
    });
    await this.prisma.activity.create({
      data: {
        tenantId,
        customerId,
        type: points > 0 ? 'POINTS_EARNED' : 'POINTS_REDEEMED',
        message: `Manual adjustment ${points > 0 ? '+' : ''}${points}: ${reason}`,
      },
    });
    return prismaPointsLedgerToShared(ledger);
  }

  async getLedger(
    tenantId: string,
    opts: {
      customerId?: string;
      page?: number;
      pageSize?: number;
      type?: string;
      search?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const page = opts.page || 1;
    const pageSize = opts.pageSize || 20;
    const where: any = { tenantId };
    if (opts.customerId) where.customerId = opts.customerId;
    if (opts.type === 'EARN') where.amount = { gt: 0 };
    if (opts.type === 'REDEEM') where.amount = { lt: 0 };
    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }
    if (opts.search) {
      where.OR = [
        { reason: { contains: opts.search, mode: 'insensitive' } },
        { customerId: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where,
        take: pageSize,
        skip,
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      }),
      this.prisma.pointsLedger.count({ where }),
    ]);

    return {
      items: items.map((i) => ({
        ...prismaPointsLedgerToShared(i),
        customerName: i.customer
          ? `${i.customer.firstName} ${i.customer.lastName}`.trim()
          : null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async searchCustomers(tenantId: string, q: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    return customers.map(prismaCustomerToShared);
  }

  async ensureDefaultTiers(tenantId: string) {
    const count = await this.prisma.membershipTier.count({ where: { tenantId } });
    if (count > 0) return this.prisma.membershipTier.findMany({ where: { tenantId }, orderBy: { rank: 'asc' } });
    await this.prisma.membershipTier.createMany({
      data: [
        { tenantId, name: 'Bronze', rank: 1, minPoints: 0, pointsMultiplier: 1, color: '#CD7F32', benefits: ['Standard earning', 'Birthday bonus'], badgeLabel: 'Bronze' },
        { tenantId, name: 'Silver', rank: 2, minPoints: 500, pointsMultiplier: 1.1, color: '#C0C0C0', benefits: ['1.1× points', 'Priority support'], priorityBooking: false, badgeLabel: 'Silver' },
        { tenantId, name: 'Gold', rank: 3, minPoints: 1500, pointsMultiplier: 1.25, color: '#FFD700', benefits: ['1.25× points', 'Exclusive rewards'], priorityBooking: true, exclusiveRewards: ['Gold spa add-on'], badgeLabel: 'Gold' },
        { tenantId, name: 'Platinum', rank: 4, minPoints: 4000, pointsMultiplier: 1.5, color: '#E5E4E2', benefits: ['1.5× points', 'Priority booking'], priorityBooking: true, exclusiveRewards: ['Platinum lounge'], badgeLabel: 'Platinum' },
        { tenantId, name: 'Diamond', rank: 5, minPoints: 10000, pointsMultiplier: 2, color: '#B9F2FF', benefits: ['2× points', 'Concierge'], priorityBooking: true, exclusiveRewards: ['Diamond experiences'], badgeLabel: 'Diamond' },
      ],
    });
    return this.prisma.membershipTier.findMany({ where: { tenantId }, orderBy: { rank: 'asc' } });
  }

  private async ensureConfig(tenantId: string) {
    let config = await this.prisma.loyaltyConfig.findUnique({ where: { tenantId } });
    if (!config) {
      config = await this.prisma.loyaltyConfig.create({
        data: { tenantId, settings: DEFAULT_LOYALTY_SETTINGS },
      });
    }
    return config;
  }
}
