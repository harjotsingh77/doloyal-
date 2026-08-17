import type { Customer as PrismaCustomer, Invoice as PrismaInvoice, Appointment as PrismaAppointment, InvoiceItem as PrismaInvoiceItem, PointsLedger as PrismaPointsLedger, Reward as PrismaReward, RewardRedemption as PrismaRedemption, MembershipTier as PrismaTier, CustomerMembership as PrismaCustomerMembership, Activity as PrismaActivity, LoyaltyConfig as PrismaLoyaltyConfig } from '@prisma/client';
import type {
  Customer,
  PointsLedgerEntry,
  Invoice,
  Appointment,
  Reward,
  RewardRedemption,
  MembershipTier,
  CustomerMembership,
  ActivityEntry,
  LoyaltyConfig,
} from '@doloyal/shared';

export function prismaCustomerToShared(c: PrismaCustomer & { _count?: { invoices?: number; appointments?: number } }): Customer {
  const totalSpent = c.totalSpent || 0;
  const totalVisits = c.totalVisits || 0;
  const avgSpend = totalVisits > 0 ? Math.round((totalSpent / totalVisits) * 100) / 100 : 0;
  const daysSinceLastVisit = c.lastVisitAt
    ? Math.floor((Date.now() - new Date(c.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  return {
    id: c.id,
    tenantId: c.tenantId,
    name: `${c.firstName} ${c.lastName}`.trim(),
    phone: c.phone,
    email: c.email,
    address: null,
    dateOfBirth: c.dob?.toISOString() ?? null,
    anniversary: null,
    gender: null,
    avatarUrl: c.avatarUrl,
    tags: c.tags,
    notes: c.notes,
    source: null,
    createdAt: c.createdAt.toISOString(),
    lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
    pointsBalance: c.pointsBalance,
    lifetimeValue: totalSpent,
    visitCount: totalVisits,
    averageSpend: avgSpend,
    loyaltyBand: computeLoyaltyBand(totalSpent, totalVisits, c.pointsBalance),
    churnRisk: computeChurnRisk(daysSinceLastVisit, totalVisits),
    loyaltyScore: computeLoyaltyScore(totalVisits, totalSpent, daysSinceLastVisit),
  };
}

export function computeLoyaltyBand(totalSpent: number, totalVisits: number, pointsBalance: number): 'NEW' | 'GROWING' | 'LOYAL' | 'VIP' | 'CHURNED' {
  if (totalSpent >= 50000 || pointsBalance >= 5000) return 'VIP';
  if (totalSpent >= 10000 || totalVisits >= 20) return 'LOYAL';
  if (totalSpent >= 2000 || totalVisits >= 5) return 'GROWING';
  return 'NEW';
}

export function computeChurnRisk(daysSinceLastVisit: number, totalVisits: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (daysSinceLastVisit <= 30 && totalVisits > 0) return 'LOW';
  if (daysSinceLastVisit <= 60) return 'MEDIUM';
  if (daysSinceLastVisit <= 90) return 'HIGH';
  return 'CRITICAL';
}

export function computeLoyaltyScore(totalVisits: number, totalSpent: number, daysSinceLastVisit: number): number {
  const visitScore = Math.min(totalVisits * 5, 40);
  const spendScore = Math.min(totalSpent / 500, 30);
  const recencyScore = daysSinceLastVisit <= 30 ? 30 : daysSinceLastVisit <= 60 ? 20 : daysSinceLastVisit <= 90 ? 10 : 0;
  return Math.min(Math.round(visitScore + spendScore + recencyScore), 100);
}

export function prismaPointsLedgerToShared(p: PrismaPointsLedger): PointsLedgerEntry {
  return {
    id: p.id,
    customerId: p.customerId,
    type: p.amount >= 0 ? 'EARN' : 'REDEEM',
    points: p.amount,
    balanceAfter: p.balanceAfter,
    reason: p.reason,
    reference: null,
    invoiceId: null,
    rewardId: null,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

export function prismaInvoiceToShared(inv: PrismaInvoice & { items?: PrismaInvoiceItem[]; customer?: PrismaCustomer }): Invoice {
  const subtotal = inv.items?.reduce((s, i) => s + i.total, 0) ?? inv.subtotal;
  return {
    id: inv.id,
    number: inv.invoiceNumber,
    customerId: inv.customerId,
    customerName: inv.customer ? `${inv.customer.firstName} ${inv.customer.lastName}` : '',
    staffId: null,
    subtotal: subtotal,
    discount: inv.discount,
    tax: inv.tax,
    total: inv.total,
    status: inv.status as any,
    paymentMethod: inv.paymentMethod as any,
    items: (inv.items || []).map((i) => ({
      id: i.id,
      serviceName: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.total,
    })),
    createdAt: inv.createdAt.toISOString(),
  };
}

export function prismaAppointmentToShared(a: PrismaAppointment & { customer?: PrismaCustomer; staff?: { name: string } | null }): Appointment {
  return {
    id: a.id,
    customerId: a.customerId,
    customerName: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : '',
    staffId: a.staffId,
    staffName: (a.staff as any)?.name ?? null,
    serviceName: a.serviceName,
    branchName: null,
    startsAt: a.startTime.toISOString(),
    endsAt: a.endTime.toISOString(),
    status: a.status as any,
    notes: a.notes,
  };
}

export function prismaRewardToShared(r: PrismaReward & { _count?: { redemptions?: number } }): Reward {
  const remaining =
    r.quantity == null ? null : Math.max(0, r.quantity - (r.redeemedCount || 0));
  return {
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    description: r.description,
    pointsCost: r.pointsCost,
    rewardValue: (r as any).rewardValue ?? r.discountVal ?? 0,
    rewardType: (r as any).rewardType ?? 'CUSTOM',
    imageUrl: r.imageUrl,
    terms: (r as any).terms ?? null,
    validityDays: r.validityDays,
    status: r.status as Reward['status'],
    totalQuantity: r.quantity,
    redeemedCount: r.redeemedCount,
    category: r.category || 'STANDARD',
    startsAt: (r as any).startsAt?.toISOString?.() ?? null,
    expiresAt: r.expiresAt?.toISOString() ?? null,
    branchIds: (r as any).branchIds ?? [],
    tierRequired: (r as any).tierRequired ?? null,
    membershipRequired: (r as any).membershipRequired ?? null,
    remainingQuantity: remaining,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt?.toISOString?.(),
  };
}

export function prismaRedemptionToShared(r: PrismaRedemption & { reward?: PrismaReward; customer?: PrismaCustomer }): RewardRedemption {
  const statusMap: Record<string, RewardRedemption['status']> = {
    PENDING: 'PENDING',
    FULFILLED: 'FULFILLED',
    REDEEMED: 'FULFILLED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'CANCELLED',
  };
  return {
    id: r.id,
    rewardId: r.rewardId,
    customerId: r.customerId,
    customerName: r.customer ? `${r.customer.firstName} ${r.customer.lastName}` : '',
    rewardName: r.reward?.name ?? '',
    category: r.reward?.category ?? null,
    pointsCost: r.reward?.pointsCost ?? 0,
    pointsUsed: (r as any).pointsUsed ?? r.reward?.pointsCost ?? 0,
    cashbackAmount: (r as any).cashbackAmount ?? 0,
    branchName: (r as any).branchName ?? null,
    transactionId: r.code,
    status: statusMap[r.status] || 'PENDING',
    fulfilledAt: r.redeemedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function prismaTierToShared(t: PrismaTier): MembershipTier {
  return {
    id: t.id,
    tenantId: t.tenantId,
    name: t.name as any,
    price: t.price,
    validityDays: t.validityDays,
    discountPercent: t.discountPercent,
    bonusPointsPercent: t.bonusPointsPercent,
    priorityBooking: t.priorityBooking,
    benefits: t.benefits,
    color: t.color,
  };
}

export function prismaMembershipToShared(m: PrismaCustomerMembership & { tier?: PrismaTier; customer?: PrismaCustomer }): CustomerMembership {
  return {
    id: m.id,
    customerId: m.customerId,
    tierId: m.tierId,
    tierName: m.tier?.name as any ?? 'SILVER',
    startDate: m.assignedAt.toISOString(),
    endDate: new Date(new Date(m.assignedAt).getTime() + 365 * 86400000).toISOString(),
    active: true,
  };
}

export function prismaActivityToShared(a: PrismaActivity & { customer?: PrismaCustomer }): ActivityEntry {
  const mappedType = mapActivityType(a.type);
  return {
    id: a.id,
    type: mappedType,
    message: a.message,
    customerId: a.customerId ?? null,
    customerName: a.customer ? `${a.customer.firstName} ${a.customer.lastName}` : null,
    amount: null,
    createdAt: a.createdAt.toISOString(),
  };
}

function mapActivityType(type: string): ActivityEntry['type'] {
  const map: Record<string, ActivityEntry['type']> = {
    CUSTOMER_CREATED: 'CUSTOMER_ADDED',
    APPOINTMENT_BOOKED: 'APPOINTMENT_BOOKED',
    INVOICE_PAID: 'INVOICE_PAID',
    POINTS_EARNED: 'POINTS_EARNED',
    POINTS_REDEEMED: 'REWARD_REDEEMED',
    TIER_UPGRADED: 'MEMBERSHIP_SOLD',
    CAMPAIGN_SENT: 'CAMPAIGN_SENT',
    NOTE_ADDED: 'NOTE',
  };
  return map[type] || 'NOTE';
}

export const DEFAULT_LOYALTY_SETTINGS = {
  birthdayBonus: 100,
  reviewBonus: 50,
  socialShareBonus: 25,
  googleReviewBonus: 75,
  instagramStoryBonus: 50,
  minRedemption: 100,
  maxRedemption: 10000,
  tierMultiplier: 1,
  autoExpiry: true,
  doublePoints: false,
  weekendBonus: false,
  holidayBonus: false,
};

export function prismaConfigToShared(c: PrismaLoyaltyConfig): LoyaltyConfig {
  const settings = {
    ...DEFAULT_LOYALTY_SETTINGS,
    ...((c as any).settings && typeof (c as any).settings === 'object' ? (c as any).settings : {}),
  };
  const modeMap: Record<string, LoyaltyConfig['mode']> = {
    POINTS_PER_SPEND: 'CURRENCY',
    VISIT_BASED: 'VISIT',
    TIERED: 'HYBRID',
    HYBRID: 'HYBRID',
    SUBSCRIPTION: 'SUBSCRIPTION',
    SUBSCRIPTION_BASED: 'SUBSCRIPTION',
  };
  return {
    id: c.id,
    tenantId: c.tenantId,
    mode: modeMap[c.mode] || 'CURRENCY',
    pointsPerCurrency: c.pointsPerUnit,
    pointsPerVisit: c.pointsPerVisit,
    currencyPerPoint: c.currencyUnit,
    expiryDays: c.expiryDays,
    welcomeBonus: c.signupBonus,
    referralBonus: c.referralBonus,
    settings,
  };
}

export function mapModeToPrisma(mode: string): 'POINTS_PER_SPEND' | 'VISIT_BASED' | 'TIERED' | 'HYBRID' | 'SUBSCRIPTION' {
  const map: Record<string, any> = {
    CURRENCY: 'POINTS_PER_SPEND',
    VISIT: 'VISIT_BASED',
    SERVICE: 'TIERED',
    HYBRID: 'HYBRID',
    SUBSCRIPTION: 'SUBSCRIPTION',
  };
  return map[mode] || 'POINTS_PER_SPEND';
}

export function generateInvoiceNumber(prefix: string, count: number): string {
  const padded = String(count + 1).padStart(5, '0');
  return `${prefix}-${padded}`;
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

/**
 * Allowed frontend origins for CORS (comma-separated `CORS_ORIGIN`).
 * Production example: https://www.doloyal.com,http://localhost:3000
 */
export function getAllowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Resolves the `Access-Control-Allow-Origin` value for an inbound request
 * origin. Returns `''` when the origin is not allowed, so private endpoints
 * never echo arbitrary origins back with credentials.
 */
export function resolveCorsOrigin(origin?: string): string {
  if (!origin) return '';
  const allowed = getAllowedOrigins();
  return allowed.includes(origin) ? origin : '';
}
