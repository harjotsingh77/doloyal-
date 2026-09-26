import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class BookingAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics(tenantId: string, from?: string, to?: string) {
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const [totalBookings, revenue, topServices, topStaff, peakHours, sourceBreakdown] =
      await Promise.all([
        this.getTotalBookings(tenantId, fromDate, toDate),
        this.getRevenue(tenantId, fromDate, toDate),
        this.getTopServices(tenantId, fromDate, toDate, 5),
        this.getTopStaff(tenantId, fromDate, toDate, 5),
        this.getPeakHours(tenantId, fromDate, toDate),
        this.getSourceBreakdown(tenantId, fromDate, toDate),
      ]);

    return {
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
      totalBookings,
      revenue,
      topServices,
      topStaff,
      peakHours,
      sourceBreakdown,
      averageBookingsPerDay: totalBookings / Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / 86400000)),
    };
  }

  async getTotalBookings(tenantId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
      },
    });
  }

  async getRevenue(tenantId: string, from: Date, to: Date): Promise<number> {
    const agg = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
        status: 'PAID',
      },
      _sum: { total: true },
    });
    return agg._sum.total || 0;
  }

  async getTopServices(tenantId: string, from: Date, to: Date, limit: number) {
    const appointments = await this.prisma.appointment.groupBy({
      by: ['serviceName'],
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return appointments.map((a: any) => ({
      name: a.serviceName,
      count: a._count.id,
      revenue: 0,
    }));
  }

  async getTopStaff(tenantId: string, from: Date, to: Date, limit: number) {
    const staffAppointments = await this.prisma.appointment.groupBy({
      by: ['staffId'],
      where: {
        tenantId,
        staffId: { not: null },
        createdAt: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const staffIds = staffAppointments.map((s: any) => s.staffId).filter(Boolean);
    const staffMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const staff = await this.prisma.staff.findMany({
        where: { id: { in: staffIds as string[] } },
        select: { id: true, name: true },
      });
      for (const s of staff) {
        staffMap.set(s.id, s.name);
      }
    }

    return staffAppointments.map((s: any) => ({
      id: s.staffId,
      name: staffMap.get(s.staffId) || 'Unknown',
      count: s._count.id,
      revenue: 0,
    }));
  }

  async getPeakHours(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.$queryRaw<{ hour: number; count: number }[]>`
      SELECT EXTRACT(HOUR FROM "startTime")::int AS hour, COUNT(*)::int AS count
      FROM "Appointment"
      WHERE "tenantId" = ${tenantId}
        AND "startTime" >= ${from} AND "startTime" <= ${to}
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
      GROUP BY 1
      ORDER BY 1
    `;
    return rows.map((r) => ({ hour: Number(r.hour), count: Number(r.count) }));
  }

  async getSourceBreakdown(tenantId: string, from: Date, to: Date) {
    const rows = await this.prisma.appointment.groupBy({
      by: ['source'],
      where: { tenantId, createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    });
    return rows.map((r) => ({ source: r.source || 'DASHBOARD', count: r._count._all }));
  }
}
