import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { getPlan } from '@doloyal/shared';
import {
  dateRangeFor,
  fillDays,
  labelForDate,
  dayKey,
  planMonthlyAmount,
  planLabel,
  realTenantWhere,
  realUserWhere,
  isRecognizedPaidSubscription,
} from './admin-util';

interface TenantWithSub {
  id: string;
  name: string;
  createdAt: Date;
  subscription: {
    plan: string;
    status: string;
    trialEndsAt?: Date | null;
    createdAt: Date;
    stripeSubId?: string | null;
    stripeId?: string | null;
    paymentMethod?: string | null;
  } | null;
  contractPrice?: number;
  contractCycle?: string;
}

@Injectable()
export class AdminDashboardService {
  private readonly logger = new Logger(AdminDashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview(range = '30d') {
    return this.buildOverview(range);
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  private async soft<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Admin overview widget "${label}" failed: ${message}`);
      return fallback;
    }
  }

  private async buildOverview(range = '30d') {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const ninetyAgo = new Date(now.getTime() - 90 * 86400000);

    const realTenant = realTenantWhere();
    const [
      totalBusinesses,
      newSignups30d,
      supportOpen,
      websiteRequestsOpen,
      totalUsers,
      totalCustomers,
      totalBookings,
      integrationErrors24h,
      canceled30d,
      activeSubRows,
      trialSubRows,
      contracts,
      recentTenants,
    ] = await Promise.all([
      this.prisma.tenant.count({ where: realTenant }),
      this.prisma.tenant.count({ where: realTenantWhere({ createdAt: { gte: thirtyDaysAgo } }) }),
      this.prisma.supportTicket.count({
        where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] }, tenant: realTenant },
      }),
      this.prisma.websiteProject.count({
        where: { status: { notIn: ['COMPLETED', 'PUBLISHED'] }, tenant: realTenant },
      }),
      this.prisma.user.count({ where: realUserWhere({ isAdmin: false }) }),
      this.prisma.customer.count({ where: { tenant: realTenant } }),
      this.prisma.appointment.count({ where: { tenant: realTenant } }),
      this.prisma.syncLog.count({
        where: { status: 'FAILED', resolvedAt: null, startedAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.count({
        where: {
          status: 'CANCELED',
          updatedAt: { gte: thirtyDaysAgo },
          tenant: realTenant,
        },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE', tenant: realTenant },
        take: 5_000,
        select: {
          plan: true,
          tenantId: true,
          status: true,
          trialEndsAt: true,
          createdAt: true,
          stripeSubId: true,
          stripeId: true,
          paymentMethod: true,
        },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenant: realTenant,
          OR: [{ status: 'TRIALING' }, { trialEndsAt: { gt: now } }],
        },
        take: 5_000,
        select: {
          plan: true,
          tenantId: true,
          status: true,
          trialEndsAt: true,
          createdAt: true,
          stripeSubId: true,
          stripeId: true,
          paymentMethod: true,
        },
      }),
      this.prisma.enterpriseContract.findMany({
        where: { tenant: realTenant },
        select: { tenantId: true, contractPrice: true, billingCycle: true },
      }),
      this.prisma.tenant.findMany({
        where: realTenantWhere({ createdAt: { gte: ninetyAgo } }),
        take: 500,
        select: {
          id: true,
          name: true,
          createdAt: true,
          subscriptions: {
            select: {
              plan: true,
              status: true,
              trialEndsAt: true,
              createdAt: true,
              stripeSubId: true,
              stripeId: true,
              paymentMethod: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
    ]);

    const contractMap = new Map(
      contracts.map((c) => [c.tenantId, { price: c.contractPrice, cycle: c.billingCycle }]),
    );

    const withSub: TenantWithSub[] = activeSubRows.map((s) => {
      const contract = contractMap.get(s.tenantId);
      return {
        id: s.tenantId,
        name: '',
        createdAt: s.createdAt,
        subscription: s,
        contractPrice: contract?.price,
        contractCycle: contract?.cycle,
      };
    });

    const activeSubs = withSub;
    const trialSubs = trialSubRows.filter(
      (s) => s.status === 'TRIALING' || (s.trialEndsAt && s.trialEndsAt > now),
    );
    const paidSubs = activeSubs.filter((t) =>
      isRecognizedPaidSubscription(t.subscription!, t.contractPrice, t.contractCycle),
    );

    const mrr = paidSubs.reduce(
      (sum, t) => sum + planMonthlyAmount(t.subscription!.plan, t.contractPrice, t.contractCycle),
      0,
    );

    const convertedCount = recentTenants.filter((t) => {
      const sub = t.subscriptions[0];
      const contract = contractMap.get(t.id);
      return sub ? isRecognizedPaidSubscription(sub, contract?.price, contract?.cycle) : false;
    }).length;
    const trialToPaidRate =
      recentTenants.length > 0
        ? Math.round((convertedCount / recentTenants.length) * 1000) / 10
        : 0;

    const churnBase = activeSubs.length + canceled30d;
    const churnRate30d = churnBase > 0 ? Math.round((canceled30d / churnBase) * 1000) / 10 : 0;

    const emptyTrial = {
      trialUsers: trialSubs.length,
      trialsStarted30d: 0,
      trialsExpiring7d: 0,
      trialsConverted30d: 0,
      conversionRate: 0,
      averageTrialDurationDays: 0,
      alerts: [] as string[],
    };
    const emptyChurn = {
      churnRate: churnRate30d,
      canceled30d,
      downgrades30d: 0,
      paymentFailures30d: 0,
      atRiskAccounts: 0,
    };

    const emptyWidgets = {
      activeDelta: null as number | null,
      signupsDelta: null as number | null,
      paidDelta: null as number | null,
      trialDelta: null as number | null,
      mrrDeltaVal: null as number | null,
      revenueTrend: [] as Awaited<ReturnType<AdminDashboardService['revenueTrend']>>,
      growth: [] as Awaited<ReturnType<AdminDashboardService['growth']>>,
      activationRate: 0,
      trial: emptyTrial,
      churn: emptyChurn,
      insights: [] as Awaited<ReturnType<AdminDashboardService['aiInsights']>>,
      recentActivity: [] as Awaited<ReturnType<AdminDashboardService['recentActivity']>>,
      recentSignups: [] as Awaited<ReturnType<AdminDashboardService['recentSignups']>>,
      recentPayments: [] as Awaited<ReturnType<AdminDashboardService['recentPayments']>>,
      recentTickets: [] as Awaited<ReturnType<AdminDashboardService['recentTickets']>>,
      recentWebsiteRequests: [] as Awaited<ReturnType<AdminDashboardService['recentWebsiteRequests']>>,
      alerts: [] as Awaited<ReturnType<AdminDashboardService['systemAlerts']>>,
      featureAdoption: [] as Awaited<ReturnType<AdminDashboardService['featureAdoption']>>,
    };

    let widgets = emptyWidgets;
    try {
      const loaded = await this.withTimeout(
        Promise.all([
          this.soft('activeDelta', () => this.monthDelta('tenant', 'active'), null),
          this.soft('signupsDelta', () => this.monthDelta('tenant', 'signups'), null),
          this.soft('paidDelta', () => this.monthDelta('tenant', 'paid'), null),
          this.soft('trialDelta', () => this.monthDelta('tenant', 'trial'), null),
          this.soft('mrrDelta', () => this.mrrDelta(), null),
          this.soft('revenueTrend', () => this.revenueTrend(range, activeSubRows, contracts), []),
          this.soft('growth', () => this.growth(range), []),
          this.soft('activationRate', () => this.activationRate(), 0),
          this.soft('trial', () => this.trialAnalytics(thirtyDaysAgo, now), emptyTrial),
          this.soft('churn', () => this.churnAnalytics(thirtyDaysAgo, now, canceled30d, churnRate30d), emptyChurn),
          this.soft('insights', async () => [], []),
          this.soft('recentActivity', () => this.recentActivity(30), []),
          this.soft('recentSignups', () => this.recentSignups(), []),
          this.soft('recentPayments', () => this.recentPayments(), []),
          this.soft('recentTickets', () => this.recentTickets(), []),
          this.soft('recentWebsiteRequests', () => this.recentWebsiteRequests(), []),
          this.soft('alerts', () => this.systemAlerts(thirtyDaysAgo, now), []),
          this.soft('featureAdoption', async () => [], []),
        ]),
        2_500,
      );
      widgets = {
        activeDelta: loaded[0],
        signupsDelta: loaded[1],
        paidDelta: loaded[2],
        trialDelta: loaded[3],
        mrrDeltaVal: loaded[4],
        revenueTrend: loaded[5],
        growth: loaded[6],
        activationRate: loaded[7],
        trial: loaded[8],
        churn: loaded[9],
        insights: loaded[10],
        recentActivity: loaded[11],
        recentSignups: loaded[12],
        recentPayments: loaded[13],
        recentTickets: loaded[14],
        recentWebsiteRequests: loaded[15],
        alerts: loaded[16],
        featureAdoption: loaded[17],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Admin overview widgets timed out; returning core KPIs: ${message}`);
    }

