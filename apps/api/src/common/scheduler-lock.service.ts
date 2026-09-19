import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from './prisma.service';

/**
 * Database-backed leases used by background schedulers.
 *
 * Session-level PostgreSQL advisory locks are unsafe through Supabase's
 * transaction pooler: acquire and release can land on different server
 * sessions. A persisted expiring lease remains correct across pooled
 * connections, cold starts, concurrent Vercel instances and hard timeouts.
 */
@Injectable()
export class SchedulerLockService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerLockService.name);
  private readonly held = new Set<string>();
  private readonly ownerId = randomUUID();

  constructor(private readonly prisma: PrismaService) {}

  /** Attempts to take a named lease. Stale leases self-heal after ttlMs. */
  async tryAcquire(key: string, ttlMs = 10 * 60_000): Promise<boolean> {
    if (this.held.has(key)) return false;
    try {
      const expiresAt = new Date(Date.now() + ttlMs);
      const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
        INSERT INTO "SchedulerLease" ("key", "ownerId", "expiresAt", "createdAt", "updatedAt")
        VALUES (${key}, ${this.ownerId}, ${expiresAt}, NOW(), NOW())
        ON CONFLICT ("key") DO UPDATE
          SET "ownerId" = EXCLUDED."ownerId",
              "expiresAt" = EXCLUDED."expiresAt",
              "updatedAt" = NOW()
        WHERE "SchedulerLease"."expiresAt" < NOW()
           OR "SchedulerLease"."ownerId" = ${this.ownerId}
        RETURNING "key"
      `;
      const ok = rows.length > 0;
      if (ok) this.held.add(key);
      return ok;
    } catch (err: any) {
      this.logger.warn(`Scheduler lease acquire failed (${key}): ${err?.message}`);
      return false;
    }
  }

  async release(key: string): Promise<void> {
    if (!this.held.has(key)) return;
    this.held.delete(key);
    try {
      await this.prisma.schedulerLease.deleteMany({
        where: { key, ownerId: this.ownerId },
      });
    } catch {
      // The lease expires automatically after the TTL if cleanup cannot run.
    }
  }

  async onModuleDestroy() {
    const keys = Array.from(this.held.keys());
    await Promise.all(keys.map((k) => this.release(k)));
  }
}
