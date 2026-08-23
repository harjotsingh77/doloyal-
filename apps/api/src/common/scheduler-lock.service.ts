import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Postgres session-level advisory locks used by background schedulers.
 *
 * The API may run with multiple replicas; setInterval-based schedulers would
 * then fire once per replica. `tryAcquire(key)` returns false when another
 * instance already holds the lock for this tick, making scheduled work
 * exactly-once per interval without external infrastructure.
 */
@Injectable()
export class SchedulerLockService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerLockService.name);
  private readonly held = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  private lockId(key: string): bigint {
    // Deterministic 64-bit signed int from the key (pg advisory locks take bigint).
    let h = 0n;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31n + BigInt(key.charCodeAt(i))) & 0x7fffffffffffffffn;
    }
    return h;
  }

  /** Attempts to take a named advisory lock. Returns false if already held elsewhere or locally. */
  async tryAcquire(key: string): Promise<boolean> {
    if (this.held.has(key)) return false;
    const id = this.lockId(key);
    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(
        'SELECT pg_try_advisory_lock($1) AS ok',
        id,
      );
      const ok = Array.isArray(rows) && rows[0]?.ok === true;
      if (ok) this.held.set(key, id.toString());
      return ok;
    } catch (err: any) {
      this.logger.warn(`Advisory lock acquire failed (${key}): ${err?.message}`);
      return false;
    }
  }

  async release(key: string): Promise<void> {
    const stored = this.held.get(key);
    if (!stored) return;
    this.held.delete(key);
    try {
      await this.prisma.$queryRawUnsafe(
        'SELECT pg_advisory_unlock($1)',
        this.lockId(key),
      );
    } catch {
      // Session-scoped locks auto-release on disconnect.
    }
  }

  async onModuleDestroy() {
    await Promise.all(Array.from(this.held.keys()).map((k) => this.release(k)));
  }
}
