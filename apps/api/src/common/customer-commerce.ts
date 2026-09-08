import type { PrismaClient } from '@prisma/client';

type Db = PrismaClient | any;

export function orderCountsAsRevenue(status: string, paymentStatus: string): boolean {
  if (status === 'CANCELLED') return false;
  if (paymentStatus === 'REFUNDED') return false;
  return paymentStatus === 'PAID' || status === 'COMPLETED';
}

export async function applyCustomerSpendDelta(
  prisma: Db,
  args: {
    tenantId: string;
    customerId: string;
    deltaAmount: number;
    deltaVisits: number;
    lastVisitAt?: Date | null;
  },
) {
  if (!args.deltaAmount && !args.deltaVisits && !args.lastVisitAt) return;
  const customer = await prisma.customer.findFirst({
    where: { id: args.customerId, tenantId: args.tenantId },
    select: { id: true, totalSpent: true, totalVisits: true, lastVisitAt: true },
  });
  if (!customer) return;

  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      totalSpent: Math.max(0, Math.round((customer.totalSpent + args.deltaAmount) * 100) / 100),
      totalVisits: Math.max(0, customer.totalVisits + args.deltaVisits),
      ...(args.lastVisitAt
        ? {
            lastVisitAt:
              !customer.lastVisitAt || args.lastVisitAt > customer.lastVisitAt
                ? args.lastVisitAt
                : customer.lastVisitAt,
          }
        : {}),
    },
  });
}

export async function awardSpendPoints(
  prisma: Db,
  args: {
    tenantId: string;
    customerId: string;
    amount: number;
    reason: string;
  },
) {
  if (args.amount <= 0) return 0;
  const existing = await prisma.pointsLedger.findFirst({
    where: { tenantId: args.tenantId, customerId: args.customerId, reason: args.reason },
    select: { id: true },
  });
  if (existing) return 0;

  const [customer, config] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: args.customerId, tenantId: args.tenantId },
      select: { id: true, firstName: true, lastName: true, pointsBalance: true },
    }),
    prisma.loyaltyConfig.findUnique({ where: { tenantId: args.tenantId } }),
  ]);
  if (!customer || !config || config.pointsPerUnit <= 0 || config.currencyUnit <= 0) return 0;

  const pointsEarned = Math.floor((args.amount / config.currencyUnit) * config.pointsPerUnit);
  if (pointsEarned <= 0) return 0;

  const newBalance = customer.pointsBalance + pointsEarned;
  await prisma.pointsLedger.create({
    data: {
      tenantId: args.tenantId,
      customerId: args.customerId,
      amount: pointsEarned,
      balanceAfter: newBalance,
      reason: args.reason,
    },
  });
  await prisma.customer.update({
    where: { id: customer.id },
    data: { pointsBalance: newBalance },
  });
  await prisma.activity.create({
    data: {
      tenantId: args.tenantId,
      customerId: args.customerId,
      type: 'POINTS_EARNED',
      message: `${customer.firstName} ${customer.lastName} earned ${pointsEarned} points — ${args.reason}`,
    },
  });
  return pointsEarned;
}

export async function logActivity(
  prisma: Db,
  args: {
    tenantId: string;
    customerId?: string | null;
    type: 'CUSTOMER_CREATED' | 'APPOINTMENT_BOOKED' | 'INVOICE_PAID' | 'POINTS_EARNED' | 'POINTS_REDEEMED' | 'TIER_UPGRADED' | 'CAMPAIGN_SENT' | 'NOTE_ADDED' | 'WHATSAPP_RECEIVED';
    message: string;
  },
) {
  await prisma.activity.create({
    data: {
      tenantId: args.tenantId,
      customerId: args.customerId ?? null,
      type: args.type,
      message: args.message,
    },
  });
}
