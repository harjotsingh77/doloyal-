import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { tenantContext } from './prisma.service';
import { IS_PUBLIC_KEY } from '../modules/auth/jwt-auth.guard';

@Injectable()
export class TenantContextGuard implements CanActivate {
  private readonly reflector = new Reflector();

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

    if (!user.activeTenantId) {
      throw new ForbiddenException('No active tenant context. Select a workspace first.');
    }

    return new Promise<boolean>((resolve) => {
      tenantContext.run({ tenantId: user.activeTenantId }, () => {
        resolve(true);
      });
    });
  }
}
