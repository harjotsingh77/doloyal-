import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { ADMIN_ROLES } from '@doloyal/shared';
import { paginate } from './admin-util';

@Injectable()
export class AdminTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async list(query: { status?: string; search?: string; page?: string; pageSize?: string }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = { isAdmin: true };
    if (query.search?.trim()) {
      where.OR = [
        { email: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { firstName: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { lastName: { contains: query.search.trim(), mode: 'insensitive' as const } },
      ];
    }
    const [members, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          loginHistory: { orderBy: { createdAt: 'desc' }, take: 1, where: { successful: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const items = members.map((m) => ({
      id: m.id,
      email: m.email,
      firstName: m.firstName,
      lastName: m.lastName,
      avatarUrl: m.avatarUrl,
      isAdmin: true,
      adminRole: m.adminRole,
      status: 'ACTIVE',
      lastActive: m.loginHistory[0]?.createdAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
    const filtered =
      query.status && query.status !== 'ALL'
        ? items.filter((i) => i.status === query.status)
        : items;
    return { items: filtered, total: filtered.length, page, pageSize, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) };
  }

  async invite(actor: any, data: { email: string; firstName?: string; lastName?: string; role: string }) {
    if (!data.email?.trim()) throw new BadRequestException('Email is required');
    if (!ADMIN_ROLES.includes(data.role as any)) {
      throw new BadRequestException(`Invalid admin role: ${data.role}`);
    }
    let user = await this.prisma.user.findUnique({ where: { email: data.email.trim().toLowerCase() } });
    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isAdmin: true, adminRole: data.role as any },
      });
    } else {
      user = await this.prisma.user.create({
        data: {
          email: data.email.trim().toLowerCase(),
          firstName: data.firstName || 'Admin',
          lastName: data.lastName || '',
          isAdmin: true,
          adminRole: data.role as any,
        },
      });
    }
    await this.audit.record(actor, 'adminTeam.invited', 'TEAM', {
      targetType: 'user',
      targetId: user.id,
      targetName: user.email,
      metadata: { role: data.role },
    });
    return { ok: true, id: user.id };
  }

  async changeRole(actor: any, userId: string, role: string) {
    if (!ADMIN_ROLES.includes(role as any)) throw new BadRequestException(`Invalid admin role: ${role}`);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const before = user.adminRole;
    await this.prisma.user.update({
      where: { id: userId },
      data: { adminRole: role as any, isAdmin: true },
    });
    await this.audit.record(actor, 'adminTeam.roleChanged', 'TEAM', {
      targetType: 'user',
      targetId: userId,
      targetName: user.email,
      metadata: { from: before, to: role },
    });
    return { ok: true, role };
  }

  async setStatus(actor: any, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (status === 'SUSPENDED') {
      // Revoke all sessions.
      await this.prisma.user.update({
        where: { id: userId },
        data: { tokenVersion: { increment: 1 }, sessions: [] },
      });
    }
    await this.audit.record(actor, status === 'SUSPENDED' ? 'adminTeam.suspended' : 'adminTeam.reactivated', 'TEAM', {
      targetType: 'user',
      targetId: userId,
      targetName: user.email,
    });
    return { ok: true, status };
  }
}