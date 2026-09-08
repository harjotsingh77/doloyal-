import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../modules/auth/jwt-auth.guard';
import { ALLOW_CUSTOMER_KEY } from './allow-customer.decorator';

/**
 * Blocks customer-kind sessions from owner/staff APIs.
 * Customer data access must go through @AllowCustomer() routes that
 * additionally scope by JWT tenantId + customerId.
 */
@Injectable()
export class StaffOnlyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowCustomer = this.reflector.getAllAndOverride<boolean>(ALLOW_CUSTOMER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowCustomer) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    if (!user) return true;

    if (user.sessionKind === 'customer' || user.activeRole === 'CUSTOMER') {
      throw new ForbiddenException('Customer accounts cannot access the business dashboard.');
    }

    return true;
  }
}