    const {
      activeDelta,
      signupsDelta,
      paidDelta,
      trialDelta,
      mrrDeltaVal,
      revenueTrend,
      growth,
      activationRate,
      trial,
      churn,
      insights,
      recentActivity,
      recentSignups,
      recentPayments,
      recentTickets,
      recentWebsiteRequests,
      alerts,
      featureAdoption,
    } = widgets;

    const totals = {
      totalBusinesses,
      activeBusinesses: activeSubs.length,
      newSignups30d,
      paidBusinesses: paidSubs.length,
      mrr,
      arr: mrr * 12,
      trialUsers: trialSubs.length,
      paidUsers: paidSubs.length,
      trialToPaidRate,
      churnRate30d,
      openSupportTickets: supportOpen,
      websiteRequests: websiteRequestsOpen,
      totalUsers,
      totalCustomers,
      totalBookings,
      integrationErrors24h,
    };

    const kpis = {
      totalBusinesses: { value: totalBusinesses, delta: null },
      activeBusinesses: { value: activeSubs.length, delta: activeDelta },
      newSignups: { value: newSignups30d, delta: signupsDelta },
      paidBusinesses: { value: paidSubs.length, delta: paidDelta },
      mrr: { value: mrr, delta: mrrDeltaVal },
      arr: { value: mrr * 12, delta: null },
      trialUsers: { value: trialSubs.length, delta: trialDelta },
      paidUsers: { value: paidSubs.length, delta: null },
      trialToPaidRate: { value: trialToPaidRate, delta: null, prefix: '%' },
      churnRate: { value: churnRate30d, delta: null, prefix: '%' },
      openTickets: { value: supportOpen, delta: null },
      websiteRequests: { value: websiteRequestsOpen, delta: null },
      totalUsers: { value: totalUsers, delta: null },
      totalCustomers: { value: totalCustomers, delta: null },
      totalBookings: { value: totalBookings, delta: null },
      integrationErrors: { value: integrationErrors24h, delta: null },
    };

