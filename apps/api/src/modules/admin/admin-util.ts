import { PLANS, getPlan } from '@doloyal/shared';
import { PrismaService } from '../../common/prisma.service';

export const INR = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export function planMonthlyAmount(plan: string, contractPrice?: number, cycle?: string): number {
  if (plan === 'enterprise') {
    if (!contractPrice || contractPrice <= 0) return 0;
    const months = (() => {
      switch (cycle) {
        case 'MONTHLY':
          return 1;
        case 'QUARTERLY':
          return 3;
        case 'HALF_YEARLY':
          return 6;
        case 'YEARLY':
        case 'ONE_TIME':
          return 12;
        default:
          return 1;
      }
    })();
    return Math.round(contractPrice / months);
  }
  return getPlan(plan)?.priceMonthly ?? 0;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export function dateRangeFor(range?: string, end = new Date()): DateRange {
  const e = new Date(end);
  let start = new Date(e);
  switch (range) {
    case '7d':
      start.setDate(e.getDate() - 6);
      break;
    case '30d':
      start.setDate(e.getDate() - 29);
      break;
    case '90d':
      start.setDate(e.getDate() - 89);
      break;
    case 'month':
      start = new Date(e.getFullYear(), e.getMonth(), 1);
      break;
    case 'quarter': {
      const q = Math.floor(e.getMonth() / 3);
      start = new Date(e.getFullYear(), q * 3, 1);
      break;
    }
    case 'year':
      start = new Date(e.getFullYear(), 0, 1);
      break;
    default:
      start.setDate(e.getDate() - 29);
      break;
  }
  start.setHours(0, 0, 0, 0);
  return { start, end: new Date(e) };
}

export function labelForDate(d: Date, range: string): string {
  const date = new Date(d);
  if (range === '7d') return date.toLocaleDateString('en-IN', { weekday: 'short' });
  if (range === '90d' || range === 'year' || range === 'quarter')
    return date.toLocaleDateString('en-IN', { month: 'short' });
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function fillDays(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function paginate(pageStr?: string, pageSizeStr?: string) {
  const page = Math.max(1, parseInt(pageStr ?? '', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(pageSizeStr ?? '', 10) || 25));
  return { page, pageSize };
}

/** Business status derived from its subscription state. */
export async function businessStatus(prisma: PrismaService, tenantId: string) {
  const sub = await prisma.subscription.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });
  if (!sub) return 'TRIAL';
  const now = new Date();
  if (sub.status === 'CANCELED' || sub.status === 'EXPIRED') return 'CANCELED';
  if (sub.status === 'PAST_DUE') return 'PAUSED';
  const trialActive =
    sub.status === 'TRIALING' || (sub.trialEndsAt && sub.trialEndsAt > now);
  if (trialActive) return 'TRIAL';
  if (sub.status === 'ACTIVE') return 'ACTIVE';
  return 'ACTIVE';
}

export async function lastActiveFor(prisma: PrismaService, tenantId: string): Promise<Date | null> {
  const [lastAppt, lastCustomer, lastInvoice] = await Promise.all([
    prisma.appointment.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    prisma.customer.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
  ]);
  const times = [lastAppt?.createdAt, lastCustomer?.createdAt, lastInvoice?.createdAt].filter(
    Boolean,
  ) as Date[];
  if (!times.length) return null;
  return new Date(Math.max(...times.map((t) => t.getTime())));
}

export const PLAN_ORDER = ['free', 'starter', 'growth', 'professional', 'enterprise'];
export function planLabel(plan?: string | null): string {
  if (!plan) return 'Free Trial';
  return PLANS.find((p) => p.id === plan)?.name ?? plan;
}