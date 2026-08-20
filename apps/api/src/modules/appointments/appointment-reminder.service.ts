import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { BookingNotificationsService } from '../booking-links/booking-notifications.service';

/**
 * Sends 24h appointment reminder emails for appointments starting tomorrow,
 * through each business's connected Resend account. Each appointment gets at
 * most one REMINDER_24H notification. Runs hourly, server-side only.
 */
@Injectable()
export class AppointmentReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AppointmentReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: BookingNotificationsService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 60 * 60 * 1000);
    setTimeout(() => void this.tick(), 30_000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const sent = await this.processDueReminders();
      if (sent > 0) this.logger.log(`Appointment reminders sent: ${sent}`);
    } catch (err: any) {
      this.logger.warn(`Appointment reminder tick failed: ${err?.message}`);
    } finally {
      this.running = false;
    }
  }

  /** Find appointments starting within the 24h window and email reminders. */
  async processDueReminders(): Promise<number> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in26h = new Date(now.getTime() + 26 * 60 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['BOOKED', 'CONFIRMED'] },
        startTime: { gte: in24h, lt: in26h },
      },
      include: { customer: true, tenant: true },
      take: 200,
    });

    let sent = 0;
    for (const appointment of appointments) {
      if (!appointment.customer?.email) continue;

      const existing = await this.prisma.notification.findFirst({
        where: { appointmentId: appointment.id, type: 'REMINDER_24H', status: 'SENT' },
      });
      if (existing) continue;

      try {
        await this.notifications.sendAppointmentEmail(
          appointment,
          'REMINDER_24H',
          'Appointment Reminder',
          this.reminderBody(appointment),
        );
        sent += 1;
      } catch (err: any) {
        this.logger.warn(`Reminder send failed (appointment=${appointment.id}): ${err?.message}`);
      }
    }
    return sent;
  }

  private reminderBody(appointment: any): string {
    const customerName = appointment.customer
      ? `${appointment.customer.firstName} ${appointment.customer.lastName}`.trim()
      : 'Valued Customer';
    const time = new Date(appointment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const service = appointment.serviceName || 'your service';
    return `Hi ${customerName},<br/><br/>Reminder: your appointment for <strong>${service}</strong> is tomorrow at <strong>${time}</strong>.<br/><br/>We look forward to seeing you!`;
  }
}