import { Injectable, UnauthorizedException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import * as bcrypt from 'bcrypt';
import type { AuthUser } from '@doloyal/shared';
import { StaffService } from '../staff/staff.service';

export type LoginMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly encryption: EncryptionService,
    private readonly staff: StaffService,
  ) {}

  async signUp(data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email already registered');

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        password: hashedPassword,
      },
      include: { memberships: true },
    });

    const tenant = await this.prisma.tenant.create({
      data: {
        name: `${data.firstName}'s Business`,
        slug: `${data.firstName}-${Date.now().toString(36)}`.toLowerCase(),
        category: 'OTHER',
        email: data.email,
        phone: data.phone || '',
      },
    });

    await this.prisma.membership.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'OWNER',
      },
    });

    const payload = { sub: user.id, email: user.email, tv: 0 };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: this.mapUser(
        {
          ...user,
          memberships: [
            {
              id: '',
              userId: user.id,
              tenantId: tenant.id,
              role: 'OWNER' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        },
        tenant.id,
        'OWNER',
      ),
    };
  }

  async login(email: string, password: string, meta?: LoginMeta) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: true },
    });
    if (!user || !user.password) {
      if (user) {
        await this.staff.markLogin(user.id, null, { successful: false, ...(meta || {}) });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await this.staff.markLogin(user.id, null, { successful: false, ...(meta || {}) });
      throw new UnauthorizedException('Invalid email or password');
    }

    const activeMembership = user.memberships[0];
    if (!activeMembership) throw new UnauthorizedException('No tenant access');

    await this.staff.markLogin(user.id, activeMembership.tenantId, {
      successful: true,
      ...(meta || {}),
    });

    const payload = { sub: user.id, email: user.email, tv: user.tokenVersion ?? 0 };
    const token = this.jwtService.sign(payload);

    await this.touchSession(user.id, {
      id: `sess-${Date.now()}`,
      device: 'Web browser',
      token,
    });

    return {
      token,
      user: this.mapUser(user, activeMembership.tenantId, activeMembership.role),
    };
  }

  async googleLogin(googleProfile: { id: string; email: string; firstName: string; lastName: string; avatarUrl?: string }, meta?: LoginMeta) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleProfile.id }, { email: googleProfile.email }] },
      include: { memberships: true },
    });

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleProfile.id, avatarUrl: googleProfile.avatarUrl || user.avatarUrl },
          include: { memberships: true },
        });
      }
    } else {
      user = await this.prisma.user.create({
        data: {
          email: googleProfile.email,
          firstName: googleProfile.firstName,
          lastName: googleProfile.lastName,
          avatarUrl: googleProfile.avatarUrl,
          googleId: googleProfile.id,
        },
        include: { memberships: true },
      });

      const tenant = await this.prisma.tenant.create({
        data: {
          name: `${googleProfile.firstName}'s Business`,
          slug: `${googleProfile.firstName}-${Date.now().toString(36)}`.toLowerCase(),
          category: 'OTHER',
          email: googleProfile.email,
        },
      });

      await this.prisma.membership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'OWNER',
        },
      });

      user = await this.prisma.user.findUnique({
        where: { id: user.id },
        include: { memberships: true },
      })!;
    }

    const activeMembership = user!.memberships[0];
    if (!activeMembership) throw new UnauthorizedException('No tenant access');

    await this.staff.markLogin(user!.id, activeMembership.tenantId, {
      successful: true,
      ...(meta || {}),
    });

    const payload = { sub: user!.id, email: user!.email, tv: user!.tokenVersion ?? 0 };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: this.mapUser(user!, activeMembership.tenantId, activeMembership.role),
    };
  }

  async getMe(user: any): Promise<AuthUser> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { memberships: true },
    });
    if (!dbUser) return user;
    const activeMembership = dbUser.memberships.find(m => m.tenantId === user.activeTenantId) || dbUser.memberships[0];
    return this.mapUser(dbUser, activeMembership?.tenantId || user.activeTenantId, activeMembership?.role || user.activeRole);
  }

  async switchTenant(userId: string, tenantId: string, currentUser: any): Promise<AuthUser> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_tenantId: { userId, tenantId } },
    });
    if (!membership) throw new NotFoundException('Tenant membership not found');
    const dbUser = await this.prisma.user.findUnique({ where: { id: userId }, include: { memberships: true } });
    if (!dbUser) throw new NotFoundException('User not found');
    return this.mapUser(dbUser, membership.tenantId, membership.role);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.password) {
      throw new UnauthorizedException('Password login is not available for this account. Use Google sign-in.');
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');
    if (newPassword.length < 8) {
      throw new UnauthorizedException('New password must be at least 8 characters');
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });
    return { message: 'Password updated successfully' };
  }

  async setTwoFactor(userId: string, enabled: boolean) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: enabled },
    });
    return { twoFactorEnabled: user.twoFactorEnabled };
  }

  async listSessions(userId: string, currentToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const sessions = Array.isArray(user.sessions) ? (user.sessions as any[]) : [];
    if (sessions.length === 0) {
      return [
        {
          id: 'current',
          device: 'This device',
          ip: null,
          lastActiveAt: new Date().toISOString(),
          current: true,
        },
      ];
    }
    return sessions.map((s) => ({
      ...s,
      current: currentToken ? s.token === currentToken : s.current === true,
    }));
  }

  async revokeAllSessions(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 }, sessions: [] },
    });
    return { message: 'Logged out from all devices' };
  }

  async touchSession(userId: string, session: { id: string; device: string; ip?: string; token?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    const sessions = Array.isArray(user.sessions) ? ([...(user.sessions as any[])] as any[]) : [];
    const idx = sessions.findIndex((s) => s.id === session.id);
    const entry = {
      id: session.id,
      device: session.device,
      ip: session.ip ?? null,
      token: session.token,
      lastActiveAt: new Date().toISOString(),
      current: true,
    };
    if (idx >= 0) sessions[idx] = { ...sessions[idx], ...entry };
    else sessions.unshift(entry);
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessions: sessions.slice(0, 10) },
    });
  }

  private mapUser(user: any, tenantId: string, role: string): AuthUser {
    return {
      id: user.id,
      externalId: user.googleId || user.clerkId || user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      memberships: (user.memberships || []).map((m: any) => ({
        id: m.id,
        userId: m.userId,
        tenantId: m.tenantId,
        role: m.role,
        createdAt: m.createdAt?.toISOString?.() || m.createdAt,
      })),
      activeTenantId: tenantId,
      activeRole: role as any,
    };
  }
}
