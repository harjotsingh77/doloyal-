import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { orderCountsAsRevenue } from '../../common/customer-commerce';
import {
  alignPreviousBucket,
  buildPeriodBuckets,
  chartGranularity,
  comparePercentagePoints,
  compareValues,
  isDashboardMetricId,
  resolveComparisonRange,
  tableGranularity,
  toYmd,
  type DateRangeComparison,
  type PeriodBucket,
  type ValueChange,
} from '@doloyal/shared';
import type {
  DashboardMetricDetail,
  DashboardMetricId,
  MetricHistoryRow,
  MetricInsightCopy,
  MetricRecordRow,
  MetricSupportingStat,
  MetricTrendPoint,
  MetricValueUnit,
} from '@doloyal/shared';

type InvoiceRow = { customerId: string; total: number; createdAt: Date };
type OrderRow = {
  id: string;
  customerId: string;
  total: number;
  status: string;
  paymentStatus: string;
  orderDate: Date;
  orderNumber: string;
};
type CustomerRow = {
  id: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  lastVisitAt: Date | null;
  totalSpent: number;
  status: string;
};
type PointsRow = { customerId: string; amount: number; createdAt: Date; reason: string };
type ReviewRow = {
  id: string;
  rating: number;
  status: string;
  body: string;
  authorName: string;
  publishedAt: Date;
  customerId: string | null;
};
type AppointmentRow = { id: string; status: string; startTime: Date; serviceName: string; customerId: string };
type MembershipRow = {
  assignedAt: Date;
  customerId: string;
  tier: { name: string; price: number; validityDays: number };
};

interface MetricContext {
  range: DateRangeComparison;
  invoices: InvoiceRow[];
  orders: OrderRow[];
  customers: CustomerRow[];
  points: PointsRow[];
  reviews: ReviewRow[];
  appointments: AppointmentRow[];
  memberships: MembershipRow[];
}

function inYmdRange(date: Date, from: Date, to: Date): boolean {
  const key = toYmd(date);
  return key >= toYmd(from) && key <= toYmd(to);
}

function money(value: number): string {
  return Math.round(Number(value) || 0).toLocaleString('en-IN');
}

function num(value: number): string {
  return Math.round(value).toLocaleString('en-IN');
}

function historyFromBuckets(
  buckets: PeriodBucket[],
  range: DateRangeComparison,
  currentFn: (from: Date, to: Date) => number,
  extraFn?: (from: Date, to: Date) => Record<string, number>,
): MetricHistoryRow[] {
  return buckets.map((bucket) => {
    const prev = alignPreviousBucket(bucket, range);
    const current = currentFn(bucket.from, bucket.to);
    const previous = currentFn(prev.from, prev.to);
    const change = compareValues(current, previous);
    return {
      key: bucket.key,
      label: bucket.label,
      from: bucket.fromYmd,
      to: bucket.toYmd,
      current: change.current,
      previous: change.previous,
      difference: change.difference,
      percentChange: change.percentChange,
      percentChangeLabel: change.percentChangeLabel,
      kind: change.kind,
      extra: extraFn ? extraFn(bucket.from, bucket.to) : undefined,
    };
  });
}

function seriesFromBuckets(
  buckets: PeriodBucket[],
  range: DateRangeComparison,
  currentFn: (from: Date, to: Date) => number,
): MetricTrendPoint[] {
  return buckets.map((bucket) => {
    const prev = alignPreviousBucket(bucket, range);
    return {
      date: bucket.label,
      current: currentFn(bucket.from, bucket.to),
      previous: currentFn(prev.from, prev.to),
    };
  });
}

function pack(args: {
  metric: DashboardMetricId;
  title: string;
  description?: string;
  unit: MetricValueUnit;
  range: DateRangeComparison;
  comparison: ValueChange;
  series: MetricTrendPoint[];
  history: MetricHistoryRow[];
  extraColumns?: { key: string; label: string }[];
  supporting: MetricSupportingStat[];
  records?: MetricRecordRow[];
  recordsTitle?: string;
  insight?: MetricInsightCopy;
  changeIsPercentagePoints?: boolean;
}): DashboardMetricDetail {
  return {
    ...args,
    currentPeriod: { from: args.range.currentFromYmd, to: args.range.currentToYmd },
    previousPeriod: { from: args.range.prevFromYmd, to: args.range.prevToYmd },
    empty: args.comparison.current === 0 && args.comparison.previous === 0 && args.history.every((row) => row.current === 0 && row.previous === 0),
  };
}

