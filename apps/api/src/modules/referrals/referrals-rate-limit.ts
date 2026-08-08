/**
 * Lightweight in-memory rate limiter for public referral tracking endpoints.
 * Suitable for single-instance deployments; replace with Redis for multi-instance.
 */
export class ReferralRateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(
    private readonly maxHits: number,
    private readonly windowMs: number,
  ) {}

  allow(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const arr = (this.hits.get(key) || []).filter((t) => t > windowStart);
    if (arr.length >= this.maxHits) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
}

export const publicTrackLimiter = new ReferralRateLimiter(60, 60_000);
export const publicClaimLimiter = new ReferralRateLimiter(20, 60_000);
