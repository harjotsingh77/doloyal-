import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  prismaCustomerToShared,
  prismaRewardToShared,
  prismaActivityToShared,
} from '../../common/helpers';
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
  /** Short reuse so dashboard and analytics don't recompute the same window. */
  private readonly overviewCache = new Map<string, { at: number; data: any }>();

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

    const cacheKey = `${tenantId}:${range.currentFromYmd}:${range.currentToYmd}`;
    const cached = this.overviewCache.get(cacheKey);
    // Keep occupied-tenant results briefly; never reuse an empty snapshot —
    // the first customer/order after an empty window must show up immediately.
    if (cached && cached.data?.kpis?.totalCustomers > 0 && now.getTime() - cached.at < 8_000) {
      return cached.data;
    }

    // One existence check, in parallel with nothing else — empty tenants skip
    // the aggregate scans. Occupied tenants go straight into indexed scans.
    const occupied = await this.hasTenantActivity(tenantId);
    if (!occupied) {
      // Do not remember empty results — a create arriving a second later
      // would otherwise keep returning zeros from this function instance.
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
        select: {
          id: true,
          tenantId: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          totalSpent: true,
          totalVisits: true,
          pointsBalance: true,
          churnRiskScore: true,
          lastVisitAt: true,
          createdAt: true,
          status: true,
          tags: true,
          notes: true,
          avatarUrl: true,
          dob: true,
        },
      }),
      this.prisma.reward.findMany({
        where: { tenantId, status: 'ACTIVE' as any },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          pointsCost: true,
          discountVal: true,
          imageUrl: true,
          validityDays: true,
          status: true,
          quantity: true,
          redeemedCount: true,
          category: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { redemptions: true } },
        },
        orderBy: { redemptions: { _count: 'desc' } },
        take: 5,
      }),
      this.getTopServices(tenantId, fromDate, toDate, prevPeriodFrom),
      this.prisma.activity.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          tenantId: true,
          customerId: true,
          type: true,
          message: true,
          metadata: true,
          createdAt: true,
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
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


    const result = {
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
        const shared = prismaCustomerToShared(c as any);
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
      topRewards: topRewards.map((r) => prismaRewardToShared(r as any)).map((r) => ({
        id: r.id,
        name: r.name,
        pointsCost: r.pointsCost,
        redeemedCount: r.redeemedCount,
      })),
      recentActivity: recentActivity.map((a) =>
        prismaActivityToShared(a as any),
      ),
    };
    this.rememberOverview(cacheKey, result);
    return result;
  }

  private rememberOverview(key: string, data: any) {
    this.overviewCache.set(key, { at: Date.now(), data });
    if (this.overviewCache.size > 80) {
      const oldest = this.overviewCache.keys().next().value;
      if (oldest) this.overviewCache.delete(oldest);
    }
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
    const invoiceSince = prevFrom < startOfDay ? prevFrom : startOfDay;
    const orderPredicate = `status <> 'CANCELLED'::"ClientOrderStatus" AND "paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus" AND ("paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR status = 'COMPLETED'::"ClientOrderStatus")`;
    const [customers, invoices, orders, repeats, points, appointments, reviews, extras] = await Promise.all([
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COUNT(*) FILTER (WHERE "createdAt" >= ${from} AND "createdAt" <= ${to})::float8 AS "periodCustomers",
          COUNT(*) FILTER (WHERE "createdAt" <= ${to})::float8 AS "totalCustomers",
          COUNT(*) FILTER (WHERE "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo})::float8 AS "prevPeriodCustomers",
          COUNT(*) FILTER (WHERE "createdAt" <= ${prevTo})::float8 AS "prevTotalCustomers",
          COUNT(*) FILTER (WHERE "lastVisitAt" IS NOT NULL AND "lastVisitAt" < ${from} AND status = 'ACTIVE'::"CustomerStatus")::float8 AS "inactiveCustomers",
          COUNT(*) FILTER (WHERE "lastVisitAt" IS NOT NULL AND "lastVisitAt" < ${prevFrom} AND status = 'ACTIVE'::"CustomerStatus")::float8 AS "prevInactiveCustomers",
          COUNT(*) FILTER (WHERE "pointsBalance" > 0)::float8 AS "walletHolders",
          COALESCE(SUM("pointsBalance"), 0)::float8 AS "outstandingPoints"
        FROM "Customer"
        WHERE "tenantId" = ${tenantId}
      `,
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${from} AND "createdAt" <= ${to}), 0)::float8 AS "periodInvoiceRev",
          COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${startOfDay}), 0)::float8 AS "todayInvoiceRev",
          COALESCE(SUM(total) FILTER (WHERE "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo}), 0)::float8 AS "prevInvoiceRev"
        FROM "Invoice"
        WHERE "tenantId" = ${tenantId}
          AND status = 'PAID'::"InvoiceStatus"
          AND "createdAt" >= ${invoiceSince}
      `,
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT
          COALESCE(SUM(total) FILTER (WHERE "orderDate" >= $2 AND "orderDate" <= $3), 0)::float8 AS "periodOrderRev",
          COALESCE(COUNT(*) FILTER (WHERE "orderDate" >= $2 AND "orderDate" <= $3), 0)::float8 AS "periodOrderCount",
          COALESCE(SUM(total) FILTER (WHERE "orderDate" >= $4 AND "orderDate" <= $5), 0)::float8 AS "prevOrderRev",
          COALESCE(COUNT(*) FILTER (WHERE "orderDate" >= $4 AND "orderDate" <= $5), 0)::float8 AS "prevOrderCount",
          COALESCE(SUM(total) FILTER (WHERE "orderDate" >= $6), 0)::float8 AS "todayOrderRev"
        FROM "ClientOrder"
        WHERE "tenantId" = $1 AND "orderDate" >= $7 AND ${orderPredicate}`,
        tenantId, from, to, prevFrom, prevTo, startOfDay, invoiceSince,
      ),
      this.prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT COALESCE(i.cid, o.cid) AS cid, COALESCE(i.n, 0) + COALESCE(o.n, 0) AS n
              FROM (
                SELECT "customerId" AS cid, COUNT(*)::int AS n FROM "Invoice"
                WHERE "tenantId" = $1 AND status = 'PAID'::"InvoiceStatus" AND "createdAt" >= $2 AND "createdAt" <= $3
                GROUP BY "customerId"
              ) i
              FULL OUTER JOIN (
                SELECT "customerId" AS cid, COUNT(*)::int AS n FROM "ClientOrder"
                WHERE "tenantId" = $1 AND "orderDate" >= $2 AND "orderDate" <= $3 AND ${orderPredicate}
                GROUP BY "customerId"
              ) o ON i.cid = o.cid
            ) s WHERE s.n >= 2
          ), 0)::float8 AS "repeatCustomers",
          COALESCE((
            SELECT COUNT(*) FROM (
              SELECT COALESCE(i.cid, o.cid) AS cid, COALESCE(i.n, 0) + COALESCE(o.n, 0) AS n
              FROM (
                SELECT "customerId" AS cid, COUNT(*)::int AS n FROM "Invoice"
                WHERE "tenantId" = $1 AND status = 'PAID'::"InvoiceStatus" AND "createdAt" >= $4 AND "createdAt" <= $5
                GROUP BY "customerId"
              ) i
              FULL OUTER JOIN (
                SELECT "customerId" AS cid, COUNT(*)::int AS n FROM "ClientOrder"
                WHERE "tenantId" = $1 AND "orderDate" >= $4 AND "orderDate" <= $5 AND ${orderPredicate}
                GROUP BY "customerId"
              ) o ON i.cid = o.cid
            ) s WHERE s.n >= 2
          ), 0)::float8 AS "prevRepeatCustomers"`,
        tenantId, from, to, prevFrom, prevTo,
      ),
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${from} AND "createdAt" <= ${to} AND amount < 0), 0)::float8 AS "pointsRedeemed",
          COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${from} AND "createdAt" <= ${to} AND amount > 0), 0)::float8 AS "pointsIssued",
          COALESCE(SUM(amount) FILTER (WHERE "createdAt" >= ${prevFrom} AND "createdAt" <= ${prevTo} AND amount < 0), 0)::float8 AS "prevPointsRedeemed"
        FROM "PointsLedger"
        WHERE "tenantId" = ${tenantId} AND "createdAt" >= ${prevFrom} AND "createdAt" <= ${to}
      `,
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COUNT(*) FILTER (WHERE "startTime" >= ${startOfDay} AND "startTime" < ${dayEnd} AND status IN ('BOOKED'::"AppointmentStatus", 'CONFIRMED'::"AppointmentStatus", 'IN_PROGRESS'::"AppointmentStatus"))::float8 AS "appointmentsToday",
          COUNT(*) FILTER (WHERE "startTime" >= ${from} AND "startTime" <= ${to} AND status <> 'CANCELLED'::"AppointmentStatus")::float8 AS "appointmentsInPeriod",
          COUNT(*) FILTER (WHERE "startTime" >= ${prevFrom} AND "startTime" <= ${prevTo} AND status <> 'CANCELLED'::"AppointmentStatus")::float8 AS "prevAppointmentsInPeriod"
        FROM "Appointment"
        WHERE "tenantId" = ${tenantId} AND "startTime" >= ${prevFrom < startOfDay ? prevFrom : startOfDay} AND "startTime" <= ${to > dayEnd ? to : dayEnd}
      `,
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COUNT(*) FILTER (WHERE status = 'PENDING'::"ReviewStatus")::float8 AS "pendingReviews",
          COUNT(*) FILTER (WHERE status = 'APPROVED'::"ReviewStatus" AND "publishedAt" >= ${from} AND "publishedAt" <= ${to})::float8 AS "approvedReviews",
          COALESCE(AVG(rating) FILTER (WHERE status = 'APPROVED'::"ReviewStatus" AND "publishedAt" >= ${from} AND "publishedAt" <= ${to}), 0)::float8 AS "averageRating",
          COUNT(*) FILTER (WHERE status = 'APPROVED'::"ReviewStatus" AND "publishedAt" >= ${prevFrom} AND "publishedAt" <= ${prevTo})::float8 AS "prevApprovedReviews",
          COALESCE(AVG(rating) FILTER (WHERE status = 'APPROVED'::"ReviewStatus" AND "publishedAt" >= ${prevFrom} AND "publishedAt" <= ${prevTo}), 0)::float8 AS "prevAverageRating"
        FROM "Review"
        WHERE "tenantId" = ${tenantId}
      `,
      this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        SELECT
          COALESCE((SELECT COUNT(*) FROM "Reward" WHERE "tenantId" = ${tenantId} AND status = 'ACTIVE'::"RewardStatus"), 0)::float8 AS "activeRewards",
          COALESCE((SELECT COUNT(*) FROM "CustomerMembership" m INNER JOIN "Customer" c ON c.id = m."customerId" WHERE c."tenantId" = ${tenantId} AND m."assignedAt" >= ${from} AND m."assignedAt" <= ${to}), 0)::float8 AS "membershipSales",
          COALESCE((SELECT COUNT(*) FROM "CustomerMembership" m INNER JOIN "Customer" c ON c.id = m."customerId" WHERE c."tenantId" = ${tenantId} AND m."assignedAt" >= ${prevFrom} AND m."assignedAt" <= ${prevTo}), 0)::float8 AS "prevMembershipSales"
      `,
    ]);
    const row = Object.assign({}, customers[0], invoices[0], orders[0], repeats[0], points[0], appointments[0], reviews[0], extras[0]);
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
    // One round trip instead of four findFirsts competing for the pool.
    const rows = await this.prisma.$queryRaw<Array<{ ok: number }>>`
      SELECT 1::int AS ok
      WHERE EXISTS (SELECT 1 FROM "Customer" WHERE "tenantId" = ${tenantId} LIMIT 1)
         OR EXISTS (SELECT 1 FROM "Invoice" WHERE "tenantId" = ${tenantId} LIMIT 1)
         OR EXISTS (SELECT 1 FROM "Appointment" WHERE "tenantId" = ${tenantId} LIMIT 1)
         OR EXISTS (SELECT 1 FROM "ClientOrder" WHERE "tenantId" = ${tenantId} LIMIT 1)
    `.catch(() => [] as Array<{ ok: number }>);
    return rows.length > 0;
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
   * Top services and products for the window. Aggregated in SQL and capped
   * at 5 so a busy tenant never pulls every line item into Node.
   */
  private async getTopServices(
    tenantId: string,
    from: Date,
    to: Date,
    prevFrom: Date,
  ): Promise<TopServiceRow[]> {
    const [services, products] = await Promise.all([
      this.prisma.$queryRaw<Array<{ service: string; revenue: number; customers: number; prev: number }>>`
        SELECT
          COALESCE(s.name, 'Service') AS service,
          COALESCE(SUM(ii.total) FILTER (WHERE i."createdAt" >= ${from} AND i."createdAt" <= ${to}), 0)::float8 AS revenue,
          COUNT(DISTINCT i."customerId") FILTER (WHERE i."createdAt" >= ${from} AND i."createdAt" <= ${to})::int AS customers,
          COALESCE(SUM(ii.total) FILTER (WHERE i."createdAt" >= ${prevFrom} AND i."createdAt" < ${from}), 0)::float8 AS prev
        FROM "InvoiceItem" ii
        JOIN "Invoice" i ON i.id = ii."invoiceId"
        LEFT JOIN "Service" s ON s.id = ii."serviceId"
        WHERE i."tenantId" = ${tenantId}
          AND i.status = 'PAID'::"InvoiceStatus"
          AND i."createdAt" >= ${prevFrom}
          AND i."createdAt" <= ${to}
          AND ii."serviceId" IS NOT NULL
        GROUP BY s.name
        ORDER BY revenue DESC
        LIMIT 5
      `.catch(() => []),
      this.prisma.$queryRaw<Array<{ service: string; revenue: number; customers: number; prev: number }>>`
        SELECT
          COALESCE(p.name, 'Product') AS service,
          COALESCE(SUM(o.total) FILTER (WHERE o."orderDate" >= ${from} AND o."orderDate" <= ${to}), 0)::float8 AS revenue,
          COUNT(DISTINCT o."customerId") FILTER (WHERE o."orderDate" >= ${from} AND o."orderDate" <= ${to})::int AS customers,
          COALESCE(SUM(o.total) FILTER (WHERE o."orderDate" >= ${prevFrom} AND o."orderDate" < ${from}), 0)::float8 AS prev
        FROM "ClientOrder" o
        LEFT JOIN "Product" p ON p.id = o."productId"
        WHERE o."tenantId" = ${tenantId}
          AND o."orderDate" >= ${prevFrom}
          AND o."orderDate" <= ${to}
          AND o.status <> 'CANCELLED'::"ClientOrderStatus"
          AND o."paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
          AND (o."paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR o.status = 'COMPLETED'::"ClientOrderStatus")
        GROUP BY p.name
        ORDER BY revenue DESC
        LIMIT 5
      `.catch(() => []),
    ]);

    return [...services, ...products]
      .filter((row) => Number(row.revenue) > 0)
      .map((row) => {
        const revenue = Number(row.revenue) || 0;
        const prev = Number(row.prev) || 0;
        return {
          service: row.service || 'Service',
          revenue: Math.round(revenue * 100) / 100,
          customers: Number(row.customers) || 0,
          growth: prev > 0 ? Math.round(((revenue - prev) / prev) * 1000) / 10 : null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
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
          AND status = 'PAID'::"InvoiceStatus"
          AND "createdAt" >= ${from}
          AND "createdAt" <= ${to}
        UNION ALL
        SELECT to_char("orderDate" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, total AS revenue
        FROM "ClientOrder"
        WHERE "tenantId" = ${tenantId}
          AND "orderDate" >= ${from}
          AND "orderDate" <= ${to}
          AND status <> 'CANCELLED'::"ClientOrderStatus"
          AND "paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
          AND ("paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR status = 'COMPLETED'::"ClientOrderStatus")
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
   * Customers and paid revenue attributed to campaigns in the period.
   * Aggregated in the database so a large send log is not loaded into Node.
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
      const rows = await this.prisma.$queryRaw<Array<Record<string, unknown>>>`
        WITH email_touch AS (
          SELECT "customerId" AS cid, MIN("createdAt") AS touched
          FROM "EmailLog"
          WHERE "tenantId" = ${tenantId}
            AND "campaignId" IS NOT NULL
            AND status = 'SENT'
            AND "customerId" IS NOT NULL
            AND "createdAt" >= ${from}
            AND "createdAt" <= ${to}
          GROUP BY "customerId"
        ),
        note_touch AS (
          SELECT "customerId" AS cid, MIN(COALESCE("sentAt", "createdAt")) AS touched
          FROM "Notification"
          WHERE "tenantId" = ${tenantId}
            AND type = 'CAMPAIGN'
            AND status = 'SENT'
            AND "customerId" IS NOT NULL
            AND (
              ("sentAt" >= ${from} AND "sentAt" <= ${to})
              OR ("sentAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" <= ${to})
            )
          GROUP BY "customerId"
        ),
        touches AS (
          SELECT cid, MIN(touched) AS touched
          FROM (
            SELECT * FROM email_touch
            UNION ALL
            SELECT * FROM note_touch
          ) u
          GROUP BY cid
        )
        SELECT
          (SELECT COUNT(*)::int FROM "Campaign"
            WHERE "tenantId" = ${tenantId}
              AND status = 'COMPLETED'::"CampaignStatus"
              AND "sentAt" >= ${from} AND "sentAt" <= ${to}) AS "campaignsSent",
          CASE
            WHEN (SELECT COUNT(*) FROM touches) = 0 THEN (
              SELECT COALESCE(SUM("sentCount"), 0)::int FROM "Campaign"
              WHERE "tenantId" = ${tenantId}
                AND status = 'COMPLETED'::"CampaignStatus"
                AND "sentAt" >= ${from} AND "sentAt" <= ${to}
            )
            ELSE (SELECT COUNT(*)::int FROM touches)
          END AS reached,
          (
            COALESCE((
              SELECT SUM(i.total) FROM "Invoice" i
              JOIN touches t ON t.cid = i."customerId"
              WHERE i."tenantId" = ${tenantId}
                AND i.status = 'PAID'::"InvoiceStatus"
                AND i."createdAt" >= ${from} AND i."createdAt" <= ${to}
                AND i."createdAt" >= t.touched
            ), 0)
            + COALESCE((
              SELECT SUM(o.total) FROM "ClientOrder" o
              JOIN touches t ON t.cid = o."customerId"
              WHERE o."tenantId" = ${tenantId}
                AND o."orderDate" >= ${from} AND o."orderDate" <= ${to}
                AND o."orderDate" >= t.touched
                AND o.status <> 'CANCELLED'::"ClientOrderStatus"
                AND o."paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
                AND (o."paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR o.status = 'COMPLETED'::"ClientOrderStatus")
            ), 0)
          )::float8 AS revenue,
          (
            SELECT COUNT(*)::int FROM (
              SELECT i."customerId" AS cid FROM "Invoice" i
              JOIN touches t ON t.cid = i."customerId"
              WHERE i."tenantId" = ${tenantId}
                AND i.status = 'PAID'::"InvoiceStatus"
                AND i."createdAt" >= ${from} AND i."createdAt" <= ${to}
                AND i."createdAt" >= t.touched
              UNION
              SELECT o."customerId" FROM "ClientOrder" o
              JOIN touches t ON t.cid = o."customerId"
              WHERE o."tenantId" = ${tenantId}
                AND o."orderDate" >= ${from} AND o."orderDate" <= ${to}
                AND o."orderDate" >= t.touched
                AND o.status <> 'CANCELLED'::"ClientOrderStatus"
                AND o."paymentStatus" <> 'REFUNDED'::"ClientOrderPaymentStatus"
                AND (o."paymentStatus" = 'PAID'::"ClientOrderPaymentStatus" OR o.status = 'COMPLETED'::"ClientOrderStatus")
            ) converted
          ) AS customers
      `;
      const row = rows[0] ?? {};
      const n = (key: string) => Number(row[key] ?? 0) || 0;
      return {
        revenue: Math.round(n('revenue') * 100) / 100,
        customers: n('customers'),
        reached: n('reached'),
        campaignsSent: n('campaignsSent'),
      };
    } catch (err) {
      this.logger.warn(
        `Campaign performance unavailable: ${err instanceof Error ? err.message : err}`,
      );
      return empty;
    }
  }

}
