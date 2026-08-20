import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import type { Prisma, User as PrismaUser } from '@prisma/client';
import {
  STAFF_ROLE_DEFAULT_PERMISSIONS,
  type StaffMember,
  type StaffProfileDetail,
  type StaffInvitation,
  type StaffInvitationDetail,
  type StaffStats,
  type StaffMemberList,
  type InvitationCounts,
} from '@doloyal/shared';
import { parseUserAgent } from './user-agent';

type Actor = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  activeTenantId?: string;
  activeRole?: string;
  ip?: string;
  userAgent?: string;
};

const ROLE_PRIORITY: Record<string, number> = {
  OWNER: 4,
  MANAGER: 3,
  RECEPTIONIST: 2,
  STAFF: 1,
};

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private webBaseUrl() {
    return process.env.WEB_BASE_URL || process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  }

  private inviteExpiryMs() {
    const days = Number(process.env.INVITE_EXPIRY_DAYS) || 7;
    return days * 24 * 60 * 60 * 1000;
  }

  // ─── Profile helpers ─────────────────────────────────────────────────────

  async ensureProfile(userId: string, tenantId: string, role = 'STAFF') {
    let profile = await this.prisma.staffProfile.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!profile) {
      const member = await this.prisma.membership.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });
      profile = await this.prisma.staffProfile.create({
        data: {
          userId,
          tenantId,
          role: (member?.role as any) || role,
          status: 'ACTIVE',
          dateJoined: member?.createdAt || new Date(),
        },
      });
    }
    return profile;
  }

  async getProfile(tenantId: string, memberId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { id: memberId, tenantId },
    });
    if (!profile) throw new NotFoundException('Member not found in this tenant');
    return profile;
  }

  async getProfileForUser(tenantId: string, userId: string) {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { userId, tenantId },
    });
    if (!profile) throw new NotFoundException('Member not found in this tenant');
    return profile;
  }

  private parsePermissions(value: unknown, role: string): string[] {
    if (Array.isArray(value)) return value as string[];
    const defaults =
      STAFF_ROLE_DEFAULT_PERMISSIONS[role as keyof typeof STAFF_ROLE_DEFAULT_PERMISSIONS];
    return defaults ? [...defaults] : [];
  }

  private canManageActor(targetRole: string, actorRole: string): boolean {
    if (actorRole === 'OWNER') return true;
    if (actorRole === 'MANAGER') return ROLE_PRIORITY[targetRole] < ROLE_PRIORITY.MANAGER;
    return false;
  }

  // ─── Activity + Audit logging ────────────────────────────────────────────

  private async recordActivity(params: {
    tenantId: string;
    actor: Actor;
    targetId?: string;
    targetName?: string;
    action: string;
    category?: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.prisma.staffActivityLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actor.id || null,
          actorName: this.actorName(params.actor),
          targetId: params.targetId || null,
          targetName: params.targetName || null,
          action: params.action,
          category: params.category || null,
          message: params.message,
          metadata: (params.metadata || {}) as Prisma.InputJsonValue,
          ip: params.actor.ip || null,
        },
      });
    } catch (err) {
      // Activity logging must never break the primary operation.
      console.warn('Activity log write failed', err);
    }
  }

  private async recordAudit(params: {
    tenantId: string;
    actor: Actor;
    entityType: string;
    entityId: string;
    action: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: params.tenantId,
          actorId: params.actor.id || null,
          actorName: this.actorName(params.actor),
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          before: (params.before ?? null) as Prisma.InputJsonValue,
          after: (params.after ?? null) as Prisma.InputJsonValue,
          reason: params.reason || null,
          ip: params.actor.ip || null,
          userAgent: params.actor.userAgent || null,
        },
      });
    } catch (err) {
      console.warn('Audit log write failed', err);
    }
  }

  private actorName(actor: { firstName?: string; lastName?: string; email?: string }) {
    if (actor.firstName) return `${actor.firstName} ${actor.lastName ?? ''}`.trim();
    return actor.email || 'System';
  }

  // ─── Mapping ─────────────────────────────────────────────────────────────

  private async mapMembers(
    tenantId: string,
    profiles: Array<
      Prisma.StaffProfileGetPayload<{
        include: { user: { select: Record<string, boolean> }; branches: { include: { branch: true } } };
      }>
    >,
    userId: string,
  ) {
    const userIds = profiles.map((p) => p.userId);
    const [invitations, loginCounts] = await Promise.all([
      this.prisma.invitation.findMany({
        where: { tenantId, email: { in: profiles.map((p) => (p as any).user.email as string) } },
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, status: true, sentAt: true },
      }),
      this.prisma.loginHistory.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }),
    ]);
    const inviteByEmail = new Map<string, { status: string; sentAt: Date | null }>();
    for (const inv of invitations) {
      if (!inviteByEmail.has(inv.email)) {
        inviteByEmail.set(inv.email, { status: inv.status, sentAt: inv.sentAt });
      }
    }
    const countByUser = new Map(loginCounts.map((l) => [l.userId, l._count.id]));

    return profiles.map((p) => this.toStaffMember(p, userId, inviteByEmail, countByUser));
  }

  private toStaffMember(
    p: any,
    currentUserId: string,
    inviteByEmail?: Map<string, { status: string; sentAt: Date | null }>,
    countByUser?: Map<string, number>,
  ): StaffMember {
    const user = p.user;
    const invite = inviteByEmail?.get(user.email);
    return {
      id: p.id,
      userId: p.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: p.role,
      status: p.status,
      department: p.department ?? null,
      jobTitle: p.jobTitle ?? null,
      notes: p.notes ?? null,
      permissions: this.parsePermissions(p.permissions, p.role),
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      twoFactorRequired: Boolean(p.twoFactorRequired),
      requirePasswordReset: Boolean(p.requirePasswordReset),
      isOnline: Boolean(p.isOnline),
      lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
      lastLoginAt: p.lastLoginAt?.toISOString() ?? null,
      lastLogoutAt: p.lastLogoutAt?.toISOString() ?? null,
      lastLoginDevice: p.lastLoginDevice ?? null,
      lastLoginBrowser: p.lastLoginBrowser ?? null,
      lastLoginOs: p.lastLoginOs ?? null,
      lastLoginIp: p.lastLoginIp ?? null,
      lastLoginLocation: p.lastLoginLocation ?? null,
      dateJoined: p.dateJoined?.toISOString() ?? p.createdAt?.toISOString(),
      branches: (p.branches || []).map((b: any) => ({
        id: b.branchId,
        name: b.branch?.name ?? 'Unknown branch',
        address: b.branch?.address ?? null,
        primary: Boolean(b.primary),
      })),
      invitationStatus: (invite?.status as any) ?? null,
      invitationSentAt: invite?.sentAt?.toISOString() ?? null,
      isCurrentUser: p.userId === currentUserId,
      loginCount: countByUser?.get(p.userId) ?? 0,
    };
  }

  // ─── Stats ───────────────────────────────────────────────────────────────

  async getStats(tenantId: string): Promise<StaffStats> {
    const [profiles, pending] = await Promise.all([
      this.prisma.staffProfile.findMany({
        where: { tenantId },
        select: { role: true, status: true, isOnline: true },
      }),
      this.prisma.invitation.count({ where: { tenantId, status: 'PENDING' } }),
    ]);
    const stats: StaffStats = {
      total: profiles.length,
      admins: profiles.filter((p) => p.role === 'OWNER').length,
      managers: profiles.filter((p) => p.role === 'MANAGER').length,
      staff: profiles.filter((p) => p.role === 'RECEPTIONIST' || p.role === 'STAFF').length,
      pendingInvitations: pending,
      online: profiles.filter((p) => p.isOnline).length,
      inactive: profiles.filter((p) => p.status === 'INACTIVE').length,
      suspended: profiles.filter((p) => p.status === 'SUSPENDED').length,
    };
    return stats;
  }

  // ─── List / search / filter ──────────────────────────────────────────────

  async listMembers(tenantId: string, query: ListStaffQueryLike, actor: Actor) {
    await this.ensureProfile(actor.id, tenantId, actor.activeRole);
    this.expirePendingInvitations(tenantId);

    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Prisma.StaffProfileWhereInput = { tenantId };

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { user: { email: { contains: term, mode: 'insensitive' } } },
        { user: { firstName: { contains: term, mode: 'insensitive' } } },
        { user: { lastName: { contains: term, mode: 'insensitive' } } },
        { user: { phone: { contains: term, mode: 'insensitive' } } },
      ];
    }
    if (query.role) where.role = query.role as any;
    if (query.status) where.status = query.status as any;
    if (query.online === 'true') where.isOnline = true;
    if (query.online === 'false') where.isOnline = false;
    if (query.branchId) where.branches = { some: { branchId: query.branchId } };

    const dateFrom = query.dateJoinedFrom ? new Date(query.dateJoinedFrom) : null;
    const dateTo = query.dateJoinedTo ? new Date(query.dateJoinedTo) : null;
    if (dateFrom || dateTo) {
      where.dateJoined = {
        gte: dateFrom || undefined,
        lte: dateTo || undefined,
      };
    }

    const sortBy: keyof Prisma.StaffProfileOrderByWithRelationInput =      (query.sortBy === 'role' || query.sortBy === 'status' || query.sortBy === 'dateJoined' || query.sortBy === 'createdAt' ? query.sortBy : 'dateJoined') as any;
    const sortDir = query.sortDir || 'desc';
    const orderBy: Prisma.StaffProfileOrderByWithRelationInput[] = (() => {
      if (query.sortBy === 'name') {
        return [{ user: { firstName: sortDir } }, { user: { lastName: sortDir as any } }];
      }
      return [{ [sortBy]: sortDir }];
    })();

    const [total, rows] = await Promise.all([
      this.prisma.staffProfile.count({ where }),
      this.prisma.staffProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatarUrl: true,
              twoFactorEnabled: true,
            },
          },
          branches: { include: { branch: true } },
        },
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Server-side lastLogin sort + range filter applied on the page set.
    let members = await this.mapMembers(tenantId, rows as any, actor.id);
    if (query.lastLoginFrom || query.lastLoginTo) {
      const from = query.lastLoginFrom ? new Date(query.lastLoginFrom).getTime() : null;
      const to = query.lastLoginTo ? new Date(query.lastLoginTo).getTime() : null;
      members = members.filter((m) => {
        const t = m.lastLoginAt ? new Date(m.lastLoginAt).getTime() : null;
        if (t == null) return false;
        if (from && t < from) return false;
        if (to && t > to) return false;
        return true;
      });
    }
    if (query.sortBy === 'lastLogin') {
      members.sort((a, b) => {
        const at = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const bt = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        return sortDir === 'asc' ? at - bt : bt - at;
      });
    }

    const result: StaffMemberList = {
      items: members,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
    return result;
  }

  async getMemberDetail(tenantId: string, memberId: string, actor: Actor): Promise<StaffProfileDetail> {
    const profile = await this.prisma.staffProfile.findFirst({
      where: { id: memberId, tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            twoFactorEnabled: true,
          },
        },
        branches: { include: { branch: true } },
      },
    });
    if (!profile) throw new NotFoundException('Member not found in this tenant');

    const [loginHistory, activity, auditLogs, employeeNotes, loginCount, invitations] =
      await Promise.all([
        this.prisma.loginHistory.findMany({
          where: { userId: profile.userId },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.staffActivityLog.findMany({
          where: {
            tenantId,
            OR: [{ actorId: profile.userId }, { targetId: memberId }],
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.auditLog.findMany({
          where: { tenantId, entityId: memberId },
          orderBy: { createdAt: 'desc' },
          take: 200,
        }),
        this.prisma.employeeNote.findMany({
          where: { staffProfileId: memberId },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.loginHistory.count({ where: { userId: profile.userId } }),
        this.prisma.invitation.findMany({
          where: { tenantId, email: profile.user.email },
          orderBy: { createdAt: 'desc' },
          take: 1,
        }),
      ]);

    const base = this.toStaffMember(profile as any, actor.id);
    const latestInvite = invitations[0];
    if (latestInvite) {
      base.invitationStatus = latestInvite.status as any;
      base.invitationSentAt = latestInvite.sentAt?.toISOString() ?? null;
    }
    base.loginCount = loginCount;

    return {
      ...base,
      loginHistory: loginHistory.map((l) => ({
        id: l.id,
        userId: l.userId,
        tenantId: l.tenantId,
        successful: l.successful,
        device: l.device,
        browser: l.browser,
        os: l.os,
        ip: l.ip,
        location: l.location,
        userAgent: l.userAgent,
        createdAt: l.createdAt.toISOString(),
      })),
      activity: activity.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        actorName: a.actorName,
        targetId: a.targetId,
        targetName: a.targetName,
        action: a.action,
        category: a.category,
        message: a.message,
        metadata: a.metadata as Record<string, unknown> | null,
        ip: a.ip,
        createdAt: a.createdAt.toISOString(),
      })),
      auditLogs: auditLogs.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        actorName: a.actorName,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        before: a.before as Record<string, unknown> | null,
        after: a.after as Record<string, unknown> | null,
        reason: a.reason,
        ip: a.ip,
        createdAt: a.createdAt.toISOString(),
      })),
      employeeNotes: employeeNotes.map((n) => ({
        id: n.id,
        staffProfileId: n.staffProfileId,
        authorId: n.authorId,
        authorName: n.authorName,
        body: n.body,
        category: n.category,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
    };
  }

  async updateMember(
    tenantId: string,
    memberId: string,
    dto: UpdateStaffLike,
    actor: Actor,
  ) {
    const profile = await this.getProfile(tenantId, memberId);
    const current = await this.getMemberDetail(tenantId, memberId, actor);

    if (!this.canManageActor(profile.role as string, actor.activeRole || 'STAFF')) {
      throw new ForbiddenException('You cannot modify a member with a higher role');
    }
    if (actor.activeRole !== 'OWNER' && profile.role === 'OWNER') {
      throw new ForbiddenException('Only the owner can modify the owner');
    }
    if (profile.userId === actor.id && dto.status === 'SUSPENDED') {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    if (dto.role && dto.role !== profile.role && actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can change roles');
    }
    if (dto.role === 'OWNER' && actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can grant the owner role');
    }
    if (profile.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      throw new ForbiddenException('The owner role cannot be demoted');
    }

    const before = this.snapshotForAudit(profile, current);

    const data: Prisma.StaffProfileUpdateInput = {};
    if (dto.department !== undefined) data.department = dto.department;
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.notes !== undefined) data.notes = dto.notes;
    if (dto.status) data.status = dto.status as any;
    if (dto.role) data.role = dto.role as any;
    if (dto.requirePasswordReset !== undefined) data.requirePasswordReset = dto.requirePasswordReset;
    if (dto.twoFactorRequired !== undefined) data.twoFactorRequired = dto.twoFactorRequired;
    if (dto.permissions) data.permissions = dto.permissions as any;

    const userData: Prisma.UserUpdateInput = {};
    if (dto.firstName !== undefined) userData.firstName = dto.firstName;
    if (dto.lastName !== undefined) userData.lastName = dto.lastName;
    if (dto.phone !== undefined) userData.phone = dto.phone;

    if (Object.keys(userData).length) {
      await this.prisma.user.update({ where: { id: profile.userId }, data: userData });
    }

    if (dto.branchIds) {
      await this.replaceBranches(profile.id, dto.branchIds);
    }

    const updatedProfile = await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatarUrl: true,
            twoFactorEnabled: true,
          },
        },
        branches: { include: { branch: true } },
      },
    });

    // Keep membership role in sync.
    if (dto.role && dto.role !== profile.role) {
      await this.prisma.membership.updateMany({
        where: { userId: profile.userId, tenantId },
        data: { role: dto.role as any },
      });
    }

    const after = this.toStaffMember(updatedProfile as any, actor.id);
    const changes = this.buildChanges(before, after, dto);
    await this.recordAudit({
      tenantId,
      actor,
      entityType: 'StaffProfile',
      entityId: memberId,
      action: 'STAFF_UPDATED',
      before: changes.before,
      after: changes.after,
      reason: 'Member profile updated',
    });
    await this.recordActivity({
      tenantId,
      actor,
      targetId: memberId,
      targetName: this.actorName({ email: after.email, firstName: after.firstName || undefined, lastName: after.lastName || undefined }),
      action: 'STAFF_UPDATED',
      category: 'staff',
      message: `Updated member ${after.firstName || ''} ${after.lastName || ''}`.trim(),
    });
    return after;
  }

  async changeRole(tenantId: string, memberId: string, role: string, actor: Actor) {
    if (actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can change roles');
    }
    if (role === 'OWNER') {
      throw new ForbiddenException('The owner role cannot be granted through role changes');
    }
    const profile = await this.getProfile(tenantId, memberId);
    if (profile.role === 'OWNER') {
      throw new ForbiddenException('The owner role cannot be changed');
    }
    if (profile.userId === actor.id) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const before = { role: profile.role };
    const updated = await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: { role: role as any },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, twoFactorEnabled: true } },
        branches: { include: { branch: true } },
      },
    });
    await this.prisma.membership.updateMany({
      where: { userId: profile.userId, tenantId },
      data: { role: role as any },
    });
    const after = this.toStaffMember(updated as any, actor.id);
    await this.recordAudit({
      tenantId, actor, entityType: 'StaffProfile', entityId: memberId,
      action: 'ROLE_CHANGED',
      before, after: { role },
      reason: `Role changed from ${before.role} to ${role}`,
    });
    await this.recordActivity({
      tenantId, actor, targetId: memberId,
      targetName: this.actorName({ email: after.email, firstName: after.firstName || undefined, lastName: after.lastName || undefined }),
      action: 'ROLE_CHANGED', category: 'staff',
      message: `Changed role of ${after.firstName || after.email} to ${role}`,
      metadata: { from: before.role, to: role },
    });
    return after;
  }

  async updatePermissions(tenantId: string, memberId: string, permissions: string[], actor: Actor) {
    if (actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can change permissions');
    }
    const profile = await this.getProfile(tenantId, memberId);
    if (profile.role === 'OWNER' && profile.userId !== actor.id) {
      throw new ForbiddenException('Only the owner themselves can change their permissions');
    }
    const before = { permissions: this.parsePermissions(profile.permissions, profile.role) };
    const updated = await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: { permissions: permissions as any },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, twoFactorEnabled: true } },
        branches: { include: { branch: true } },
      },
    });
    const after = this.toStaffMember(updated as any, actor.id);
    await this.recordAudit({
      tenantId, actor, entityType: 'StaffProfile', entityId: memberId,
      action: 'PERMISSION_UPDATED', before, after: { permissions },
      reason: 'Permission set updated',
    });
    await this.recordActivity({
      tenantId, actor, targetId: memberId,
      targetName: this.actorName({ email: after.email, firstName: after.firstName || undefined, lastName: after.lastName || undefined }),
      action: 'PERMISSION_UPDATED', category: 'staff',
      message: `Updated permissions for ${after.firstName || after.email}`,
    });
    return after;
  }

  async setStatus(tenantId: string, memberId: string, status: string, actor: Actor) {
    const profile = await this.getProfile(tenantId, memberId);
    if (!this.canManageActor(profile.role as string, actor.activeRole || 'STAFF')) {
      throw new ForbiddenException('You cannot change the status of a member with a higher role');
    }
    if (profile.userId === actor.id && status === 'SUSPENDED') {
      throw new ForbiddenException('You cannot suspend your own account');
    }
    if (profile.role === 'OWNER' && actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can change the owner status');
    }
    const before = { status: profile.status };
    const updated = await this.prisma.staffProfile.update({
      where: { id: profile.id },
      data: { status: status as any },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true, twoFactorEnabled: true } },
        branches: { include: { branch: true } },
      },
    });
    const after = this.toStaffMember(updated as any, actor.id);
    await this.recordAudit({
      tenantId, actor, entityType: 'StaffProfile', entityId: memberId,
      action: 'STATUS_CHANGED', before, after: { status },
      reason: `Status changed to ${status}`,
    });
    await this.recordActivity({
      tenantId, actor, targetId: memberId,
      targetName: this.actorName({ email: after.email, firstName: after.firstName || undefined, lastName: after.lastName || undefined }),
      action: 'STATUS_CHANGED', category: 'staff',
      message: `Marked ${after.firstName || after.email} as ${status.toLowerCase()}`,
    });
    return after;
  }

  async setTwoFactor(tenantId: string, memberId: string, action: 'REQUIRE' | 'DISABLE' | 'RESET', actor: Actor) {
    if (actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can manage two-factor authentication');
    }
    const profile = await this.getProfile(tenantId, memberId);
    const before = {
      twoFactorRequired: profile.twoFactorRequired,
      twoFactorEnabled: await this.prisma.user
        .findUnique({ where: { id: profile.userId } })
        .then((u) => u?.twoFactorEnabled),
    };
    const data: Prisma.StaffProfileUpdateInput = {};
    const userData: Prisma.UserUpdateInput = {};
    if (action === 'REQUIRE') {
      data.twoFactorRequired = true;
      userData.twoFactorEnabled = true;
    } else if (action === 'DISABLE') {
      data.twoFactorRequired = false;
      userData.twoFactorEnabled = false;
    } else if (action === 'RESET') {
      // Invalidate existing 2FA setup; user must re-enroll.
      data.twoFactorRequired = true;
      userData.twoFactorEnabled = false;
    }
    await this.prisma.user.update({ where: { id: profile.userId }, data: userData });
    const updated = await this.prisma.staffProfile.update({ where: { id: profile.id }, data });
    const after = {
      twoFactorRequired: updated.twoFactorRequired,
      twoFactorEnabled: Boolean(userData.twoFactorEnabled),
    };
    await this.recordAudit({
      tenantId, actor, entityType: 'StaffProfile', entityId: memberId,
      action: 'TWO_FACTOR_CHANGED', before, after,
      reason: `2FA ${action.toLowerCase()}`,
    });
    await this.recordActivity({
      tenantId, actor, targetId: memberId,
      targetName: this.actorName({ email: profile.userId, firstName: undefined, lastName: undefined }),
      action: 'TWO_FACTOR_CHANGED', category: 'security',
      message: `${action === 'REQUIRE' ? 'Required' : action === 'DISABLE' ? 'Disabled' : 'Reset'} 2FA for a member`,
    });
    return after;
  }

  async removeMember(tenantId: string, memberId: string, actor: Actor) {
    const profile = await this.getProfile(tenantId, memberId);
    if (profile.userId === actor.id) {
      throw new ForbiddenException('You cannot remove your own account');
    }
    if (profile.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove the owner');
    }
    if (actor.activeRole !== 'OWNER') {
      throw new ForbiddenException('Only the owner can remove members');
    }
    const targetName = this.actorName({ email: profile.userId, firstName: undefined, lastName: undefined });
    await this.prisma.$transaction([
      this.prisma.staffBranch.deleteMany({ where: { staffProfileId: profile.id } }),
      this.prisma.employeeNote.deleteMany({ where: { staffProfileId: profile.id } }),
      this.prisma.staffProfile.delete({ where: { id: profile.id } }),
      this.prisma.membership.deleteMany({ where: { userId: profile.userId, tenantId } }),
    ]);
    await this.recordAudit({
      tenantId, actor, entityType: 'StaffProfile', entityId: memberId,
      action: 'STAFF_REMOVED', before: { role: profile.role },
      reason: 'Member removed from team',
    });
    await this.recordActivity({
      tenantId, actor, targetId: memberId, targetName,
      action: 'STAFF_REMOVED', category: 'staff',
      message: `Removed a member from the team`,
    });
    return { message: 'Member removed successfully' };
  }

  async replaceBranches(staffProfileId: string, branchIds: string[]) {
    await this.prisma.$transaction([
      this.prisma.staffBranch.deleteMany({ where: { staffProfileId } }),
      this.prisma.staffBranch.createMany({
        data: branchIds.map((branchId, i) => ({
          staffProfileId,
          branchId,
          primary: i === 0,
        })),
      }),
    ]);
  }

  // ─── Notes ───────────────────────────────────────────────────────────────

  async addNote(tenantId: string, memberId: string, body: string, category: string | undefined, actor: Actor) {
    const profile = await this.getProfile(tenantId, memberId);
    const note = await this.prisma.employeeNote.create({
      data: {
        tenantId,
        staffProfileId: profile.id,
        authorId: actor.id,
        authorName: this.actorName(actor),
        body,
        category: category || null,
      },
    });
    await this.recordActivity({
      tenantId, actor, targetId: profile.id,
      targetName: this.actorName({ email: profile.userId, firstName: undefined, lastName: undefined }),
      action: 'NOTE_ADDED', category: 'notes',
      message: `Added a private note`,
    });
    return {
      id: note.id,
      staffProfileId: note.staffProfileId,
      authorId: note.authorId,
      authorName: note.authorName,
      body: note.body,
      category: note.category,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async deleteNote(tenantId: string, memberId: string, noteId: string) {
    const note = await this.prisma.employeeNote.findFirst({
      where: { id: noteId, staffProfileId: memberId, tenantId },
    });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.employeeNote.delete({ where: { id: noteId } });
    return { message: 'Note deleted' };
  }

  // ─── Profile photo ───────────────────────────────────────────────────────

  async uploadPhoto(tenantId: string, memberId: string, buffer: Buffer, mimetype: string, filename: string, actor: Actor) {
    const profile = await this.getProfile(tenantId, memberId);
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif'];
    if (!allowed.includes(mimetype) && !/\.(png|jpe?g|webp|gif|avif)$/i.test(filename)) {
      throw new BadRequestException('Unsupported image type');
    }
    if (buffer.length > 3 * 1024 * 1024) {
      throw new BadRequestException('Image must be under 3MB');
    }
    const dataUrl = `data:${mimetype};base64,${buffer.toString('base64')}`;
    await this.prisma.user.update({ where: { id: profile.userId }, data: { avatarUrl: dataUrl } });
    await this.prisma.profileImage.create({
      data: { userId: profile.userId, url: dataUrl, provider: 'internal' },
    });
    await this.recordActivity({
      tenantId, actor, targetId: profile.id,
      targetName: this.actorName({ email: profile.userId, firstName: undefined, lastName: undefined }),
      action: 'PROFILE_UPDATED', category: 'staff',
      message: `Updated profile photo`,
    });
    return this.getMemberDetail(tenantId, memberId, actor);
  }

  async removePhoto(tenantId: string, memberId: string, actor: Actor) {
    const profile = await this.getProfile(tenantId, memberId);
    await this.prisma.user.update({ where: { id: profile.userId }, data: { avatarUrl: null } });
    await this.recordActivity({
      tenantId, actor, targetId: profile.id,
      targetName: this.actorName({ email: profile.userId, firstName: undefined, lastName: undefined }),
      action: 'PROFILE_UPDATED', category: 'staff',
      message: `Removed profile photo`,
    });
    return this.getMemberDetail(tenantId, memberId, actor);
  }

  // ─── Presence ────────────────────────────────────────────────────────────

  async heartbeat(tenantId: string, userId: string) {
    await this.ensureProfile(userId, tenantId, 'STAFF');
    await this.prisma.staffProfile.updateMany({
      where: { userId, tenantId },
      data: { isOnline: true, lastSeenAt: new Date() },
    });
    return { online: true, at: new Date().toISOString() };
  }

  async markOffline(tenantId: string, userId: string) {
    await this.prisma.staffProfile.updateMany({
      where: { userId, tenantId },
      data: { isOnline: false, lastLogoutAt: new Date() },
    });
    return { online: false };
  }

  async markLogin(
    userId: string,
    tenantId: string | null,
    opts: {
      successful: boolean;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const ua = parseUserAgent(opts.userAgent || '');
    try {
      await this.prisma.loginHistory.create({
        data: {
          userId,
          tenantId: tenantId || undefined,
          successful: opts.successful,
          device: ua.device,
          browser: ua.browser,
          os: ua.os,
          ip: opts.ip || null,
          location: null,
          userAgent: opts.userAgent || null,
        },
      });
    } catch (err) {
      console.warn('Login history write failed', err);
    }
    if (opts.successful && tenantId) {
      try {
        await this.ensureProfile(userId, tenantId, 'STAFF');
      } catch {
        /* ignore */
      }
      await this.prisma.staffProfile.updateMany({
        where: { userId, tenantId },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
          lastLoginAt: new Date(),
          lastLoginIp: opts.ip || null,
          lastLoginDevice: ua.device,
          lastLoginBrowser: ua.browser,
          lastLoginOs: ua.os,
        },
      });
    }
  }

  // ─── Invitations ─────────────────────────────────────────────────────────

  private resendCooldownMs() {
    const secs = Number(process.env.INVITE_RESEND_COOLDOWN_SECONDS) || 60;
    return secs * 1000;
  }

  async expirePendingInvitations(tenantId: string) {
    const updated = await this.prisma.invitation.updateMany({
      where: { tenantId, status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return updated.count;
  }

  async listBranches(tenantId: string) {
    const branches = await this.prisma.branch.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, address: true, city: true },
    });
    return branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address ? [b.address, b.city].filter(Boolean).join(', ') : (b.city ?? null),
    }));
  }

  private async assertBranchesBelongToTenant(tenantId: string, branchIds: string[]) {
    if (!branchIds.length) return;
    const count = await this.prisma.branch.count({
      where: { tenantId, id: { in: branchIds } },
    });
    if (count !== branchIds.length) {
      throw new BadRequestException('One or more selected branches are invalid');
    }
  }

  private async resendRemainingSeconds(invitation: { lastSentAt?: Date | null; sentAt?: Date | null }): Promise<number> {
    const last = invitation.lastSentAt ?? invitation.sentAt;
    if (!last) return 0;
    const elapsed = Date.now() - new Date(last).getTime();
    if (elapsed < 0) return Math.ceil(this.resendCooldownMs() / 1000);
    return Math.max(0, Math.ceil((this.resendCooldownMs() - elapsed) / 1000));
  }

  async inviteMember(tenantId: string, dto: InviteMemberLike, actor: Actor) {
    await this.ensureProfile(actor.id, tenantId, actor.activeRole);
    const email = dto.email.toLowerCase().trim();

    if (actor.activeRole !== 'OWNER' && (dto.role === 'OWNER' || dto.role === 'MANAGER')) {
      throw new ForbiddenException('Only the owner can invite owner or manager roles');
    }

    await this.assertBranchesBelongToTenant(tenantId, dto.branchIds || []);

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const member = await this.prisma.membership.findFirst({
        where: { userId: existingUser.id, tenantId },
      });
      if (member) {
        throw new ConflictException('This email is already a member of your team');
      }
    }

    const pending = await this.prisma.invitation.findFirst({
      where: { tenantId, email, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('An invitation for this email is already pending');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const isDraft = Boolean(dto.saveDraft);
    const now = new Date();
    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        phone: dto.phone || null,
        role: dto.role as any,
        branchIds: dto.branchIds || [],
        department: dto.department || null,
        jobTitle: dto.jobTitle || null,
        permissions: (dto.permissions && dto.permissions.length ? dto.permissions : null) as any,
        notes: dto.notes || null,
        message: dto.message || null,
        status: 'PENDING',
        token,
        invitationUrl: isDraft ? null : `${this.webBaseUrl()}/invite/${token}`,
        expiresAt: new Date(now.getTime() + this.inviteExpiryMs()),
        sentAt: isDraft ? null : now,
        lastSentAt: isDraft ? null : now,
        invitedById: actor.id,
      },
    });

    if (!isDraft && dto.sendWelcomeEmail !== false) {
      await this.sendInviteEmail(tenantId, invitation, actor);
    } else {
      this.logInvite(tenantId, invitation, actor);
    }

    await this.recordActivity({
      tenantId, actor,
      targetId: invitation.id,
      targetName: email,
      action: isDraft ? 'INVITATION_DRAFTED' : 'INVITATION_SENT',
      category: 'invitations',
      message: isDraft
        ? `Saved a draft invitation for ${email}`
        : `Invited ${email} as ${dto.role.toLowerCase()}`,
      metadata: { role: dto.role },
    });

    return this.mapInvitation(invitation);
  }

  async getInvitationCounts(tenantId: string): Promise<InvitationCounts> {
    await this.expirePendingInvitations(tenantId);
    const grouped = await this.prisma.invitation.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });
    const map: Record<string, number> = { PENDING: 0, ACCEPTED: 0, EXPIRED: 0, CANCELLED: 0 };
    for (const g of grouped) map[g.status] = g._count._all;
    const ALL = Object.values(map).reduce((a, b) => a + b, 0);
    return { ALL, PENDING: map.PENDING, ACCEPTED: map.ACCEPTED, EXPIRED: map.EXPIRED, CANCELLED: map.CANCELLED };
  }

  async listInvitations(
    tenantId: string,
    query: { status?: string; search?: string; role?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number },
  ) {
    await this.expirePendingInvitations(tenantId);
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const where: Prisma.InvitationWhereInput = { tenantId };
    if (query.status && query.status !== 'ALL') where.status = query.status as any;
    if (query.role && query.role !== 'ALL') where.role = query.role as any;
    const term = query.search?.trim();
    if (term) {
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { id: { contains: term, mode: 'insensitive' } },
      ];
    }
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
    const dateTo = query.dateTo ? new Date(query.dateTo) : null;
    if (dateFrom || dateTo) {
      where.createdAt = {
        gte: dateFrom || undefined,
        lte: dateTo || undefined,
      };
    }
    const [total, rows, counts] = await Promise.all([
      this.prisma.invitation.count({ where }),
      this.prisma.invitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.getInvitationCounts(tenantId),
    ]);
    const branchIds = Array.from(new Set(rows.flatMap((r) => r.branchIds)));
    const userIds = Array.from(
      new Set(rows.flatMap((r) => [r.invitedById, r.cancelledById, r.acceptedByUserId].filter(Boolean) as string[])),
    );
    const [branches, users] = await Promise.all([
      this.prisma.branch.findMany({ where: { tenantId, id: { in: branchIds } } }),
      this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
    ]);
    const branchNameById = new Map(branches.map((b) => [b.id, b.name]));
    const userById = new Map(users.map((u) => [u.id, u]));
    return {
      items: rows.map((r) => this.mapInvitation(r, branchNameById, userById)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      counts,
    };
  }

  async getInvitationDetail(tenantId: string, invitationId: string): Promise<StaffInvitationDetail> {
    await this.expirePendingInvitations(tenantId);
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const [activity, branches, users, joinedProfile, existingAccount] = await Promise.all([
      this.prisma.staffActivityLog.findMany({
        where: { tenantId, targetId: invitation.id, category: 'invitations' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.branch.findMany({ where: { tenantId, id: { in: invitation.branchIds } } }),
      this.prisma.user.findMany({
        where: {
          id: {
            in: [invitation.invitedById, invitation.cancelledById, invitation.acceptedByUserId].filter(Boolean) as string[],
          },
        },
        select: { id: true, firstName: true, lastName: true },
      }),
      invitation.acceptedByUserId
        ? this.prisma.staffProfile.findFirst({
            where: { userId: invitation.acceptedByUserId, tenantId },
            select: { id: true, userId: true, role: true, status: true },
          })
        : Promise.resolve(null),
      this.prisma.user.findUnique({ where: { email: invitation.email } }),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const detail = this.mapInvitation(invitation, new Map(branches.map((b) => [b.id, b.name])), userById);
    const cooldown = await this.resendRemainingSeconds(invitation);
    return {
      ...detail,
      joinedMemberId: joinedProfile?.id ?? null,
      hasExistingAccount: Boolean(existingAccount),
      resendCooldownSeconds: cooldown,
      resendAvailableAt: cooldown > 0 ? new Date(Date.now() + cooldown * 1000).toISOString() : null,
      activity: activity.map((a) => ({
        id: a.id,
        actorId: a.actorId,
        actorName: a.actorName,
        eventType: a.action,
        action: a.action,
        category: a.category,
        message: a.message,
        metadata: a.metadata as Record<string, unknown> | null,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  }

  async resendInvitation(tenantId: string, invitationId: string, actor: Actor) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('This invitation has already been accepted');
    }
    const cooldown = await this.resendRemainingSeconds(invitation);
    if (cooldown > 0) {
      throw new BadRequestException(`Invitation can be resent in ${cooldown} seconds`);
    }
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token,
        invitationUrl: `${this.webBaseUrl()}/invite/${token}`,
        expiresAt: new Date(now.getTime() + this.inviteExpiryMs()),
        sentAt: now,
        lastSentAt: now,
        status: 'PENDING',
        cancelledAt: null,
        cancelledById: null,
        resendCount: { increment: 1 },
      },
    });
    await this.sendInviteEmail(tenantId, updated, actor);
    await this.recordActivity({
      tenantId, actor,
      targetId: updated.id,
      targetName: updated.email,
      action: 'INVITATION_RESENT', category: 'invitations',
      message: `Resent invitation to ${updated.email}`,
    });
    return this.getInvitationDetail(tenantId, invitationId);
  }

  async cancelInvitation(tenantId: string, invitationId: string, actor: Actor) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === 'ACCEPTED') {
      throw new BadRequestException('An accepted invitation cannot be cancelled');
    }
    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: actor.id,
        // Rotate the token so the previous link is dead even at the data layer.
        token: crypto.randomBytes(32).toString('hex'),
        invitationUrl: null,
      },
    });
    await this.recordActivity({
      tenantId, actor,
      targetId: updated.id,
      targetName: updated.email,
      action: 'INVITATION_CANCELLED', category: 'invitations',
      message: `Cancelled invitation for ${updated.email}`,
    });
    return this.getInvitationDetail(tenantId, invitationId);
  }

  async getInvitationLink(tenantId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (!invitation.invitationUrl) {
      throw new BadRequestException('This invitation has no active link');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('This invitation link is no longer active');
    }
    return { invitationUrl: invitation.invitationUrl, expiresAt: invitation.expiresAt.toISOString() };
  }

  async getInvitationForAccept(token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status === 'CANCELLED') throw new BadRequestException('This invitation was cancelled');
    if (invitation.status === 'ACCEPTED') throw new BadRequestException('This invitation has already been used');
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This invitation has expired');
    }
    const [tenant, branches, existing] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: invitation.tenantId } }),
      this.prisma.branch.findMany({ where: { tenantId: invitation.tenantId, id: { in: invitation.branchIds } } }),
      this.prisma.user.findUnique({ where: { email: invitation.email } }),
    ]);
    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      phone: invitation.phone,
      role: invitation.role,
      branchIds: invitation.branchIds,
      branchNames: branches.map((b) => b.name),
      department: invitation.department,
      jobTitle: invitation.jobTitle,
      message: invitation.message,
      businessName: tenant?.name || 'the business',
      expiresAt: invitation.expiresAt.toISOString(),
      hasExistingAccount: Boolean(existing),
    };
  }

  async acceptInvitation(token: string, dto: AcceptInvitationLike) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new NotFoundException('Invitation not found');

    const now = new Date();
    if (invitation.expiresAt < now) {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This invitation has expired');
    }

    // Authenticated acceptance: the provided user must own the invited email.
    let user: PrismaUser | null = null;
    if (dto.userId) {
      user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
      if (!user) throw new BadRequestException('Account not found');
      if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
        throw new ForbiddenException('This invitation was sent to another email address');
      }
    }

    // Idempotent, atomic acceptance — double-clicks and replays are safe.
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: now, acceptedByUserId: user?.id ?? null },
      });
      if (claimed.count === 0) {
        const current = await tx.invitation.findUnique({ where: { id: invitation.id } });
        if (current?.status === 'ACCEPTED') {
          return { alreadyAccepted: true as const, user: null as any };
        }
        throw new BadRequestException('This invitation is no longer active');
      }

      if (!user) {
        user = await tx.user.findUnique({ where: { email: invitation.email } });
        if (user) {
          const bcrypt = await import('bcrypt');
          const hashed = dto.password ? await bcrypt.hash(dto.password, 12) : null;
          await tx.user.update({
            where: { id: user.id },
            data: {
              firstName: dto.firstName || user.firstName,
              lastName: dto.lastName || user.lastName,
              ...(hashed ? { password: user.password || hashed } : {}),
            },
          });
        } else {
          if (!dto.password) {
            throw new BadRequestException('A password is required to create your account');
          }
          const bcrypt = await import('bcrypt');
          const hashed = await bcrypt.hash(dto.password, 12);
          user = await tx.user.create({
            data: {
              email: invitation.email,
              firstName: dto.firstName || invitation.firstName || 'Team',
              lastName: dto.lastName || invitation.lastName || 'Member',
              phone: dto.phone || invitation.phone || null,
              password: hashed,
            },
          });
        }
      }

      // Membership — created idempotently so repeat acceptance never duplicates.
      const existing = await tx.membership.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: invitation.tenantId } },
      });
      if (!existing) {
        await tx.membership.create({
          data: { userId: user.id, tenantId: invitation.tenantId, role: invitation.role },
        });
      }

      // Staff profile with the invited role + permissions + branches.
      let profile = await tx.staffProfile.findUnique({
        where: { userId_tenantId: { userId: user.id, tenantId: invitation.tenantId } },
      });
      const profileData = {
        role: invitation.role,
        status: 'ACTIVE' as const,
        department: invitation.department || null,
        jobTitle: invitation.jobTitle || null,
        permissions: (invitation.permissions as any) ?? undefined,
        requirePasswordReset: false,
      };
      if (!profile) {
        profile = await tx.staffProfile.create({
          data: { userId: user.id, tenantId: invitation.tenantId, dateJoined: now, ...profileData },
        });
      } else {
        profile = await tx.staffProfile.update({ where: { id: profile.id }, data: profileData });
      }
      if (invitation.branchIds.length) {
        await tx.staffBranch.deleteMany({ where: { staffProfileId: profile.id } });
        await tx.staffBranch.createMany({
          data: invitation.branchIds.map((branchId, i) => ({
            staffProfileId: profile.id,
            branchId,
            primary: i === 0,
          })),
        });
      }

      return { alreadyAccepted: false as const, user };
    });

    if (result.alreadyAccepted) {
      return { message: 'You are already a member of this workspace.', email: invitation.email, alreadyAccepted: true };
    }

    const acceptedUser = result.user;
    await this.recordActivity({
      tenantId: invitation.tenantId,
      actor: { id: acceptedUser.id, email: acceptedUser.email, firstName: acceptedUser.firstName, lastName: acceptedUser.lastName },
      targetId: invitation.id,
      targetName: `${acceptedUser.firstName} ${acceptedUser.lastName}`.trim(),
      action: 'INVITATION_ACCEPTED', category: 'invitations',
      message: `${acceptedUser.firstName} ${acceptedUser.lastName}`.trim() + ' accepted the invitation',
    });

    return { message: 'Welcome aboard! You can now sign in.', email: acceptedUser.email };
  }

  async sendInviteEmail(tenantId: string, invitation: any, actor: Actor) {
    const apiKey = process.env.RESEND_API_KEY;
    const link = invitation.invitationUrl;
    if (!link) {
      this.logInvite(tenantId, invitation, actor);
      return;
    }
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const businessName = tenant?.name || 'your business';
    const roleLabel = (invitation.role || 'STAFF').toLowerCase();
    const inviterName = this.actorName(actor);
    const expiresDate = new Date(invitation.expiresAt);
    const expiresLabel = Number.isNaN(expiresDate.getTime())
      ? 'soon'
      : expiresDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    const inviteeName = [invitation.firstName, invitation.lastName].filter(Boolean).join(' ') || 'there';
    const messageHtml = invitation.message
      ? `<p style="margin:0 0 16px;font-size:14px;color:#334155">${invitation.message}</p>`
      : '';
    const html = `
      <div style="font-family:Inter,-apple-system,system-ui,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9px;background:#2563EB;color:#fff;font-weight:800;font-size:16px">D</span>
          <span style="font-size:17px;font-weight:700;color:#0f172a">Doloyal</span>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:28px">
          <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a">You've been invited to join ${businessName}</h1>
          <p style="margin:0 0 16px;font-size:14px;color:#475569">Hi ${inviteeName}, ${inviterName} has invited you to collaborate on <strong>${businessName}</strong> as a <strong style="color:#2563EB">${roleLabel}</strong>.</p>
          ${messageHtml}
          <a href="${link}" style="display:inline-block;margin:8px 0 20px;padding:12px 24px;background:#2563EB;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px">Accept Invitation</a>
          <p style="margin:0 0 12px;font-size:12px;color:#94a3b8">This invitation expires on <strong>${expiresLabel}</strong> and can only be used once.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8">If you didn't expect this invitation, you can safely ignore this email. This link is private and should not be shared.</p>
        </div>
        <p style="margin:20px 0 0;text-align:center;font-size:12px;color:#94a3b8">© ${new Date().getFullYear()} Doloyal. Powering smarter customer retention.</p>
      </div>`;
    if (apiKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(apiKey);
        await resend.emails.send({
          from: process.env.RESEND_FROM || 'Doloyal <noreply@doloyal.ai>',
          to: invitation.email,
          subject: `You've been invited to join ${businessName} on Doloyal`,
          html,
        });
        return;
      } catch (err) {
        console.warn('Invite email failed, logging instead', err);
      }
    }
    this.logInvite(tenantId, invitation, actor);
  }

  private logInvite(tenantId: string, invitation: any, actor: Actor) {
    console.log(
      `[invite] ${actor.email} -> ${invitation.email} (${invitation.role}) ${invitation.invitationUrl || '(draft)'}`,
    );
  }

  private mapInvitation(
    r: any,
    branchNameById?: Map<string, string>,
    userById?: Map<string, { id: string; firstName: string | null; lastName: string | null }>,
  ): StaffInvitation {
    const nameOf = (id?: string | null): string | null => {
      if (!id) return null;
      const u = userById?.get(id);
      if (!u) return null;
      return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null;
    };
    return {
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      role: r.role,
      status: r.status,
      branchIds: r.branchIds || [],
      branchNames: (r.branchIds || []).map((id: string) => branchNameById?.get(id)).filter(Boolean),
      department: r.department,
      jobTitle: r.jobTitle,
      message: r.message ?? null,
      token: r.token,
      invitationUrl: r.invitationUrl,
      expiresAt: r.expiresAt?.toISOString(),
      sentAt: r.sentAt?.toISOString() ?? null,
      lastSentAt: r.lastSentAt?.toISOString() ?? r.sentAt?.toISOString() ?? null,
      acceptedAt: r.acceptedAt?.toISOString() ?? null,
      cancelledAt: r.cancelledAt?.toISOString() ?? null,
      cancelledById: r.cancelledById ?? null,
      cancelledByName: nameOf(r.cancelledById),
      acceptedByUserId: r.acceptedByUserId ?? null,
      acceptedByName: nameOf(r.acceptedByUserId),
      invitedById: r.invitedById ?? null,
      invitedByName: nameOf(r.invitedById),
      joinedMemberId: null,
      resendCount: r.resendCount,
      createdAt: r.createdAt?.toISOString(),
    };
  }

  // ─── Bulk actions ────────────────────────────────────────────────────────

  async bulkAction(tenantId: string, dto: BulkActionLike, actor: Actor) {
    const results: Array<{ id: string; ok: boolean; message?: string }> = [];
    for (const id of dto.ids) {
      try {
        switch (dto.action) {
          case 'DELETE':
            await this.removeMember(tenantId, id, actor);
            break;
          case 'DEACTIVATE':
            await this.setStatus(tenantId, id, 'INACTIVE', actor);
            break;
          case 'ACTIVATE':
            await this.setStatus(tenantId, id, 'ACTIVE', actor);
            break;
          case 'SUSPEND':
            await this.setStatus(tenantId, id, 'SUSPENDED', actor);
            break;
          case 'ASSIGN_BRANCH':
            if (!dto.branchId) throw new BadRequestException('branchId required');
            await this.updateMember(tenantId, id, { branchIds: [dto.branchId] }, actor);
            break;
          case 'CHANGE_ROLE':
            if (!dto.role) throw new BadRequestException('role required');
            await this.changeRole(tenantId, id, dto.role, actor);
            break;
          case 'RESEND_INVITATION': {
            const profile = await this.getProfile(tenantId, id);
            const user = await this.prisma.user.findUnique({ where: { id: profile.userId } });
            const inv = user
              ? await this.prisma.invitation.findFirst({
                  where: { tenantId, email: user.email, status: 'PENDING' },
                })
              : null;
            if (inv) await this.resendInvitation(tenantId, inv.id, actor);
            else throw new BadRequestException('No pending invitation found');
            break;
          }
          case 'ENABLE_2FA':
            await this.setTwoFactor(tenantId, id, 'REQUIRE', actor);
            break;
          case 'DISABLE_2FA':
            await this.setTwoFactor(tenantId, id, 'DISABLE', actor);
            break;
        }
        results.push({ id, ok: true });
      } catch (err: any) {
        results.push({ id, ok: false, message: err.message });
      }
    }
    return { action: dto.action, total: results.length, succeeded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
  }

  // ─── Export ──────────────────────────────────────────────────────────────

  async exportMembers(tenantId: string, query: ListStaffQueryLike, format: 'csv' | 'xlsx', actor: Actor) {
    const members = await this.listMembers(tenantId, { ...query, pageSize: 500 }, actor);
    const rows = members.items.map((m) => ({
      Name: [m.firstName, m.lastName].filter(Boolean).join(' '),
      Email: m.email,
      Phone: m.phone || '',
      Role: m.role,
      Status: m.status,
      Department: m.department || '',
      'Job Title': m.jobTitle || '',
      Branches: m.branches.map((b) => b.name).join('; '),
      'Two-Factor': m.twoFactorEnabled ? 'Enabled' : 'Disabled',
      Online: m.isOnline ? 'Yes' : 'No',
      'Last Login': m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : '',
      'Date Joined': new Date(m.dateJoined).toLocaleDateString(),
      'Login Count': String(m.loginCount),
    }));

    if (format === 'xlsx') {
      const xlsx = await import('xlsx');
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Staff');
      const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      const date = new Date().toISOString().slice(0, 10);
      return { buffer: buf, filename: `staff-${date}.xlsx`, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }

    const headers = Object.keys(rows[0] || {});
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape((r as any)[h] || '')).join(','))].join('\n');
    return { buffer: Buffer.from(csv, 'utf-8'), filename: `staff-${new Date().toISOString().slice(0, 10)}.csv`, mimeType: 'text/csv;charset=utf-8' };
  }

  // ─── Audit helpers ───────────────────────────────────────────────────────

  private snapshotForAudit(profile: any, current: StaffMember) {
    return {
      role: profile.role,
      status: profile.status,
      department: current.department,
      jobTitle: current.jobTitle,
      phone: current.phone,
      permissions: current.permissions,
    };
  }

  private buildChanges(before: Record<string, unknown>, after: StaffMember, dto: UpdateStaffLike) {
    const beforeObj: Record<string, unknown> = {};
    const afterObj: Record<string, unknown> = {};
    const fields: Array<[keyof UpdateStaffLike, string]> = [
      ['firstName', 'firstName'],
      ['lastName', 'lastName'],
      ['phone', 'phone'],
      ['department', 'department'],
      ['jobTitle', 'jobTitle'],
      ['notes', 'notes'],
      ['role', 'role'],
      ['status', 'status'],
      ['permissions', 'permissions'],
    ];
    for (const [key, field] of fields) {
      if (dto[key] === undefined) continue;
      beforeObj[field] = before[field] ?? null;
      afterObj[field] = (after as any)[field] ?? null;
    }
    return { before: beforeObj, after: afterObj };
  }
}

type ListStaffQueryLike = {
  search?: string;
  role?: string;
  branchId?: string;
  status?: string;
  invitationStatus?: string;
  online?: string;
  dateJoinedFrom?: string;
  dateJoinedTo?: string;
  lastLoginFrom?: string;
  lastLoginTo?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

type UpdateStaffLike = {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  role?: string;
  status?: string;
  notes?: string | null;
  permissions?: string[];
  branchIds?: string[];
  requirePasswordReset?: boolean;
  twoFactorRequired?: boolean;
};

type InviteMemberLike = {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
  branchIds?: string[];
  department?: string;
  jobTitle?: string;
  permissions?: string[];
  notes?: string;
  message?: string;
  sendWelcomeEmail?: boolean;
  requirePasswordReset?: boolean;
  twoFactorRequired?: boolean;
  saveDraft?: boolean;
};

type BulkActionLike = {
  ids: string[];
  action: string;
  branchId?: string;
  role?: string;
};

type AcceptInvitationLike = {
  password?: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
