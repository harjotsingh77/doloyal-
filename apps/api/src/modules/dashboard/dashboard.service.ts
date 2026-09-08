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

    const [
      periodInvoices,
      todayInvoices,
      periodCustomers,
      repeatCustomers,
      inactiveCustomers,
      activeRewards,
      pointsRedeemed,
      appointmentsToday,
      revenueTrend,
      customerTrend,
      topCustomers,
      topRewards,
      topServices,
      recentActivity,
      prevPeriodRevenue,
      pendingReviewRows,
      membershipSales,
      outstandingPointsAgg,
      walletHolders,
      pointsIssued,
      campaignPerf,
      totalCustomers,
      periodOrders,
      prevPeriodOrders,
      todayOrders,
      reviewPending,
      reviewApproved,
      appointmentsInPeriod,
      prevTotalCustomers,
      prevPeriodCustomers,
      prevInactiveCustomers,
      prevPointsRedeemedAgg,
      prevAppointmentsInPeriod,
      prevMembershipSales,
      prevReviewApproved,
      prevRepeatInvoiceGroups,
    ] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: fromDate, lte: toDate },
          status: 'PAID',
        },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { tenantId, createdAt: { gte: startOfDay }, status: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: fromDate, lte: toDate } },
      }),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: {
          tenantId,
          createdAt: { gte: fromDate, lte: toDate },
          status: 'PAID',
        },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          lastVisitAt: { lt: fromDate, not: null },
          status: 'ACTIVE',
        },
      }),
      this.prisma.reward.count({
        where: { tenantId, status: 'ACTIVE' as any },
      }),
      this.prisma.pointsLedger.aggregate({
        where: {
          tenantId,
          createdAt: { gte: fromDate, lte: toDate },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
      this.prisma.appointment.count({
        where: {
          tenantId,
          startTime: {
            gte: startOfDay,
            lt: new Date(startOfDay.getTime() + 86400000),
          },
          status: { in: ['BOOKED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),
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
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          createdAt: { gte: prevPeriodFrom, lte: prevPeriodTo },
          status: 'PAID',
        },
        _sum: { total: true },
      }),
      // Real pending review queue size (reward claims awaiting moderation).
      this.prisma.review.count({
        where: { tenantId, status: 'PENDING' },
      }).catch(() => 0),
      // Membership sales = assignments created in the period (tier rows are
      // tenant-scoped via their members).
      (async () => {
        const memberships = await this.prisma.customerMembership.count({
          where: {
            assignedAt: { gte: fromDate, lte: toDate },
            customer: { tenantId },
          },
        }).catch(() => 0);
        return memberships;
      })(),
      this.prisma.customer.aggregate({
        where: { tenantId },
        _sum: { pointsBalance: true },
      }).catch(() => ({ _sum: { pointsBalance: 0 } })),
      this.prisma.customer.count({
        where: { tenantId, pointsBalance: { gt: 0 } },
      }).catch(() => 0),
      this.prisma.pointsLedger.aggregate({
        where: {
          tenantId,
          createdAt: { gte: fromDate, lte: toDate },
          amount: { gt: 0 },
        },
        _sum: { amount: true },
      }).catch(() => ({ _sum: { amount: 0 } })),
      this.getCampaignPerformance(tenantId, fromDate, toDate),
      this.prisma.customer.count({ where: { tenantId, createdAt: { lte: toDate } } }),
      this.prisma.clientOrder.findMany({
        where: { tenantId, orderDate: { gte: fromDate, lte: toDate } },
        select: { total: true, status: true, paymentStatus: true, customerId: true, createdAt: true, orderDate: true },
      }).catch(() => [] as { total: number; status: string; paymentStatus: string; customerId: string; createdAt: Date; orderDate: Date }[]),
      this.prisma.clientOrder.findMany({
        where: { tenantId, orderDate: { gte: prevPeriodFrom, lte: prevPeriodTo } },
        select: { total: true, status: true, paymentStatus: true, customerId: true },
      }).catch(() => [] as { total: number; status: string; paymentStatus: string; customerId: string }[]),
      this.prisma.clientOrder.findMany({
        where: { tenantId, orderDate: { gte: startOfDay } },
        select: { total: true, status: true, paymentStatus: true },
      }).catch(() => [] as { total: number; status: string; paymentStatus: string }[]),
      this.prisma.review.count({ where: { tenantId, status: 'PENDING' } }).catch(() => 0),
      this.prisma.review.aggregate({
        where: { tenantId, status: 'APPROVED', publishedAt: { gte: fromDate, lte: toDate } },
        _avg: { rating: true },
        _count: { _all: true },
      }).catch(() => ({ _avg: { rating: 0 }, _count: { _all: 0 } })),
      this.prisma.appointment.count({
        where: {
          tenantId,
          startTime: { gte: fromDate, lte: toDate },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { lte: prevPeriodTo } },
      }),
      this.prisma.customer.count({
        where: { tenantId, createdAt: { gte: prevPeriodFrom, lte: prevPeriodTo } },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          lastVisitAt: { lt: prevPeriodFrom, not: null },
          status: 'ACTIVE',
        },
      }),
      this.prisma.pointsLedger.aggregate({
        where: {
          tenantId,
          createdAt: { gte: prevPeriodFrom, lte: prevPeriodTo },
          amount: { lt: 0 },
        },
        _sum: { amount: true },
      }),
      this.prisma.appointment.count({
        where: {
          tenantId,
          startTime: { gte: prevPeriodFrom, lte: prevPeriodTo },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.customerMembership.count({
        where: {
          assignedAt: { gte: prevPeriodFrom, lte: prevPeriodTo },
          customer: { tenantId },
        },
      }).catch(() => 0),
      this.prisma.review.aggregate({
        where: { tenantId, status: 'APPROVED', publishedAt: { gte: prevPeriodFrom, lte: prevPeriodTo } },
        _avg: { rating: true },
        _count: { _all: true },
      }).catch(() => ({ _avg: { rating: 0 }, _count: { _all: 0 } })),
      this.prisma.invoice.groupBy({
        by: ['customerId'],
        where: {
          tenantId,
          createdAt: { gte: prevPeriodFrom, lte: prevPeriodTo },
          status: 'PAID',
        },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      }),
    ]);

    const orderRevenue = (rows: { total: number; status: string; paymentStatus: string }[]) =>
      rows
        .filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus))
        .reduce((sum, row) => sum + (row.total || 0), 0);

    const qualifyingPeriodOrders = Array.isArray(periodOrders)
      ? periodOrders.filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus))
      : [];
    const periodOrderRev = orderRevenue(Array.isArray(periodOrders) ? periodOrders : []);
    const prevOrderRev = orderRevenue(Array.isArray(prevPeriodOrders) ? prevPeriodOrders : []);
    const todayOrderRev = orderRevenue(Array.isArray(todayOrders) ? todayOrders : []);

    const periodRev = (periodInvoices._sum.total || 0) + periodOrderRev;
    const prevRev = (prevPeriodRevenue._sum.total || 0) + prevOrderRev;
    const issuedPts = pointsIssued._sum.amount || 0;
    const redeemedPts = Math.abs(pointsRedeemed._sum.amount || 0);
    const redemptionRatePct =
      issuedPts > 0
        ? Math.round((redeemedPts / issuedPts) * 1000) / 10
        : 0;
    const monthlyGrowthPct =
      prevRev > 0 ? Math.round(((periodRev - prevRev) / prevRev) * 1000) / 10 : null;

    const purchaseCounts = new Map<string, number>();
    for (const row of repeatCustomers) {
      purchaseCounts.set(row.customerId, (purchaseCounts.get(row.customerId) || 0) + row._count.id);
    }
    for (const row of qualifyingPeriodOrders) {
      purchaseCounts.set(row.customerId, (purchaseCounts.get(row.customerId) || 0) + 1);
    }
    const repeatCount = Array.from(purchaseCounts.values()).filter((n) => n >= 2).length;
    const prevPurchaseCounts = new Map<string, number>();
    for (const row of Array.isArray(prevRepeatInvoiceGroups) ? prevRepeatInvoiceGroups : []) {
      prevPurchaseCounts.set(row.customerId, (prevPurchaseCounts.get(row.customerId) || 0) + row._count.id);
    }
    const qualifyingPrevOrders = Array.isArray(prevPeriodOrders)
      ? prevPeriodOrders.filter((row) => orderCountsAsRevenue(row.status, row.paymentStatus))
      : [];
    for (const row of qualifyingPrevOrders) {
      if ('customerId' in row && row.customerId) {
        prevPurchaseCounts.set(row.customerId, (prevPurchaseCounts.get(row.customerId) || 0) + 1);
      }
    }
    const prevRepeatCount = Array.from(prevPurchaseCounts.values()).filter((n) => n >= 2).length;
    const pendingReviewCount = typeof reviewPending === 'number' ? reviewPending : (typeof pendingReviewRows === 'number' ? pendingReviewRows : 0);
    const approvedCount = reviewApproved?._count?._all || 0;
    const averageRating = approvedCount
      ? Math.round((reviewApproved._avg.rating || 0) * 10) / 10
      : 0;
    const prevApprovedCount = prevReviewApproved?._count?._all || 0;
    const prevAverageRating = prevApprovedCount
      ? Math.round((prevReviewApproved._avg.rating || 0) * 10) / 10
      : 0;
    const prevRedeemedPts = Math.abs(prevPointsRedeemedAgg?._sum?.amount || 0);

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
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to }, status: 'PAID' },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const orders = await this.prisma.clientOrder.findMany({
      where: { tenantId, orderDate: { gte: from, lte: to } },
      select: { total: true, orderDate: true, status: true, paymentStatus: true },
    }).catch(() => []);

    const dailyMap = new Map<string, number>();
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor.getTime() <= end.getTime()) {
      dailyMap.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    void _numDays;
    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + inv.total);
      }
    }
    for (const order of orders) {
      if (!orderCountsAsRevenue(order.status, order.paymentStatus)) continue;
      const key = order.orderDate.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + order.total);
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
    const customers = await this.prisma.customer.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

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
      const key = c.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
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
