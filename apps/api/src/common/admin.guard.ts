import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import type { AdminRole, AdminPermission as AdminPermissionType } from '@doloyal/shared';

export const IS_ADMIN_KEY = 'isAdmin';
export const ADMIN_ROLES_KEY = 'adminRoles';
export const ADMIN_PERMISSION_KEY = 'adminPermissions';

/** Require the user to be any Doloyal admin (isAdmin === true). */
export const Admin = () => SetMetadata(IS_ADMIN_KEY, true);

/** Restrict a controller/method to specific admin roles. */
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

/** Restrict a controller/method to admins holding at least one permission. */
export const AdminPermission = (...perms: AdminPermissionType[]) =>
  SetMetadata(ADMIN_PERMISSION_KEY, perms);

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    if (user.isAdmin !== true) {
      throw new ForbiddenException('Requires Doloyal admin access');
    }

    const handler = context.getHandler();
    const cls = context.getClass();
    const requiredRoles: AdminRole[] | undefined = this.reflector.getAllAndOverride<
      AdminRole[]
    >(ADMIN_ROLES_KEY, [handler, cls]);
    const requiredPerms: AdminPermissionType[] | undefined = this.reflector.getAllAndOverride<
      AdminPermissionType[]
    >(ADMIN_PERMISSION_KEY, [handler, cls]);

    if (requiredRoles && requiredRoles.length > 0) {
      const ok = requiredRoles.includes(user.adminRole);
      if (!ok) {
        throw new ForbiddenException(
          `Requires one of admin roles: ${requiredRoles.join(', ')}`,
        );
      }
    }

    if (requiredPerms && requiredPerms.length > 0) {
      const granted: AdminPermissionType[] = Array.isArray(user.adminPermissions)
        ? user.adminPermissions
        : [];
      const ok = requiredPerms.some((p) => granted.includes(p));
      if (!ok) {
        throw new ForbiddenException(
          `Requires admin permission: ${requiredPerms.join(' or ')}`,
        );
      }
    }

    return true;
  }
}