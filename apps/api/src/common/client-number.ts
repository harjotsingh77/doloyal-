import type { Customer, PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'customer'>;
type PrismaRaw = { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> };

let clientNumberColumnReady: Promise<boolean> | null = null;

/**
 * Idempotent schema patch for production drift when migrate deploy lagged
 * behind a release that expects Customer.clientNumber.
 * Safe on PgBouncer: ADD COLUMN IF NOT EXISTS is a no-op after the first run.
 */
export async function ensureClientNumberColumn(prisma: PrismaRaw): Promise<boolean> {
  if (!clientNumberColumnReady) {
    clientNumberColumnReady = prisma
      .$executeRawUnsafe(`ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "clientNumber" TEXT`)
      .then(() => true)
      .catch(() => {
        clientNumberColumnReady = null;
        return false;
      });
  }
  return clientNumberColumnReady;
}

export function isMissingClientNumberColumn(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return (
    code === 'P2022' ||
    /clientNumber/i.test(msg) ||
    (/column/i.test(msg) && /does not exist/i.test(msg))
  );
}

/** Lean list projection — avoids selecting unused scalars on the customers table. */
export const CUSTOMER_LIST_SELECT = {
  id: true,
  tenantId: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dob: true,
  avatarUrl: true,
  status: true,
  notes: true,
  tags: true,
  pointsBalance: true,
  totalSpent: true,
  totalVisits: true,
  clientNumber: true,
  lastVisitAt: true,
  lastLoginAt: true,
  lastActivityAt: true,
  signupSource: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Same as list select but omits clientNumber for schema-drift fallback. */
export const CUSTOMER_LIST_SELECT_NO_CLIENT_NUMBER = {
  id: true,
  tenantId: true,
  userId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  dob: true,
  avatarUrl: true,
  status: true,
  notes: true,
  tags: true,
  pointsBalance: true,
  totalSpent: true,
  totalVisits: true,
  lastVisitAt: true,
  lastLoginAt: true,
  lastActivityAt: true,
  signupSource: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Next sequential client ID for a tenant, e.g. CL-0001, CL-0002. */
export async function nextClientNumber(prisma: PrismaLike, tenantId: string): Promise<string> {
  try {
    const rows = await prisma.customer.findMany({
      where: { tenantId, clientNumber: { startsWith: 'CL-' } },
      select: { clientNumber: true },
    });
    let max = 0;
    for (const row of rows) {
      const n = Number(String(row.clientNumber || '').replace(/^CL-/i, ''));
      if (Number.isFinite(n) && n > max) max = n;
    }
    return `CL-${String(max + 1).padStart(4, '0')}`;
  } catch (err) {
    if (isMissingClientNumberColumn(err)) return 'CL-0001';
    throw err;
  }
}

/** Assign a clientNumber if missing. Safe to call on every portal/login path. */
export async function ensureClientNumber<T extends Customer>(
  prisma: PrismaLike,
  customer: T,
): Promise<T> {
  if (customer.clientNumber) return customer;

  for (let attempt = 0; attempt < 5; attempt++) {
    const clientNumber = await nextClientNumber(prisma, customer.tenantId);
    try {
      return (await prisma.customer.update({
        where: { id: customer.id },
        data: { clientNumber },
      })) as T;
    } catch {
      const fresh = await prisma.customer.findUnique({ where: { id: customer.id } });
      if (fresh?.clientNumber) return fresh as T;
    }
  }

  return customer;
}
