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
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: from, lte: to },
        status: 'PAID',
      },
      select: { total: true },
    });
    return invoices.reduce((sum, inv) => sum + inv.total, 0);
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
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { startTime: true },
    });

    const hourCounts = new Map<number, number>();
    for (const apt of appointments) {
      const hour = new Date(apt.startTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour - b.hour);
  }

  async getSourceBreakdown(tenantId: string, from: Date, to: Date) {
    const appointments = await this.prisma.appointment.findMany({
      where: { tenantId, createdAt: { gte: from, lte: to } },
      select: { source: true },
    });
    const map = new Map<string, number>();
    for (const a of appointments) {
      const s = a.source || 'DASHBOARD';
      map.set(s, (map.get(s) || 0) + 1);
    }
    return [...map.entries()].map(([source, count]) => ({ source, count }));
  }
}
