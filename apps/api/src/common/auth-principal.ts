/**
 * Tenant suspension state resolved while authenticating a request.
 *
 * JwtStrategy already reads the active tenant's row, so it records the
 * suspension state here and TenantContextGuard reuses it instead of issuing
 * another query. Keyed by the principal object itself (a WeakMap) so nothing
 * extra is ever serialized into `request.user` or API responses.
 */
export interface PrincipalTenantState {
  tenantId: string;
  suspendedAt: Date | null;
  /** When the business was created (onboarded); dashboards start here. */
  createdAt?: Date | null;
}

const tenantStateByPrincipal = new WeakMap<object, PrincipalTenantState>();
const userRowByPrincipal = new WeakMap<object, unknown>();

export function rememberPrincipalTenant(principal: object, state: PrincipalTenantState): void {
  tenantStateByPrincipal.set(principal, state);
}

/** The user row (with memberships) JwtStrategy loaded for this principal. */
export function rememberPrincipalUserRow(principal: object, row: unknown): void {
  userRowByPrincipal.set(principal, row);
}

export function principalUserRow<T>(principal: unknown): T | undefined {
  if (!principal || typeof principal !== 'object') return undefined;
  return userRowByPrincipal.get(principal) as T | undefined;
}

/** Returns the recorded state only when it describes the principal's active tenant. */
export function principalTenantState(
  principal: { activeTenantId?: string } | null | undefined,
): PrincipalTenantState | undefined {
  if (!principal || typeof principal !== 'object' || !principal.activeTenantId) return undefined;
  const state = tenantStateByPrincipal.get(principal);
  return state && state.tenantId === principal.activeTenantId ? state : undefined;
}
