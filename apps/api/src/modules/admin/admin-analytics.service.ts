import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { dateRangeFor, fillDays, labelForDate, dayKey, planMonthlyAmount } from './admin-util';

@Injectable()
export class AdminAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  async overview(range = '30d') {
    const { start, end } = dateRangeFor(range);
    const days = fillDays(start, end);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [tenants, users, subscriptions, customers, appointments, conversations] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { createdAt: { gte: start } },
        select: { id: true, createdAt: true, onboardingComplete: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: start } },
        select: { id: true, createdAt: true },
      }),
      this.prisma.subscription.findMany({ where: { status: 'ACTIVE' } }),
      this.prisma.customer.groupBy({ by: ['tenantId'] }),
      this.prisma.appointment.groupBy({ by: ['tenantId'] }),
      this.prisma.aiConversation.groupBy({ by: ['tenantId'] }),
    ]);

    const tenantMap = new Map(tenants.map((t) => [t.id, t]));
    const activeSet = new Set(subscriptions.map((s) => s.tenantId));
    const customerSet = new Set(customers.map((c) => c.tenantId));
    const apptSet = new Set(appointments.map((a) => a.tenantId));
    const aiSet = new Set(conversations.map((c) => c.tenantId));

    const acquisition = days.map((d) => {
      const key = dayKey(d);
      return {
        date: d.toISOString(),
        label: labelForDate(d, range),
        newUsers: users.filter((u) => dayKey(new Date(u.createdAt)) === key).length,
        newBusinesses: tenants.filter((t) => dayKey(new Date(t.createdAt)) === key).length,
        activeUsers: users.filter((u) => new Date(u.createdAt) <= d).length,
        activeBusinesses: tenants.filter((t) => activeSet.has(t.id) && new Date(t.createdAt) <= d).length,
      };
    });

    const totalTenants = await this.prisma.tenant.count();
    const onboardingCompleted = tenants.filter((t) => t.onboardingComplete).length;
    const activationRate =
      totalTenants > 0 ? Math.round((onboardingCompleted / totalTenants) * 1000) / 10 : 0;

    // Sources: derive from referral source + booking-link traffic (real data only).
    const sources: Array<{ source: string; count: number }> = [];
    const bookingLinkVisits = await this.prisma.bookingLinkVisit.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    if (bookingLinkVisits > 0) sources.push({ source: 'Booking Links', count: bookingLinkVisits });
    const referralVisits = await this.prisma.referralVisit.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });
    if (referralVisits > 0) sources.push({ source: 'Referrals', count: referralVisits });

    const mrr = subscriptions.reduce(
      (s, sub) => s + planMonthlyAmount(sub.plan),
      0,
    );
    const totalActive = subscriptions.length;
    const arpu = totalActive > 0 ? Math.round((mrr / totalActive) * 100) / 100 : 0;
    const ltv = arpu * 12 * 2; // heuristic: avg ARPU × 24 months (documented heuristic).

    const revenueByPlan: Record<string, number> = {};
    for (const s of subscriptions) {
      revenueByPlan[s.plan] = (revenueByPlan[s.plan] ?? 0) + planMonthlyAmount(s.plan);
    }

    const wau = customerSet.size + apptSet.size;
    const mau = new Set([...customerSet, ...apptSet, ...aiSet]).size;

    // Feature adoption (real usage evidence per business).
    const defs = [
      { key: 'customers', label: 'Customer Management', set: customerSet },
      { key: 'booking', label: 'Booking', set: apptSet },
      { key: 'ai', label: 'AI Assistant', set: aiSet },
    ];
    const productUsage = await Promise.all(
      defs.map(async (d) => {
        let active = d.set.size;
        if (d.key === 'loyalty') active = await this.prisma.loyaltyConfig.count();
        if (d.key === 'rewards') active = await this.prisma.reward.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'memberships') active = await this.prisma.membershipTier.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'campaigns') active = await this.prisma.campaign.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'websiteBuilder') active = await this.prisma.website.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'websiteConnection') active = await this.prisma.connectedWebsite.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'invoices') active = await this.prisma.invoice.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        if (d.key === 'analytics') active = await this.prisma.activity.groupBy({ by: ['tenantId'] }).then((r) => r.length);
        return {
          key: d.key,
          label: d.label,
          percentage: totalTenants > 0 ? Math.round((active / totalTenants) * 1000) / 10 : 0,
          activeBusinesses: active,
          totalBusinesses: totalTenants,
        };
      }),
    );

    const canceled30d = await this.prisma.subscription.count({
      where: { status: 'CANCELED', updatedAt: { gte: thirtyDaysAgo } },
    });
    const churnRate =
      totalActive + canceled30d > 0 ? Math.round((canceled30d / (totalActive + canceled30d)) * 1000) / 10 : 0;
    const businessRetentionRate =
      totalTenants > 0 ? Math.max(0, Math.round((1 - canceled30d / Math.max(totalTenants, 1)) * 1000) / 10) : 0;

    return {
      acquisition,
      newSignups: tenants.length,
      sources,
      activationRate,
      onboardingCompleted,
      activatedBusinesses: onboardingCompleted,
      retention: {
        activeBusinesses: totalActive,
        wau,
        mau,
        businessRetentionRate,
        churnRate,
      },
      revenue: { mrr, arr: mrr * 12, arpu, ltv, byPlan: revenueByPlan },
      productUsage,
    };
  }
}