import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import {
  prismaCustomerToShared,
  prismaRewardToShared,
  prismaActivityToShared,
} from '../../common/helpers';

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
    let numDays = 30;
    let fromDate = new Date(now.getTime() - 30 * 86400000);
    let toDate = now;

    if (query?.from && query?.to) {
      fromDate = new Date(query.from);
      toDate = new Date(query.to);
      numDays = Math.max(
        1,
        Math.round((toDate.getTime() - fromDate.getTime()) / 86400000),
      );
    } else if (query?.days) {
      numDays = parseInt(query.days, 10) || 30;
      fromDate = new Date(now.getTime() - numDays * 86400000);
    }

    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const prevPeriodFrom = new Date(fromDate.getTime() - numDays * 86400000);

    const [
      periodInvoices,
      todayInvoices,
      todayCustomers,
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
      pendingClaims,
      membershipSales,
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
        where: { tenantId, createdAt: { gte: startOfDay } },
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
          createdAt: { gte: prevPeriodFrom, lt: fromDate },
          status: 'PAID',
        },
        _sum: { total: true },
      }),
      // Real pending review queue size (reward claims awaiting moderation).
      this.prisma.rewardEngagementClaim.count({
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
    ]);

    const periodRev = periodInvoices._sum.total || 0;
    const prevRev = prevPeriodRevenue._sum.total || 0;
    // null when there is no prior-period baseline — never invent growth.
    const monthlyGrowthPct =
      prevRev > 0 ? Math.round(((periodRev - prevRev) / prevRev) * 1000) / 10 : null;

    return {
      generatedAt: now.toISOString(),
      period: {
        from: fromDate.toISOString().slice(0, 10),
        to: toDate.toISOString().slice(0, 10),
      },
      kpis: {
        todayRevenue: todayInvoices._sum.total || 0,
        periodRevenue: Math.round(periodRev * 100) / 100,
        todayCustomers: periodCustomers || 0,
        repeatCustomers: repeatCustomers.length,
        newCustomers: periodCustomers,
        inactiveCustomers,
        activeRewards,
        pointsRedeemed30d: Math.abs(pointsRedeemed._sum.amount || 0),
        membershipSales30d: membershipSales,
        appointmentsToday,
        pendingReviews: typeof pendingClaims === 'number' ? pendingClaims : 0,
        monthlyGrowthPct,
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

    if (current.length === 0) return [];

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
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private async getRevenueTrend(
    tenantId: string,
    from: Date,
    to: Date,
    numDays: number,
  ) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to }, status: 'PAID' },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const stepDays = Math.max(1, Math.floor(numDays / 30));
    const dailyMap = new Map<string, number>();

    for (let i = 0; i <= numDays; i += stepDays) {
      const d = new Date(from.getTime() + i * 86400000);
      if (d <= to) {
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }
    }
    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) || 0) + inv.total);
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

    const stepDays = Math.max(1, Math.floor(numDays / 30));
    const dailyMap = new Map<string, number>();

    for (let i = 0; i <= numDays; i += stepDays) {
      const d = new Date(from.getTime() + i * 86400000);
      if (d <= to) {
        dailyMap.set(d.toISOString().slice(0, 10), 0);
      }
    }
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
}
