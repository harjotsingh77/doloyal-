import { Injectable, UnauthorizedException, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma.service';
import { EncryptionService } from '../../common/encryption.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import type { AuthUser } from '@doloyal/shared';
import { StaffService } from '../staff/staff.service';

export type LoginMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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

    const payload = { sub: user.id, email: user.email, tv: 0, kind: 'staff' as const };
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

    const activeMembership = user.memberships.find((m) => m.role !== 'CUSTOMER');
    if (!activeMembership) {
      throw new UnauthorizedException(
        'This account is registered as a customer. Sign in from the business Client Page.',
      );
    }

    await this.staff.markLogin(user.id, activeMembership.tenantId, {
      successful: true,
      ...(meta || {}),
    });

    const payload = { sub: user.id, email: user.email, tv: user.tokenVersion ?? 0, kind: 'staff' as const };
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

    // Admin status is granted exclusively through the database (isAdmin /
    // adminRole columns managed by platform operators). No email-based
    // auto-promotion — that would let anyone registering a matching address
    // escalate to SUPER_ADMIN.

    if (user) {
      const updateData: any = {};
      if (!user.googleId) updateData.googleId = googleProfile.id;
      if (googleProfile.avatarUrl && googleProfile.avatarUrl !== user.avatarUrl) updateData.avatarUrl = googleProfile.avatarUrl;
      if (Object.keys(updateData).length > 0) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: updateData,
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

    const activeMembership = user!.memberships.find((m) => m.role !== 'CUSTOMER');
    if (!activeMembership) {
      throw new UnauthorizedException(
        'This account is registered as a customer. Sign in from the business Client Page.',
      );
    }

    await this.staff.markLogin(user!.id, activeMembership.tenantId, {
      successful: true,
      ...(meta || {}),
    });

    const payload = { sub: user!.id, email: user!.email, tv: user!.tokenVersion ?? 0, kind: 'staff' as const };
    const token = this.jwtService.sign(payload);

    return {
      token,
      user: this.mapUser(user!, activeMembership.tenantId, activeMembership.role),
    };
  }

  /**
   * Verifies a Supabase access token against GoTrue (server-side) and maps the
   * verified Supabase user to the shape expected by `googleLogin`.
   *
   * The Google identity id (Supabase `identities[].id`) is preferred as the
   * profile id so that accounts created via the legacy direct-Google flow
   * (stored under `User.googleId`) are matched instead of duplicated.
   */
  async resolveSupabaseUser(accessToken: string): Promise<{ id: string; email: string; firstName: string; lastName: string; avatarUrl?: string }> {
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey || !supabaseUrl.includes('supabase.co')) {
      throw new UnauthorizedException('Supabase authentication is not configured.');
    }

    let userInfo: any;
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`GoTrue returned ${res.status}`);
      userInfo = await res.json();
    } catch {
      throw new UnauthorizedException('Invalid Supabase session token.');
    }

    const email = userInfo?.email;
    if (!email) throw new UnauthorizedException('Supabase session is missing an email.');

    const identity = (userInfo?.identities ?? []).find((i: any) => i?.provider === 'google');
    const meta = userInfo?.user_metadata ?? {};
    const fullName =
      meta.full_name ||
      identity?.user_metadata?.full_name ||
      identity?.claims?.full_name ||
      meta.name ||
      '';
    const nameParts = String(fullName).trim().split(/\s+/).filter(Boolean);
    const avatarUrl =
      meta.avatar_url || meta.picture || identity?.user_metadata?.avatar_url || undefined;

    return {
      id: identity?.id || userInfo.id,
      email,
      firstName: nameParts[0] || 'User',
      lastName: nameParts.slice(1).join(' ') || '',
      avatarUrl,
    };
  }

  async getMe(user: any): Promise<AuthUser> {
    if (user?.sessionKind === 'customer' || user?.activeRole === 'CUSTOMER') {
      const dbUser = await this.prisma.user.findUnique({ where: { id: user.id } });
      if (!dbUser) return user;
      const customer = user.activeTenantId
        ? await this.prisma.customer.findFirst({
            where: { tenantId: user.activeTenantId, userId: user.id },
          })
        : null;
      return {
        id: dbUser.id,
        externalId: dbUser.googleId || dbUser.clerkId || dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        phone: dbUser.phone ?? null,
        avatarUrl: dbUser.avatarUrl ?? undefined,
        twoFactorEnabled: Boolean(dbUser.twoFactorEnabled),
        isAdmin: false,
        adminRole: null,
        adminPermissions: [],
        memberships: [],
        activeTenantId: user.activeTenantId,
        activeRole: 'CUSTOMER',
        sessionKind: 'customer',
        customerId: customer?.id ?? null,
        needsPhone: !dbUser.phone || String(dbUser.phone).replace(/\D/g, '').length < 8,
        clientSlug: user.clientSlug ?? null,
      };
    }
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { memberships: true },
    });
    if (!dbUser) return user;
    const staffMemberships = dbUser.memberships.filter((m) => m.role !== 'CUSTOMER');
    const activeMembership =
      staffMemberships.find((m) => m.tenantId === user.activeTenantId) || staffMemberships[0];
    return this.mapUser(
      { ...dbUser, memberships: staffMemberships },
      activeMembership?.tenantId || user.activeTenantId,
      activeMembership?.role || user.activeRole,
    );
  }

  async switchTenant(userId: string, tenantId: string): Promise<AuthUser> {
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
      data: {
        password: hashed,
        tokenVersion: { increment: 1 },
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    return { message: 'Password updated successfully' };
  }

  /**
   * Requests a password reset. Always returns success to prevent account
   * enumeration; only users WITH a password set actually receive an email.
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const genericMessage =
      'If an account exists for that email, a reset link has been sent.';
    if (!normalizedEmail) return { message: genericMessage };

    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    // No account OR no password auth (Google-only) → pretend success.
    if (!user || !user.password) return { message: genericMessage };

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedToken, passwordResetExpires: expires },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/forgot-password?token=${rawToken}`;
    const sent = await this.sendPlatformEmail(
      user.email,
      'Reset your Doloyal password',
      `<p>Hi ${user.firstName || 'there'},</p>
       <p>We received a request to reset your Doloyal password. This link is valid for <strong>30 minutes</strong> and can be used once.</p>
       <p><a href="${resetUrl}" style="display:inline-block;background:#2563EB;color:#ffffff;padding:12px 24px;border-radius:999px;font-weight:600;text-decoration:none;">Choose a new password</a></p>
       <p style="color:#6B7280;font-size:13px;">If you didn't request this, you can safely ignore this email — your password stays unchanged.</p>`,
      `Reset your Doloyal password: ${resetUrl}`,
    );

    if (!sent.ok) {
      this.logger.warn(`Password-reset email failed (${user.email}): ${sent.error}`);
    }
    return { message: genericMessage };
  }

  /** Completes a password reset using a single-use token. */
  async resetPassword(token: string, newPassword: string) {
    if (!token) throw new BadRequestException('Reset token is required');
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: hashedToken },
    });
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired. Request a new one.');
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        tokenVersion: { increment: 1 }, // revoke all existing sessions
        sessions: [],
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    return { message: 'Password has been reset. You can now sign in.' };
  }

  /**
   * Platform-level transactional email (auth flows). Uses RESEND_API_KEY when
   * configured; otherwise reports failure so callers can log it.
   */
  private async sendPlatformEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY is not configured on this environment' };
    }
    const preferredFrom = process.env.RESEND_FROM || 'Doloyal <onboarding@resend.dev>';
    const fallbackFrom = 'Doloyal <onboarding@resend.dev>';
    const sendOnce = async (from: string) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from, to, subject, html, ...(text ? { text } : {}) }),
      });
      if (!response.ok) {
        const body: any = await response.json().catch(() => null);
        return { ok: false as const, error: body?.message || `Resend returned ${response.status}` };
      }
      return { ok: true as const };
    };

    try {
      let result = await sendOnce(preferredFrom);
      const unverified = /not verified|invalid `from`/i.test(result.error || '');
      if (!result.ok && unverified && !preferredFrom.includes('resend.dev')) {
        this.logger.warn(`Resend rejected ${preferredFrom}; retrying with ${fallbackFrom}`);
        result = await sendOnce(fallbackFrom);
      }
      return result;
    } catch (err: any) {
      return { ok: false, error: err?.message || 'Failed to reach Resend' };
    }
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
      phone: user.phone ?? null,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      isAdmin: Boolean(user.isAdmin),
      adminRole: user.adminRole || (user.isAdmin ? 'SUPER_ADMIN' : undefined),
      memberships: (user.memberships || []).map((m: any) => ({
        id: m.id,
        userId: m.userId,
        tenantId: m.tenantId,
        role: m.role,
        createdAt: m.createdAt?.toISOString?.() || m.createdAt,
      })),
      activeTenantId: tenantId,
      activeRole: role as any,
      sessionKind: 'staff',
    };
  }
}
