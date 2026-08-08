import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class AiSchedulingService {
  constructor(private readonly prisma: PrismaService) {}

  async suggestBestSlot(
    tenantId: string,
    serviceId: string,
    date: string,
    staffId?: string,
    customerId?: string,
  ) {
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, tenantId },
    });
    if (!service) {
      return { time: null, score: 0, reason: 'Service not found' };
    }

    const dateObj = new Date(date);
    const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const availability = await this.prisma.availabilityConfig.findUnique({
      where: { tenantId },
    });

    let businessHours = { start: '09:00', end: '18:00' };
    if (availability) {
      const dayConfig = (availability as any)[dayOfWeek];
      if (dayConfig && (dayConfig as any).isAvailable) {
        businessHours = {
          start: (dayConfig as any).start || '09:00',
          end: (dayConfig as any).end || '18:00',
        };
      } else if (dayConfig && !(dayConfig as any).isAvailable) {
        return { time: null, score: 0, reason: 'Business is closed on this day' };
      }
    }

    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(staffId ? { staffId } : {}),
      },
      select: { startTime: true, endTime: true },
    });

    const [startHour, startMin] = businessHours.start.split(':').map(Number);
    const [endHour, endMin] = businessHours.end.split(':').map(Number);
    const dayStart = new Date(dateObj);
    dayStart.setHours(startHour, startMin, 0, 0);
    const dayEnd = new Date(dateObj);
    dayEnd.setHours(endHour, endMin, 0, 0);

    const slotInterval = availability?.slotIntervalMinutes || 30;
    const now = new Date();

    let bestSlot: { time: Date; score: number; reason: string } | null = null;
    const current = new Date(dayStart);

    while (current < dayEnd) {
      const slotStart = new Date(current);
      const slotEnd = new Date(slotStart.getTime() + service.durationMinutes * 60000);

      if (slotEnd > dayEnd) break;
      if (slotStart <= now) {
        current.setMinutes(current.getMinutes() + slotInterval);
        continue;
      }

      const conflicting = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return slotStart < aptEnd && slotEnd > aptStart;
      });

      if (!conflicting) {
        let score = 70;
        const hour = slotStart.getHours();

        if (hour >= 10 && hour <= 11) score += 15;
        else if (hour >= 14 && hour <= 15) score += 10;
        else if (hour >= 16) score -= 10;

        const existingToday = existingAppointments.filter((apt) => {
          const h = new Date(apt.startTime).getHours();
          return h >= hour - 1 && h <= hour + 1;
        }).length;
        if (existingToday === 0) score += 5;

        const reasons: string[] = [];
        if (score >= 80) reasons.push('Prime morning slot');
        else if (score >= 70) reasons.push('Good availability');
        else reasons.push('Limited availability');

        if (!bestSlot || score > bestSlot.score) {
          bestSlot = { time: slotStart, score, reason: reasons[0] };
        }
      }

      current.setMinutes(current.getMinutes() + slotInterval);
    }

    if (!bestSlot) {
      return { time: null, score: 0, reason: 'No available slots found for the given date and staff' };
    }

    return {
      time: bestSlot.time.toISOString(),
      score: bestSlot.score,
      reason: bestSlot.reason,
    };
  }

  async detectConflicts(tenantId: string, date: string, staffId?: string) {
    const dateObj = new Date(date);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        ...(staffId ? { staffId } : {}),
      },
      include: { customer: true, staff: true },
      orderBy: { startTime: 'asc' },
    });

    const conflicts: any[] = [];
    for (let i = 0; i < appointments.length - 1; i++) {
      const current = appointments[i];
      const next = appointments[i + 1];

      if (current.staffId && current.staffId === next.staffId) {
        const currentEnd = new Date(current.endTime).getTime();
        const nextStart = new Date(next.startTime).getTime();
        const gapMinutes = (nextStart - currentEnd) / 60000;

        if (gapMinutes < 0) {
          conflicts.push({
            type: 'OVERLAP',
            severity: 'HIGH',
            description: `Appointment for ${current.customer?.firstName || 'Unknown'} overlaps with ${next.customer?.firstName || 'Unknown'}`,
            appointment1: { id: current.id, startTime: current.startTime, endTime: current.endTime },
            appointment2: { id: next.id, startTime: next.startTime, endTime: next.endTime },
            staffName: current.staff?.name || 'Unknown',
          });
        } else if (gapMinutes < 15 && gapMinutes >= 0) {
          conflicts.push({
            type: 'TIGHT_GAP',
            severity: 'MEDIUM',
            description: `Only ${Math.round(gapMinutes)} min gap between appointments for staff ${current.staff?.name || 'Unknown'}`,
            appointment1: { id: current.id, startTime: current.startTime, endTime: current.endTime },
            appointment2: { id: next.id, startTime: next.startTime, endTime: next.endTime },
            staffName: current.staff?.name || 'Unknown',
          });
        }
      }
    }

    const staffMap = new Map<string, number>();
    for (const apt of appointments) {
      if (apt.staffId) {
        staffMap.set(apt.staffId, (staffMap.get(apt.staffId) || 0) + 1);
      }
    }

    for (const [sid, count] of staffMap) {
      if (count > 8) {
        const staffMember = await this.prisma.staff.findUnique({ where: { id: sid } });
        conflicts.push({
          type: 'OVERBOOKED',
          severity: 'LOW',
          description: `Staff ${staffMember?.name || 'Unknown'} has ${count} appointments today`,
          staffName: staffMember?.name || 'Unknown',
          appointmentCount: count,
        });
      }
    }

    return { conflicts, totalAppointments: appointments.length };
  }

  async predictNoShow(tenantId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true },
    });
    if (!appointment) {
      return { probability: 0, factors: ['Appointment not found'] };
    }

    const factors: string[] = [];
    let probability = 15;

    const now = new Date();
    const daysSinceBooking = Math.floor(
      (now.getTime() - new Date(appointment.createdAt).getTime()) / 86400000,
    );
    if (daysSinceBooking > 7) {
      probability += 10;
      factors.push('Booked more than a week ago');
    }

    const appointmentHour = new Date(appointment.startTime).getHours();
    if (appointmentHour < 8 || appointmentHour > 20) {
      probability += 5;
      factors.push('Unusual time slot');
    }

    if (appointmentHour >= 6 && appointmentHour <= 9) {
      probability += 10;
      factors.push('Early morning slot');
    }

    const pastAppointments = await this.prisma.appointment.findMany({
      where: { customerId: appointment.customerId, tenantId, id: { not: appointmentId } },
      select: { status: true },
    });

    const totalPast = pastAppointments.length;
    const noShows = pastAppointments.filter((a) => a.status === 'NO_SHOW').length;

    if (totalPast > 0) {
      const noShowRate = noShows / totalPast;
      if (noShowRate > 0.3) {
        probability += 25;
        factors.push(`Customer has ${noShows} no-shows out of ${totalPast} past appointments`);
      } else if (noShowRate > 0.1) {
        probability += 10;
        factors.push('Customer has occasional no-shows');
      } else {
        probability -= 5;
        factors.push('Good attendance history');
      }
    } else {
      probability += 5;
      factors.push('New customer with no history');
    }

    if (appointment.notes?.toLowerCase().includes('reschedule') || appointment.notes?.toLowerCase().includes('rescheduled')) {
      probability += 10;
      factors.push('Previously rescheduled');
    }

    const customer = appointment.customer;
    if (customer) {
      if (!customer.email) {
        probability += 5;
        factors.push('No email on file');
      }
      if (!customer.lastVisitAt || daysSinceBooking > 60) {
        probability += 5;
        factors.push('Customer has not visited recently');
      }
    }

    probability = Math.min(Math.max(probability, 0), 95);

    return { probability, factors };
  }

  async optimizeSchedule(tenantId: string, date: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: {
          gte: new Date(`${date}T00:00:00`),
          lte: new Date(`${date}T23:59:59`),
        },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      include: { customer: true, staff: true },
      orderBy: { startTime: 'asc' },
    });

    const suggestions: any[] = [];

    const staffAppointments = new Map<string, typeof appointments>();
    for (const apt of appointments) {
      if (apt.staffId) {
        const list = staffAppointments.get(apt.staffId) || [];
        list.push(apt);
        staffAppointments.set(apt.staffId, list);
      }
    }

    for (const [staffId, apts] of staffAppointments) {
      const staff = apts[0].staff;
      const gaps: { start: Date; end: Date; minutes: number }[] = [];

      for (let i = 0; i < apts.length - 1; i++) {
        const gapStart = new Date(apts[i].endTime);
        const gapEnd = new Date(apts[i + 1].startTime);
        const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / 60000;

        if (gapMinutes >= 30) {
          gaps.push({ start: gapStart, end: gapEnd, minutes: gapMinutes });
        }
      }

      if (gaps.length > 0) {
        const longestGap = gaps.reduce((a, b) => (a.minutes > b.minutes ? a : b));
        suggestions.push({
          type: 'GAP_ALERT',
          staffId,
          staffName: staff?.name || 'Unknown',
          gapMinutes: longestGap.minutes,
          gapStart: longestGap.start.toISOString(),
          gapEnd: longestGap.end.toISOString(),
          suggestion: `Consider filling the ${longestGap.minutes}-min gap for ${staff?.name || 'Unknown'} at ${longestGap.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        });
      }

      if (apts.length > 8) {
        suggestions.push({
          type: 'WORKLOAD',
          staffId,
          staffName: staff?.name || 'Unknown',
          appointmentCount: apts.length,
          suggestion: `${staff?.name || 'Unknown'} has ${apts.length} appointments. Consider redistributing or adding buffer time.`,
        });
      }

      if (apts.length <= 3) {
        suggestions.push({
          type: 'UNDERUTILIZED',
          staffId,
          staffName: staff?.name || 'Unknown',
          appointmentCount: apts.length,
          suggestion: `${staff?.name || 'Unknown'} has only ${apts.length} appointments. Consider promoting available slots.`,
        });
      }
    }

    const busiestHour: Record<number, number> = {};
    for (const apt of appointments) {
      const hour = new Date(apt.startTime).getHours();
      busiestHour[hour] = (busiestHour[hour] || 0) + 1;
    }

    const peakHour = Object.entries(busiestHour).sort(([, a], [, b]) => b - a)[0];
    if (peakHour) {
      suggestions.push({
        type: 'PEAK_HOUR',
        hour: parseInt(peakHour[0]),
        appointmentCount: peakHour[1],
        suggestion: `Busiest hour is ${peakHour[0]}:00 with ${peakHour[1]} appointments. Consider staggering appointments or adding staff.`,
      });
    }

    return { suggestions, totalAppointments: appointments.length };
  }
}
