import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { InternalCronController } from './internal-cron.controller';

const originalSecret = process.env.CRON_SECRET;

afterEach(() => {
  process.env.CRON_SECRET = originalSecret;
});

function controller() {
  return new InternalCronController(
    { runOnce: vi.fn().mockResolvedValue({ dispatched: 1, skipped: false }) } as any,
    { runOnce: vi.fn().mockResolvedValue({ resumed: 1, enqueued: 0, skipped: false }) } as any,
    { runJob: vi.fn().mockResolvedValue({ job: 'leaderboards', skipped: false }) } as any,
    { runOnce: vi.fn().mockResolvedValue({ sent: 1, skipped: false }) } as any,
  );
}

describe('InternalCronController', () => {
  it('rejects requests without the configured bearer secret', () => {
    process.env.CRON_SECRET = 's'.repeat(48);
    expect(() => controller().runCampaigns()).toThrow(UnauthorizedException);
  });

  it('runs a job with the exact bearer secret', async () => {
    process.env.CRON_SECRET = 's'.repeat(48);
    await expect(
      controller().runCampaigns(`Bearer ${process.env.CRON_SECRET}`),
    ).resolves.toEqual({ dispatched: 1, skipped: false });
  });
});
