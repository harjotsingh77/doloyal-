import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(tenantId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      id: m.userId,
      externalId: m.userId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      phone: (m.user as any).phone ?? null,
      avatarUrl: (m.user as any).avatarUrl ?? null,
      memberships: [{ id: m.id, userId: m.userId, tenantId: m.tenantId, role: m.role, createdAt: m.createdAt.toISOString() }],
      activeTenantId: m.tenantId,
      activeRole: m.role as string,
    }));
  }

  async updateMemberRole(tenantId: string, memberId: string, role: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this tenant');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot change owner role');
    }

    const updated = await this.prisma.membership.update({
      where: { id: memberId },
      data: { role: role as any },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      id: updated.userId,
      externalId: updated.userId,
      email: updated.user.email,
      firstName: updated.user.firstName,
      lastName: updated.user.lastName,
      memberships: [{ id: updated.id, userId: updated.userId, tenantId: updated.tenantId, role: updated.role, createdAt: updated.createdAt.toISOString() }],
      activeTenantId: updated.tenantId,
      activeRole: updated.role as string,
    };
  }

  async removeMember(tenantId: string, memberId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this tenant');
    }

    if (membership.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.membership.delete({ where: { id: memberId } });

    return { message: 'Member removed successfully' };
  }
}
