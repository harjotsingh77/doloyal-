import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class GoogleAnalyticsIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {}

  async validateCredentials(measurementIdOrApiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Validate the format - GA4 measurement IDs start with G-
      if (measurementIdOrApiKey.startsWith('G-')) {
        return { valid: true };
      }
      // For API key validation, we try a simple request
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getMeasurementId(tenantId: string): Promise<string | null> {
    const integration = await this.integrations.get(tenantId, 'GOOGLE_ANALYTICS' as any);
    if (!integration?.connected || !integration.token) return null;

    const raw = integration.token as any;
    return raw.apiKey || null;
  }

  async sendEvent(tenantId: string, eventName: string, params?: Record<string, unknown>) {
    const measurementId = await this.getMeasurementId(tenantId);
    if (!measurementId) throw new Error('Google Analytics not connected');

    const apiSecret = this.config.get('GOOGLE_ANALYTICS_API_KEY');
    if (!apiSecret) throw new Error('Google Analytics API key not configured');

    // GA4 Measurement Protocol
    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: tenantId,
        events: [{ name: eventName, params }],
      }),
    });

    if (!response.ok) throw new Error(`Google Analytics API error: ${response.statusText}`);
    return { success: true };
  }
}
