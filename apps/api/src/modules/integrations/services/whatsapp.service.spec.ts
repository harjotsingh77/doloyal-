import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as crypto from 'crypto';
import {
  WhatsAppIntegrationService,
  describeWhatsAppError,
  mapWebhookStatus,
  nextDeliveryStatus,
  renderTemplateBody,
} from './whatsapp.service';
import { IntegrationsService } from '../integrations.service';
import { formatWhatsAppNumber, toWhatsAppNumber } from '../../../common/phone';

describe('toWhatsAppNumber', () => {
  it('adds the business dial code to national numbers', () => {
    expect(toWhatsAppNumber('98765 43210', 'IN')).toBe('919876543210');
    expect(toWhatsAppNumber('098765-43210', 'India')).toBe('919876543210');
    expect(toWhatsAppNumber('(415) 555-2671', 'US')).toBe('14155552671');
  });

  it('keeps numbers that are already international', () => {
    expect(toWhatsAppNumber('+91 98765 43210', 'US')).toBe('919876543210');
    expect(toWhatsAppNumber('0044 7700 900123', 'IN')).toBe('447700900123');
    expect(toWhatsAppNumber('919876543210', 'IN')).toBe('919876543210');
  });

  it('rejects values that cannot be WhatsApp numbers', () => {
    expect(toWhatsAppNumber('', 'IN')).toBeNull();
    expect(toWhatsAppNumber('12345', null)).toBeNull();
    expect(toWhatsAppNumber('+1234567890123456', 'US')).toBeNull();
  });

  it('formats for display', () => {
    expect(formatWhatsAppNumber('919876543210')).toBe('+91 98765 43210');
    expect(formatWhatsAppNumber('14155552671')).toBe('+1 415 555 2671');
    expect(formatWhatsAppNumber(null)).toBeNull();
  });
});

describe('delivery status', () => {
  it('maps only known Meta webhook statuses', () => {
    expect(mapWebhookStatus('sent')).toBe('SENT');
    expect(mapWebhookStatus('delivered')).toBe('DELIVERED');
    expect(mapWebhookStatus('read')).toBe('READ');
    expect(mapWebhookStatus('failed')).toBe('FAILED');
    expect(mapWebhookStatus('something_new')).toBeNull();
  });

  it('never moves backwards and keeps FAILED terminal', () => {
    expect(nextDeliveryStatus('QUEUED', 'SENT')).toBe('SENT');
    expect(nextDeliveryStatus('READ', 'DELIVERED')).toBe('READ');
    expect(nextDeliveryStatus('DELIVERED', 'SENT')).toBe('DELIVERED');
    expect(nextDeliveryStatus('SENT', 'FAILED')).toBe('FAILED');
    expect(nextDeliveryStatus('FAILED', 'READ')).toBe('FAILED');
    expect(nextDeliveryStatus('DEMO', 'READ')).toBe('DEMO');
  });
});

describe('describeWhatsAppError', () => {
  it('maps common Meta failures to actionable messages', () => {
    expect(describeWhatsAppError({ code: 190 }, 401)).toMatch(/invalid or has expired/);
    expect(describeWhatsAppError({ code: 100, error_subcode: 33 }, 400)).toMatch(/Phone Number ID/);
    expect(describeWhatsAppError({ code: 131047 })).toMatch(/24 hours/);
    expect(describeWhatsAppError({ code: 131026 })).toMatch(/verify the customer’s WhatsApp number/);
    expect(describeWhatsAppError({ code: 130429 })).toMatch(/rate limit/);
    expect(describeWhatsAppError({ code: 10 })).toMatch(/permission/);
    expect(describeWhatsAppError({ code: 131000 })).toMatch(/Please try again/);
  });

  it('never echoes raw Meta text', () => {
    const msg = describeWhatsAppError({ code: 1, message: 'Invalid OAuth access token EAAG-secret' });
    expect(msg).not.toContain('EAAG');
  });
});

describe('renderTemplateBody', () => {
  it('fills numbered placeholders', () => {
    const tpl = {
      name: 'winback',
      language: 'en_US',
      components: [{ type: 'BODY', text: 'Hi {{1}}, it has been {{2}} days.' }],
    };
    expect(renderTemplateBody(tpl, ['Rahul', '45'])).toBe('Hi Rahul, it has been 45 days.');
  });
});

