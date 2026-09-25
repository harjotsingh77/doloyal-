import type { Customer, PrismaClient } from '@prisma/client';

type PrismaLike = Pick<PrismaClient, 'customer'>;

/** Next sequential client ID for a tenant, e.g. CL-0001, CL-0002. */
export async function nextClientNumber(prisma: PrismaLike, tenantId: string): Promise<string> {
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
