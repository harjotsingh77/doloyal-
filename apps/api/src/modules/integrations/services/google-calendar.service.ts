import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma.service';
import { IntegrationsService } from '../integrations.service';

export interface AppointmentLike {
  id: string;
  tenantId: string;
  serviceName: string;
  startTime: Date | string;
  endTime: Date | string;
  notes?: string | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
}

@Injectable()
export class GoogleCalendarIntegrationService {
  private readonly logger = new Logger(GoogleCalendarIntegrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations: IntegrationsService,
  ) {}

  /** Connected integration for this tenant, if any. */
  private async getConnectedIntegration(tenantId: string) {
    const integration = await this.integrations.get(tenantId, 'GOOGLE_CALENDAR' as any);
    if (!integration?.connected) return null;
    return integration;
  }

  private calendarIdFor(integration: any): string {
    return (integration?.metadata as any)?.google_calendar_id || 'primary';
  }

  async listCalendars(tenantId: string) {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) throw new Error('Google Calendar not connected');

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
        throw new Error('Google Calendar access was revoked. Please reconnect.');
      }
      throw new Error(`Google Calendar API error: ${response.status}`);
    }
    return response.json();
  }

  async listEvents(tenantId: string, calendarId: string = 'primary', timeMin?: string, timeMax?: string) {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) throw new Error('Google Calendar not connected');

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      if (response.status === 401) {
        await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
        throw new Error('Google Calendar access was revoked. Please reconnect.');
      }
      throw new Error(`Google Calendar API error: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Create or update the Google Calendar event for an appointment. Idempotent —
   * the Google event ID is stored on the CalendarEvent row so reschedules update
   * the same event instead of creating duplicates.
   */
  async syncAppointmentToCalendar(tenantId: string, appointment: AppointmentLike) {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) return { skipped: true, reason: 'not_connected' };

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const calendarId = this.calendarIdFor(integration);

    const start = new Date(appointment.startTime).toISOString();
    const end = new Date(appointment.endTime).toISOString();
    const customerName = appointment.customer
      ? `${appointment.customer.firstName || ''} ${appointment.customer.lastName || ''}`.trim()
      : '';
    const description = [appointment.notes, customerName ? `Customer: ${customerName}` : null, appointment.customer?.phone ? `Phone: ${appointment.customer.phone}` : null]
      .filter(Boolean)
      .join('\n') || undefined;

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { tenantId, appointmentId: appointment.id, provider: 'GOOGLE', status: 'ACTIVE' },
    });

    const eventBody = {
      summary: appointment.serviceName,
      description,
      start: { dateTime: start },
      end: { dateTime: end },
    };

    // Existing Google event → update it (no duplicate).
    if (existing?.externalId) {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.externalId)}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(eventBody),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 401) {
          await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
          throw new Error('Google Calendar access was revoked. Please reconnect.');
        }
        this.logger.warn(`Google event update failed (${res.status}): ${text}`);
        throw new Error('Failed to update the Google Calendar event.');
      }
      await this.prisma.calendarEvent.update({
        where: { id: existing.id },
        data: { title: appointment.serviceName, startTime: new Date(appointment.startTime), endTime: new Date(appointment.endTime), lastSyncedAt: new Date() },
      });
      return { updated: true, eventId: existing.externalId };
    }

    // No event yet → create one.
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventBody),
    });
    const data = await res.json() as any;
    if (!res.ok) {
      const text = res.status === 500 ? JSON.stringify(data) : '';
      if (res.status === 401) {
        await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
        throw new Error('Google Calendar access was revoked. Please reconnect.');
      }
      this.logger.warn(`Google event create failed (${res.status}): ${data?.error?.message || text}`);
      throw new Error('Failed to create the Google Calendar event.');
    }

    await this.prisma.calendarEvent.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        provider: 'GOOGLE',
        externalId: data.id,
        title: appointment.serviceName,
        startTime: new Date(appointment.startTime),
        endTime: new Date(appointment.endTime),
        status: 'ACTIVE',
      },
    });
    return { created: true, eventId: data.id };
  }

  /** Cancel/delete the Google event for a cancelled appointment. */
  async cancelAppointmentEvent(tenantId: string, appointment: AppointmentLike) {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) return { skipped: true, reason: 'not_connected' };

    const existing = await this.prisma.calendarEvent.findFirst({
      where: { tenantId, appointmentId: appointment.id, provider: 'GOOGLE', status: 'ACTIVE' },
    });
    if (!existing?.externalId) return { skipped: true, reason: 'no_event' };

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const calendarId = this.calendarIdFor(integration);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.externalId)}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (res.status === 401) {
      await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
      throw new Error('Google Calendar access was revoked. Please reconnect.');
    }
    // 410 = event already gone; treat as success.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      throw new Error('Failed to cancel the Google Calendar event.');
    }
    await this.prisma.calendarEvent.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED', lastSyncedAt: new Date() },
    });
    return { cancelled: true, eventId: existing.externalId };
  }

  /**
   * Busy periods from the tenant's configured Google Calendar for [timeMin, timeMax].
   * Returns an empty array when Google Calendar is not connected or unavailable.
   */
  async getBusyPeriods(tenantId: string, timeMin: Date, timeMax: Date): Promise<Array<{ start: Date; end: Date }>> {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) return [];

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const calendarId = this.calendarIdFor(integration);
    const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'UTC',
        items: [{ id: calendarId }],
      }),
    });
    if (!res.ok) {
      if (res.status === 401) {
        await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
        throw new Error('Google Calendar access was revoked. Please reconnect.');
      }
      throw new Error(`Google Calendar free/busy failed: ${res.status}`);
    }
    const data = await res.json() as any;
    const busy = data.calendars?.[calendarId]?.busy || [];
    return busy.map((b: any) => ({ start: new Date(b.start), end: new Date(b.end) }));
  }

  /** True when the configured Google Calendar is busy during [start, end]. */
  async isTimeSlotBusy(tenantId: string, start: Date, end: Date): Promise<boolean> {
    const busy = await this.getBusyPeriods(tenantId, start, end);
    return busy.some((b) => start < b.end && end > b.start);
  }

  /** Real connection test: validates the stored token against the Google API. */
  async testConnection(tenantId: string) {
    const integration = await this.getConnectedIntegration(tenantId);
    if (!integration) throw new Error('Google Calendar not connected');

    const accessToken = await this.integrations.getValidAccessToken(integration.id);
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        await this.integrations.markExpired(integration.id, 'Google Calendar access was revoked. Please reconnect.');
        throw new Error('Google Calendar access was revoked. Please reconnect.');
      }
      throw new Error(`Google Calendar API error: ${res.status}`);
    }
    return { success: true, message: 'Connection successful' };
  }
}
