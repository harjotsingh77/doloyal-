import { describe, expect, it, vi } from 'vitest';
import { CampaignsService } from './campaigns.service';

function build(overrides: Record<string, any> = {}) {
  const prisma: any = {
    customer: {
      count: vi.fn().mockResolvedValue(3),
      findMany: vi.fn().mockResolvedValue([{ id: 'c1', firstName: 'Asha <b>', lastName: null, email: 'a@example.com' }]),
    },
    campaign: {
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'cmp1', ...data })),
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    activity: { create: vi.fn().mockResolvedValue({}) },
    integration: { findFirst: vi.fn().mockResolvedValue({ id: 'i1' }) },
    notification: { create: vi.fn().mockResolvedValue({}) },
    ...overrides,
  };
  const email = { sendBusinessEmail: vi.fn().mockResolvedValue({ status: 'SENT' }) };
  const whatsapp = {
    sendTemplate: vi.fn().mockResolvedValue({ ok: true }),
    sendSessionText: vi.fn().mockResolvedValue({ ok: true }),
  };
  return { service: new CampaignsService(prisma, email as any, whatsapp as any), prisma, email, whatsapp };
}

describe('CampaignsService', () => {
  it('keeps the WhatsApp template name empty when none is given', async () => {
    const { service, prisma } = build();
    await service.create('t1', { name: 'Winter Offer', body: 'Hi', channel: 'WHATSAPP' });
    expect(prisma.campaign.create.mock.calls[0][0].data.subject).toBe('');
  });

  it('defaults the email subject to the campaign name', async () => {
    const { service, prisma } = build();
    await service.create('t1', { name: 'Winter Offer', body: 'Hi', channel: 'EMAIL' });
    expect(prisma.campaign.create.mock.calls[0][0].data.subject).toBe('Winter Offer');
  });

  it('rejects SMS campaigns and invalid schedule dates', async () => {
    const { service } = build();
    await expect(service.create('t1', { name: 'A', body: 'B', channel: 'SMS' })).rejects.toThrow(/SMS/);
    await expect(
      service.create('t1', { name: 'A', body: 'B', channel: 'EMAIL', scheduleDate: 'not-a-date' }),
    ).rejects.toThrow(/valid date/);
  });

  it('does not send a campaign that was already claimed', async () => {
    const { service, prisma, email } = build();
    prisma.campaign.findFirst.mockResolvedValue({ id: 'cmp1', tenantId: 't1', channel: 'EMAIL', status: 'COMPLETED', audience: 'All' });
    prisma.campaign.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.send('t1', 'cmp1')).rejects.toThrow(/already been sent/);
    expect(email.sendBusinessEmail).not.toHaveBeenCalled();
  });

  it('personalises and escapes a plain-text email body', async () => {
    const { service, prisma, email } = build();
    prisma.campaign.findFirst.mockResolvedValue({
      id: 'cmp1', tenantId: 't1', channel: 'EMAIL', status: 'DRAFT', audience: 'All',
      name: 'N', subject: 'S', body: 'Hi {{firstName}},\n\nSee you soon.',
    });
    const result = await service.send('t1', 'cmp1');
    expect(email.sendBusinessEmail.mock.calls[0][0].html).toBe('<p>Hi Asha &lt;b&gt;,</p><p>See you soon.</p>');
    expect(result.sent).toBe(1);
  });

  it('sends free-form WhatsApp text when the stored subject is not a template name', async () => {
    const { service, prisma, whatsapp } = build();
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1', firstName: 'Asha', lastName: null, phone: '+911' }]);
    prisma.campaign.findFirst.mockResolvedValue({
      id: 'cmp1', tenantId: 't1', channel: 'WHATSAPP', status: 'DRAFT', audience: 'All',
      name: 'Winter Offer', subject: 'Winter Offer', body: 'Hi {{firstName}}',
    });
    await service.send('t1', 'cmp1');
    expect(whatsapp.sendTemplate).not.toHaveBeenCalled();
    expect(whatsapp.sendSessionText).toHaveBeenCalledWith('t1', '+911', 'Hi Asha');
  });

  it('marks the campaign failed instead of leaving it sending when a send throws', async () => {
    const { service, prisma, email } = build();
    prisma.campaign.findFirst.mockResolvedValue({
      id: 'cmp1', tenantId: 't1', channel: 'EMAIL', status: 'DRAFT', audience: 'All', name: 'N', subject: 'S', body: 'B',
    });
    email.sendBusinessEmail.mockRejectedValue(new Error('boom'));
    await expect(service.send('t1', 'cmp1')).rejects.toThrow(/could not be sent/);
    expect(prisma.campaign.update.mock.calls.at(-1)[0].data.status).toBe('FAILED');
  });
});
