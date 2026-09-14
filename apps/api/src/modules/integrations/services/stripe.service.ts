import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class StripeIntegrationService {
  constructor(
    private readonly config: ConfigService,
    private readonly integrations: IntegrationsService,
  ) {}

  async validateCredentials(apiKey: string): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      const stripe = new Stripe(apiKey);
      await stripe.balance.retrieve();
      return { valid: true, accountName: 'Stripe Account' };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getClient(tenantId: string, _type: string): Promise<Stripe | null> {
    const secrets = await this.integrations.getConnectedProviderSecrets(tenantId, 'STRIPE');
    const apiKey = secrets?.token?.apiKey;
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

  /**
   * Verifies a platform-level Stripe webhook. Tenant booking webhooks are
   * verified in IntegrationsService against each tenant's signing secret.
   */
  constructVerifiedEvent(rawBody: Buffer | string, signature: string): Stripe.Event {
    const endpointSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!endpointSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }
    const stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') || 'sk_webhook_verify');
    return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  }

  async handleWebhookEvent(body: any, signature: string): Promise<{ received: boolean; type?: string }> {
    const event = this.constructVerifiedEvent(
      typeof body === 'string' ? body : JSON.stringify(body),
      signature,
    );
    return { received: true, type: event.type };
  }
}
