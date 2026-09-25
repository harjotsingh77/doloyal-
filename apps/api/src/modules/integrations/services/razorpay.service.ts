import { Injectable } from '@nestjs/common';
import Razorpay from 'razorpay';
import { IntegrationsService } from '../integrations.service';

@Injectable()
export class RazorpayIntegrationService {
  constructor(private readonly integrations: IntegrationsService) {}

  async validateCredentials(keyId: string, keySecret: string): Promise<{ valid: boolean; accountName?: string; error?: string }> {
    try {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const res = await fetch('https://api.razorpay.com/v1/orders?count=1', {
        headers: { Authorization: `Basic ${auth}` },
      });
      if (!res.ok) {
        const body: any = await res.json().catch(() => null);
        return { valid: false, error: body?.error?.description || `Razorpay rejected the keys (${res.status})` };
      }
      return { valid: true, accountName: 'Razorpay Account' };
    } catch (err: any) {
      return { valid: false, error: err.message };
    }
  }

  async getClient(tenantId: string): Promise<Razorpay | null> {
    const secrets = await this.integrations.getConnectedProviderSecrets(tenantId, 'RAZORPAY');
    const keyId = secrets?.token?.apiKey;
    const keySecret = secrets?.token?.apiSecret;
    if (!keyId || !keySecret) return null;
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async getKeyId(tenantId: string): Promise<string | null> {
    const secrets = await this.integrations.getConnectedProviderSecrets(tenantId, 'RAZORPAY');
    return secrets?.token?.apiKey || null;
  }

  async getKeySecret(tenantId: string): Promise<string | null> {
    const secrets = await this.integrations.getConnectedProviderSecrets(tenantId, 'RAZORPAY');
    return secrets?.token?.apiSecret || null;
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
