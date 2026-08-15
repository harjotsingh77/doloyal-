import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaAppointmentToShared } from '../../common/helpers';
import { ReferralsService } from '../referrals/referrals.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
    private readonly workflowEngine: WorkflowEngineService,
  ) {}

  async list(tenantId: string, query: { status?: string; from?: string; to?: string }) {
    const where: any = { tenantId };
    if (query.status) where.status = query.status;
    if (query.from || query.to) {
      where.startTime = {};
      if (query.from) where.startTime.gte = new Date(query.from);
      if (query.to) where.startTime.lte = new Date(query.to);
    }
    const appointments = await this.prisma.appointment.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: { customer: true, staff: true },
      take: 100,
    });
    return appointments.map(prismaAppointmentToShared);
  }

  async create(tenantId: string, data: {
    customerId: string;
    staffId?: string;
    serviceName: string;
    startTime: string;
    endTime: string;
    notes?: string;
  }) {
    const appointment = await this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: data.customerId,
        staffId: data.staffId,
        serviceName: data.serviceName,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        notes: data.notes,
        status: 'BOOKED',
      },
      include: { customer: true, staff: true },
    });

    try {
      await this.referrals.onFriendAppointmentBooked(
        tenantId,
        data.customerId,
        appointment.id,
        0,
      );
    } catch {
      // Referral automation must not block booking
    }

    try {
      await this.workflowEngine.handleEvent(tenantId, 'appointment_booked', {
        customerId: data.customerId,
        appointmentId: appointment.id,
        serviceName: data.serviceName,
        appointmentStatus: 'BOOKED',
      });
    } catch {
      // Workflows must never block booking
    }

    return prismaAppointmentToShared(appointment);
  }

  async updateStatus(tenantId: string, id: string, status: string) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');
    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: status as any },
      include: { customer: true, staff: true },
    });

    if (status === 'COMPLETED' || status === 'CANCELLED') {
      try {
        if (status === 'COMPLETED') {
          await this.referrals.onFriendConverted(tenantId, appointment.customerId, {
            appointmentId: appointment.id,
            bookingValue: 0,
          });
        } else if (status === 'CANCELLED') {
          const open = await this.prisma.referralConversion.findFirst({
            where: {
              tenantId,
              friendId: appointment.customerId,
              appointmentId: appointment.id,
              status: { in: ['BOOKED', 'SIGNED_UP'] },
            },
          });
          if (open) {
            await this.prisma.referralConversion.update({
              where: { id: open.id },
              data: { status: 'REJECTED', rejectReason: 'CANCELLED_APPOINTMENT' },
            });
          }
        }
      } catch {
        // non-blocking
      }
    }

    try {
      const eventMap: Record<string, string> = {
        COMPLETED: 'appointment_completed',
        CANCELLED: 'appointment_canceled',
        NO_SHOW: 'appointment_no_show',
        CONFIRMED: 'appointment_confirmed',
      };
      const eventType = eventMap[status];
      if (eventType) {
        await this.workflowEngine.handleEvent(tenantId, eventType, {
          customerId: appointment.customerId,
          appointmentId: appointment.id,
          serviceName: appointment.serviceName,
          appointmentStatus: status,
        });
      }
    } catch {
      // Workflows must never block status updates
    }

    return prismaAppointmentToShared(updated);
  }

  async getToday(tenantId: string) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 86400000);
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        startTime: { gte: startOfDay, lt: endOfDay },
      },
      orderBy: { startTime: 'asc' },
      include: { customer: true, staff: true },
    });
    return appointments.map(prismaAppointmentToShared);
  }
}
