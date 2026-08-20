import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import {
  businessStatus,
  lastActiveFor,
  paginate,
  planLabel,
} from './admin-util';

@Injectable()
export class AdminBusinessesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: {
    search?: string;
    industry?: string;
    plan?: string;
    status?: string;
    location?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const search = query.search?.trim() || undefined;
    const industry = query.industry?.trim() || undefined;
    const plan = query.plan?.trim() || undefined;
    const status = query.status?.trim() || undefined;
    const location = query.location?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (industry && industry !== 'ALL') where.category = industry;
    if (location && location !== 'ALL') {
      where.OR = [{ city: { contains: location, mode: 'insensitive' as const } }, { country: { equals: location, mode: 'insensitive' as const } }];
    }
    if (plan && plan !== 'ALL') {
      where.subscriptions = { some: { plan } };
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { memberships: { some: { user: { email: { contains: search, mode: 'insensitive' as const } } } } },
      ];
    }

    const [tenants] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          city: true,
          country: true,
          currency: true,
          logoUrl: true,
          createdAt: true,
          updatedAt: true,
          subscriptions: {
            select: { plan: true, status: true, trialEndsAt: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          memberships: {
            select: {
              user: { select: { firstName: true, lastName: true, email: true } },
              role: true,
            },
            take: 1,
          },
          _count: { select: { customers: true, branches: true } },
        },
      }),
    ]);

    const items = await Promise.all(
      tenants.map(async (t) => {
        const statusVal = await businessStatus(this.prisma, t.id);
        const lastActive = await lastActiveFor(this.prisma, t.id);
        const owner = t.memberships[0];
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          category: t.category,
          city: t.city,
          country: t.country,
          currency: t.currency,
          logoUrl: t.logoUrl,
          plan: t.subscriptions[0]?.plan ?? 'free',
          status: statusVal,
          ownerName: owner?.user.firstName
            ? `${owner.user.firstName} ${owner.user.lastName ?? ''}`.trim()
            : null,
          ownerEmail: owner?.user.email ?? null,
          customerCount: t._count.customers,
          branchCount: t._count.branches,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          lastActive: lastActive?.toISOString() ?? null,
        };
      }),
    );

    // Status filter applied post-hoc because status is derived.
    const filtered =
      status && status !== 'ALL' ? items.filter((i) => i.status === status) : items;
    const filteredTotal = filtered.length;

    return {
      items: filtered,
      total: filteredTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    };
  }

  async detail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { take: 1, orderBy: { createdAt: 'desc' } },
        memberships: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          take: 1,
        },
      },
    });
    if (!tenant) throw new NotFoundException('Business not found');

    const status = await businessStatus(this.prisma, tenant.id);
    const lastActive = await lastActiveFor(this.prisma, tenant.id);
    const owner = tenant.memberships[0];

    const counts = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.appointment.count({ where: { tenantId } }),
      this.prisma.invoice.count({ where: { tenantId } }),
      this.prisma.loyaltyConfig.count({ where: { tenantId } }),
      this.prisma.reward.count({ where: { tenantId } }),
      this.prisma.membershipTier.count({ where: { tenantId } }),
      this.prisma.campaign.count({ where: { tenantId } }),
      this.prisma.staff.count({ where: { tenantId } }),
      this.prisma.branch.count({ where: { tenantId } }),
      this.prisma.website.count({ where: { tenantId } }),
      this.prisma.bookingLink.count({ where: { tenantId } }),
      this.prisma.websiteProject.count({ where: { tenantId } }),
      this.prisma.integration.count({ where: { tenantId } }),
      this.prisma.supportTicket.count({ where: { tenantId } }),
      this.prisma.aiConversation.count({ where: { tenantId } }),
    ]);

    const [customerCount, appointmentCount, invoiceCount, loyaltyCount, rewardCount,
      tierCount, campaignCount, staffCount, branchCount, websiteCount, bookingLinkCount,
      projectCount, integrationCount, supportCount, aiCount] = counts;

    const recentActivity = await this.prisma.subscriptionEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const activities = recentActivity.map((e) => ({
      id: e.id,
      type: e.type,
      message: `${e.description ?? e.type.replace(/_/g, ' ')}`,
      createdAt: e.createdAt.toISOString(),
    }));

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      category: tenant.category,
      city: tenant.city,
      state: tenant.state,
      zip: tenant.zip,
      country: tenant.country,
      currency: tenant.currency,
      timezone: tenant.timezone,
      email: tenant.email,
      phone: tenant.phone,
      website: tenant.website,
      logoUrl: tenant.logoUrl,
      plan: tenant.subscriptions[0]?.plan ?? 'free',
      status,
      onboardingComplete: tenant.onboardingComplete,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
      lastActive: lastActive?.toISOString() ?? null,
      subscription: tenant.subscriptions[0]
        ? {
            id: tenant.subscriptions[0].id,
            plan: tenant.subscriptions[0].plan,
            status: tenant.subscriptions[0].status,
            trialEndsAt: tenant.subscriptions[0].trialEndsAt?.toISOString() ?? null,
            currentPeriodEnd: tenant.subscriptions[0].currentPeriodEnd?.toISOString() ?? null,
            autoRenew: tenant.subscriptions[0].autoRenew,
          }
        : null,
      owner: owner
        ? {
            id: owner.user.id,
            name: `${owner.user.firstName} ${owner.user.lastName ?? ''}`.trim(),
            email: owner.user.email,
          }
        : null,
      counts: {
        customers: customerCount,
        appointments: appointmentCount,
        invoices: invoiceCount,
        loyalty: loyaltyCount,
        rewards: rewardCount,
        membershipTiers: tierCount,
        campaigns: campaignCount,
        staff: staffCount,
        branches: branchCount,
        websites: websiteCount,
        bookingLinks: bookingLinkCount,
        websiteRequests: projectCount,
        integrations: integrationCount,
        supportTickets: supportCount,
        aiConversations: aiCount,
      },
      recentActivity: activities,
    };
  }

  async changePlan(actor: any, tenantId: string, plan: string) {
    const allowed = ['free', 'starter', 'growth', 'professional', 'enterprise'];
    if (!allowed.includes(plan)) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }
    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');

    let sub: any;
    if (existing) {
      sub = await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { plan, status: plan === 'free' ? existing.status : 'ACTIVE' },
      });
    } else {
      sub = await this.prisma.subscription.create({
        data: {
          tenantId,
          plan,
          status: 'ACTIVE',
          autoRenew: true,
        },
      });
    }

    await this.prisma.subscriptionEvent.create({
      data: {
        tenantId,
        type: 'PLAN_CHANGED',
        plan,
        description: `Admin changed plan to ${planLabel(plan)}`,
        metadata: { by: actor?.email, from: existing?.plan },
      },
    });
    await this.audit.record(actor, 'subscription.planChanged', 'SUBSCRIPTION', {
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenant.name,
      metadata: { from: existing?.plan, to: plan },
    });

    return { ok: true, plan, status: sub.status };
  }

  async setStatus(actor: any, tenantId: string, status: string, note?: string) {
    const allowed = ['ACTIVE', 'PAUSED', 'SUSPENDED', 'CANCELED'];
    if (!allowed.includes(status)) throw new BadRequestException(`Invalid status: ${status}`);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');

    const existing = await this.prisma.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      const mapped = {
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAST_DUE',
        SUSPENDED: 'PAST_DUE',
        CANCELED: 'CANCELED',
      } as Record<string, string>;
      await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { status: mapped[status] ?? existing.status },
      });
    }

    const action =
      status === 'SUSPENDED'
        ? 'business.suspended'
        : status === 'CANCELED'
          ? 'business.canceled'
          : status === 'PAUSED'
            ? 'business.paused'
            : 'business.reactivated';

    await this.audit.record(actor, action, 'BUSINESS', {
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenant.name,
      metadata: { status, note },
    });

    return { ok: true, status };
  }

  async addNote(actor: any, tenantId: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Note is required');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');
    await this.audit.record(actor, 'business.noteAdded', 'BUSINESS', {
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenant.name,
      metadata: { note: body.trim() },
    });
    return { ok: true };
  }
}