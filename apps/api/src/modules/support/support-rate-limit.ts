/**
 * Lightweight in-memory rate limiters for the Ask Doloyal support surfaces
 * (AI chat, ticket creation, messages, uploads). Suitable for single-instance
 * deployments; replace with Redis for multi-instance.
 */
export class SupportRateLimiter {
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

/** AI chat replies — generous enough for normal use, cheap enough to protect cost. */
export const aiChatLimiter = new SupportRateLimiter(30, 60_000);
/** Ticket creation per user. */
export const ticketCreateLimiter = new SupportRateLimiter(10, 60_000);
/** Ticket messages per user. */
export const messageSendLimiter = new SupportRateLimiter(30, 60_000);
/** File uploads per user. */
export const fileUploadLimiter = new SupportRateLimiter(10, 60_000);
/** Admin AI assist calls. */
export const adminAiAssistLimiter = new SupportRateLimiter(60, 60_000);
