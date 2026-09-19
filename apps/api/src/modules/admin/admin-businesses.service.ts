import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import {
  deriveBusinessStatus,
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
    if (status === 'SUSPENDED') {
      where.suspendedAt = { not: null };
    } else if (status && status !== 'ALL') {
      where.suspendedAt = null;
      if (status === 'CANCELED') {
        where.subscriptions = { some: { status: { in: ['CANCELED', 'EXPIRED'] } } };
      } else if (status === 'PAUSED') {
        where.subscriptions = { some: { status: 'PAST_DUE' } };
      } else if (status === 'TRIAL') {
        where.OR = [
          ...(Array.isArray(where.OR) ? (where.OR as object[]) : []),
          { subscriptions: { none: {} } },
          { subscriptions: { some: { status: 'TRIALING' } } },
          { subscriptions: { some: { trialEndsAt: { gt: new Date() } } } },
        ];
      } else if (status === 'ACTIVE') {
        where.subscriptions = { some: { status: 'ACTIVE' } };
      }
    }

    const orderBy =
      query.sort === 'name'
        ? { name: 'asc' as const }
        : query.sort === 'oldest'
          ? { createdAt: 'asc' as const }
          : { createdAt: 'desc' as const };

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        orderBy,
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
          suspendedAt: true,
          subscriptions: {
            select: { plan: true, status: true, trialEndsAt: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          memberships: {
            where: { role: 'OWNER' },
            select: {
              user: { select: { firstName: true, lastName: true, email: true } },
              role: true,
            },
            take: 1,
          },
          _count: { select: { customers: true, branches: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const items = tenants.map((t) => {
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
        status: deriveBusinessStatus(t.subscriptions[0], t.suspendedAt),
        ownerName: owner?.user.firstName
          ? `${owner.user.firstName} ${owner.user.lastName ?? ''}`.trim()
          : null,
        ownerEmail: owner?.user.email ?? null,
        customerCount: t._count.customers,
        branchCount: t._count.branches,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        lastActive: t.updatedAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async detail(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscriptions: { take: 1, orderBy: { createdAt: 'desc' } },
        memberships: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        integrations: {
          select: { id: true, type: true, status: true, lastSyncedAt: true, errorLog: true },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Business not found');

    const status = deriveBusinessStatus(tenant.subscriptions[0], tenant.suspendedAt);
    const lastActive = await lastActiveFor(this.prisma, tenant.id);
    const owner = tenant.memberships.find((m) => m.role === 'OWNER') ?? tenant.memberships[0];

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

    const [recentActivity, notes, tickets] = await Promise.all([
      this.prisma.subscriptionEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.adminAuditLog.findMany({
        where: { action: 'business.noteAdded', targetId: tenantId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.supportTicket.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, ticketNumber: true, subject: true, status: true, createdAt: true },
      }),
    ]);
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
      members: tenant.memberships.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        userId: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName ?? ''}`.trim(),
        email: m.user.email,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
      integrations: tenant.integrations.map((i) => ({
        id: i.id,
        type: i.type,
        status: i.status,
        lastSyncedAt: i.lastSyncedAt?.toISOString() ?? null,
        lastError: i.errorLog,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        message: String((n.metadata as { note?: string } | null)?.note ?? ''),
        actorEmail: n.actorEmail,
        createdAt: n.createdAt.toISOString(),
      })),
      supportTickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt.toISOString(),
      })),
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
    if (status === 'SUSPENDED') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { suspendedAt: tenant.suspendedAt ?? new Date() },
      });
    } else if (status === 'ACTIVE' || status === 'PAUSED' || status === 'CANCELED') {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { suspendedAt: null },
      });
    }
    if (existing && status !== 'SUSPENDED') {
      const mapped = {
        ACTIVE: 'ACTIVE',
        PAUSED: 'PAST_DUE',
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