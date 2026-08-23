import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { tenantContext } from './prisma.service';

@Injectable()
export class TenantContextGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
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
