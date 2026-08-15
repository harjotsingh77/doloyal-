import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../common/prisma.service';
import { permissionsForRole } from '@doloyal/shared';

export interface JwtPayload {
  sub: string;
  email: string;
  tv?: number;
  imp?: string;
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
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    const activeMembership = user.memberships[0];
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
        adminRole: user.adminRole ?? null,
        adminPermissions: permissionsForRole(user.adminRole),
        memberships: user.memberships,
        activeTenantId: tenant.id,
        activeRole: 'OWNER' as const,
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
      avatarUrl: user.avatarUrl,
      twoFactorEnabled: user.twoFactorEnabled,
      isAdmin: Boolean(user.isAdmin),
      adminRole: user.adminRole ?? null,
      adminPermissions: permissionsForRole(user.adminRole),
      memberships: user.memberships,
      activeTenantId: activeMembership?.tenantId || '',
      activeRole: activeMembership?.role || 'OWNER',
      isImpersonating: false,
    };
  }
}
