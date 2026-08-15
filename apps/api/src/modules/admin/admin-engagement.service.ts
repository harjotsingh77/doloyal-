import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AdminAuditService } from '../../common/admin-audit.service';
import { paginate } from './admin-util';

@Injectable()
export class AdminEngagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
  ) {}

  // ─── Customers ────────────────────────────────────────────────────────────

  async listCustomers(query: {
    search?: string;
    businessId?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const search = query.search?.trim() || undefined;
    const where: Record<string, unknown> = {};
    if (query.businessId && query.businessId !== 'ALL') where.tenantId = query.businessId;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: { select: { id: true, name: true } },
          memberships: { include: { tier: { select: { name: true } } } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = customers.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      businessName: c.tenant.name,
      businessId: c.tenant.id,
      totalVisits: c.totalVisits,
      totalSpent: c.totalSpent,
      pointsBalance: c.pointsBalance,
      membershipTier: c.memberships[0]?.tier?.name ?? null,
      lastVisitAt: c.lastVisitAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  // ─── Bookings ─────────────────────────────────────────────────────────────

  async bookingsOverview() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [today, upcoming, completed, canceled, noShows, total] = await Promise.all([
      this.prisma.appointment.count({
        where: { startTime: { gte: todayStart }, status: { notIn: ['CANCELLED', 'NO_SHOW'] } },
      }),
      this.prisma.appointment.count({ where: { startTime: { gte: now }, status: { notIn: ['CANCELLED', 'NO_SHOW', 'COMPLETED'] } } }),
      this.prisma.appointment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.appointment.count({ where: { status: 'CANCELLED' } }),
      this.prisma.appointment.count({ where: { status: 'NO_SHOW' } }),
      this.prisma.appointment.count(),
    ]);
    return { today, upcoming, completed, canceled, noShows, total };
  }

  async listBookings(query: {
    status?: string;
    businessId?: string;
    date?: string;
    page?: string;
    pageSize?: string;
  }) {
    const { page, pageSize } = paginate(query.page, query.pageSize);
    const where: Record<string, unknown> = {};
    if (query.status && query.status !== 'ALL') where.status = query.status;
    if (query.businessId && query.businessId !== 'ALL') where.tenantId = query.businessId;
    if (query.date) {
      const start = new Date(query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);
      where.startTime = { gte: start, lte: end };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          tenant: { select: { name: true } },
          customer: { select: { firstName: true, lastName: true } },
          staff: { select: { name: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    const items = appointments.map((a) => ({
      id: a.id,
      businessName: a.tenant.name,
      customerName: a.customer ? `${a.customer.firstName} ${a.customer.lastName ?? ''}`.trim() : null,
      serviceName: a.serviceName,
      staffName: a.staff?.name ?? null,
      startTime: a.startTime.toISOString(),
      status: a.status,
      source: a.source,
      paymentStatus: a.paymentStatus,
    }));
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  // ─── Loyalty ──────────────────────────────────────────────────────────────

  async loyaltyOverview() {
    const [issued, redeemed, rewards, redemptions, activePrograms] = await Promise.all([
      this.prisma.pointsLedger.aggregate({
        _sum: { amount: true },
        where: { reason: { in: ['EARN', 'BONUS', 'SIGNUP', 'REFERRAL'] } },
      }),
      this.prisma.pointsLedger.aggregate({
        _sum: { amount: true },
        where: { reason: { in: ['REDEEM', 'ADJUST'] } },
      }),
      this.prisma.reward.count(),
      this.prisma.rewardRedemption.count(),
      this.prisma.loyaltyConfig.count(),
    ]);
    const totalBusinesses = await this.prisma.tenant.count();
    return {
      pointsIssued: issued._sum.amount ?? 0,
      pointsRedeemed: Math.abs(redeemed._sum.amount ?? 0),
      rewardsCreated: rewards,
      rewardsRedeemed: redemptions,
      activePrograms,
      totalBusinesses,
    };
  }

  async rewardsOverview() {
    const [mostUsed, totalRedemptions, rewards30d, expired30d, rewardsTotal] = await Promise.all([
      this.prisma.reward.findMany({
        orderBy: { redeemedCount: 'desc' },
        take: 10,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.rewardRedemption.count(),
      this.prisma.reward.count({ where: { createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      this.prisma.reward.count({
        where: { expiresAt: { lt: new Date(), gt: new Date(Date.now() - 30 * 86400000) } },
      }),
      this.prisma.reward.count(),
    ]);
    const redemptionRate =
      rewardsTotal > 0 ? Math.round((totalRedemptions / rewardsTotal) * 100) : 0;
    return {
      mostUsed: mostUsed.map((r) => ({
        name: r.name,
        businessName: r.tenant.name,
        redeemedCount: r.redeemedCount,
      })),
      redemptionRate,
      created30d: rewards30d,
      expired30d,
      totalRedemptions,
    };
  }

  async membershipsOverview() {
    const [active, new30d, canceled30d, byBusiness] = await Promise.all([
      this.prisma.customerMembership.count(),
      this.prisma.customerMembership.count({
        where: { assignedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      this.prisma.membershipTier.count({
        where: { updatedAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      }),
      this.prisma.membershipTier.findMany({
        include: {
          tenant: { select: { name: true } },
          _count: { select: { memberships: true } },
        },
      }),
    ]);
    const byBusinessMap: Record<string, { count: number; revenue: number }> = {};
    for (const t of byBusiness) {
      const key = t.tenant.name;
      byBusinessMap[key] = byBusinessMap[key] ?? { count: 0, revenue: 0 };
      byBusinessMap[key].count += t._count.memberships;
      byBusinessMap[key].revenue += t.price;
    }
    const membershipRevenue = byBusiness.reduce((s, t) => s + t.price, 0);
    return {
      activeMemberships: active,
      newMemberships30d: new30d,
      canceledMemberships30d: canceled30d,
      membershipRevenue,
      byBusiness: Object.entries(byBusinessMap)
        .map(([businessName, v]) => ({ businessName, count: v.count, revenue: v.revenue }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  // ─── Campaigns / messaging ────────────────────────────────────────────────

  async campaignsOverview() {
    const [campaigns, notifications, failedNotif] = await Promise.all([
      this.prisma.campaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: { tenant: { select: { name: true } } },
      }),
      this.prisma.notification.count({ where: { status: 'FAILED' } }),
    ]);

    const emailSent = notifications.filter((n) => n.channel === 'EMAIL' && n.status === 'SENT').length;
    const smsSent = notifications.filter((n) => n.channel === 'SMS' && n.status === 'SENT').length;
    const whatsappSent = notifications.filter((n) => n.channel === 'WHATSAPP' && n.status === 'SENT').length;
    const totalSent = emailSent + smsSent + whatsappSent;
    const delivered = notifications.filter((n) => n.status === 'SENT').length;
    const deliveryRate = notifications.length > 0 ? Math.round((delivered / notifications.length) * 1000) / 10 : 0;

    const byBusinessMap: Record<string, { sent: number; failed: number }> = {};
    for (const n of notifications) {
      const key = n.tenant.name;
      byBusinessMap[key] = byBusinessMap[key] ?? { sent: 0, failed: 0 };
      if (n.status === 'SENT') byBusinessMap[key].sent++;
      if (n.status === 'FAILED') byBusinessMap[key].failed++;
    }

    return {
      totalSent30d: totalSent,
      emailSent,
      smsSent,
      whatsappSent,
      deliveryRate,
      failed30d: failedNotif,
      byBusiness: Object.entries(byBusinessMap)
        .map(([businessName, v]) => ({ businessName, sent: v.sent, failed: v.failed }))
        .sort((a, b) => b.sent - a.sent),
      providerFailures: [],
    };
  }
}