import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AdminRole, Role } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { rememberPrincipalTenant, rememberPrincipalUserRow } from '../../common/auth-principal';
import { permissionsForRole } from '@doloyal/shared';
import { hasPhone } from './client-auth.service';

export interface JwtPayload {
  sub: string;
  email: string;
  tv?: number;
  imp?: string;
  kind?: 'staff' | 'customer';
  tid?: string;
  slug?: string;
  /** Informational — `validate()` always re-reads isAdmin/adminRole from the DB. */
  isAdmin?: boolean;
  adminRole?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: any) => req?.query?.access_token || req?.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'doloyal-jwt-secret-dev',
    });
  }

  async validate(payload: JwtPayload) {
    const isCustomer = payload.kind === 'customer';
    // Every lookup below is keyed by claims already in the token, so they run
    // concurrently. Behind the production transaction pooler each Prisma
    // query costs several network round trips; serial lookups here were paid
    // on every authenticated request.
    const [user, tenantForCustomer, customer, impersonatedTenant] = await Promise.all([
      this.loadPrincipalUser(payload.sub),
      isCustomer && payload.tid
        ? this.prisma.tenant.findUnique({
            where: { id: payload.tid },
            select: { id: true, slug: true, suspendedAt: true },
          })
        : null,
      isCustomer && payload.tid
        ? this.prisma.customer.findFirst({
            where: { tenantId: payload.tid, userId: payload.sub },
            select: { id: true },
          })
        : null,
      !isCustomer && payload.imp
        ? this.prisma.tenant.findUnique({
            where: { id: payload.imp },
            select: { id: true, name: true, suspendedAt: true },
          })
        : null,
    ]);
    if (!user) throw new UnauthorizedException('User not found');
    if (user.suspendedAt) {
      throw new UnauthorizedException('This account has been suspended.');
    }
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (isCustomer) {
      if (!payload.tid) throw new UnauthorizedException('Invalid customer session.');
      const tenant = tenantForCustomer;
      if (!tenant) throw new UnauthorizedException('Business not found');

      const needsPhone = !hasPhone(user.phone);
      const principal = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
        isAdmin: false,
        adminRole: null,
        adminPermissions: [],
        memberships: [],
        activeTenantId: payload.tid,
        activeRole: 'CUSTOMER' as const,
        sessionKind: 'customer' as const,
        customerId: customer?.id ?? null,
        needsPhone,
        clientSlug: payload.slug || tenant.slug,
        isImpersonating: false,
      };
      rememberPrincipalTenant(principal, { tenantId: tenant.id, suspendedAt: tenant.suspendedAt });
      return principal;
    }

    const staffMemberships = user.memberships.filter((m) => m.role !== 'CUSTOMER');
    // `tid` records which workspace the user switched to. It is only ever
    // honoured when the user still holds a membership for it, so a tampered
    // or stale claim degrades to their first workspace instead of granting
    // access to someone else's data.
    const activeMembership =
      (payload.tid && staffMemberships.find((m) => m.tenantId === payload.tid)) ||
      staffMemberships[0];
    if (payload.imp) {
      if (user.isAdmin !== true) {
        throw new UnauthorizedException('Not authorized to impersonate');
      }
      const tenant = impersonatedTenant;
      if (!tenant) throw new UnauthorizedException('Impersonated tenant not found');
      const principal = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        twoFactorEnabled: user.twoFactorEnabled,
        isAdmin: Boolean(user.isAdmin),
        adminRole: user.adminRole ?? (user.isAdmin ? 'SUPER_ADMIN' : null),
        adminPermissions: permissionsForRole(
          user.adminRole ?? (user.isAdmin ? 'SUPER_ADMIN' : null),
        ),
        memberships: staffMemberships,
        activeTenantId: tenant.id,
        activeRole: 'OWNER' as const,
        sessionKind: 'staff' as const,
        isImpersonating: true,
        impersonatedTenantId: tenant.id,
        impersonatedTenantName: tenant.name,
      };
      rememberPrincipalTenant(principal, { tenantId: tenant.id, suspendedAt: tenant.suspendedAt });
      rememberPrincipalUserRow(principal, user);
      return principal;
    }
    const principal = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      isAdmin: Boolean(user.isAdmin),
      adminRole: user.adminRole ?? (user.isAdmin ? 'SUPER_ADMIN' : null),
      adminPermissions: permissionsForRole(
        user.adminRole ?? (user.isAdmin ? 'SUPER_ADMIN' : null),
      ),
      memberships: staffMemberships,
      activeTenantId: activeMembership?.tenantId || '',
      activeRole: activeMembership?.role || 'OWNER',
      sessionKind: 'staff' as const,
      isImpersonating: false,
    };
    if (activeMembership && user.tenantSuspendedAt.has(activeMembership.tenantId)) {
      rememberPrincipalTenant(principal, {
        tenantId: activeMembership.tenantId,
        suspendedAt: user.tenantSuspendedAt.get(activeMembership.tenantId) ?? null,
      });
    }
    // GET /auth/me maps this same row instead of reading it again.
    rememberPrincipalUserRow(principal, user);
    return principal;
  }

  /**
   * User, memberships and each membership's tenant suspension state in one
   * statement (previously a user query, a memberships query, and a separate
   * tenant lookup in TenantContextGuard). Selects only the columns auth needs,
   * so password hashes and session blobs are no longer read per request.
   *
   * The memberships subquery scans `Membership WHERE "userId" = $1` exactly
   * like Prisma's include did, so their order — which picks the default
   * workspace — is unchanged.
   */
  private async loadPrincipalUser(userId: string): Promise<PrincipalUser | null> {
    if (this.prisma.isInMemory) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { memberships: true },
      });
      return user ? { ...user, tenantSuspendedAt: new Map() } : null;
    }

    const rows = await this.prisma.$queryRaw<PrincipalUserRow[]>`
      SELECT
        u.id, u.email, u."firstName", u."lastName", u.phone, u."avatarUrl",
        u."twoFactorEnabled", u."tokenVersion", u."isAdmin", u."adminRole"::text AS "adminRole",
        u."suspendedAt", u."googleId", u."clerkId",
        (
          SELECT COALESCE(json_agg(json_build_object(
            'id', m.id,
            'userId', m."userId",
            'tenantId', m."tenantId",
            'role', m.role,
            'createdAt', m."createdAt",
            'updatedAt', m."updatedAt",
            'tenantSuspendedAt', (SELECT t."suspendedAt" FROM "Tenant" t WHERE t.id = m."tenantId")
          )), '[]'::json)
          FROM "Membership" m
          WHERE m."userId" = u.id
        ) AS memberships
      FROM "User" u
      WHERE u.id = ${userId}
    `;
    const row = rows[0];
    if (!row) return null;

    const tenantSuspendedAt = new Map<string, Date | null>();
    const memberships = (row.memberships ?? []).map((m) => {
      tenantSuspendedAt.set(m.tenantId, parseDbTimestamp(m.tenantSuspendedAt));
      return {
        id: m.id,
        userId: m.userId,
        tenantId: m.tenantId,
        role: m.role,
        createdAt: parseDbTimestamp(m.createdAt) as Date,
        updatedAt: parseDbTimestamp(m.updatedAt) as Date,
      };
    });
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      avatarUrl: row.avatarUrl,
      twoFactorEnabled: row.twoFactorEnabled,
      tokenVersion: row.tokenVersion,
      isAdmin: row.isAdmin,
      adminRole: row.adminRole as AdminRole | null,
      suspendedAt: row.suspendedAt,
      googleId: row.googleId,
      clerkId: row.clerkId,
      memberships,
      tenantSuspendedAt,
    };
  }
}

type PrincipalMembership = {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

type PrincipalUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  twoFactorEnabled: boolean;
  tokenVersion: number;
  isAdmin: boolean;
  adminRole: AdminRole | null;
  suspendedAt: Date | null;
  googleId: string | null;
  clerkId: string | null;
  memberships: PrincipalMembership[];
  /** tenantId → that tenant's suspendedAt, for every membership. */
  tenantSuspendedAt: Map<string, Date | null>;
};

type PrincipalUserRow = Omit<PrincipalUser, 'memberships' | 'tenantSuspendedAt' | 'adminRole'> & {
  adminRole: string | null;
  memberships: Array<{
    id: string;
    userId: string;
    tenantId: string;
    role: Role;
    createdAt: string;
    updatedAt: string;
    tenantSuspendedAt: string | null;
  }> | null;
};

/**
 * json_build_object renders `timestamp(3)` columns without a zone. Prisma
 * stores and reads them as UTC, so parse them the same way.
 */
function parseDbTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(/(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`);
}
