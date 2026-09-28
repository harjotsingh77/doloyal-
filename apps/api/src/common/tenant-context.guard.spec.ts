import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { TenantContextGuard } from './tenant-context.guard';
import { rememberPrincipalTenant } from './auth-principal';

function context(user: unknown) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user, url: '/customers' }) }),
  } as any;
}

function guard(tenant: { suspendedAt: Date | null } | null = { suspendedAt: null }) {
  const prisma = { tenant: { findUnique: vi.fn().mockResolvedValue(tenant) } };
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(false) };
  return { guard: new TenantContextGuard(reflector as any, prisma as any), prisma };
}

describe('TenantContextGuard', () => {
  it('reuses the suspension state recorded during authentication', async () => {
    const { guard: g, prisma } = guard();
    const user = { id: 'u', activeTenantId: 't1' };
    rememberPrincipalTenant(user, { tenantId: 't1', suspendedAt: null });

    await expect(g.canActivate(context(user))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('blocks a suspended business without another query', async () => {
    const { guard: g, prisma } = guard();
    const user = { id: 'u', activeTenantId: 't1' };
    rememberPrincipalTenant(user, { tenantId: 't1', suspendedAt: new Date() });

    await expect(g.canActivate(context(user))).rejects.toThrow(ForbiddenException);
    expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
  });

  it('lets platform admins into a suspended business', async () => {
    const { guard: g } = guard();
    const user = { id: 'u', activeTenantId: 't1', isAdmin: true };
    rememberPrincipalTenant(user, { tenantId: 't1', suspendedAt: new Date() });

    await expect(g.canActivate(context(user))).resolves.toBe(true);
  });

  it('queries the tenant when authentication recorded nothing', async () => {
    const { guard: g, prisma } = guard({ suspendedAt: new Date() });
    await expect(g.canActivate(context({ id: 'u', activeTenantId: 't1' }))).rejects.toThrow(
      'This business has been suspended',
    );
    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 't1' },
      select: { suspendedAt: true },
    });
  });

  it('ignores recorded state for a different tenant than the active one', async () => {
    const { guard: g, prisma } = guard({ suspendedAt: null });
    const user = { id: 'u', activeTenantId: 't2' };
    rememberPrincipalTenant(user, { tenantId: 't1', suspendedAt: new Date() });

    await expect(g.canActivate(context(user))).resolves.toBe(true);
    expect(prisma.tenant.findUnique).toHaveBeenCalledTimes(1);
  });
});