@Injectable()
export class DashboardMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricDetail(
    tenantId: string,
    metric: string,
    from?: string,
    to?: string,
  ): Promise<DashboardMetricDetail> {
    if (!isDashboardMetricId(metric)) {
      throw new BadRequestException('Unknown dashboard metric');
    }
    const metricId = metric as DashboardMetricId;
    const now = new Date();
    const fallbackTo = toYmd(now);
    const range = resolveComparisonRange(from || fallbackTo, to || fallbackTo);
    // Load only the tables this metric needs — the previous path always
    // pulled every customer plus 6 other full windows (~7 queries) even for
    // a simple revenue card.
    const ctx = await this.loadContext(tenantId, range, metricId);

    switch (metricId) {
      case 'revenue':
        return this.revenueDetail(ctx);
      case 'customers':
        return this.customersDetail(ctx);
      case 'repeat_rate':
        return this.repeatRateDetail(ctx);
      case 'new_customers':
        return this.newCustomersDetail(ctx);
      case 'inactive':
        return this.inactiveDetail(ctx);
      case 'points':
        return this.pointsDetail(ctx);
      case 'orders':
        return this.ordersDetail(ctx);
      case 'reviews':
        return this.reviewsDetail(ctx);
      case 'appointments':
        return this.appointmentsDetail(ctx);
      case 'memberships':
        return this.membershipsDetail(ctx);
      case 'ai_revenue':
        return this.aiRevenueDetail(ctx);
      case 'ai_retention':
        return this.aiRetentionDetail(ctx);
      default:
        throw new BadRequestException('Unknown dashboard metric');
    }
  }

  /** Which datasets each metric actually reads. */
  private needsFor(metric: DashboardMetricId): {
    invoices: boolean;
    orders: boolean;
    allCustomers: boolean;
    points: boolean;
    reviews: boolean;
    appointments: boolean;
    memberships: boolean;
    buyerCustomers: boolean;
  } {
    switch (metric) {
      case 'revenue':
        return {
          invoices: true,
          orders: true,
          allCustomers: false,
          points: false,
          reviews: false,
          appointments: false,
          memberships: false,
          buyerCustomers: true,
        };
      case 'ai_revenue':
      case 'ai_retention':
      case 'customers':
      case 'repeat_rate':
        return {
          invoices: true,
          orders: true,
          allCustomers: true,
          points: false,
          reviews: false,
          appointments: metric === 'ai_revenue' || metric === 'ai_retention',
          memberships: false,
          buyerCustomers: false,
        };
      case 'new_customers':
      case 'inactive':
        return {
          invoices: false,
          orders: false,
          allCustomers: true,
          points: false,
          reviews: false,
          appointments: false,
          memberships: false,
          buyerCustomers: false,
        };
      case 'points':
        return {
          invoices: false,
          orders: false,
          allCustomers: false,
          points: true,
          reviews: false,
          appointments: false,
          memberships: false,
          buyerCustomers: true,
        };
      case 'orders':
        return {
          invoices: false,
          orders: true,
          allCustomers: false,
          points: false,
          reviews: false,
          appointments: false,
          memberships: false,
          buyerCustomers: true,
        };
      case 'reviews':
        return {
          invoices: false,
          orders: false,
          allCustomers: false,
          points: false,
          reviews: true,
          appointments: false,
          memberships: false,
          buyerCustomers: false,
        };
      case 'appointments':
        return {
          invoices: false,
          orders: false,
          allCustomers: false,
          points: false,
          reviews: false,
          appointments: true,
          memberships: false,
          buyerCustomers: true,
        };
      case 'memberships':
        return {
          invoices: false,
          orders: false,
          allCustomers: false,
          points: false,
          reviews: false,
          appointments: false,
          memberships: true,
          buyerCustomers: false,
        };
      default:
        return {
          invoices: true,
          orders: true,
          allCustomers: true,
          points: true,
          reviews: true,
          appointments: true,
          memberships: true,
          buyerCustomers: false,
        };
    }
  }

  private async loadContext(
    tenantId: string,
    range: DateRangeComparison,
    metric: DashboardMetricId,
  ): Promise<MetricContext> {
    const windowFrom = range.prevFrom;
    const windowTo = range.currentTo;
    const needs = this.needsFor(metric);
    const empty: MetricContext = {
      range,
      invoices: [],
      orders: [],
      customers: [],
      points: [],
      reviews: [],
      appointments: [],
      memberships: [],
    };

    const [invoices, orders, allCustomers, points, reviews, appointments, memberships] =
      await Promise.all([
        needs.invoices
          ? this.prisma.invoice.findMany({
              where: { tenantId, status: 'PAID', createdAt: { gte: windowFrom, lte: windowTo } },
              select: { customerId: true, total: true, createdAt: true },
            })
          : Promise.resolve([] as InvoiceRow[]),
        needs.orders
          ? this.prisma.clientOrder
              .findMany({
                where: { tenantId, orderDate: { gte: windowFrom, lte: windowTo } },
                select: {
                  id: true,
                  customerId: true,
                  total: true,
                  status: true,
                  paymentStatus: true,
                  orderDate: true,
                  orderNumber: true,
                },
              })
              .catch(() => [] as OrderRow[])
          : Promise.resolve([] as OrderRow[]),
        needs.allCustomers
          ? this.prisma.customer.findMany({
              where: { tenantId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                lastVisitAt: true,
                totalSpent: true,
                status: true,
              },
            })
          : Promise.resolve([] as CustomerRow[]),
        needs.points
          ? this.prisma.pointsLedger.findMany({
              where: { tenantId, amount: { lt: 0 }, createdAt: { gte: windowFrom, lte: windowTo } },
              select: { customerId: true, amount: true, createdAt: true, reason: true },
            })
          : Promise.resolve([] as PointsRow[]),
        needs.reviews
          ? this.prisma.review
              .findMany({
                where: { tenantId, publishedAt: { gte: windowFrom, lte: windowTo } },
                select: {
                  id: true,
                  rating: true,
                  status: true,
                  body: true,
                  authorName: true,
                  publishedAt: true,
                  customerId: true,
                },
              })
              .catch(() => [] as ReviewRow[])
          : Promise.resolve([] as ReviewRow[]),
        needs.appointments
          ? this.prisma.appointment.findMany({
              where: { tenantId, startTime: { gte: windowFrom, lte: windowTo } },
              select: { id: true, status: true, startTime: true, serviceName: true, customerId: true },
            })
          : Promise.resolve([] as AppointmentRow[]),
        needs.memberships
          ? this.prisma.customerMembership
              .findMany({
                where: { customer: { tenantId } },
                select: {
                  assignedAt: true,
                  customerId: true,
                  tier: { select: { name: true, price: true, validityDays: true } },
                },
              })
              .catch(() => [] as MembershipRow[])
          : Promise.resolve([] as MembershipRow[]),
      ]);

    let customers = allCustomers;
    if (needs.buyerCustomers && !needs.allCustomers) {
      const ids = new Set<string>();
      for (const row of invoices) ids.add(row.customerId);
      for (const row of orders) ids.add(row.customerId);
      for (const row of points) ids.add(row.customerId);
      for (const row of appointments) ids.add(row.customerId);
      if (ids.size) {
        customers = await this.prisma.customer.findMany({
          where: { tenantId, id: { in: Array.from(ids) } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            createdAt: true,
            lastVisitAt: true,
            totalSpent: true,
            status: true,
          },
        });
      }
    }

    empty.invoices = invoices;
    empty.orders = orders;
    empty.customers = customers;
    empty.points = points;
    empty.reviews = reviews;
    empty.appointments = appointments;
    empty.memberships = memberships;
    return empty;
  }

  private qualifyingOrders(rows: OrderRow[], from: Date, to: Date) {
    return rows.filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus) && inYmdRange(row.orderDate, from, to));
  }

  private revenueIn(ctx: MetricContext, from: Date, to: Date) {
    const invoiceRev = ctx.invoices
      .filter((row) => inYmdRange(row.createdAt, from, to))
      .reduce((sum, row) => sum + Number(row.total || 0), 0);
    const orderRev = this.qualifyingOrders(ctx.orders, from, to).reduce(
      (sum, row) => sum + Number(row.total || 0),
      0,
    );
    return Math.round((invoiceRev + orderRev) * 100) / 100;
  }

  private newCustomerCount(ctx: MetricContext, from: Date, to: Date) {
    return ctx.customers.filter((c) => inYmdRange(c.createdAt, from, to)).length;
  }

  private totalCustomersAsOf(ctx: MetricContext, asOf: Date) {
    return ctx.customers.filter((c) => c.createdAt.getTime() <= asOf.getTime()).length;
  }

  private purchaseCounts(ctx: MetricContext, from: Date, to: Date) {
    const counts = new Map<string, number>();
    for (const inv of ctx.invoices) {
      if (!inYmdRange(inv.createdAt, from, to)) continue;
      counts.set(inv.customerId, (counts.get(inv.customerId) || 0) + 1);
    }
    for (const order of this.qualifyingOrders(ctx.orders, from, to)) {
      counts.set(order.customerId, (counts.get(order.customerId) || 0) + 1);
    }
    return counts;
  }

  private repeatStats(ctx: MetricContext, from: Date, to: Date) {
    const counts = this.purchaseCounts(ctx, from, to);
    let repeat = 0;
    let oneTime = 0;
    for (const n of counts.values()) {
      if (n >= 2) repeat += 1;
      else oneTime += 1;
    }
    const newcomers = this.newCustomerCount(ctx, from, to);
    const eligible = repeat + newcomers;
    const rate = eligible > 0 ? Math.round((repeat / eligible) * 100) : 0;
    return { repeat, oneTime, newcomers, eligible, rate };
  }

  private inactiveCount(ctx: MetricContext, before: Date) {
    return ctx.customers.filter(
      (c) => c.status === 'ACTIVE' && c.lastVisitAt != null && c.lastVisitAt.getTime() < before.getTime(),
    ).length;
  }

  private pointsRedeemed(ctx: MetricContext, from: Date, to: Date) {
    return Math.abs(
      ctx.points.filter((row) => inYmdRange(row.createdAt, from, to)).reduce((sum, row) => sum + row.amount, 0),
    );
  }

  private buckets(range: DateRangeComparison, kind: 'chart' | 'table') {
    const granularity = kind === 'chart' ? chartGranularity(range.inclusiveDays) : tableGranularity(range);
    return buildPeriodBuckets(range.currentFromYmd, range.currentToYmd, granularity);
  }

  private revenueDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.revenueIn(ctx, range.currentFrom, range.currentTo);
    const previous = this.revenueIn(ctx, range.prevFrom, range.prevTo);
    const orders = this.qualifyingOrders(ctx.orders, range.currentFrom, range.currentTo);
    const prevOrders = this.qualifyingOrders(ctx.orders, range.prevFrom, range.prevTo);
    const invoices = ctx.invoices.filter((row) => inYmdRange(row.createdAt, range.currentFrom, range.currentTo));
    const buyerIds = new Set<string>([
      ...invoices.map((row) => row.customerId),
      ...orders.map((row) => row.customerId),
    ]);
    const created = new Map(ctx.customers.map((c) => [c.id, c.createdAt]));
    let newRev = 0;
    let repeatRev = 0;
    const addRev = (customerId: string, amount: number, at: Date) => {
      const createdAt = created.get(customerId);
      if (createdAt && inYmdRange(createdAt, range.currentFrom, range.currentTo) && createdAt.getTime() <= at.getTime()) {
        newRev += amount;
      } else {
        repeatRev += amount;
      }
    };
    for (const inv of invoices) addRev(inv.customerId, inv.total || 0, inv.createdAt);
    for (const order of orders) addRev(order.customerId, order.total || 0, order.orderDate);

    const daily = buildPeriodBuckets(range.currentFromYmd, range.currentToYmd, 'day');
    const dailyValues = daily.map((b) => this.revenueIn(ctx, b.from, b.to));
    const positiveDays = daily.filter((_, i) => dailyValues[i] > 0);
    const highIdx = dailyValues.reduce((best, v, i, arr) => (v > arr[best] ? i : best), 0);
    const lowIdx = positiveDays.length
      ? dailyValues.reduce((best, v, i, arr) => (v > 0 && v < arr[best] ? i : best), highIdx)
      : highIdx;

    const orderCount = orders.length;
    const supporting: MetricSupportingStat[] = [
      { label: 'Total revenue', value: money(current) },
      { label: 'Average per day', value: money(range.inclusiveDays ? current / range.inclusiveDays : 0) },
      { label: 'Highest day', value: daily.length ? `${money(dailyValues[highIdx])} · ${daily[highIdx].label}` : 'No data available for this period' },
      { label: 'Lowest day with revenue', value: daily.length ? `${money(dailyValues[lowIdx])} · ${daily[lowIdx].label}` : 'No data available for this period' },
    ];
    if (buyerIds.size) {
      supporting.push({ label: 'Revenue per customer', value: money(current / buyerIds.size) });
    }
    if (orderCount) {
      supporting.push({ label: 'Revenue per order', value: money(this.qualifyingOrders(ctx.orders, range.currentFrom, range.currentTo).reduce((s, r) => s + r.total, 0) / orderCount) });
    }
    if (newRev || repeatRev) {
      supporting.push({ label: 'Revenue from new customers', value: money(newRev) });
      supporting.push({ label: 'Revenue from existing customers', value: money(repeatRev) });
    }

    return pack({
      metric: 'revenue',
      title: 'Revenue',
      description: 'Paid invoices plus qualifying product orders in the selected period.',
      unit: 'currency',
      range,
      comparison: compareValues(current, previous),
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from, to) => this.revenueIn(ctx, from, to)),
      history: historyFromBuckets(this.buckets(range, 'table'), range, (from, to) => this.revenueIn(ctx, from, to)),
      supporting,
    });
  }

  private customersDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.totalCustomersAsOf(ctx, range.currentTo);
    const previous = this.totalCustomersAsOf(ctx, range.prevTo);
    const newcomers = this.newCustomerCount(ctx, range.currentFrom, range.currentTo);
    const returning = this.repeatStats(ctx, range.currentFrom, range.currentTo).repeat;
    return pack({
      metric: 'customers',
      title: 'Customer growth',
      description: 'Total customers on file at the end of each period, plus new and returning activity.',
      unit: 'number',
      range,
      comparison: compareValues(current, previous),
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from, to) =>
        this.totalCustomersAsOf(ctx, to),
      ),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => this.totalCustomersAsOf(ctx, to),
        (from, to) => ({
          newCustomers: this.newCustomerCount(ctx, from, to),
          returningCustomers: this.repeatStats(ctx, from, to).repeat,
        }),
      ),
      extraColumns: [
        { key: 'newCustomers', label: 'New customers' },
        { key: 'returningCustomers', label: 'Returning customers' },
      ],
      supporting: [
        { label: 'New customers', value: num(newcomers) },
        { label: 'Returning customers (2+ purchases)', value: num(returning) },
        { label: 'Previous period total', value: num(previous) },
      ],
    });
  }

  private repeatRateDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.repeatStats(ctx, range.currentFrom, range.currentTo);
    const previous = this.repeatStats(ctx, range.prevFrom, range.prevTo);
    const pointChange = comparePercentagePoints(current.rate, previous.rate);
    const relative = compareValues(current.rate, previous.rate);
    return pack({
      metric: 'repeat_rate',
      title: 'Repeat customers',
      description: 'Share of period customers with 2+ purchases versus new customers in the same window.',
      unit: 'percent',
      changeIsPercentagePoints: true,
      range,
      comparison: pointChange,
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from, to) => this.repeatStats(ctx, from, to).rate),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => this.repeatStats(ctx, from, to).rate,
        (from, to) => {
          const stats = this.repeatStats(ctx, from, to);
          return { repeatCustomers: stats.repeat, oneTimeCustomers: stats.oneTime };
        },
      ),
      extraColumns: [
        { key: 'repeatCustomers', label: 'Repeat customers' },
        { key: 'oneTimeCustomers', label: 'One-time customers' },
      ],
      supporting: [
        { label: 'Repeat rate', value: `${current.rate}%` },
        { label: 'Previous repeat rate', value: `${previous.rate}%` },
        { label: 'Change', value: pointChange.percentChangeLabel, hint: 'percentage points' },
        { label: 'Relative change', value: relative.percentChangeLabel },
        { label: 'Repeat customers', value: num(current.repeat) },
        { label: 'One-time customers', value: num(current.oneTime) },
        { label: 'Eligible customers (repeat + new)', value: num(current.eligible) },
      ],
    });
  }

  private newCustomersDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.newCustomerCount(ctx, range.currentFrom, range.currentTo);
    const previous = this.newCustomerCount(ctx, range.prevFrom, range.prevTo);
    const total = this.totalCustomersAsOf(ctx, range.currentTo);
    const records: MetricRecordRow[] = ctx.customers
      .filter((c) => inYmdRange(c.createdAt, range.currentFrom, range.currentTo))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 25)
      .map((c) => ({
        id: c.id,
        title: `${c.firstName} ${c.lastName}`.trim(),
        subtitle: toYmd(c.createdAt),
        value: money(c.totalSpent),
        href: `/app/customers/${c.id}`,
      }));
    return pack({
      metric: 'new_customers',
      title: 'New customers',
      description: 'Customers whose first record was created in the selected period.',
      unit: 'number',
      range,
      comparison: compareValues(current, previous),
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from, to) => this.newCustomerCount(ctx, from, to)),
      history: historyFromBuckets(this.buckets(range, 'table'), range, (from, to) => this.newCustomerCount(ctx, from, to)),
      supporting: [
        { label: '% of total customers who are new', value: total ? `${Math.round((current / total) * 1000) / 10}%` : 'No data available for this period' },
      ],
      records,
      recordsTitle: 'New customers in this period',
    });
  }

  private inactiveDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.inactiveCount(ctx, range.currentFrom);
    const previous = this.inactiveCount(ctx, range.prevFrom);
    const newlyInactive = ctx.customers.filter(
      (c) =>
        c.status === 'ACTIVE' &&
        c.lastVisitAt != null &&
        c.lastVisitAt.getTime() >= range.prevFrom.getTime() &&
        c.lastVisitAt.getTime() < range.currentFrom.getTime(),
    );
    const reactivated = ctx.customers.filter(
      (c) =>
        c.lastVisitAt != null &&
        inYmdRange(c.lastVisitAt, range.currentFrom, range.currentTo) &&
        c.createdAt.getTime() < range.currentFrom.getTime(),
    );
    const now = Date.now();
    const records: MetricRecordRow[] = ctx.customers
      .filter((c) => c.status === 'ACTIVE' && c.lastVisitAt != null && c.lastVisitAt.getTime() < range.currentFrom.getTime())
      .sort((a, b) => (a.lastVisitAt?.getTime() || 0) - (b.lastVisitAt?.getTime() || 0))
      .slice(0, 25)
      .map((c) => {
        const last = c.lastVisitAt!;
        const days = Math.max(0, Math.round((now - last.getTime()) / 86_400_000));
        return {
          id: c.id,
          title: `${c.firstName} ${c.lastName}`.trim(),
          subtitle: `Last visit ${toYmd(last)}`,
          value: money(c.totalSpent),
          href: `/app/customers/${c.id}`,
          meta: { 'Days inactive': String(days), Status: c.status },
        };
      });
    return pack({
      metric: 'inactive',
      title: 'Inactive customers',
      description:
        'Active customers whose last visit was before the start of the selected period. This matches the dashboard inactive count.',
      unit: 'number',
      range,
      comparison: compareValues(current, previous),
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from) => this.inactiveCount(ctx, from)),
      history: historyFromBuckets(this.buckets(range, 'table'), range, (from) => this.inactiveCount(ctx, from)),
      supporting: [
        { label: 'Newly inactive', value: num(newlyInactive.length), hint: 'Last visit fell in the previous period' },
        { label: 'Reactivated', value: num(reactivated.length), hint: 'Existing customers who visited again in this period' },
      ],
      records,
      recordsTitle: 'Inactive customers',
    });
  }

  private pointsDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = this.pointsRedeemed(ctx, range.currentFrom, range.currentTo);
    const previous = this.pointsRedeemed(ctx, range.prevFrom, range.prevTo);
    const currentRows = ctx.points.filter((row) => inYmdRange(row.createdAt, range.currentFrom, range.currentTo));
    const byCustomer = new Map<string, number>();
    for (const row of currentRows) {
      byCustomer.set(row.customerId, (byCustomer.get(row.customerId) || 0) + Math.abs(row.amount));
    }
    const names = new Map(ctx.customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
    const records: MetricRecordRow[] = Array.from(byCustomer.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([id, pts]) => ({
        id,
        title: names.get(id) || 'Customer',
        value: num(pts),
        href: `/app/customers/${id}`,
      }));
    const redeemers = byCustomer.size;
    return pack({
      metric: 'points',
      title: 'Points redeemed',
      description: 'Loyalty points deducted from customer wallets in the selected period.',
      unit: 'points',
      range,
      comparison: compareValues(current, previous),
      series: seriesFromBuckets(this.buckets(range, 'chart'), range, (from, to) => this.pointsRedeemed(ctx, from, to)),
      history: historyFromBuckets(this.buckets(range, 'table'), range, (from, to) => this.pointsRedeemed(ctx, from, to)),
      supporting: [
        { label: 'Customers redeeming', value: num(redeemers) },
        {
          label: 'Average points per redeeming customer',
          value: redeemers ? num(current / redeemers) : 'No data available for this period',
        },
      ],
      records,
      recordsTitle: 'Top customers using points',
    });
  }

  private ordersDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const currentOrders = ctx.orders.filter((row) => inYmdRange(row.orderDate, range.currentFrom, range.currentTo));
    const previousOrders = ctx.orders.filter((row) => inYmdRange(row.orderDate, range.prevFrom, range.prevTo));
    const qualifying = currentOrders.filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus));
    const prevQualifying = previousOrders.filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus));
    const revenue = qualifying.reduce((s, r) => s + r.total, 0);
    const prevRevenue = prevQualifying.reduce((s, r) => s + r.total, 0);
    const aov = qualifying.length ? revenue / qualifying.length : 0;
    const statusCount = (rows: OrderRow[], status: string) => rows.filter((r) => r.status === status).length;
    const names = new Map(ctx.customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
    const records: MetricRecordRow[] = currentOrders
      .slice()
      .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
      .slice(0, 25)
      .map((row) => ({
        id: row.id,
        title: row.orderNumber,
        subtitle: `${names.get(row.customerId) || 'Customer'} · ${row.status}`,
        value: money(row.total),
        href: `/app/customers/orders/${row.id}`,
        meta: { Date: toYmd(row.orderDate), Payment: row.paymentStatus },
      }));
    return pack({
      metric: 'orders',
      title: 'Order analytics',
      description: 'Catalog orders in the selected period. Revenue uses completed or paid orders, matching the dashboard.',
      unit: 'number',
      range,
      comparison: compareValues(qualifying.length, prevQualifying.length),
      series: seriesFromBuckets(
        this.buckets(range, 'chart'),
        range,
        (from, to) => this.qualifyingOrders(ctx.orders, from, to).length,
      ),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => this.qualifyingOrders(ctx.orders, from, to).length,
        (from, to) => {
          const rows = this.qualifyingOrders(ctx.orders, from, to);
          const rev = rows.reduce((s, r) => s + r.total, 0);
          return { revenue: Math.round(rev * 100) / 100, aov: rows.length ? Math.round((rev / rows.length) * 100) / 100 : 0 };
        },
      ),
      extraColumns: [
        { key: 'revenue', label: 'Revenue' },
        { key: 'aov', label: 'Avg order value' },
      ],
      supporting: [
        { label: 'Qualifying orders', value: num(qualifying.length) },
        { label: 'Order revenue', value: money(revenue) },
        { label: 'Average order value', value: qualifying.length ? money(aov) : 'No data available for this period' },
        { label: 'Previous order revenue', value: money(prevRevenue) },
        { label: 'Completed', value: num(statusCount(currentOrders, 'COMPLETED')) },
        { label: 'Pending', value: num(statusCount(currentOrders, 'PENDING')) },
        { label: 'Cancelled', value: num(statusCount(currentOrders, 'CANCELLED')) },
      ],
      records,
      recordsTitle: 'Orders in this period',
    });
  }

  private reviewsDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = ctx.reviews.filter((row) => inYmdRange(row.publishedAt, range.currentFrom, range.currentTo));
    const previous = ctx.reviews.filter((row) => inYmdRange(row.publishedAt, range.prevFrom, range.prevTo));
    const approved = current.filter((row) => row.status === 'APPROVED');
    const prevApproved = previous.filter((row) => row.status === 'APPROVED');
    const avg = (rows: ReviewRow[]) =>
      rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : 0;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      label: `${star} star`,
      value: num(approved.filter((r) => r.rating === star).length),
    }));
    const records: MetricRecordRow[] = current
      .slice()
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 25)
      .map((row) => ({
        id: row.id,
        title: row.authorName,
        subtitle: row.body ? row.body.slice(0, 120) : 'No written review',
        value: `${row.rating}/5`,
        href: '/app/reviews',
        meta: { Date: toYmd(row.publishedAt), Status: row.status },
      }));
    return pack({
      metric: 'reviews',
      title: 'Reviews',
      description: 'Reviews published in the selected period. Average rating uses approved reviews only.',
      unit: 'number',
      range,
      comparison: compareValues(approved.length, prevApproved.length),
      series: seriesFromBuckets(
        this.buckets(range, 'chart'),
        range,
        (from, to) => ctx.reviews.filter((row) => row.status === 'APPROVED' && inYmdRange(row.publishedAt, from, to)).length,
      ),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => ctx.reviews.filter((row) => row.status === 'APPROVED' && inYmdRange(row.publishedAt, from, to)).length,
        (from, to) => ({
          avgRating: avg(ctx.reviews.filter((row) => row.status === 'APPROVED' && inYmdRange(row.publishedAt, from, to))),
        }),
      ),
      extraColumns: [{ key: 'avgRating', label: 'Avg rating' }],
      supporting: [
        { label: 'Approved reviews', value: num(approved.length) },
        { label: 'Average rating', value: approved.length ? avg(approved).toFixed(1) : 'No data available for this period' },
        { label: 'Previous average rating', value: prevApproved.length ? avg(prevApproved).toFixed(1) : 'No data available for this period' },
        { label: 'Rating difference', value: approved.length || prevApproved.length ? `${(avg(approved) - avg(prevApproved)).toFixed(1)}` : 'No data available for this period' },
        ...dist,
      ],
      records,
      recordsTitle: 'Recent reviews',
    });
  }

  private appointmentsDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const current = ctx.appointments.filter((row) => inYmdRange(row.startTime, range.currentFrom, range.currentTo));
    const previous = ctx.appointments.filter((row) => inYmdRange(row.startTime, range.prevFrom, range.prevTo));
    const counted = (rows: AppointmentRow[]) => rows.filter((row) => row.status !== 'CANCELLED');
    const byStatus = (rows: AppointmentRow[], status: string) => rows.filter((row) => row.status === status).length;
    const now = Date.now();
    const upcoming = current.filter((row) =>
      ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'].includes(row.status) && row.startTime.getTime() >= now,
    ).length;
    const total = counted(current).length;
    const completed = byStatus(current, 'COMPLETED');
    const cancelled = byStatus(current, 'CANCELLED');
    const noShow = byStatus(current, 'NO_SHOW');
    const pending = byStatus(current, 'BOOKED');
    const rate = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 1000) / 10}%` : 'No data available for this period');
    const names = new Map(ctx.customers.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
    const records: MetricRecordRow[] = current
      .slice()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 25)
      .map((row) => ({
        id: row.id,
        title: row.serviceName,
        subtitle: names.get(row.customerId) || 'Customer',
        value: row.status,
        href: '/app/appointments',
        meta: { Date: toYmd(row.startTime) },
      }));
    return pack({
      metric: 'appointments',
      title: 'Appointments',
      description: 'Appointments scheduled in the selected period. The dashboard card excludes cancelled visits.',
      unit: 'number',
      range,
      comparison: compareValues(total, counted(previous).length),
      series: seriesFromBuckets(
        this.buckets(range, 'chart'),
        range,
        (from, to) => ctx.appointments.filter((row) => row.status !== 'CANCELLED' && inYmdRange(row.startTime, from, to)).length,
      ),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => ctx.appointments.filter((row) => row.status !== 'CANCELLED' && inYmdRange(row.startTime, from, to)).length,
        (from, to) => {
          const rows = ctx.appointments.filter((row) => inYmdRange(row.startTime, from, to));
          return {
            completed: byStatus(rows, 'COMPLETED'),
            cancelled: byStatus(rows, 'CANCELLED'),
            noShow: byStatus(rows, 'NO_SHOW'),
          };
        },
      ),
      extraColumns: [
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
        { key: 'noShow', label: 'No-show' },
      ],
      supporting: [
        { label: 'Completed', value: num(completed) },
        { label: 'Upcoming', value: num(upcoming) },
        { label: 'Pending', value: num(pending) },
        { label: 'Cancelled', value: num(cancelled) },
        { label: 'No-show', value: num(noShow) },
        { label: 'Completion rate', value: rate(completed, current.length) },
        { label: 'Cancellation rate', value: rate(cancelled, current.length) },
        { label: 'No-show rate', value: rate(noShow, current.length) },
      ],
      records,
      recordsTitle: 'Appointments in this period',
    });
  }

  private membershipsDetail(ctx: MetricContext): DashboardMetricDetail {
    const { range } = ctx;
    const currentNew = ctx.memberships.filter((row) => inYmdRange(row.assignedAt, range.currentFrom, range.currentTo));
    const previousNew = ctx.memberships.filter((row) => inYmdRange(row.assignedAt, range.prevFrom, range.prevTo));
    const isActiveAt = (row: MembershipRow, at: Date) =>
      row.assignedAt.getTime() <= at.getTime() &&
      row.assignedAt.getTime() + row.tier.validityDays * 86_400_000 >= at.getTime();
    const activeNow = ctx.memberships.filter((row) => isActiveAt(row, range.currentTo)).length;
    const expired = ctx.memberships.filter((row) => {
      const ends = row.assignedAt.getTime() + row.tier.validityDays * 86_400_000;
      return ends >= range.currentFrom.getTime() && ends <= range.currentTo.getTime();
    }).length;
    const revenue = currentNew.reduce((s, r) => s + (r.tier.price || 0), 0);
    const popular = new Map<string, number>();
    for (const row of currentNew) popular.set(row.tier.name, (popular.get(row.tier.name) || 0) + 1);
    const top = Array.from(popular.entries()).sort((a, b) => b[1] - a[1])[0];
    return pack({
      metric: 'memberships',
      title: 'Memberships',
      description: 'New memberships are assignments created in the selected period. Active uses each tier’s validity window. Cancelled memberships are not tracked.',
      unit: 'number',
      range,
      comparison: compareValues(currentNew.length, previousNew.length),
      series: seriesFromBuckets(
        this.buckets(range, 'chart'),
        range,
        (from, to) => ctx.memberships.filter((row) => inYmdRange(row.assignedAt, from, to)).length,
      ),
      history: historyFromBuckets(
        this.buckets(range, 'table'),
        range,
        (from, to) => ctx.memberships.filter((row) => inYmdRange(row.assignedAt, from, to)).length,
        (from, to) => ({
          active: ctx.memberships.filter((row) => isActiveAt(row, to)).length,
          expired: ctx.memberships.filter((row) => {
            const ends = row.assignedAt.getTime() + row.tier.validityDays * 86_400_000;
            return ends >= from.getTime() && ends <= to.getTime();
          }).length,
        }),
      ),
      extraColumns: [
        { key: 'active', label: 'Active' },
        { key: 'expired', label: 'Expired' },
      ],
      supporting: [
        { label: 'Active memberships', value: num(activeNow) },
        { label: 'New memberships', value: num(currentNew.length) },
        { label: 'Expired in period', value: num(expired) },
        { label: 'Membership revenue', value: revenue ? money(revenue) : 'No data available for this period' },
        { label: 'Most popular membership', value: top ? `${top[0]} (${top[1]})` : 'No data available for this period' },
      ],
    });
  }

  private snapshot(ctx: MetricContext) {
    const { range } = ctx;
    const revenue = compareValues(
      this.revenueIn(ctx, range.currentFrom, range.currentTo),
      this.revenueIn(ctx, range.prevFrom, range.prevTo),
    );
    const orders = compareValues(
      this.qualifyingOrders(ctx.orders, range.currentFrom, range.currentTo).length,
      this.qualifyingOrders(ctx.orders, range.prevFrom, range.prevTo).length,
    );
    const newcomers = compareValues(
      this.newCustomerCount(ctx, range.currentFrom, range.currentTo),
      this.newCustomerCount(ctx, range.prevFrom, range.prevTo),
    );
    const repeat = this.repeatStats(ctx, range.currentFrom, range.currentTo);
    const prevRepeat = this.repeatStats(ctx, range.prevFrom, range.prevTo);
    const repeatPts = comparePercentagePoints(repeat.rate, prevRepeat.rate);
    const inactive = compareValues(this.inactiveCount(ctx, range.currentFrom), this.inactiveCount(ctx, range.prevFrom));
    const appointments = compareValues(
      ctx.appointments.filter((row) => row.status !== 'CANCELLED' && inYmdRange(row.startTime, range.currentFrom, range.currentTo)).length,
      ctx.appointments.filter((row) => row.status !== 'CANCELLED' && inYmdRange(row.startTime, range.prevFrom, range.prevTo)).length,
    );
    const curOrders = this.qualifyingOrders(ctx.orders, range.currentFrom, range.currentTo);
    const prevOrders = this.qualifyingOrders(ctx.orders, range.prevFrom, range.prevTo);
    const aov = compareValues(
      curOrders.length ? curOrders.reduce((s, r) => s + r.total, 0) / curOrders.length : 0,
      prevOrders.length ? prevOrders.reduce((s, r) => s + r.total, 0) / prevOrders.length : 0,
    );
    return { revenue, orders, newcomers, repeat, prevRepeat, repeatPts, inactive, appointments, aov };
  }

  private aiRevenueDetail(ctx: MetricContext): DashboardMetricDetail {
    const base = this.revenueDetail(ctx);
    const snap = this.snapshot(ctx);
    const factors: string[] = [];
    const pushFactor = (label: string, change: ValueChange, asPoints = false) => {
      if (change.kind === 'no_change') return;
      factors.push(`${label}: ${change.percentChangeLabel}${asPoints ? '' : ''}`);
    };
    pushFactor('Orders', snap.orders);
    pushFactor('New customers', snap.newcomers);
    pushFactor('Repeat rate', snap.repeatPts, true);
    pushFactor('Average order value', snap.aov);
    pushFactor('Appointments', snap.appointments);
    pushFactor('Inactive customers', snap.inactive);

    let recommendation = 'Keep monitoring this period. There is not enough movement yet to recommend a specific action.';
    if (snap.revenue.kind === 'down') {
      recommendation =
        snap.repeatPts.kind === 'down'
          ? 'Revenue and repeat rate both declined. Run a win-back offer for inactive and one-time customers.'
          : snap.orders.kind === 'down'
            ? 'Order volume dropped with revenue. Promote a limited-time offer to recover visits.'
            : 'Revenue declined versus the previous period. Review average order value and appointment volume for recovery levers.';
    } else if (snap.revenue.kind === 'up') {
      recommendation = 'Revenue is up versus the previous period. Protect this by rewarding repeat buyers and keeping campaigns on the same cadence.';
    } else if (snap.revenue.kind === 'new') {
      recommendation = 'This is the first period with revenue. Keep capturing orders so period-over-period tracking can start.';
    }

    const summary =
      snap.revenue.kind === 'no_change'
        ? `Revenue is ${money(snap.revenue.current)} with no change versus the previous period.`
        : `Revenue is ${money(snap.revenue.current)} versus ${money(snap.revenue.previous)} previously (${snap.revenue.percentChangeLabel}).`;

    return {
      ...base,
      metric: 'ai_revenue',
      title: 'Revenue insight',
      insight: {
        summary,
        factors: factors.length ? factors : ['No additional metric movement was detected for this period.'],
        recommendation,
      },
    };
  }

  private aiRetentionDetail(ctx: MetricContext): DashboardMetricDetail {
    const base = this.repeatRateDetail(ctx);
    const snap = this.snapshot(ctx);
    const factors = [
      `Repeat customers: ${snap.repeat.repeat}`,
      `New customers: ${snap.repeat.newcomers}`,
      `Inactive customers: ${snap.inactive.current}`,
    ];
    const recommendation =
      snap.repeat.rate < 50
        ? 'Repeat rate is below 50%. Target one-time and inactive customers with a loyalty re-engagement offer.'
        : 'Repeat rate is healthy. Keep rewarding returning customers and watch inactive growth.';
    return {
      ...base,
      metric: 'ai_retention',
      title: 'Retention insight',
      insight: {
        summary: `Retention is currently ${snap.repeat.rate}%, compared with ${snap.prevRepeat.rate}% in the previous period (${snap.repeatPts.percentChangeLabel}).`,
        factors,
        recommendation,
      },
      supporting: [
        ...base.supporting,
        { label: 'Inactive customers', value: num(snap.inactive.current) },
        { label: 'New customers', value: num(snap.newcomers.current) },
      ],
    };
  }
}
