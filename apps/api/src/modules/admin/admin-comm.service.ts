import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { businessStatus, planMonthlyAmount } from './admin-util';

@Injectable()
export class AdminCommService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AdminAuditService,
  ) {}

  // ─── Admin notifications ───────────────────────────────────────────────────

  async listNotifications(actor: any, query: { unreadOnly?: string; limit?: string }) {
    const unreadOnly = query.unreadOnly === 'true';
    const limit = Number(query.limit) || 50;
    const where: Record<string, unknown> = {
      OR: [{ recipientId: null }, { recipientId: actor?.id }],
    };
    if (unreadOnly) where.readAt = null;
    const items = await this.prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unreadCount = await this.prisma.adminNotification.count({
      where: {
        OR: [{ recipientId: null }, { recipientId: actor?.id }],
        readAt: null,
      },
    });
    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        severity: n.severity,
        link: n.link,
        targetId: n.targetId,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  }

  async markNotificationRead(actor: any, id: string) {
    await this.prisma.adminNotification.updateMany({
      where: { id, OR: [{ recipientId: null }, { recipientId: actor?.id }] },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  async markAllNotificationsRead(actor: any) {
    await this.prisma.adminNotification.updateMany({
      where: { OR: [{ recipientId: null }, { recipientId: actor?.id }], readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  // ─── Global search ─────────────────────────────────────────────────────────

  async search(q: string) {
    const term = q?.trim();
    if (!term) {
      return { businesses: [], users: [], customers: [], subscriptions: [], tickets: [], websiteRequests: [], invoices: [], total: 0 };
    }
    const like = { contains: term, mode: 'insensitive' as const };

    const [businesses0, users0, customers0, subscriptions0, tickets0, requests0, invoices0] =
      await Promise.all([
        this.prisma.tenant.findMany({
          where: { OR: [{ name: like }, { slug: like }, { email: like }] },
          take: 8,
          include: {
            subscriptions: { select: { plan: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            memberships: { where: { role: 'OWNER' }, include: { user: { select: { firstName: true, lastName: true, email: true } } } },
            _count: { select: { customers: true, branches: true } },
          },
        }),
        this.prisma.user.findMany({
          where: { OR: [{ email: like }, { firstName: like }, { lastName: like }] },
          take: 8,
          include: { memberships: { include: { tenant: { select: { name: true } } } } },
        }),
        this.prisma.customer.findMany({
          where: {
            OR: [
              { firstName: like },
              { lastName: like },
              { email: like },
              { phone: { contains: term } },
            ],
          },
          take: 8,
          include: { tenant: { select: { name: true } } },
        }),
        this.prisma.subscription.findMany({
          where: { tenant: { name: like } },
          take: 8,
          include: {
            tenant: {
              select: { name: true },
              include: { memberships: { where: { role: 'OWNER' }, include: { user: { select: { email: true } } } } },
            },
          },
        }),
        this.prisma.supportTicket.findMany({
          where: { OR: [{ subject: like }, { ticketNumber: { contains: term, mode: 'insensitive' as const } }] },
          take: 8,
          include: { tenant: { select: { name: true } } },
        }),
        this.prisma.websiteProject.findMany({
          where: { OR: [{ name: like }, { websiteType: like }] },
          take: 8,
          include: { tenant: { select: { name: true } } },
        }),
        this.prisma.invoice.findMany({
          where: { OR: [{ invoiceNumber: like }, { tenant: { name: like } }] },
          take: 8,
          include: { tenant: { select: { name: true } } },
        }),
      ]);

    const subscriptions = subscriptions0.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      businessName: s.tenant.name,
      ownerEmail: s.tenant.memberships[0]?.user?.email ?? null,
      plan: s.plan,
      status: s.status,
      billingCycle: 'monthly',
      amount: planMonthlyAmount(s.plan),
      currency: 'INR',
      renewal: s.currentPeriodEnd?.toISOString() ?? null,
      provider: 'MANUAL',
      autoRenew: s.autoRenew ?? false,
      createdAt: s.createdAt.toISOString(),
    }));

    const customers = customers0.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      businessName: c.tenant.name,
      businessId: c.tenantId,
      totalVisits: 0,
      totalSpent: 0,
      pointsBalance: 0,
      createdAt: c.createdAt.toISOString(),
    }));

    const users = users0.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      avatarUrl: u.avatarUrl,
      isAdmin: Boolean(u.isAdmin),
      adminRole: u.adminRole ?? null,
      status: 'ACTIVE' as const,
      businessCount: u.memberships.length,
      primaryBusiness: u.memberships[0]?.tenant?.name ?? null,
      createdAt: u.createdAt.toISOString(),
    }));

    const businesses = await Promise.all(
      businesses0.map(async (b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category,
        city: b.city,
        country: b.country,
        currency: b.currency,
        logoUrl: b.logoUrl,
        plan: b.subscriptions[0]?.plan ?? 'free',
        status: await businessStatus(this.prisma, b.id),
        ownerName: b.memberships[0]?.user ? `${b.memberships[0].user.firstName} ${b.memberships[0].user.lastName}`.trim() : null,
        ownerEmail: b.memberships[0]?.user?.email ?? null,
        customerCount: b._count?.customers ?? 0,
        branchCount: b._count?.branches ?? 0,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
    );

    const total =
      businesses.length +
      users.length +
      customers.length +
      subscriptions.length +
      tickets0.length +
      requests0.length +
      invoices0.length;

    return {
      businesses,
      users,
      customers,
      subscriptions,
      tickets: tickets0.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        status: t.status,
        businessName: t.tenant?.name,
      })),
      websiteRequests: requests0.map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        businessName: r.tenant?.name,
      })),
      invoices: invoices0.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        businessName: i.tenant?.name,
        total: i.total,
      })),
      total,
    };
  }

  // ─── Impersonation ─────────────────────────────────────────────────────────

  async impersonate(actor: any, tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Business not found');
    if (!actor?.isAdmin) throw new UnauthorizedException('Not authorized to impersonate');

    const accessToken = this.jwt.sign({
      sub: actor.id,
      email: actor.email,
      tv: actor.tv ?? 0,
      imp: tenantId,
    });

    await this.audit.record(actor, 'impersonation.started', 'SECURITY', {
      targetType: 'tenant',
      targetId: tenantId,
      targetName: tenant.name,
      metadata: { tokenIssued: true },
    });

    return {
      ok: true,
      accessToken,
      tenantId,
      tenantName: tenant.name,
      message: `You are now viewing as ${tenant.name}. Use the exit impersonation button in the header to return.`,
    };
  }

  // ─── CSV exports ───────────────────────────────────────────────────────────

  async exportCsv(actor: any, entity: string) {
    let rows: string[][];
    switch (entity) {
      case 'businesses': {
        const data = await this.prisma.tenant.findMany({
          include: {
            subscriptions: { select: { plan: true, status: true }, orderBy: { createdAt: 'desc' }, take: 1 },
            memberships: { where: { role: 'OWNER' }, include: { user: { select: { email: true } } }, take: 1 },
          },
        });
        rows = [
          ['Name', 'Email', 'Plan', 'Status', 'Created'],
          ...data.map((b) => [
            b.name,
            b.memberships[0]?.user?.email ?? b.email ?? '',
            b.subscriptions[0]?.plan ?? 'free',
            b.subscriptions[0]?.status ?? 'NONE',
            b.createdAt.toISOString(),
          ]),
        ];
        break;
      }
      case 'users': {
        const data = await this.prisma.user.findMany();
        rows = [
          ['Name', 'Email', 'Admin', 'Created'],
          ...data.map((u) => [`${u.firstName} ${u.lastName}`.trim(), u.email, u.isAdmin ? 'Yes' : 'No', u.createdAt.toISOString()]),
        ];
        break;
      }
      case 'subscriptions': {
        const data = await this.prisma.subscription.findMany({ include: { tenant: { select: { name: true } } } });
        rows = [
          ['Business', 'Plan', 'Status', 'Amount', 'Renews', 'Created'],
          ...data.map((s) => [
            s.tenant.name,
            s.plan,
            s.status,
            String(planMonthlyAmount(s.plan)),
            s.currentPeriodEnd?.toISOString() ?? '',
            s.createdAt.toISOString(),
          ]),
        ];
        break;
      }
      case 'invoices': {
        const data = await this.prisma.invoice.findMany({ include: { tenant: { select: { name: true } } } });
        rows = [
          ['Invoice', 'Business', 'Total', 'Status', 'Created'],
          ...data.map((i) => [i.invoiceNumber, i.tenant.name, String(i.total), i.status, i.createdAt.toISOString()]),
        ];
        break;
      }
      case 'tickets': {
        const data = await this.prisma.supportTicket.findMany({ include: { tenant: { select: { name: true } } } });
        rows = [
          ['Ticket', 'Business', 'Subject', 'Priority', 'Status', 'Created'],
          ...data.map((t) => [t.ticketNumber, t.tenant.name, t.subject, t.priority, t.status, t.createdAt.toISOString()]),
        ];
        break;
      }
      default:
        throw new NotFoundException(`Unknown export entity: ${entity}`);
    }

    await this.audit.record(actor, 'export.csv', 'SECURITY', {
      targetType: 'export',
      targetName: entity,
      metadata: { rows: rows.length - 1 },
    });

    const csv = rows
      .map((r) => r.map((c) => (c.includes(',') || c.includes('"') || c.includes('\n') ? `"${c.replace(/"/g, '""')}"` : c)).join(','))
      .join('\n');
    return { filename: `doloyal-${entity}-${Date.now()}.csv`, csv };
  }
}