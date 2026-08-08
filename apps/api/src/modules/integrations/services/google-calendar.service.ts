import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class GoogleCalendarIntegrationService {
  private readonly logger = new Logger(GoogleCalendarIntegrationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {}

  async validateCredentials(accessToken: string): Promise<{ valid: boolean; calendars?: number; error?: string }> {
    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const err = await response.text();
        return { valid: false, error: err };
      }
      const data: any = await response.json();
      return { valid: true, calendars: data.items?.length || 0 };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async listCalendars(tenantId: string) {
    const integration = await this.integrations.get(tenantId, 'GOOGLE_CALENDAR' as any);
    if (!integration?.connected) throw new Error('Google Calendar not connected');

    const token = await this.integrations.getDecryptedToken(integration.id);
    if (!token?.accessToken) throw new Error('No access token');

    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.statusText}`);
    return response.json();
  }

  async listEvents(tenantId: string, calendarId: string = 'primary', timeMin?: string, timeMax?: string) {
    const integration = await this.integrations.get(tenantId, 'GOOGLE_CALENDAR' as any);
    if (!integration?.connected) throw new Error('Google Calendar not connected');

    const token = await this.integrations.getDecryptedToken(integration.id);
    if (!token?.accessToken) throw new Error('No access token');

    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`, {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.statusText}`);
    return response.json();
  }

  async createEvent(tenantId: string, calendarId: string, event: {
    summary: string; description?: string; start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string }; location?: string;
  }) {
    const integration = await this.integrations.get(tenantId, 'GOOGLE_CALENDAR' as any);
    if (!integration?.connected) throw new Error('Google Calendar not connected');

    const token = await this.integrations.getDecryptedToken(integration.id);
    if (!token?.accessToken) throw new Error('No access token');

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error(`Google Calendar API error: ${response.statusText}`);
    return response.json();
  }
}
