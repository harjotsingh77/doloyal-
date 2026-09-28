import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { principalTenantState, principalUserRow } from '../../common/auth-principal';

const USER_ID = 'user-1';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'owner@example.com',
    firstName: 'Olive',
    lastName: 'Owner',
    phone: '+911234567890',
    avatarUrl: null,
    twoFactorEnabled: false,
    tokenVersion: 3,
    isAdmin: false,
    adminRole: null,
    suspendedAt: null,
    googleId: 'g-1',
    clerkId: null,
    // json_build_object renders timestamp(3) without a zone.
    memberships: [
      {
        id: 'm-a',
        userId: USER_ID,
        tenantId: 'tenant-a',
        role: 'OWNER',
        createdAt: '2026-01-02T03:04:05.678',
        updatedAt: '2026-01-02T03:04:05.678',
        tenantSuspendedAt: null,
        tenantCreatedAt: '2026-01-01T09:00:00',
      },
      {
        id: 'm-b',
        userId: USER_ID,
        tenantId: 'tenant-b',
        role: 'MANAGER',
        createdAt: '2026-02-02T00:00:00',
        updatedAt: '2026-02-02T00:00:00',
        tenantSuspendedAt: '2026-03-01T10:00:00',
        tenantCreatedAt: '2026-02-01T00:00:00',
      },
    ],
    ...overrides,
  };
}

function strategy(row: unknown, extra: Record<string, unknown> = {}) {
  const prisma = {
    isInMemory: false,
    $queryRaw: vi.fn().mockResolvedValue(row ? [row] : []),
    tenant: { findUnique: vi.fn().mockResolvedValue(null) },
    customer: { findFirst: vi.fn().mockResolvedValue(null) },
    user: { findUnique: vi.fn() },
    ...extra,
  };
  return { strategy: new JwtStrategy(prisma as any), prisma };
}

describe('JwtStrategy.validate', () => {
  it('loads the user, memberships and tenant state in a single query', async () => {
    const { strategy: s, prisma } = strategy(userRow());
    const principal = await s.validate({ sub: USER_ID, email: 'owner@example.com', tv: 3, kind: 'staff' });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(principal).toMatchObject({
      id: USER_ID,
      activeTenantId: 'tenant-a',
      activeRole: 'OWNER',
      sessionKind: 'staff',
      isImpersonating: false,
    });
    expect(principal.memberships).toEqual([
      {
        id: 'm-a',
        userId: USER_ID,
        tenantId: 'tenant-a',
        role: 'OWNER',
        createdAt: new Date('2026-01-02T03:04:05.678Z'),
        updatedAt: new Date('2026-01-02T03:04:05.678Z'),
      },
      {
        id: 'm-b',
        userId: USER_ID,
        tenantId: 'tenant-b',
        role: 'MANAGER',
        createdAt: new Date('2026-02-02T00:00:00Z'),
        updatedAt: new Date('2026-02-02T00:00:00Z'),
      },
    ]);
    // Nothing internal leaks into the principal that responses may serialize.
    expect(JSON.stringify(principal)).not.toContain('tenantSuspendedAt');
    expect(principalTenantState(principal)).toEqual({
      tenantId: 'tenant-a',
      suspendedAt: null,
      createdAt: new Date('2026-01-01T09:00:00Z'),
    });
    expect(principalUserRow<{ googleId: string }>(principal)?.googleId).toBe('g-1');
  });

  it('honours tid only for a workspace the user belongs to, and records its suspension', async () => {
    const { strategy: s } = strategy(userRow());
    const switched = await s.validate({ sub: USER_ID, email: 'x', tv: 3, kind: 'staff', tid: 'tenant-b' });
    expect(switched.activeTenantId).toBe('tenant-b');
    expect(principalTenantState(switched)?.suspendedAt).toEqual(new Date('2026-03-01T10:00:00Z'));

    const tampered = await s.validate({ sub: USER_ID, email: 'x', tv: 3, kind: 'staff', tid: 'someone-else' });
    expect(tampered.activeTenantId).toBe('tenant-a');
  });

  it('rejects unknown users, suspended users and revoked token versions', async () => {
    await expect(strategy(null).strategy.validate({ sub: USER_ID, email: 'x', tv: 3 })).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(
      strategy(userRow({ suspendedAt: new Date() })).strategy.validate({ sub: USER_ID, email: 'x', tv: 3 }),
    ).rejects.toThrow('This account has been suspended.');
    await expect(strategy(userRow()).strategy.validate({ sub: USER_ID, email: 'x', tv: 2 })).rejects.toThrow(
      'Session expired. Please sign in again.',
    );
  });

  it('looks up the tenant and customer for customer sessions alongside the user', async () => {
    const tenant = { id: 'tenant-a', slug: 'olive-salon', suspendedAt: null, createdAt: new Date('2026-01-01') };
    const { strategy: s, prisma } = strategy(userRow({ memberships: [] }), {
      tenant: { findUnique: vi.fn().mockResolvedValue(tenant) },
      customer: { findFirst: vi.fn().mockResolvedValue({ id: 'cust-1' }) },
    });
    const principal = await s.validate({ sub: USER_ID, email: 'x', tv: 3, kind: 'customer', tid: 'tenant-a' });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-a' },
      select: { id: true, slug: true, suspendedAt: true, createdAt: true },
    });
    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', userId: USER_ID },
      select: { id: true },
    });
    expect(principal).toMatchObject({
      activeTenantId: 'tenant-a',
      activeRole: 'CUSTOMER',
      customerId: 'cust-1',
      clientSlug: 'olive-salon',
    });
    expect(principalTenantState(principal)).toEqual({
      tenantId: 'tenant-a',
      suspendedAt: null,
      createdAt: new Date('2026-01-01'),
    });
  });

  it('still rejects a customer session whose business is gone', async () => {
    const { strategy: s } = strategy(userRow({ memberships: [] }));
    await expect(
      s.validate({ sub: USER_ID, email: 'x', tv: 3, kind: 'customer', tid: 'missing' }),
    ).rejects.toThrow('Business not found');
  });

  it('only lets platform admins impersonate', async () => {
    const tenant = { id: 'tenant-z', name: 'Zed Spa', suspendedAt: null, createdAt: null };
    const extra = { tenant: { findUnique: vi.fn().mockResolvedValue(tenant) } };
    await expect(
      strategy(userRow(), extra).strategy.validate({ sub: USER_ID, email: 'x', tv: 3, imp: 'tenant-z' }),
    ).rejects.toThrow('Not authorized to impersonate');

    const admin = await strategy(userRow({ isAdmin: true }), extra).strategy.validate({
      sub: USER_ID,
      email: 'x',
      tv: 3,
      imp: 'tenant-z',
    });
    expect(admin).toMatchObject({ activeTenantId: 'tenant-z', isImpersonating: true, impersonatedTenantName: 'Zed Spa' });
    expect(principalTenantState(admin)).toEqual({ tenantId: 'tenant-z', suspendedAt: null, createdAt: null });
  });
});