    return {
      totals,
      kpis,
      revenueTrend,
      revenueSeries: {
        range,
        totalRevenue: revenueTrend.reduce((s, p) => s + p.revenue, 0),
        mrr,
        arr: mrr * 12,
        refunds: revenueTrend.reduce((s, p) => s + p.refunds, 0),
        netRevenue: revenueTrend.reduce((s, p) => s + p.revenue - p.refunds, 0),
        byPlan: this.revenueByPlan(withSub),
      },
      growth,
      activationRate,
      trial,
      churn,
      insights,
      recentActivity,
      recentSignups,
      recentPayments,
      recentTickets,
      recentWebsiteRequests,
      alerts,
      featureAdoption,
    };
  }

  private revenueByPlan(withSub: TenantWithSub[]): Record<string, number> {
    const by: Record<string, number> = {};
    for (const t of withSub) {
      if (t.subscription?.status !== 'ACTIVE') continue;
      if (!isRecognizedPaidSubscription(t.subscription, t.contractPrice, t.contractCycle)) continue;
      const amount = planMonthlyAmount(t.subscription.plan, t.contractPrice, t.contractCycle);
      by[t.subscription.plan] = (by[t.subscription.plan] ?? 0) + amount;
    }
    return by;
  }

  private async revenueTrend(
    range: string,
    subscriptions: any[],
    contracts: any[],
  ) {
    const { start, end } = dateRangeFor(range);
    const contractMap = new Map(contracts.map((c) => [c.tenantId, c]));
    const days = fillDays(start, end);

    // Real payment events in window (subscription payments recognized).
    const events = await this.prisma.subscriptionEvent.findMany({
      where: {
        tenant: realTenantWhere(),
        type: { in: ['PAYMENT_SUCCEEDED', 'PAYMENT_FAILED'] },
        createdAt: { gte: start, lte: end },
      },
      select: { type: true, amount: true, createdAt: true, metadata: true },
      take: 10_000,
    });

    // Admin-issued refunds (recorded in audit log with amount).
    const refunds = await this.prisma.adminAuditLog.findMany({
      where: { action: 'billing.refund', createdAt: { gte: start, lte: end } },
      select: { createdAt: true, metadata: true },
      take: 5_000,
    });

    const eventByDay = new Map<string, { revenue: number; refunds: number }>();
    for (const ev of events) {
      const key = dayKey(new Date(ev.createdAt));
      const cur = eventByDay.get(key) ?? { revenue: 0, refunds: 0 };
      const amount = ev.amount ?? 0;
      if (ev.type === 'PAYMENT_SUCCEEDED') cur.revenue += amount;
      else if ((ev.metadata as any)?.refunded === true) cur.refunds += amount;
      eventByDay.set(key, cur);
    }
    for (const r of refunds) {
      const meta = (r.metadata as any) || {};
      const key = dayKey(new Date(r.createdAt));
      const cur = eventByDay.get(key) ?? { revenue: 0, refunds: 0 };
      cur.refunds += Number(meta.amount ?? 0);
      eventByDay.set(key, cur);
    }

    // Do not recognize list-price on subscription creation — that painted
    // unpaid default Growth plans as revenue. Revenue is payment events only.

    const byPlanByDay = new Map<string, Record<string, number>>();
    for (const sub of subscriptions) {
      if (!isRecognizedPaidSubscription(sub, contractMap.get(sub.tenantId)?.contractPrice, contractMap.get(sub.tenantId)?.billingCycle)) {
        continue;
      }
      const price = planMonthlyAmount(
        sub.plan,
        contractMap.get(sub.tenantId)?.contractPrice,
        contractMap.get(sub.tenantId)?.billingCycle,
      );
      const key = dayKey(new Date(sub.createdAt));
      const cur = byPlanByDay.get(key) ?? {};
      cur[sub.plan] = (cur[sub.plan] ?? 0) + price;
      byPlanByDay.set(key, cur);
    }

    const mrrTotal = subscriptions
      .filter((s) =>
        isRecognizedPaidSubscription(
          s,
          contractMap.get(s.tenantId)?.contractPrice,
          contractMap.get(s.tenantId)?.billingCycle,
        ),
      )
      .reduce(
        (sum, s) =>
          sum +
          planMonthlyAmount(
            s.plan,
            contractMap.get(s.tenantId)?.contractPrice,
            contractMap.get(s.tenantId)?.billingCycle,
          ),
        0,
      );
    const arrTotal = mrrTotal * 12;

    return days.map((d) => {
      const key = dayKey(d);
      const ev = eventByDay.get(key) ?? { revenue: 0, refunds: 0 };
      const byPlan = byPlanByDay.get(key) ?? {};
      return {
        date: d.toISOString(),
        label: labelForDate(d, range),
        revenue: Math.round(ev.revenue),
        mrr: Math.round(mrrTotal),
        arr: Math.round(arrTotal),
        refunds: Math.round(ev.refunds),
        netRevenue: Math.round(ev.revenue - ev.refunds),
        starter: Math.round(byPlan.starter ?? 0),
        growth: Math.round(byPlan.growth ?? 0),
        professional: Math.round(byPlan.professional ?? 0),
        enterprise: Math.round(byPlan.enterprise ?? 0),
      };
    });
  }

  private async growth(range: string) {
    const { start, end } = dateRangeFor(range);
    const days = fillDays(start, end);

    const tenants = await this.prisma.tenant.findMany({
      where: realTenantWhere({ createdAt: { gte: start } }),
      select: { id: true, createdAt: true },
      take: 10_000,
    });
    const users = await this.prisma.user.findMany({
      where: realUserWhere({ createdAt: { gte: start } }),
      select: { id: true, createdAt: true },
      take: 10_000,
    });
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', tenant: realTenantWhere() },
      select: { tenantId: true, createdAt: true, plan: true, status: true, stripeSubId: true, stripeId: true, paymentMethod: true },
      take: 5_000,
    });
    const activeTenantSet = new Set(subs.map((s) => s.tenantId));

    return days.map((d) => {
      const key = dayKey(d);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);
      const newUsers = users.filter((u) => dayKey(new Date(u.createdAt)) === key).length;
      const newBusinesses = tenants.filter((t) => dayKey(new Date(t.createdAt)) === key).length;
      const activeUsers = users.filter((u) => new Date(u.createdAt) <= endOfDay).length;
      const activeBusinesses = tenants.filter(
        (t) => activeTenantSet.has(t.id) && new Date(t.createdAt) <= endOfDay,
      ).length;
      return {
        date: d.toISOString(),
        label: labelForDate(d, range),
        newUsers,
        newBusinesses,
        activeUsers,
        activeBusinesses,
      };
    });
  }

  private async activationRate() {
    const [total, complete] = await Promise.all([
      this.prisma.tenant.count({ where: realTenantWhere() }),
      this.prisma.tenant.count({ where: realTenantWhere({ onboardingComplete: true }) }),
    ]);
    return total > 0 ? Math.round((complete / total) * 1000) / 10 : 0;
  }

  private async trialAnalytics(thirtyDaysAgo: Date, now: Date) {
    const [trialsStarted, trialSubs, trialsExpiring] = await Promise.all([
      this.prisma.subscription.count({
        where: {
          tenant: realTenantWhere(),
          createdAt: { gte: thirtyDaysAgo },
          OR: [{ status: 'TRIALING' }, { status: 'ACTIVE' }],
        },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenant: realTenantWhere(),
          OR: [
            { status: 'TRIALING' },
            { trialEndsAt: { gt: now }, status: 'ACTIVE' },
          ],
        },
      }),
      this.prisma.subscription.findMany({
        where: {
          tenant: realTenantWhere(),
          trialEndsAt: { gt: now, lt: new Date(now.getTime() + 3 * 86400000) },
        },
      }),
    ]);

    const trialsExpiring7d = trialSubs.filter((s) => {
      const end = s.trialEndsAt ? new Date(s.trialEndsAt) : null;
      return end && end <= new Date(now.getTime() + 7 * 86400000);
    }).length;

    const converted30d = await this.prisma.subscription.count({
      where: {
        tenant: realTenantWhere(),
        status: 'ACTIVE',
        stripeSubId: { not: null },
        updatedAt: { gte: thirtyDaysAgo },
      },
    });
    const conversionRate =
      trialsStarted > 0 ? Math.round((converted30d / trialsStarted) * 1000) / 10 : 0;

    // Average trial duration from subscription events or creation → activation.
    const trialEvents = await this.prisma.subscriptionEvent.findMany({
      where: { type: 'TRIAL_STARTED', createdAt: { gte: thirtyDaysAgo } },
      take: 50,
    });
    const averageTrialDurationDays =
      trialEvents.length > 0
        ? Math.round(
            trialEvents.reduce((s, e) => {
              const sub = trialSubs.find((t) => t.tenantId === e.tenantId);
              if (!sub?.trialEndsAt) return s;
              const days =
                (new Date(sub.trialEndsAt).getTime() - new Date(e.createdAt).getTime()) /
                86400000;
              return s + days;
            }, 0) /
              trialEvents.length /
              1,
          )
        : 0;

    const alerts: string[] = [];
    if (trialsExpiring7d > 0)
      alerts.push(`${trialsExpiring7d} trials expire in the next 7 days.`);
    if (trialsExpiring.length > 0)
      alerts.push(`${trialsExpiring.length} trials expire in the next 3 days.`);

    return {
      trialUsers: trialSubs.length,
      trialsStarted30d: trialsStarted,
      trialsExpiring7d,
      trialsConverted30d: converted30d,
      conversionRate,
      averageTrialDurationDays,
      alerts,
    };
  }

  private async churnAnalytics(
    thirtyDaysAgo: Date,
    _now: Date,
    canceled30d: number,
    churnRate: number,
  ) {
    const [downgrades30d, paymentFailures30d, canceledSubs] = await Promise.all([
      this.prisma.subscriptionEvent.count({
        where: { type: 'PLAN_CHANGED', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscriptionEvent.count({
        where: { type: 'PAYMENT_FAILED', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.findMany({
        where: { status: 'CANCELED', updatedAt: { gte: thirtyDaysAgo } },
        select: { tenantId: true },
      }),
    ]);

    const atRisk = await this.prisma.customer.aggregate({
      _count: { _all: true },
      where: { status: 'AT_RISK' },
    });

    return {
      churnRate,
      canceled30d,
      downgrades30d,
      paymentFailures30d,
      atRiskAccounts: canceledSubs.length + (atRisk._count._all || 0),
    };
  }

  private async aiInsights(thirtyDaysAgo: Date, now: Date, openTickets: number) {
    const insights: Array<{
      id: string;
      title: string;
      description: string;
      metric: string;
      direction: 'up' | 'down' | 'flat';
      severity: 'info' | 'positive' | 'warning';
      link?: string;
    }> = [];

    const [growthConverted, nearLimit, payFailures, websiteRequestsUp, billingTickets, expiringTrials] =
      await Promise.all([
        this.prisma.subscriptionEvent.findMany({
          where: {
            type: 'PLAN_CHANGED',
            createdAt: { gte: thirtyDaysAgo },
            plan: 'growth',
          },
        }),
        this.subscriptionsNearCustomerLimit(),
        this.prisma.subscriptionEvent.count({
          where: { type: 'PAYMENT_FAILED', createdAt: { gte: thirtyDaysAgo } },
        }),
        this.websiteRequestDelta(),
        this.prisma.supportTicket.count({
          where: {
            category: 'Billing & Payments',
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
          },
        }),
        this.prisma.subscription.count({
          where: { trialEndsAt: { gt: now, lt: new Date(now.getTime() + 7 * 86400000) } },
        }),
      ]);

    if (growthConverted.length > 0) {
      insights.push({
        id: 'growth-conversions',
        title: 'Growth plan conversions increased',
        description: `${growthConverted.length} business${growthConverted.length > 1 ? 'es' : ''} upgraded to Growth this period.`,
        metric: `${growthConverted.length}`,
        direction: 'up',
        severity: 'positive',
        link: '/admin/subscriptions',
      });
    }

    if (nearLimit.length > 0) {
      insights.push({
        id: 'customer-limits',
        title: `${nearLimit.length} business${nearLimit.length > 1 ? 'es are' : ' is'} approaching customer limits`,
        description: 'These businesses may need an upgrade or increased limits soon.',
        metric: `${nearLimit.length}`,
        direction: 'flat',
        severity: 'warning',
        link: '/admin/businesses',
      });
    }

    if (payFailures > 0) {
      insights.push({
        id: 'payment-failures',
        title: `${payFailures} payment failure${payFailures > 1 ? 's' : ''} this month`,
        description: 'Failed payments can cascade into churn. Review affected accounts.',
        metric: `${payFailures}`,
        direction: 'down',
        severity: 'warning',
        link: '/admin/billing',
      });
    }

    if (websiteRequestsUp !== null && websiteRequestsUp > 0) {
      insights.push({
        id: 'website-requests',
        title: `Website requests up ${websiteRequestsUp}% this week`,
        description: 'The Doloyal Team website service is in demand — check capacity.',
        metric: `+${websiteRequestsUp}%`,
        direction: 'up',
        severity: 'info',
        link: '/admin/website-requests',
      });
    }

    if (billingTickets > 0) {
      insights.push({
        id: 'billing-tickets',
        title: `${billingTickets} open billing support ticket${billingTickets > 1 ? 's' : ''}`,
        description: 'Billing-related support is elevated. Review common pain points.',
        metric: `${billingTickets}`,
        direction: 'flat',
        severity: 'warning',
        link: '/admin/support',
      });
    }

    if (expiringTrials > 0) {
      insights.push({
        id: 'expiring-trials',
        title: `${expiringTrials} trial${expiringTrials > 1 ? 's' : ''} expiring within 7 days`,
        description: 'Reach out before these trials lapse to improve conversion.',
        metric: `${expiringTrials}`,
        direction: 'flat',
        severity: 'info',
        link: '/admin/subscriptions',
      });
    }

    if (openTickets > 0) {
      insights.push({
        id: 'open-tickets',
        title: `${openTickets} open support tickets`,
        description: 'Keep an eye on response time to maintain customer satisfaction.',
        metric: `${openTickets}`,
        direction: 'flat',
        severity: 'info',
        link: '/admin/support',
      });
    }

    return insights;
  }

  private async subscriptionsNearCustomerLimit() {
    const subs = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', plan: { not: 'enterprise' } },
    });
    const out: string[] = [];
    for (const sub of subs) {
      const limit = getPlan(sub.plan)?.limits?.customers ?? -1;
      if (limit < 0) continue;
      const count = await this.prisma.customer.count({ where: { tenantId: sub.tenantId } });
      if (count >= limit * 0.9) out.push(sub.tenantId);
      if (out.length >= 10) break;
    }
    return out;
  }

  private async websiteRequestDelta() {
    const now = new Date();
    const thisWeek = await this.prisma.websiteProject.count({
      where: { createdAt: { gte: new Date(now.getTime() - 7 * 86400000) } },
    });
    const prevWeek = await this.prisma.websiteProject.count({
      where: {
        createdAt: {
          gte: new Date(now.getTime() - 14 * 86400000),
          lt: new Date(now.getTime() - 7 * 86400000),
        },
      },
    });
    if (thisWeek === 0 && prevWeek === 0) return null;
    if (prevWeek === 0) return null;
    return Math.round(((thisWeek - prevWeek) / prevWeek) * 100);
  }

  private async recentActivity(limit: number) {
    const [events, refunds, tenants, projects] = await Promise.all([
      this.prisma.subscriptionEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.adminAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        where: { action: 'billing.refund' },
      }),
      this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.websiteProject.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { tenant: { select: { name: true } } },
      }),
    ]);

    const items: Array<{
      id: string;
      type: string;
      message: string;
      target?: string;
      createdAt: string;
    }> = [];

    for (const ev of events) {
      let msg = `Billing event: ${ev.type.replace(/_/g, ' ').toLowerCase()}`;
      if (ev.type === 'PAYMENT_SUCCEEDED')
        msg = `Payment succeeded for ${ev.tenant?.name ?? 'a business'}`;
      if (ev.type === 'PAYMENT_FAILED')
        msg = `Payment failed for ${ev.tenant?.name ?? 'a business'}`;
      if (ev.type === 'SUBSCRIPTION_CANCELED')
        msg = `${ev.tenant?.name ?? 'A business'} canceled their subscription`;
      if (ev.type === 'PLAN_CHANGED')
        msg = `${ev.tenant?.name ?? 'A business'} ${ev.plan ? `changed plan to ${planLabel(ev.plan)}` : 'changed plan'}`;
      items.push({
        id: `ev-${ev.id}`,
        type: ev.type,
        message: msg,
        target: ev.tenant?.name,
        createdAt: ev.createdAt.toISOString(),
      });
    }
    for (const r of refunds) {
      items.push({
        id: `rf-${r.id}`,
        type: 'REFUND',
        message: `Refund issued to ${r.targetName ?? 'a business'}`,
        target: r.targetName ?? undefined,
        createdAt: r.createdAt.toISOString(),
      });
    }
    for (const t of tenants) {
      items.push({
        id: `tn-${t.id}`,
        type: 'BUSINESS_SIGNUP',
        message: `New business signed up: ${t.name}`,
        target: t.name,
        createdAt: t.createdAt.toISOString(),
      });
    }
    for (const p of projects) {
      items.push({
        id: `pr-${p.id}`,
        type: 'WEBSITE_REQUEST',
        message: `Website request received for ${p.tenant?.name ?? p.name}`,
        target: p.tenant?.name,
        createdAt: p.createdAt.toISOString(),
      });
    }

    return items.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
  }

  private async recentSignups() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      where: realTenantWhere(),
      select: {
        id: true,
        name: true,
        createdAt: true,
        subscriptions: { select: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.name,
      plan: t.subscriptions[0]?.plan ?? 'free',
      createdAt: t.createdAt.toISOString(),
    }));
  }

  private async recentPayments() {
    const events = await this.prisma.subscriptionEvent.findMany({
      where: { type: 'PAYMENT_SUCCEEDED', tenant: realTenantWhere() },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { tenant: { select: { name: true } } },
    });
    return events.map((e) => ({
      id: e.id,
      businessName: e.tenant?.name ?? 'Unknown',
      amount: e.amount ?? 0,
      currency: e.currency ?? 'INR',
      status: 'PAID',
      createdAt: e.createdAt.toISOString(),
    }));
  }

  private async recentTickets() {
    const tickets = await this.prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        ticketNumber: true,
        subject: true,
        status: true,
        priority: true,
        updatedAt: true,
        tenant: { select: { name: true } },
      },
    });
    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      businessName: t.tenant?.name,
      status: t.status,
      priority: t.priority,
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  private async recentWebsiteRequests() {
    const projects = await this.prisma.websiteProject.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        updatedAt: true,
        tenant: { select: { name: true } },
      },
    });
    return projects.map((p) => ({
      id: p.id,
      name: p.name,
      businessName: p.tenant?.name ?? 'Unknown',
      status: p.status,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  private async systemAlerts(thirtyDaysAgo: Date, now: Date) {
    const alerts: Array<{
      id: string;
      severity: 'info' | 'warning' | 'danger';
      title: string;
      message: string;
      link?: string;
    }> = [];

    const [failedPayments, failedIntegrations, aiErrors, expiringTrials] = await Promise.all([
      this.prisma.subscriptionEvent.count({
        where: { type: 'PAYMENT_FAILED', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.integration.count({
        where: { status: 'ERROR' },
      }),
      this.prisma.systemLog.count({
        where: { service: 'AI', severity: { in: ['ERROR', 'CRITICAL'] }, createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.subscription.count({
        where: { trialEndsAt: { gt: now, lt: new Date(now.getTime() + 3 * 86400000) } },
      }),
    ]);

    if (failedPayments > 0)
      alerts.push({
        id: 'pay-fail',
        severity: 'warning',
        title: `${failedPayments} payment failures`,
        message: 'Some subscription payments failed recently. Review billing.',
        link: '/admin/billing',
      });
    if (failedIntegrations > 0)
      alerts.push({
        id: 'int-err',
        severity: 'warning',
        title: `${failedIntegrations} integrations in error`,
        message: 'Integration credentials may be invalid or providers unavailable.',
        link: '/admin/integrations',
      });
    if (aiErrors > 0)
      alerts.push({
        id: 'ai-err',
        severity: 'danger',
        title: `${aiErrors} AI errors`,
        message: 'The AI service has been failing. Check provider status.',
        link: '/admin/logs',
      });
    if (expiringTrials > 0)
      alerts.push({
        id: 'trial-exp',
        severity: 'info',
        title: `${expiringTrials} trials expiring`,
        message: 'Trials ending soon — consider a conversion outreach.',
        link: '/admin/subscriptions',
      });
    if (alerts.length === 0)
      alerts.push({
        id: 'all-clear',
        severity: 'info',
        title: 'All systems nominal',
        message: 'No platform alerts right now.',
      });

    return alerts;
  }

  private async featureAdoption() {
    const totalBusinesses = await this.prisma.tenant.count();
    if (totalBusinesses === 0) return [];

    const defs = [
      { key: 'customers', label: 'Customer Management' },
      { key: 'booking', label: 'Booking' },
      { key: 'loyalty', label: 'Loyalty' },
      { key: 'rewards', label: 'Rewards' },
      { key: 'memberships', label: 'Memberships' },
      { key: 'campaigns', label: 'Campaigns' },
      { key: 'ai', label: 'AI Assistant' },
      { key: 'analytics', label: 'Analytics' },
      { key: 'websiteBuilder', label: 'Website Builder' },
      { key: 'websiteConnection', label: 'Website Connection' },
      { key: 'invoices', label: 'Invoices' },
    ];

    const results = await Promise.all(
      defs.map(async (d) => {
        let active = 0;
        switch (d.key) {
          case 'customers':
            active = await this.prisma.customer.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'booking':
            active = await this.prisma.appointment.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'loyalty':
            active = await this.prisma.loyaltyConfig.count();
            break;
          case 'rewards':
            active = await this.prisma.reward.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'memberships':
            active = await this.prisma.membershipTier.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'campaigns':
            active = await this.prisma.campaign.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'ai':
            active = await this.prisma.aiConversation.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'analytics':
            active = await this.prisma.activity.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'websiteBuilder':
            active = await this.prisma.website.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'websiteConnection':
            active = await this.prisma.connectedWebsite.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
          case 'invoices':
            active = await this.prisma.invoice.groupBy({ by: ['tenantId'] }).then((r) => r.length);
            break;
        }
        return {
          key: d.key,
          label: d.label,
          percentage: Math.round((active / totalBusinesses) * 1000) / 10,
          activeBusinesses: active,
          totalBusinesses,
        };
      }),
    );
    return results;
  }

  private async monthDelta(_kind: 'tenant', metric: 'active' | 'signups' | 'paid' | 'trial') {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const prevAgo = new Date(now.getTime() - 60 * 86400000);

    const windowStats = async (from: Date, to: Date) => {
      if (metric === 'signups') {
        return this.prisma.tenant.count({ where: realTenantWhere({ createdAt: { gte: from, lt: to } }) });
      }
      const tenants = await this.prisma.tenant.findMany({
        where: realTenantWhere({ createdAt: { gte: from, lt: to } }),
        select: {
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true, plan: true, trialEndsAt: true, stripeSubId: true, stripeId: true, paymentMethod: true },
          },
        },
      });
      let n = 0;
      for (const t of tenants) {
        const sub = t.subscriptions[0];
        if (!sub) continue;
        if (metric === 'active' && sub.status === 'ACTIVE') n++;
        if (metric === 'paid' && isRecognizedPaidSubscription(sub)) n++;
        if (
          metric === 'trial' &&
          (sub.status === 'TRIALING' || (sub.trialEndsAt && sub.trialEndsAt > now))
        ) {
          n++;
        }
      }
      return n;
    };

    const [current, prev] = await Promise.all([
      windowStats(monthAgo, now),
      windowStats(prevAgo, monthAgo),
    ]);
    if (prev === 0) return null;
    return Math.round(((current - prev) / prev) * 1000) / 10;
  }

  private async mrrDelta() {
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400000);
    const subsNow = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', tenant: realTenantWhere() },
    });
    const subsPrev = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', createdAt: { lt: monthAgo }, tenant: realTenantWhere() },
    });
    const mrrNow = subsNow.filter((x) => isRecognizedPaidSubscription(x)).reduce((s, x) => s + planMonthlyAmount(x.plan), 0);
    const mrrPrev = subsPrev.filter((x) => isRecognizedPaidSubscription(x)).reduce((s, x) => s + planMonthlyAmount(x.plan), 0);
    if (mrrPrev === 0) return null;
    return Math.round(((mrrNow - mrrPrev) / mrrPrev) * 1000) / 10;
  }
}