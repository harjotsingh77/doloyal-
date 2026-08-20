import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { prismaAppointmentToShared } from '../../common/helpers';
import { ReferralsService } from '../referrals/referrals.service';
import { WorkflowEngineService } from '../workflows/workflow-engine.service';
import { GoogleCalendarIntegrationService } from '../integrations/services/google-calendar.service';
import { BookingNotificationsService } from '../booking-links/booking-notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrals: ReferralsService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly googleCalendar: GoogleCalendarIntegrationService,
    private readonly bookingNotifications: BookingNotificationsService,
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

    // Push the appointment to the tenant's Google Calendar when connected.
    try {
      await this.googleCalendar.syncAppointmentToCalendar(tenantId, appointment);
    } catch {
      // Calendar sync must never block the booking flow.
    }

    // Booking confirmation email through the business's Resend connection.
    try {
      await this.bookingNotifications.sendAppointmentEmail(
        appointment,
        'BOOKING_CONFIRMATION',
        'Booking Confirmed',
        this.defaultEmailBody(appointment, 'BOOKING_CONFIRMATION'),
      );
    } catch {
      // Email delivery must never block the booking flow.
    }

    return prismaAppointmentToShared(appointment);
  }

  async updateStatus(tenantId: string, id: string, status: string, reschedule?: { startTime?: string; endTime?: string }) {
    const appointment = await this.prisma.appointment.findFirst({ where: { id, tenantId } });
    if (!appointment) throw new NotFoundException('Appointment not found');

    const wasRescheduled =
      !!reschedule?.startTime &&
      new Date(reschedule.startTime).getTime() !== new Date(appointment.startTime).getTime();

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: status as any,
        ...(reschedule?.startTime ? { startTime: new Date(reschedule.startTime) } : {}),
        ...(reschedule?.endTime ? { endTime: new Date(reschedule.endTime) } : {}),
      },
      include: { customer: true, staff: true, tenant: true },
    });

    if (wasRescheduled) {
      try {
        await this.bookingNotifications.sendAppointmentEmail(
          updated,
          'RESCHEDULED',
          'Appointment Updated',
          this.defaultEmailBody(updated, 'RESCHEDULED'),
        );
      } catch {
        // non-blocking
      }
    }

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

    // Cancel the corresponding Google Calendar event on cancellation.
    if (status === 'CANCELLED' || status === 'NO_SHOW') {
      try {
        await this.googleCalendar.cancelAppointmentEvent(tenantId, updated);
      } catch {
        // Calendar sync must never block status updates.
      }
    }

    // Status-driven emails through the business's Resend connection.
    try {
      if (status === 'CANCELLED') {
        await this.bookingNotifications.sendAppointmentEmail(
          updated,
          'CANCELLED',
          'Appointment Cancelled',
          this.defaultEmailBody(updated, 'CANCELLED'),
        );
      } else if (status === 'COMPLETED') {
        await this.bookingNotifications.sendAppointmentEmail(
          updated,
          'THANK_YOU',
          'Thank You',
          this.defaultEmailBody(updated, 'THANK_YOU'),
        );
      }
    } catch {
      // Email delivery must never block status updates.
    }

    return prismaAppointmentToShared(updated);
  }

  /** Render a simple HTML email body from a notification template or fallback. */
  private defaultEmailBody(appointment: any, type: string): string {
    const customerName = appointment.customer
      ? `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim()
      : 'Valued Customer';
    const date = new Date(appointment.startTime).toLocaleDateString();
    const time = new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const service = appointment.serviceName || 'your service';

    const lines: Record<string, string> = {
      BOOKING_CONFIRMATION: `Hi ${customerName},<br/><br/>Your appointment for <strong>${service}</strong> on <strong>${date} at ${time}</strong> is confirmed!<br/><br/>See you soon.`,
      REMINDER_24H: `Hi ${customerName},<br/><br/>Reminder: your appointment for <strong>${service}</strong> is tomorrow at <strong>${time}</strong>.<br/><br/>We look forward to seeing you!`,
      REMINDER_2H: `Hi ${customerName},<br/><br/>Friendly reminder: your appointment for <strong>${service}</strong> starts in 2 hours at <strong>${time}</strong>.`,
      RESCHEDULED: `Hi ${customerName},<br/><br/>Your appointment for <strong>${service}</strong> has been moved to <strong>${date} at ${time}</strong>.<br/><br/>See you then!`,
      CANCELLED: `Hi ${customerName},<br/><br/>Your appointment for <strong>${service}</strong> on <strong>${date}</strong> has been cancelled.<br/><br/>Feel free to book a new time whenever you're ready.`,
      THANK_YOU: `Hi ${customerName},<br/><br/>Thank you for visiting us today! We hope you enjoyed your <strong>${service}</strong>.<br/><br/>We look forward to seeing you again.`,
    };

    return lines[type] || `Hi ${customerName},<br/><br/>Notification regarding your appointment for ${service}.`;
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
