import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class RazorpayIntegrationService {
  constructor(private readonly integrations: IntegrationsService) {}

  async validateCredentials(keyId: string, keySecret: string): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      new Razorpay({ key_id: keyId, key_secret: keySecret });
      return { valid: true, accountName: 'Razorpay Account' };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getClient(tenantId: string): Promise<Razorpay | null> {
    const integration = await this.integrations.get(tenantId, 'RAZORPAY' as any);
    if (!integration || !integration.connected || !integration.token) return null;

    const raw = integration.token as any;
    const keyId = raw.apiKey;
    const keySecret = raw.apiSecret;
    if (!keyId || !keySecret) return null;

    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(tenantId: string, amount: number, currency: string = 'INR', receipt?: string) {
    const client = await this.getClient(tenantId);
    if (!client) throw new Error('Razorpay not connected');
    return client.orders.create({ amount: Math.round(amount * 100), currency, receipt });
  }

  async verifyPayment(orderId: string, paymentId: string, signature: string, keySecret: string): Promise<boolean> {
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
    return expected === signature;
  }
}
