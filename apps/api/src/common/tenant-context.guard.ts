import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tenantContext } from './prisma.service';
import { IS_PUBLIC_KEY } from '../modules/auth/jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { principalTenantState } from './auth-principal';

function requestPath(request: { routerPath?: string; url?: string }): string {
  return String(request.routerPath || request.url || '').split('?')[0];
}

function isAdminApiPath(path: string): boolean {
  return path === '/admin' || path.startsWith('/admin/');
}

@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Public routes (auth, webhooks, public booking, referral tracking, health)
    // must never require a tenant context.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const path = requestPath(request);

    // Super Admin APIs must see every tenant. Do not inject ALS tenant scoping
    // here or platform-wide queries silently collapse to one business.
    if (user.isAdmin === true && isAdminApiPath(path)) {
      return true;
    }

    if (!user.activeTenantId) {
      throw new ForbiddenException('No active tenant context. Select a workspace first.');
    }

    // JwtStrategy already read the active tenant's suspension state while
    // authenticating; only fall back to a lookup when it did not (mock auth).
    const known = principalTenantState(user);
    const suspendedAt = known
      ? known.suspendedAt
      : (
          await this.prisma.tenant.findUnique({
            where: { id: user.activeTenantId },
            select: { suspendedAt: true },
          })
        )?.suspendedAt;
    if (suspendedAt && user.isAdmin !== true) {
      throw new ForbiddenException('This business has been suspended. Contact Doloyal support.');
    }

    return new Promise<boolean>((resolve) => {
      tenantContext.run({ tenantId: user.activeTenantId }, () => {
        resolve(true);
      });
    });
  }
}
