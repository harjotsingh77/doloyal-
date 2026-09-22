import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  prismaCustomerToShared,
  prismaRewardToShared,
  prismaActivityToShared,
} from '../../common/helpers';
import { orderCountsAsRevenue } from '../../common/customer-commerce';
import { resolveOverviewRange } from '@doloyal/shared';

interface TopServiceRow {
  service: string;
  revenue: number;
  customers: number;
  growth: number | null;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    tenantId: string,
    query?: { days?: string; from?: string; to?: string },
  ) {
    const now = new Date();
    const range = resolveOverviewRange(query);
    const fromDate = range.currentFrom;
    const toDate = range.currentTo;
    const numDays = range.inclusiveDays;
    const prevPeriodFrom = range.prevFrom;
    const prevPeriodTo = range.prevTo;
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Overview fans out ~35 Prisma queries. On Vercel that takes ~10s even for
    // an empty tenant, and the Next.js /backend proxy drops the socket first
    // (browser: "Failed to fetch"). New accounts have no activity — return
    // zeros without the fan-out.
    const occupied = await this.hasTenantActivity(tenantId);
    if (!occupied) {
      return this.emptyOverview(now, range);
    }

    const dayEnd = new Date(startOfDay.getTime() + 86400000);
    const [
      scalars,
      revenueTrend,
      customerTrend,
      topCustomers,
      topRewards,
      topServices,
      recentActivity,
      campaignPerf,
    ] = await Promise.all([
      this.loadOverviewScalars(tenantId, fromDate, toDate, prevPeriodFrom, prevPeriodTo, startOfDay, dayEnd),
      this.getRevenueTrend(tenantId, fromDate, toDate, numDays),
      this.getCustomerTrend(tenantId, fromDate, toDate, numDays),
      this.prisma.customer.findMany({
        where: { tenantId },
        orderBy: { totalSpent: 'desc' },
        take: 5,
      }),
      this.prisma.reward.findMany({
        where: { tenantId, status: 'ACTIVE' as any },
        include: { _count: { select: { redemptions: true } } },
        orderBy: { redemptions: { _count: 'desc' } },
        take: 5,
      }),
      this.getTopServices(tenantId, fromDate, toDate, prevPeriodFrom),
      this.prisma.activity.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { customer: true },
      }),
      this.getCampaignPerformance(tenantId, fromDate, toDate),
    ]);

    const periodRev = scalars.periodInvoiceRev + scalars.periodOrderRev;
    const prevRev = scalars.prevInvoiceRev + scalars.prevOrderRev;
    const todayOrderRev = scalars.todayOrderRev;
    const periodOrderRev = scalars.periodOrderRev;
    const prevOrderRev = scalars.prevOrderRev;
    const issuedPts = scalars.pointsIssued;
    const redeemedPts = Math.abs(scalars.pointsRedeemed);
    const prevRedeemedPts = Math.abs(scalars.prevPointsRedeemed);
    const redemptionRatePct =
      issuedPts > 0 ? Math.round((redeemedPts / issuedPts) * 1000) / 10 : 0;
    const monthlyGrowthPct =
      prevRev > 0 ? Math.round(((periodRev - prevRev) / prevRev) * 1000) / 10 : null;
    const repeatCount = scalars.repeatCustomers;
    const prevRepeatCount = scalars.prevRepeatCustomers;
    const pendingReviewCount = scalars.pendingReviews;
    const approvedCount = scalars.approvedReviews;
    const averageRating = approvedCount ? Math.round(scalars.averageRating * 10) / 10 : 0;
    const prevApprovedCount = scalars.prevApprovedReviews;
    const prevAverageRating = prevApprovedCount ? Math.round(scalars.prevAverageRating * 10) / 10 : 0;
    const membershipSales = scalars.membershipSales;
    const walletHolders = scalars.walletHolders;
    const appointmentsToday = scalars.appointmentsToday;
    const appointmentsInPeriod = scalars.appointmentsInPeriod;
    const totalCustomers = scalars.totalCustomers;
    const prevTotalCustomers = scalars.prevTotalCustomers;
    const periodCustomers = scalars.periodCustomers;
    const prevPeriodCustomers = scalars.prevPeriodCustomers;
    const inactiveCustomers = scalars.inactiveCustomers;
    const prevInactiveCustomers = scalars.prevInactiveCustomers;
    const prevAppointmentsInPeriod = scalars.prevAppointmentsInPeriod;
    const prevMembershipSales = scalars.prevMembershipSales;
    const activeRewards = scalars.activeRewards;
    const todayInvoices = { _sum: { total: scalars.todayInvoiceRev } };
    const outstandingPointsAgg = { _sum: { pointsBalance: scalars.outstandingPoints } };
    const qualifyingPeriodOrders = { length: scalars.periodOrderCount };
    const qualifyingPrevOrders = { length: scalars.prevOrderCount };


    return {
      generatedAt: now.toISOString(),
      period: {
        from: range.currentFromYmd,
        to: range.currentToYmd,
      },
      kpis: {
        todayRevenue: (todayInvoices._sum.total || 0) + todayOrderRev,
        periodRevenue: Math.round(periodRev * 100) / 100,
        todayCustomers: totalCustomers || 0,
        repeatCustomers: repeatCount,
        newCustomers: periodCustomers,
        inactiveCustomers,
        activeRewards,
        pointsRedeemed30d: redeemedPts,
        membershipSales30d: membershipSales,
        outstandingPoints: outstandingPointsAgg._sum.pointsBalance || 0,
        walletHolders,
        pointsIssued30d: issuedPts,
        redemptionRatePct,
        campaignRevenue: campaignPerf.revenue,
        campaignCustomers: campaignPerf.customers,
        campaignReached: campaignPerf.reached,
        campaignsSent: campaignPerf.campaignsSent,
        appointmentsToday,
        appointmentsInPeriod,
        pendingReviews: pendingReviewCount,
        monthlyGrowthPct,
        totalCustomers: totalCustomers || 0,
        orderCount: qualifyingPeriodOrders.length,
        orderRevenue: Math.round(periodOrderRev * 100) / 100,
        approvedReviews: approvedCount,
        averageRating,
        previousPeriodRevenue: Math.round(prevRev * 100) / 100,
        previousTotalCustomers: prevTotalCustomers || 0,
        previousRepeatCustomers: prevRepeatCount,
        previousNewCustomers: prevPeriodCustomers || 0,
        previousInactiveCustomers: prevInactiveCustomers || 0,
        previousPointsRedeemed: prevRedeemedPts,
        previousOrderCount: qualifyingPrevOrders.length,
        previousOrderRevenue: Math.round(prevOrderRev * 100) / 100,
        previousApprovedReviews: prevApprovedCount,
        previousAverageRating: prevAverageRating,
        previousAppointmentsInPeriod: prevAppointmentsInPeriod || 0,
        previousMembershipSales: prevMembershipSales || 0,
      },
      revenueTrend,
      customerTrend,
      topServices,
      topCustomers: topCustomers.map((c) => {
        const shared = prismaCustomerToShared(c);
        return {
          id: shared.id,
          name: shared.name,
          phone: shared.phone,
          lifetimeValue: shared.lifetimeValue,
          visitCount: shared.visitCount,
          loyaltyBand: shared.loyaltyBand,
          churnRisk: shared.churnRisk,
        };
      }),
      topRewards: topRewards.map(prismaRewardToShared).map((r) => ({
        id: r.id,
        name: r.name,
        pointsCost: r.pointsCost,
        redeemedCount: r.redeemedCount,
      })),
      recentActivity: recentActivity.map((a) =>
        prismaActivityToShared(a as any),
      ),
    };
  }

  /**
   * One round trip for every scalar KPI. The previous overview issued ~35
   * Prisma calls; on a 5-connection pool from Vercel to a remote Postgres
   * that serialized into a multi-second wait before the page could render.
   */
  private async loadOverviewScalars(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
    prevTo: Date,
    startOfDay: Date,
    dayEnd: Date,
  ) {
    const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT
        COALESCE((SELECT SUM(total) FROM "Invoice" WHERE "tenantId" = ${tenantId} AND status::text = 'PAID' AND "createdAt" >= ${from} AND "createdAt" <= ${to}), 0)::float8 AS "periodInvoiceRev",
        COALESCE((SELECT SUM(total) FROM "Invoice" WHERE "tenantId" = ${tenantId} AND status::text = 'PAID' AND "createdAt" >= ${startOfDay}), 0)::float8 AS "todayInvoiceRev",
        COALESCE((SELECT SUM(total) FROM "Invoice" WHERE "tenantId" = ${tenantId} AND status::text = 'PAID' AND "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo}), 0)::float8 AS "prevInvoiceRev",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${from} AND "createdAt" <= ${to}), 0)::float8 AS "periodCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "createdAt" <= ${to}), 0)::float8 AS "totalCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo}), 0)::float8 AS "prevPeriodCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "createdAt" <= ${prevTo}), 0)::float8 AS "prevTotalCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "lastVisitAt" IS NOT NULL AND "lastVisitAt" < ${from} AND status::text = 'ACTIVE'), 0)::float8 AS "inactiveCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "lastVisitAt" IS NOT NULL AND "lastVisitAt" < ${prevFrom} AND status::text = 'ACTIVE'), 0)::float8 AS "prevInactiveCustomers",
        COALESCE((SELECT COUNT(*) FROM "Customer" WHERE "tenantId" = ${tenantId} AND "pointsBalance" > 0), 0)::float8 AS "walletHolders",
        COALESCE((SELECT SUM("pointsBalance") FROM "Customer" WHERE "tenantId" = ${tenantId}), 0)::float8 AS "outstandingPoints",
        COALESCE((SELECT COUNT(*) FROM "Reward" WHERE "tenantId" = ${tenantId} AND status::text = 'ACTIVE'), 0)::float8 AS "activeRewards",
        COALESCE((SELECT SUM(amount) FROM "PointsLedger" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${from} AND "createdAt" <= ${to} AND amount < 0), 0)::float8 AS "pointsRedeemed",
        COALESCE((SELECT SUM(amount) FROM "PointsLedger" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${from} AND "createdAt" <= ${to} AND amount > 0), 0)::float8 AS "pointsIssued",
        COALESCE((SELECT SUM(amount) FROM "PointsLedger" WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo} AND amount < 0), 0)::float8 AS "prevPointsRedeemed",
        COALESCE((SELECT COUNT(*) FROM "Appointment" WHERE "tenantId" = ${tenantId} AND "startTime" >= ${startOfDay} AND "startTime" < ${dayEnd} AND status::text IN ('BOOKED', 'CONFIRMED', 'IN_PROGRESS')), 0)::float8 AS "appointmentsToday",
        COALESCE((SELECT COUNT(*) FROM "Appointment" WHERE "tenantId" = ${tenantId} AND "startTime" >= ${from} AND "startTime" <= ${to} AND status::text <> 'CANCELLED'), 0)::float8 AS "appointmentsInPeriod",
        COALESCE((SELECT COUNT(*) FROM "Appointment" WHERE "tenantId" = ${tenantId} AND "startTime" >= ${prevFrom} AND "startTime" <= ${prevTo} AND status::text <> 'CANCELLED'), 0)::float8 AS "prevAppointmentsInPeriod",
        COALESCE((SELECT COUNT(*) FROM "Review" WHERE "tenantId" = ${tenantId} AND status::text = 'PENDING'), 0)::float8 AS "pendingReviews",
        COALESCE((SELECT COUNT(*) FROM "Review" WHERE "tenantId" = ${tenantId} AND status::text = 'APPROVED' AND "publishedAt" >= ${from} AND "publishedAt" <= ${to}), 0)::float8 AS "approvedReviews",
        COALESCE((SELECT AVG(rating) FROM "Review" WHERE "tenantId" = ${tenantId} AND status::text = 'APPROVED' AND "publishedAt" >= ${from} AND "publishedAt" <= ${to}), 0)::float8 AS "averageRating",
        COALESCE((SELECT COUNT(*) FROM "Review" WHERE "tenantId" = ${tenantId} AND status::text = 'APPROVED' AND "publishedAt" >= ${prevFrom} AND "publishedAt" <= ${prevTo}), 0)::float8 AS "prevApprovedReviews",
        COALESCE((SELECT AVG(rating) FROM "Review" WHERE "tenantId" = ${tenantId} AND status::text = 'APPROVED' AND "publishedAt" >= ${prevFrom} AND "publishedAt" <= ${prevTo}), 0)::float8 AS "prevAverageRating",
        COALESCE((SELECT COUNT(*) FROM "CustomerMembership" m INNER JOIN "Customer" c ON c.id = m."customerId" WHERE c."tenantId" = ${tenantId} AND m."assignedAt" >= ${from} AND m."assignedAt" <= ${to}), 0)::float8 AS "membershipSales",
        COALESCE((SELECT COUNT(*) FROM "CustomerMembership" m INNER JOIN "Customer" c ON c.id = m."customerId" WHERE c."tenantId" = ${tenantId} AND m."assignedAt" >= ${prevFrom} AND m."assignedAt" <= ${prevTo}), 0)::float8 AS "prevMembershipSales",
        COALESCE((SELECT SUM(total) FROM "ClientOrder" WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${from} AND "orderDate" <= ${to} AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED' AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')), 0)::float8 AS "periodOrderRev",
        COALESCE((SELECT COUNT(*) FROM "ClientOrder" WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${from} AND "orderDate" <= ${to} AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED' AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')), 0)::float8 AS "periodOrderCount",
        COALESCE((SELECT SUM(total) FROM "ClientOrder" WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${prevFrom} AND "orderDate" <= ${prevTo} AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED' AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')), 0)::float8 AS "prevOrderRev",
        COALESCE((SELECT COUNT(*) FROM "ClientOrder" WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${prevFrom} AND "orderDate" <= ${prevTo} AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED' AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')), 0)::float8 AS "prevOrderCount",
        COALESCE((SELECT SUM(total) FROM "ClientOrder" WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${startOfDay} AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED' AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')), 0)::float8 AS "todayOrderRev",
        COALESCE((
          SELECT COUNT(*) FROM (
            SELECT COALESCE(i.cid, o.cid) AS cid, COALESCE(i.n, 0) + COALESCE(o.n, 0) AS n
            FROM (
              SELECT "customerId" AS cid, COUNT(*)::int AS n
              FROM "Invoice"
              WHERE "tenantId" = ${tenantId} AND status::text = 'PAID' AND "createdAt" >= ${from} AND "createdAt" <= ${to}
              GROUP BY "customerId"
            ) i
            FULL OUTER JOIN (
              SELECT "customerId" AS cid, COUNT(*)::int AS n
              FROM "ClientOrder"
              WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${from} AND "orderDate" <= ${to}
                AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED'
                AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')
              GROUP BY "customerId"
            ) o ON i.cid = o.cid
          ) s WHERE s.n >= 2
        ), 0)::float8 AS "repeatCustomers",
        COALESCE((
          SELECT COUNT(*) FROM (
            SELECT COALESCE(i.cid, o.cid) AS cid, COALESCE(i.n, 0) + COALESCE(o.n, 0) AS n
            FROM (
              SELECT "customerId" AS cid, COUNT(*)::int AS n
              FROM "Invoice"
              WHERE "tenantId" = ${tenantId} AND status::text = 'PAID' AND "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo}
              GROUP BY "customerId"
            ) i
            FULL OUTER JOIN (
              SELECT "customerId" AS cid, COUNT(*)::int AS n
              FROM "ClientOrder"
              WHERE "tenantId" = ${tenantId} AND "orderDate" >= ${prevFrom} AND "orderDate" <= ${prevTo}
                AND status::text <> 'CANCELLED' AND "paymentStatus"::text <> 'REFUNDED'
                AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')
              GROUP BY "customerId"
            ) o ON i.cid = o.cid
          ) s WHERE s.n >= 2
        ), 0)::float8 AS "prevRepeatCustomers"
    `;
    const row = rows[0] ?? {};
    const n = (key: string) => {
      const value = row[key];
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      if (typeof value === 'bigint') return Number(value);
      const parsed = Number(value ?? 0);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    return {
      periodInvoiceRev: n('periodInvoiceRev'),
      todayInvoiceRev: n('todayInvoiceRev'),
      prevInvoiceRev: n('prevInvoiceRev'),
      periodCustomers: n('periodCustomers'),
      totalCustomers: n('totalCustomers'),
      prevPeriodCustomers: n('prevPeriodCustomers'),
      prevTotalCustomers: n('prevTotalCustomers'),
      inactiveCustomers: n('inactiveCustomers'),
      prevInactiveCustomers: n('prevInactiveCustomers'),
      walletHolders: n('walletHolders'),
      outstandingPoints: n('outstandingPoints'),
      activeRewards: n('activeRewards'),
      pointsRedeemed: n('pointsRedeemed'),
      pointsIssued: n('pointsIssued'),
      prevPointsRedeemed: n('prevPointsRedeemed'),
      appointmentsToday: n('appointmentsToday'),
      appointmentsInPeriod: n('appointmentsInPeriod'),
      prevAppointmentsInPeriod: n('prevAppointmentsInPeriod'),
      pendingReviews: n('pendingReviews'),
      approvedReviews: n('approvedReviews'),
      averageRating: n('averageRating'),
      prevApprovedReviews: n('prevApprovedReviews'),
      prevAverageRating: n('prevAverageRating'),
      membershipSales: n('membershipSales'),
      prevMembershipSales: n('prevMembershipSales'),
      periodOrderRev: n('periodOrderRev'),
      periodOrderCount: n('periodOrderCount'),
      prevOrderRev: n('prevOrderRev'),
      prevOrderCount: n('prevOrderCount'),
      todayOrderRev: n('todayOrderRev'),
      repeatCustomers: n('repeatCustomers'),
      prevRepeatCustomers: n('prevRepeatCustomers'),
    };
  }

  private async hasTenantActivity(tenantId: string): Promise<boolean> {
    const [customer, invoice, appointment, order] = await Promise.all([
      this.prisma.customer.findFirst({ where: { tenantId }, select: { id: true } }),
      this.prisma.invoice.findFirst({ where: { tenantId }, select: { id: true } }),
      this.prisma.appointment.findFirst({ where: { tenantId }, select: { id: true } }),
      this.prisma.clientOrder.findFirst({ where: { tenantId }, select: { id: true } }).catch(() => null),
    ]);
    return Boolean(customer || invoice || appointment || order);
  }

  private emptyOverview(
    now: Date,
    range: ReturnType<typeof resolveOverviewRange>,
  ) {
    const zeroKpis = {
      todayRevenue: 0,
      periodRevenue: 0,
      todayCustomers: 0,
      repeatCustomers: 0,
      newCustomers: 0,
      inactiveCustomers: 0,
      activeRewards: 0,
      pointsRedeemed30d: 0,
      membershipSales30d: 0,
      outstandingPoints: 0,
      walletHolders: 0,
      pointsIssued30d: 0,
      redemptionRatePct: 0,
      campaignRevenue: 0,
      campaignCustomers: 0,
      campaignReached: 0,
      campaignsSent: 0,
      appointmentsToday: 0,
      appointmentsInPeriod: 0,
      pendingReviews: 0,
      monthlyGrowthPct: null as number | null,
      totalCustomers: 0,
      orderCount: 0,
      orderRevenue: 0,
      approvedReviews: 0,
      averageRating: 0,
      previousPeriodRevenue: 0,
      previousTotalCustomers: 0,
      previousRepeatCustomers: 0,
      previousNewCustomers: 0,
      previousInactiveCustomers: 0,
      previousPointsRedeemed: 0,
      previousOrderCount: 0,
      previousOrderRevenue: 0,
      previousApprovedReviews: 0,
      previousAverageRating: 0,
      previousAppointmentsInPeriod: 0,
      previousMembershipSales: 0,
    };
    const trend = this.zeroTrend(range.currentFrom, range.currentTo);
    return {
      generatedAt: now.toISOString(),
      period: {
        from: range.currentFromYmd,
        to: range.currentToYmd,
      },
      kpis: zeroKpis,
      revenueTrend: trend,
      customerTrend: trend.map((point) => ({ ...point })),
      topServices: [] as TopServiceRow[],
      topCustomers: [],
      topRewards: [],
      recentActivity: [],
    };
  }

  private zeroTrend(from: Date, to: Date) {
    const points: { date: string; revenue: number; customers: number }[] = [];
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor.getTime() <= end.getTime()) {
      points.push({ date: cursor.toISOString().slice(0, 10), revenue: 0, customers: 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return points;
  }

  /**
   * Real top services computed from paid invoices' line items in the period,
   * with growth measured against the equivalent previous period.
   */
  private async getTopServices(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
  ): Promise<TopServiceRow[]> {
    const [current, previous] = await Promise.all([
      this.prisma.invoiceItem.groupBy({
        by: ['serviceId'],
        where: {
          invoice: { tenantId, createdAt: { gte: from, lte: to }, status: 'PAID' },
          serviceId: { not: null },
        },
        _sum: { total: true, quantity: true },
      }).catch(() => []),
      this.prisma.invoiceItem.groupBy({
        by: ['serviceId'],
        where: {
          invoice: { tenantId, createdAt: { gte: prevFrom, lt: from }, status: 'PAID' },
          serviceId: { not: null },
        },
        _sum: { total: true },
      }).catch(() => []),
    ]);

    if (current.length === 0) {
      return (await this.getTopProducts(tenantId, from, to, prevFrom))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    }

    const serviceIds = current
      .map((row) => row.serviceId)
      .filter((id): id is string => Boolean(id));
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(services.map((s) => [s.id, s.name]));

    const prevRevenueById = new Map<string, number>();
    for (const row of previous) {
      if (row.serviceId) {
        prevRevenueById.set(row.serviceId, row._sum.total || 0);
      }
    }

    // Distinct customers per service requires the underlying rows joined
    // through their parent invoice.
    const rows = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: { tenantId, createdAt: { gte: from, lte: to }, status: 'PAID' },
        serviceId: { in: serviceIds },
      },
      select: { serviceId: true, total: true, invoice: { select: { customerId: true } } },
    });

    const agg = new Map<
      string,
      { revenue: number; customers: Set<string> }
    >();
    for (const r of rows) {
      if (!r.serviceId) continue;
      let entry = agg.get(r.serviceId);
      if (!entry) {
        entry = { revenue: 0, customers: new Set<string>() };
        agg.set(r.serviceId, entry);
      }
      entry.revenue += r.total || 0;
      if (r.invoice?.customerId) entry.customers.add(r.invoice.customerId);
    }

    return Array.from(agg.entries())
      .map(([serviceId, entry]) => {
        const prev = prevRevenueById.get(serviceId) || 0;
        const growth =
          prev > 0
            ? Math.round(((entry.revenue - prev) / prev) * 1000) / 10
            : null;
        return {
          service: nameById.get(serviceId) || 'Service',
          revenue: Math.round(entry.revenue * 100) / 100,
          customers: entry.customers.size,
          growth,
        };
      })
      .concat(await this.getTopProducts(tenantId, from, to, prevFrom))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getTopProducts(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
  ): Promise<TopServiceRow[]> {
    const orders = await this.prisma.clientOrder.findMany({
      where: { tenantId, orderDate: { gte: prevFrom, lte: to } },
      select: {
        total: true,
        customerId: true,
        orderDate: true,
        status: true,
        paymentStatus: true,
        product: { select: { name: true } },
      },
    }).catch(() => []);
    if (!orders.length) return [];

    const current = new Map<string, { revenue: number; customers: Set<string> }>();
    const previous = new Map<string, number>();
    for (const order of orders) {
      if (!orderCountsAsRevenue(order.status, order.paymentStatus)) continue;
      const name = order.product?.name || 'Product';
      if (order.orderDate >= from && order.orderDate <= to) {
        let entry = current.get(name);
        if (!entry) {
          entry = { revenue: 0, customers: new Set() };
          current.set(name, entry);
        }
        entry.revenue += order.total || 0;
        entry.customers.add(order.customerId);
      } else if (order.orderDate >= prevFrom && order.orderDate < from) {
        previous.set(name, (previous.get(name) || 0) + (order.total || 0));
      }
    }

    return Array.from(current.entries()).map(([service, entry]) => {
      const prev = previous.get(service) || 0;
      return {
        service,
        revenue: Math.round(entry.revenue * 100) / 100,
        customers: entry.customers.size,
        growth: prev > 0 ? Math.round(((entry.revenue - prev) / prev) * 1000) / 10 : null,
      };
    });
  }

  private async getRevenueTrend(
    tenantId: string,
    from: Date,
    to: Date,
    _numDays: number,
  ) {
    const buckets = await this.prisma.$queryRaw<Array<{ day: string; revenue: number }>>`
      SELECT day, SUM(revenue)::float8 AS revenue FROM (
        SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, total AS revenue
        FROM "Invoice"
        WHERE "tenantId" = ${tenantId}
          AND status::text = 'PAID'
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        UNION ALL
        SELECT to_char("orderDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, total AS revenue
        FROM "ClientOrder"
        WHERE "tenantId" = ${tenantId}
          AND "orderDate" >= ${from}
          AND "orderDate" <= ${to}
          AND status::text <> 'CANCELLED'
          AND "paymentStatus"::text <> 'REFUNDED'
          AND ("paymentStatus"::text = 'PAID' OR status::text = 'COMPLETED')
      ) days
      GROUP BY day
    `;

    const dailyMap = new Map<string, number>();
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor.getTime() <= end.getTime()) {
      dailyMap.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    void _numDays;
    for (const bucket of buckets) {
      if (dailyMap.has(bucket.day)) {
        dailyMap.set(bucket.day, (dailyMap.get(bucket.day) || 0) + Number(bucket.revenue || 0));
      }
    }
    return Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
      customers: 0,
    }));
  }

  private async getCustomerTrend(
    tenantId: string,
    from: Date,
    to: Date,
    numDays: number,
  ) {
    const customers = await this.prisma.$queryRaw<Array<{ day: string; customers: number }>>`
      SELECT to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
             COUNT(*)::int AS customers
      FROM "Customer"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= ${from}
        AND "createdAt" <= ${to}
      GROUP BY 1
    `;

    const stepDays = Math.max(1, Math.floor(numDays / 45));
    const dailyMap = new Map<string, number>();
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    const keys: string[] = [];
    while (cursor.getTime() <= end.getTime()) {
      keys.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    for (let i = 0; i < keys.length; i += stepDays) dailyMap.set(keys[i], 0);
    if (keys.length) dailyMap.set(keys[keys.length - 1], 0);
    for (const c of customers) {
      if (dailyMap.has(c.day)) {
        dailyMap.set(c.day, (dailyMap.get(c.day) || 0) + Number(c.customers || 0));
      }
    }
    return Array.from(dailyMap.entries()).map(([date, customersCount]) => ({
      date,
      revenue: 0,
      customers: customersCount,
    }));
  }

  /**
   * Customers and paid revenue attributed to campaigns in the period:
   * a paid invoice counts if that customer received a campaign send at or
   * before the invoice, within this window.
   */
  private async getCampaignPerformance(
    tenantId: string,
    from: Date,
    to: Date,
  ): Promise<{
    revenue: number;
    customers: number;
    reached: number;
    campaignsSent: number;
  }> {
    const empty = { revenue: 0, customers: 0, reached: 0, campaignsSent: 0 };
    try {
      const [campaignsSent, emailTouches, waTouches] = await Promise.all([
        this.prisma.campaign.count({
          where: {
            tenantId,
            status: 'COMPLETED',
            sentAt: { gte: from, lte: to },
          },
        }),
        this.prisma.emailLog.findMany({
          where: {
            tenantId,
            campaignId: { not: null },
            status: 'SENT',
            customerId: { not: null },
            createdAt: { gte: from, lte: to },
          },
          select: { customerId: true, createdAt: true },
        }),
        this.prisma.notification.findMany({
          where: {
            tenantId,
            type: 'CAMPAIGN',
            status: 'SENT',
            customerId: { not: null },
            OR: [
              { sentAt: { gte: from, lte: to } },
              { sentAt: null, createdAt: { gte: from, lte: to } },
            ],
          },
          select: { customerId: true, sentAt: true, createdAt: true },
        }),
      ]);

      const firstTouch = new Map<string, Date>();
      const record = (customerId: string | null, at: Date) => {
        if (!customerId) return;
        const prev = firstTouch.get(customerId);
        if (!prev || at < prev) firstTouch.set(customerId, at);
      };
      for (const row of emailTouches) record(row.customerId, row.createdAt);
      for (const row of waTouches) record(row.customerId, row.sentAt ?? row.createdAt);

      const reached = firstTouch.size;
      if (reached === 0) {
        const sentAgg = await this.prisma.campaign.aggregate({
          where: {
            tenantId,
            status: 'COMPLETED',
            sentAt: { gte: from, lte: to },
          },
          _sum: { sentCount: true },
        });
        return {
          ...empty,
          campaignsSent,
          reached: sentAgg._sum.sentCount || 0,
        };
      }

      const invoices = await this.prisma.invoice.findMany({
        where: {
          tenantId,
          status: 'PAID',
          createdAt: { gte: from, lte: to },
          customerId: { in: Array.from(firstTouch.keys()) },
        },
        select: { customerId: true, total: true, createdAt: true },
      });
      const attributedOrders = await this.prisma.clientOrder.findMany({
        where: {
          tenantId,
          orderDate: { gte: from, lte: to },
          customerId: { in: Array.from(firstTouch.keys()) },
        },
        select: { customerId: true, total: true, orderDate: true, status: true, paymentStatus: true },
      }).catch(() => []);

      const converted = new Set<string>();
      let revenue = 0;
      for (const inv of invoices) {
        const touch = firstTouch.get(inv.customerId);
        if (!touch || inv.createdAt < touch) continue;
        revenue += inv.total || 0;
        converted.add(inv.customerId);
      }
      for (const order of attributedOrders) {
        if (!orderCountsAsRevenue(order.status, order.paymentStatus)) continue;
        const touch = firstTouch.get(order.customerId);
        if (!touch || order.orderDate < touch) continue;
        revenue += order.total || 0;
        converted.add(order.customerId);
      }

      return {
        revenue: Math.round(revenue * 100) / 100,
        customers: converted.size,
        reached,
        campaignsSent,
      };
    } catch (err) {
      this.logger.warn(
        `Campaign performance unavailable: ${err instanceof Error ? err.message : err}`,
      );
      return empty;
    }
  }
}
