import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitOptions {
  /** Max requests per window per identity. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

/**
 * Declarative in-memory rate limiter.
 * Keyed by authenticated user id when available, else client IP hash.
 *
 * NOTE: state is per-instance. Sufficient for single-instance deploys and as
 * a baseline defense for multi-instance ones; swap in a Redis-backed counter
 * for strict global limits at scale.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly reflector = new Reflector();
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!opts) return true;

    const request = context.switchToHttp().getRequest();
    const user = (request as any).user;
    const ip =
      String(request.headers?.['x-forwarded-for'] || '').split(',')[0]?.trim() ||
      (request as any).ip ||
      'unknown';
    // Hash to avoid storing raw PII; keeps keys bounded.
    const identity = user?.id || ip;
    const key = `${context.getClass().name}:${identity}`;

    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowSec * 1000 };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;

    // Bound memory usage.
    if (this.buckets.size > 10_000) {
      for (const [k, v] of this.buckets) {
        if (v.resetAt <= now) this.buckets.delete(k);
      }
    }

    if (bucket.count > opts.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: 429,
          code: 'RATE_LIMITED',
          message: `Too many requests. Try again in ${retryAfter}s.`,
        },
        429,
      );
    }
    return true;
  }
}

/** Sets rate limit metadata consumed by RateLimitGuard. */
export const RateLimit = (limit: number, windowSec: number) =>
  (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    const handler = target[propertyKey!] ?? descriptor?.value;
    Reflect.defineMetadata(RATE_LIMIT_KEY, { limit, windowSec } as RateLimitOptions, handler);
    return descriptor;
  };