function sign(body: string, secret: string) {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('WhatsApp webhook routing', () => {
  const originalSecret = process.env.META_APP_SECRET;
  afterEach(() => {
    process.env.META_APP_SECRET = originalSecret;
  });

  function setup() {
    const integrations = [
      { id: 'int-a', tenantId: 'tenant-a', type: 'WHATSAPP', status: 'CONNECTED', metadata: { phoneNumberId: 'PN_A' }, tokens: [{}] },
      { id: 'int-b', tenantId: 'tenant-b', type: 'WHATSAPP', status: 'CONNECTED', metadata: { phoneNumberId: 'PN_B' }, tokens: [{ webhookSecret: 'enc:own-secret-b' }] },
    ];
    const events = new Set<string>();
    const prisma: any = {
      integration: { findMany: vi.fn(async () => integrations) },
      webhookEvent: {
        create: vi.fn(async ({ data }: any) => {
          const key = `${data.integrationId}:${data.externalEventId}`;
          if (events.has(key)) throw Object.assign(new Error('dup'), { code: 'P2002' });
          events.add(key);
          return { id: key };
        }),
        update: vi.fn(async () => ({})),
      },
    };
    const encryption: any = {
      decrypt: (v: string) => v.replace(/^enc:/, ''),
      secureCompare: (a: string, b: string) => a === b,
    };
    const whatsapp: any = { processWebhookChange: vi.fn(async () => ({ statuses: 1, messages: 0 })) };
    const service = new IntegrationsService(prisma, encryption, whatsapp, {} as any);
    return { service, whatsapp };
  }

  const payload = (phoneNumberId: string) =>
    JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: 'WABA',
        changes: [{
          field: 'messages',
          value: { metadata: { phone_number_id: phoneNumberId }, statuses: [{ id: 'wamid.1', status: 'delivered' }] },
        }],
      }],
    });

  it('routes platform-signed events to the tenant that owns the phone number id', async () => {
    process.env.META_APP_SECRET = 'platform-secret';
    const { service, whatsapp } = setup();
    const raw = payload('PN_B');
    const res = await service.handleWebhook('WHATSAPP', { 'x-hub-signature-256': sign(raw, 'platform-secret') }, raw);
    expect(res).toMatchObject({ received: true, processed: 1 });
    expect(whatsapp.processWebhookChange).toHaveBeenCalledTimes(1);
    expect(whatsapp.processWebhookChange.mock.calls[0][0]).toBe('tenant-b');
  });

  it('rejects unsigned or wrongly signed payloads', async () => {
    process.env.META_APP_SECRET = 'platform-secret';
    const { service, whatsapp } = setup();
    const raw = payload('PN_A');
    await expect(
      service.handleWebhook('WHATSAPP', { 'x-hub-signature-256': sign(raw, 'wrong') }, raw),
    ).rejects.toThrow(/Invalid webhook signature/);
    expect(whatsapp.processWebhookChange).not.toHaveBeenCalled();
  });

  it('limits a per-integration secret to its own phone number', async () => {
    delete process.env.META_APP_SECRET;
    const { service, whatsapp } = setup();
    const raw = payload('PN_A');
    const res = await service.handleWebhook('WHATSAPP', { 'x-hub-signature-256': sign(raw, 'own-secret-b') }, raw);
    expect(res).toMatchObject({ processed: 0, ignored: 1 });
    expect(whatsapp.processWebhookChange).not.toHaveBeenCalled();
  });

  it('dedupes redelivered events', async () => {
    process.env.META_APP_SECRET = 'platform-secret';
    const { service, whatsapp } = setup();
    const raw = payload('PN_A');
    const headers = { 'x-hub-signature-256': sign(raw, 'platform-secret') };
    await service.handleWebhook('WHATSAPP', headers, raw);
    const second = await service.handleWebhook('WHATSAPP', headers, raw);
    expect(second).toMatchObject({ processed: 0, duplicates: 1 });
    expect(whatsapp.processWebhookChange).toHaveBeenCalledTimes(1);
  });
});

describe('status updates', () => {
  it('advances notification + activity without overwriting the message body', async () => {
    const notification = {
      id: 'n1',
      customerId: 'c1',
      sentAt: new Date(),
      metadata: { providerMessageId: 'wamid.1', deliveryStatus: 'READ', statusTimestamps: { READ: 'x' } },
    };
    const activity = { id: 'a1', metadata: { notificationId: 'n1', body: 'Hi Rahul', deliveryStatus: 'READ' } };
    const prisma: any = {
      notification: { findFirst: vi.fn(async () => notification), update: vi.fn(async () => ({})) },
      activity: { findFirst: vi.fn(async () => activity), update: vi.fn(async () => ({})), create: vi.fn() },
      customer: { findFirst: vi.fn() },
    };
    const service = new WhatsAppIntegrationService(prisma, {} as any);
    await service.processWebhookChange('tenant-a', {
      statuses: [{ id: 'wamid.1', status: 'delivered', timestamp: '1790000000' }],
    });
    const notifUpdate = prisma.notification.update.mock.calls[0][0].data;
    expect(notifUpdate.metadata.deliveryStatus).toBe('READ');
    expect(notifUpdate.metadata.statusTimestamps.DELIVERED).toBeDefined();
    const activityUpdate = prisma.activity.update.mock.calls[0][0].data;
    expect(activityUpdate.message).toBeUndefined();
    expect(activityUpdate.metadata.body).toBe('Hi Rahul');
    expect(prisma.notification.findFirst.mock.calls[0][0].where.tenantId).toBe('tenant-a');
  });
});
