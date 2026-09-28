import { describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { rememberPrincipalUserRow } from '../../common/auth-principal';

function service(dbUser: unknown = null) {
  const svc = Object.create(AuthService.prototype) as AuthService & Record<string, any>;
  svc.jwtService = { sign: vi.fn((payload: unknown) => JSON.stringify(payload)) };
  svc.prisma = { user: { findUnique: vi.fn().mockResolvedValue(dbUser) } };
  return svc;
}

const row = { id: 'u1', email: 'o@example.com', tokenVersion: 4, isAdmin: false, adminRole: null };

describe('AuthService.refreshStaffSession', () => {
  it('re-issues a staff token with the same token version and workspace', async () => {
    const svc = service();
    const principal = { id: 'u1', sessionKind: 'staff', activeTenantId: 't9', isImpersonating: false };
    rememberPrincipalUserRow(principal, row);

    const { token } = await svc.refreshStaffSession(principal);
    expect(JSON.parse(token)).toEqual({
      sub: 'u1',
      email: 'o@example.com',
      tv: 4,
      kind: 'staff',
      isAdmin: false,
      adminRole: null,
      tid: 't9',
    });
    expect(svc.prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('falls back to the database when authentication recorded no row', async () => {
    const svc = service(row);
    const { token } = await svc.refreshStaffSession({ id: 'u1', sessionKind: 'staff', activeTenantId: 't1' });
    expect(JSON.parse(token).tv).toBe(4);
  });

  it('never renews impersonation or customer sessions', async () => {
    await expect(
      service(row).refreshStaffSession({ id: 'u1', sessionKind: 'staff', isImpersonating: true }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service(row).refreshStaffSession({ id: 'u1', sessionKind: 'customer' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
