import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { tenantContext } from './prisma.service';

@Injectable()
export class TenantContextGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    if (user?.activeTenantId) {
      return new Promise<boolean>((resolve) => {
        tenantContext.run({ tenantId: user.activeTenantId }, () => {
          resolve(true);
        });
      });
    }
    return true;
  }
}
