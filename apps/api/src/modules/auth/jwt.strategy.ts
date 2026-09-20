import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma.service';
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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { memberships: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    if (user.suspendedAt) {
      throw new UnauthorizedException('This account has been suspended.');
    }
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    if (payload.kind === 'customer') {
      if (!payload.tid) throw new UnauthorizedException('Invalid customer session.');
      const tenant = await this.prisma.tenant.findUnique({ where: { id: payload.tid } });
      if (!tenant) throw new UnauthorizedException('Business not found');

      const customer = await this.prisma.customer.findFirst({
        where: { tenantId: payload.tid, userId: user.id },
      });
      const needsPhone = !hasPhone(user.phone);
      return {
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
      const tenant = await this.prisma.tenant.findUnique({ where: { id: payload.imp } });
      if (!tenant) throw new UnauthorizedException('Impersonated tenant not found');
      return {
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
    }
    return {
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
  }
}
