import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

export const IS_ADMIN_KEY = 'isAdmin';
export const Admin = () => SetMetadata(IS_ADMIN_KEY, true);

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    if (user.isAdmin !== true) {
      throw new ForbiddenException('Requires Doloyal admin access');
    }

    return true;
  }
}
