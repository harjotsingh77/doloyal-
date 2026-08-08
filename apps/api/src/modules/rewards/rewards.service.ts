import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaRewardToShared, prismaRedemptionToShared } from '../../common/helpers';
import {
  REWARD_CATEGORIES,
  REWARD_PROGRAM_TYPES,
  type RewardProgramType,
} from '@doloyal/shared';

const DEFAULT_PROGRAM_CONFIGS: Record<RewardProgramType, Record<string, unknown>> = {
  BIRTHDAY: {
    rewardType: 'POINTS',
    bonusPoints: 100,
    couponCode: '',
    freeService: '',
    giftLabel: '',
    validityDays: 14,
    sendAutomatically: true,
    daysBefore: 0,
    daysAfter: 0,
    emailNotification: true,
    smsNotification: false,
    whatsappNotification: true,
  },
  ANNIVERSARY: {
    rewardType: 'POINTS',
    bonusPoints: 250,
    couponCode: '',
    giftLabel: '',
    yearsRequired: 1,
    validityDays: 30,
    automaticDelivery: true,
  },
  REVIEW: {
    pointsReward: 50,
    couponReward: '',
    verificationMethod: 'manual',
    minimumRating: 4,
    oneRewardPerCustomer: true,
    approvalRequired: true,
  },
  SOCIAL: {
    platforms: ['Instagram', 'Facebook', 'Stories', 'Posts'],
    points: 30,
    coupon: '',
    verification: 'manual',
    maxRewardsPerCustomer: 5,
    validityDays: 30,
  },
  WHATSAPP: {
    rewardType: 'COUPON',
    rewardLabel: 'WhatsApp join bonus',
    bonusPoints: 50,
    messageTemplate: 'Thanks for joining our WhatsApp community! Here is your reward.',
    expiryDays: 30,
    automation: true,
  },
  CASHBACK: {
    conversionRate: 0.1, // ₹ per point
    minimumPoints: 100,
    maximumCashback: 2000,
    expiryDays: 90,
    eligibleCustomers: 'all',
  },
};

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const [
      totalRewards,
      activeRewards,
      redeemedAgg,
      pendingRewards,
      cashbackAgg,
      birthdaySent,
    ] = await Promise.all([
      this.prisma.reward.count({ where: { tenantId } }),
      this.prisma.reward.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.rewardRedemption.count({
        where: { tenantId, status: { in: ['FULFILLED', 'PENDING'] } },
      }),
      this.prisma.rewardRedemption.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.cashbackTransaction.aggregate({
        where: { tenantId, status: 'COMPLETED' },
        _sum: { cashbackAmount: true },
      }),
      this.prisma.rewardRedemption.count({
        where: {
          tenantId,
          createdAt: { gte: yearStart },
          reward: { category: 'BIRTHDAY' },
        },
      }),
    ]);

    return {
      totalRewards,
      activeRewards,
      redeemedRewards: redeemedAgg,
      pendingRewards,
      cashbackIssued: cashbackAgg._sum.cashbackAmount || 0,
      birthdayRewardsSent: birthdaySent,
    };
  }

  async list(
    tenantId: string,
    opts: { category?: string; status?: string; search?: string } = {},
  ) {
    const where: any = { tenantId };
    if (opts.category && opts.category !== 'ALL') where.category = opts.category;
    if (opts.status) where.status = opts.status;
    if (opts.search?.trim()) {
      where.OR = [
        { name: { contains: opts.search.trim(), mode: 'insensitive' } },
        { description: { contains: opts.search.trim(), mode: 'insensitive' } },
      ];
    }

    const rewards = await this.prisma.reward.findMany({
      where,
      include: { _count: { select: { redemptions: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map(prismaRewardToShared);
  }

  async create(tenantId: string, data: Record<string, any>) {
    const unlimited = data.unlimitedStock === true || data.totalQuantity == null;
    const category = this.normalizeCategory(data.category);
    const status = data.status || 'DRAFT';

    const reward = await this.prisma.reward.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        pointsCost: Number(data.pointsCost || 0),
        discountVal: Number(data.discountVal || data.rewardValue || 0),
        rewardValue: Number(data.rewardValue || data.discountVal || 0),
        imageUrl: data.imageUrl || null,
        terms: data.terms || null,
        status: status as any,
        validityDays: Number(data.validityDays || 90),
        quantity: unlimited ? null : Number(data.totalQuantity),
        category,
        rewardType: data.rewardType || 'CUSTOM',
        startsAt: data.startsAt ? new Date(data.startsAt) : null,
        expiresAt: data.expiresAt
          ? new Date(data.expiresAt)
          : data.validityDays
            ? new Date(Date.now() + Number(data.validityDays) * 86400000)
            : null,
        branchIds: data.branchIds || [],
        tierRequired: data.tierRequired || null,
        membershipRequired: data.membershipRequired || null,
      },
    });

    await this.audit(tenantId, 'REWARD_CREATED', reward.id, { after: reward });

    return prismaRewardToShared({ ...reward, _count: { redemptions: 0 } });
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const reward = await this.prisma.reward.findFirst({ where: { id, tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');

    const updateData: any = {};
    const map: Record<string, string> = {
      name: 'name',
      description: 'description',
      pointsCost: 'pointsCost',
      discountVal: 'discountVal',
      rewardValue: 'rewardValue',
      imageUrl: 'imageUrl',
      terms: 'terms',
      status: 'status',
      validityDays: 'validityDays',
      category: 'category',
      rewardType: 'rewardType',
      tierRequired: 'tierRequired',
      membershipRequired: 'membershipRequired',
    };

    for (const [k, field] of Object.entries(map)) {
      if (data[k] !== undefined) updateData[field] = data[k];
    }

    if (data.unlimitedStock === true) updateData.quantity = null;
    else if (data.totalQuantity !== undefined) {
      updateData.quantity = data.totalQuantity as number | null;
    }
    if (data.startsAt !== undefined) {
      updateData.startsAt = data.startsAt ? new Date(String(data.startsAt)) : null;
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(String(data.expiresAt)) : null;
    } else if (data.validityDays) {
      updateData.expiresAt = new Date(Date.now() + Number(data.validityDays) * 86400000);
    }
    if (data.branchIds !== undefined) updateData.branchIds = data.branchIds;
    if (data.category) updateData.category = this.normalizeCategory(String(data.category));
    if (data.rewardValue !== undefined && data.discountVal === undefined) {
      updateData.discountVal = data.rewardValue;
    }

    const updated = await this.prisma.reward.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { redemptions: true } } },
    });

    await this.audit(tenantId, 'REWARD_UPDATED', id, { before: reward, after: updated });
    return prismaRewardToShared(updated);
  }

  async duplicate(tenantId: string, id: string) {
    const reward = await this.prisma.reward.findFirst({ where: { id, tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');

    const copy = await this.prisma.reward.create({
      data: {
        tenantId,
        name: `${reward.name} (Copy)`,
        description: reward.description,
        pointsCost: reward.pointsCost,
        discountVal: reward.discountVal,
        rewardValue: reward.rewardValue,
        imageUrl: reward.imageUrl,
        terms: reward.terms,
        status: 'DRAFT',
        validityDays: reward.validityDays,
        quantity: reward.quantity,
        category: reward.category,
        rewardType: reward.rewardType,
        startsAt: reward.startsAt,
        expiresAt: reward.expiresAt,
        branchIds: reward.branchIds,
        tierRequired: reward.tierRequired,
        membershipRequired: reward.membershipRequired,
        metadata: reward.metadata as any,
        redeemedCount: 0,
      },
    });

    await this.audit(tenantId, 'REWARD_DUPLICATED', copy.id, { sourceId: id });
    return prismaRewardToShared({ ...copy, _count: { redemptions: 0 } });
  }

  async archive(tenantId: string, id: string) {
    return this.update(tenantId, id, { status: 'ARCHIVED' });
  }

  async deactivate(tenantId: string, id: string) {
    return this.archive(tenantId, id);
  }

  async hardDelete(tenantId: string, id: string) {
    const reward = await this.prisma.reward.findFirst({ where: { id, tenantId } });
    if (!reward) throw new NotFoundException('Reward not found');
    const count = await this.prisma.rewardRedemption.count({ where: { rewardId: id } });
    if (count > 0) {
      throw new BadRequestException('Cannot delete a reward with redemptions. Archive it instead.');
    }
    await this.prisma.reward.delete({ where: { id } });
    await this.audit(tenantId, 'REWARD_DELETED', id, { before: reward });
    return { ok: true };
  }

  async listRedemptions(
    tenantId: string,
    query: {
      status?: string;
      rewardId?: string;
      customerId?: string;
      category?: string;
      search?: string;
      limit?: number;
      cursor?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const page = query.page || 1;
    const pageSize = Math.min(query.pageSize || query.limit || 20, 100);
    const where: any = { tenantId };

    if (query.status) where.status = query.status;
    if (query.rewardId) where.rewardId = query.rewardId;
    if (query.customerId) where.customerId = query.customerId;
    if (query.category) where.reward = { category: query.category };
    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { customer: { firstName: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
        { reward: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.rewardRedemption.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { reward: true, customer: true },
      }),
      this.prisma.rewardRedemption.count({ where }),
    ]);

    return {
      items: items.map(prismaRedemptionToShared),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      nextCursor: null,
      hasMore: page * pageSize < total,
    };
  }

  // ─── Program configs ───────────────────────────────────────────────────────

  async ensurePrograms(tenantId: string) {
    for (const programType of REWARD_PROGRAM_TYPES) {
      await this.prisma.rewardProgramConfig.upsert({
        where: { tenantId_programType: { tenantId, programType } },
        create: {
          tenantId,
          programType,
          enabled: false,
          config: DEFAULT_PROGRAM_CONFIGS[programType] as any,
        },
        update: {},
      });
    }
  }

  async listPrograms(tenantId: string) {
    await this.ensurePrograms(tenantId);
    const rows = await this.prisma.rewardProgramConfig.findMany({ where: { tenantId } });
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      programType: r.programType,
      enabled: r.enabled,
      config: {
        ...(DEFAULT_PROGRAM_CONFIGS[r.programType as RewardProgramType] || {}),
        ...((r.config && typeof r.config === 'object' ? r.config : {}) as object),
      },
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async updateProgram(
    tenantId: string,
    programType: string,
    data: { enabled?: boolean; config?: Record<string, unknown> },
  ) {
    if (!(REWARD_PROGRAM_TYPES as readonly string[]).includes(programType)) {
      throw new BadRequestException(`Unknown program: ${programType}`);
    }
    await this.ensurePrograms(tenantId);
    const existing = await this.prisma.rewardProgramConfig.findUnique({
      where: { tenantId_programType: { tenantId, programType } },
    });
    const prev =
      existing?.config && typeof existing.config === 'object'
        ? (existing.config as object)
        : DEFAULT_PROGRAM_CONFIGS[programType as RewardProgramType];

    const row = await this.prisma.rewardProgramConfig.update({
      where: { tenantId_programType: { tenantId, programType } },
      data: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.config ? { config: { ...prev, ...data.config } as any } : {}),
      },
    });

    await this.audit(tenantId, 'REWARD_PROGRAM_UPDATED', row.id, {
      programType,
      enabled: row.enabled,
    });

    return {
      id: row.id,
      tenantId: row.tenantId,
      programType: row.programType,
      enabled: row.enabled,
      config: {
        ...(DEFAULT_PROGRAM_CONFIGS[programType as RewardProgramType] || {}),
        ...((row.config && typeof row.config === 'object' ? row.config : {}) as object),
      },
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // ─── Automations ───────────────────────────────────────────────────────────

  async runBirthdayAutomation(tenantId: string) {
    const program = await this.getEnabledProgram(tenantId, 'BIRTHDAY');
    if (!program) return { processed: 0, issued: 0 };

    const cfg = program.config as Record<string, any>;
    const daysBefore = Number(cfg.daysBefore || 0);
    const daysAfter = Number(cfg.daysAfter || 0);
    const today = new Date();
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, dob: { not: null }, status: 'ACTIVE' },
    });

    let issued = 0;
    for (const c of customers) {
      if (!c.dob) continue;
      const anniversary = this.daysFromBirthday(c.dob, today);
      if (anniversary < -daysBefore || anniversary > daysAfter) continue;

      const yearKey = `${today.getFullYear()}`;
      const already = await this.prisma.rewardRedemption.findFirst({
        where: {
          tenantId,
          customerId: c.id,
          reward: { category: 'BIRTHDAY' },
          createdAt: {
            gte: new Date(today.getFullYear(), 0, 1),
            lt: new Date(today.getFullYear() + 1, 0, 1),
          },
        },
      });
      if (already) continue;

      await this.issueAutomatedReward(tenantId, c.id, 'BIRTHDAY', cfg, `Birthday ${yearKey}`);
      issued++;
    }

    return { processed: customers.length, issued };
  }

  async runAnniversaryAutomation(tenantId: string) {
    const program = await this.getEnabledProgram(tenantId, 'ANNIVERSARY');
    if (!program) return { processed: 0, issued: 0 };

    const cfg = program.config as Record<string, any>;
    const yearsRequired = Number(cfg.yearsRequired || 1);
    const today = new Date();
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { memberships: { orderBy: { assignedAt: 'asc' }, take: 1 } },
    });

    let issued = 0;
    for (const c of customers) {
      const start = c.memberships[0]?.assignedAt || c.createdAt;
      const years = this.fullYearsBetween(start, today);
      if (years < yearsRequired) continue;
      if (start.getMonth() !== today.getMonth() || start.getDate() !== today.getDate()) continue;

      const already = await this.prisma.rewardRedemption.findFirst({
        where: {
          tenantId,
          customerId: c.id,
          reward: { category: 'ANNIVERSARY' },
          createdAt: {
            gte: new Date(today.getFullYear(), 0, 1),
          },
        },
      });
      if (already) continue;

      await this.issueAutomatedReward(
        tenantId,
        c.id,
        'ANNIVERSARY',
        cfg,
        `${years}-year anniversary`,
      );
      issued++;
    }

    return { processed: customers.length, issued };
  }

  async submitClaim(
    tenantId: string,
    data: { customerId: string; programType: string; evidence?: Record<string, unknown> },
  ) {
    const programType = data.programType;
    if (!['REVIEW', 'SOCIAL', 'WHATSAPP'].includes(programType)) {
      throw new BadRequestException('Invalid claim program');
    }
    const program = await this.getEnabledProgram(tenantId, programType as RewardProgramType);
    if (!program) throw new ForbiddenException(`${programType} rewards are disabled`);

    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const cfg = program.config as Record<string, any>;
    if (programType === 'REVIEW' && cfg.oneRewardPerCustomer) {
      const prior = await this.prisma.rewardEngagementClaim.findFirst({
        where: { tenantId, customerId: data.customerId, programType, status: 'APPROVED' },
      });
      if (prior) throw new BadRequestException('Customer already received a review reward');
    }

    const points =
      Number(cfg.pointsReward || cfg.points || cfg.bonusPoints || 0) || 0;

    const claim = await this.prisma.rewardEngagementClaim.create({
      data: {
        tenantId,
        customerId: data.customerId,
        programType,
        status: cfg.approvalRequired === false && cfg.verification !== 'manual' ? 'APPROVED' : 'PENDING',
        evidence: (data.evidence || {}) as any,
        rewardPoints: points,
      },
      include: { customer: true },
    });

    if (claim.status === 'APPROVED') {
      await this.fulfillClaim(tenantId, claim.id);
    }

    return this.mapClaim(claim);
  }

  async listClaims(tenantId: string, programType?: string) {
    const claims = await this.prisma.rewardEngagementClaim.findMany({
      where: { tenantId, ...(programType ? { programType } : {}) },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return claims.map((c) => this.mapClaim(c));
  }

  async reviewClaim(tenantId: string, id: string, approve: boolean) {
    const claim = await this.prisma.rewardEngagementClaim.findFirst({
      where: { id, tenantId },
      include: { customer: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');
    if (claim.status !== 'PENDING') throw new BadRequestException('Claim already reviewed');

    if (!approve) {
      const updated = await this.prisma.rewardEngagementClaim.update({
        where: { id },
        data: { status: 'REJECTED', reviewedAt: new Date() },
        include: { customer: true },
      });
      return this.mapClaim(updated);
    }

    return this.fulfillClaim(tenantId, id);
  }

  async redeemCashback(tenantId: string, customerId: string, points: number) {
    const program = await this.getEnabledProgram(tenantId, 'CASHBACK');
    if (!program) throw new ForbiddenException('Cashback rewards are disabled');

    const cfg = program.config as Record<string, any>;
    const min = Number(cfg.minimumPoints || 100);
    const maxCash = Number(cfg.maximumCashback || 2000);
    const rate = Number(cfg.conversionRate || 0.1);

    if (points < min) throw new BadRequestException(`Minimum ${min} points required`);

    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.pointsBalance < points) {
      throw new BadRequestException('Insufficient points balance');
    }

    let cashback = Math.round(points * rate * 100) / 100;
    if (cashback > maxCash) cashback = maxCash;

    const newPoints = customer.pointsBalance - points;
    const newCashback = (customer.cashbackBalance || 0) + cashback;

    const [, , , txn] = await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: { pointsBalance: newPoints, cashbackBalance: newCashback },
      }),
      this.prisma.pointsLedger.create({
        data: {
          tenantId,
          customerId,
          amount: -points,
          balanceAfter: newPoints,
          reason: `Cashback conversion: ₹${cashback}`,
        },
      }),
      this.prisma.activity.create({
        data: {
          tenantId,
          customerId,
          type: 'POINTS_REDEEMED',
          message: `Cashback ₹${cashback} credited from ${points} points`,
          metadata: { type: 'CASHBACK', cashback, points },
        },
      }),
      this.prisma.cashbackTransaction.create({
        data: {
          tenantId,
          customerId,
          pointsUsed: points,
          cashbackAmount: cashback,
          balanceAfter: newCashback,
          status: 'COMPLETED',
          note: `Converted ${points} points`,
        },
      }),
    ]);

    await this.audit(tenantId, 'CASHBACK_ISSUED', customerId, { points, cashback });

    return {
      id: txn.id,
      customerId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      pointsUsed: points,
      cashbackAmount: cashback,
      balanceAfter: newCashback,
      status: 'COMPLETED',
      createdAt: txn.createdAt.toISOString(),
      pointsBalance: newPoints,
    };
  }

  async listCashback(tenantId: string) {
    const rows = await this.prisma.cashbackTransaction.findMany({
      where: { tenantId },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({
      id: r.id,
      customerId: r.customerId,
      customerName: `${r.customer.firstName} ${r.customer.lastName}`,
      pointsUsed: r.pointsUsed,
      cashbackAmount: r.cashbackAmount,
      balanceAfter: r.balanceAfter,
      status: r.status,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private normalizeCategory(category?: string) {
    const c = (category || 'STANDARD').toUpperCase();
    if ((REWARD_CATEGORIES as readonly string[]).includes(c)) return c;
    // legacy categories map to STANDARD
    return 'STANDARD';
  }

  private async getEnabledProgram(tenantId: string, programType: RewardProgramType) {
    await this.ensurePrograms(tenantId);
    const row = await this.prisma.rewardProgramConfig.findUnique({
      where: { tenantId_programType: { tenantId, programType } },
    });
    if (!row?.enabled) return null;
    return {
      ...row,
      config: {
        ...(DEFAULT_PROGRAM_CONFIGS[programType] || {}),
        ...((row.config && typeof row.config === 'object' ? row.config : {}) as object),
      },
    };
  }

  private daysFromBirthday(dob: Date, today: Date) {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    return Math.round((thisYear.getTime() - base.getTime()) / 86400000);
  }

  private fullYearsBetween(start: Date, end: Date) {
    let years = end.getFullYear() - start.getFullYear();
    const m = end.getMonth() - start.getMonth();
    if (m < 0 || (m === 0 && end.getDate() < start.getDate())) years--;
    return years;
  }

  private async issueAutomatedReward(
    tenantId: string,
    customerId: string,
    category: string,
    cfg: Record<string, any>,
    label: string,
  ) {
    const points = Number(cfg.bonusPoints || cfg.pointsReward || cfg.points || 0);
    let reward = await this.prisma.reward.findFirst({
      where: { tenantId, category, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!reward) {
      reward = await this.prisma.reward.create({
        data: {
          tenantId,
          name: `${category.charAt(0)}${category.slice(1).toLowerCase()} Reward`,
          description: `Automated ${category.toLowerCase()} reward`,
          pointsCost: 0,
          rewardValue: points,
          discountVal: points,
          category,
          rewardType: cfg.rewardType || 'POINTS',
          status: 'ACTIVE',
          validityDays: Number(cfg.validityDays || 30),
          expiresAt: new Date(Date.now() + Number(cfg.validityDays || 30) * 86400000),
        },
      });
    }

    const code = `RWD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return;

    const newBalance = customer.pointsBalance + points;

    await this.prisma.$transaction([
      this.prisma.rewardRedemption.create({
        data: {
          tenantId,
          customerId,
          rewardId: reward.id,
          code,
          status: 'FULFILLED',
          pointsUsed: 0,
          redeemedAt: new Date(),
        },
      }),
      this.prisma.reward.update({
        where: { id: reward.id },
        data: { redeemedCount: { increment: 1 } },
      }),
      ...(points > 0
        ? [
            this.prisma.customer.update({
              where: { id: customerId },
              data: { pointsBalance: newBalance },
            }),
            this.prisma.pointsLedger.create({
              data: {
                tenantId,
                customerId,
                amount: points,
                balanceAfter: newBalance,
                reason: label,
              },
            }),
          ]
        : []),
      this.prisma.activity.create({
        data: {
          tenantId,
          customerId,
          type: 'POINTS_EARNED',
          message: `${label}: ${points} points / reward issued`,
          metadata: { category, code },
        },
      }),
      this.prisma.notification.create({
        data: {
          tenantId,
          customerId,
          type: `${category}_REWARD`,
          channel: cfg.whatsappNotification ? 'WHATSAPP' : cfg.smsNotification ? 'SMS' : 'EMAIL',
          recipient: customer.email || customer.phone,
          subject: `Your ${category.toLowerCase()} reward`,
          body: `Congratulations! You've received ${points} bonus points for ${label}.`,
          status: 'PENDING',
        },
      }),
    ]);
  }

  private async fulfillClaim(tenantId: string, claimId: string) {
    const claim = await this.prisma.rewardEngagementClaim.findFirst({
      where: { id: claimId, tenantId },
      include: { customer: true },
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const points = claim.rewardPoints;
    const newBalance = claim.customer.pointsBalance + points;

    await this.prisma.$transaction([
      this.prisma.rewardEngagementClaim.update({
        where: { id: claimId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      }),
      this.prisma.customer.update({
        where: { id: claim.customerId },
        data: { pointsBalance: newBalance },
      }),
      this.prisma.pointsLedger.create({
        data: {
          tenantId,
          customerId: claim.customerId,
          amount: points,
          balanceAfter: newBalance,
          reason: `${claim.programType} reward approved`,
        },
      }),
      this.prisma.activity.create({
        data: {
          tenantId,
          customerId: claim.customerId,
          type: 'POINTS_EARNED',
          message: `${claim.programType} reward: +${points} points`,
        },
      }),
    ]);

    const updated = await this.prisma.rewardEngagementClaim.findUnique({
      where: { id: claimId },
      include: { customer: true },
    });
    return this.mapClaim(updated!);
  }

  private mapClaim(c: any) {
    return {
      id: c.id,
      customerId: c.customerId,
      customerName: c.customer
        ? `${c.customer.firstName} ${c.customer.lastName}`
        : '',
      programType: c.programType,
      status: c.status,
      evidence: c.evidence,
      rewardPoints: c.rewardPoints,
      createdAt: c.createdAt.toISOString(),
      reviewedAt: c.reviewedAt?.toISOString?.() ?? null,
    };
  }

  private async audit(
    tenantId: string,
    action: string,
    entityId: string,
    metadata?: unknown,
  ) {
    try {
      await this.prisma.loyaltyAuditLog.create({
        data: {
          tenantId,
          featureKey: 'rewards',
          action,
          entityType: 'Reward',
          entityId,
          metadata: metadata as any,
        },
      });
    } catch {
      // audit table may not exist yet
    }
  }
}
