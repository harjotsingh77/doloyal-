import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class StripeIntegrationService {
  private readonly logger = new Logger(StripeIntegrationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {}

  async validateCredentials(apiKey: string): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      const stripe = new Stripe(apiKey);
      const account = await stripe.accounts.retrieve('');
      return { valid: true, accountName: account.settings?.dashboard?.display_name || account.id || 'Stripe Account' };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getClient(tenantId: string, type: string): Promise<Stripe | null> {
    const integration = await this.integrations.get(tenantId, type as any);
    if (!integration || !integration.connected || !integration.token) return null;

    const raw = integration.token as any;
    const apiKey = raw.apiKey || this.config.get('STRIPE_SECRET_KEY');
    if (!apiKey) return null;

    return new Stripe(apiKey);
  }

  async createPaymentIntent(tenantId: string, amount: number, currency: string = 'usd', metadata?: Record<string, string>) {
    const stripe = await this.getClient(tenantId, 'STRIPE');
    if (!stripe) throw new Error('Stripe not connected');

    return stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: { enabled: true },
    });
  }

  async processRefund(tenantId: string, paymentIntentId: string, amount?: number) {
    const stripe = await this.getClient(tenantId, 'STRIPE');
    if (!stripe) throw new Error('Stripe not connected');

    return stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    });
  }

  async handleWebhookEvent(body: any, signature: string): Promise<{ received: boolean; type?: string }> {
    const endpointSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    if (!endpointSecret) {
      this.logger.warn('STRIPE_WEBHOOK_SECRET not configured, skipping webhook verification');
      return { received: true, type: body?.type };
    }

    const stripe = new Stripe(this.config.get('STRIPE_SECRET_KEY')!);
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret);
    return { received: true, type: event.type };
  }
}
