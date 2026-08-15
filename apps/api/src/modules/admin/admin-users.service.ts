import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: {
    search?: string;
    role?: string;
    plan?: string;
    status?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const search = query.search?.trim() || undefined;
    const role = query.role?.trim() || undefined;
    const plan = query.plan?.trim() || undefined;
    const status = query.status?.trim() || undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ];
    }
    if (role && role !== 'ALL') {
      where.memberships = { some: { role } };
    }
    if (plan && plan !== 'ALL') {
      where.memberships = {
        some: {
          tenant: { subscriptions: { some: { plan } } },
          ...(role && role !== 'ALL' ? { role } : {}),
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: {
            take: 1,
            include: {
              tenant: {
                select: {
                  name: true,
                  subscriptions: { select: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } },
                },
              },
            },
          },
          loginHistory: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            where: { successful: true },
          },
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const membership = u.memberships[0];
      const suspended = this.isSuspended(u);
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        isAdmin: u.isAdmin,
        adminRole: u.adminRole,
        status: suspended ? 'SUSPENDED' : 'ACTIVE',
        businessCount: u._count.memberships,
        primaryBusiness: membership?.tenant?.name ?? null,
        plan: membership?.tenant?.subscriptions?.[0]?.plan ?? null,
        lastLogin: u.loginHistory[0]?.createdAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      };
    });

    const filtered =
      status && status !== 'ALL' ? items.filter((i) => i.status === status) : items;

    return {
      items: filtered,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
    };
  }

  async detail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { tenant: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        loginHistory: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      twoFactorEnabled: user.twoFactorEnabled,
      isAdmin: user.isAdmin,
      adminRole: user.adminRole,
      status: this.isSuspended(user) ? 'SUSPENDED' : 'ACTIVE',
      businessCount: user.memberships.length,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((m) => ({
        id: m.id,
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        role: m.role,
        createdAt: m.createdAt.toISOString(),
      })),
      loginHistory: user.loginHistory.map((l) => ({
        id: l.id,
        successful: l.successful,
        device: l.device,
        browser: l.browser,
        ip: l.ip,
        location: l.location,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  async suspend(actor: any, userId: string, suspended = true) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id: userId },
      data: suspended ? { tokenVersion: { increment: 1 }, sessions: [] } : {},
    });
    // Suspension is expressed via a security event + audit trail (no soft-delete).
    await this.audit.record(actor, suspended ? 'user.suspended' : 'user.reactivated', 'USER', {
      targetType: 'user',
      targetId: userId,
      targetName: user.email,
    });
    return { ok: true, status: suspended ? 'SUSPENDED' : 'ACTIVE' };
  }

  async changeRole(actor: any, userId: string, tenantId: string, role: string) {
    const allowed = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'STAFF', 'CUSTOMER'];
    if (!allowed.includes(role)) throw new BadRequestException(`Invalid role: ${role}`);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.prisma.membership.update({
      where: { id: membership.id },
      data: { role: role as any },
    });
    await this.audit.record(actor, 'user.roleChanged', 'USER', {
      targetType: 'user',
      targetId: userId,
      targetName: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email,
      metadata: { tenantId, from: membership.role, to: role },
    });
    return { ok: true, role };
  }

  private isSuspended(user: { sessions?: unknown; tokenVersion?: number }) {
    return false;
  }
}