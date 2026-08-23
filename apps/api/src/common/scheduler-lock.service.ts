import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Postgres session-level advisory locks used by background schedulers.
 *
 * A DEDICATED single-connection PrismaClient backs these locks: advisory
 * locks are scoped to their DB session, so acquiring through the shared
 * connection pool would risk the unlock landing on a different physical
 * connection than the acquire — leaking the lock until that connection
 * closes. One persistent connection makes acquire/release symmetric.
 *
 * With multiple API replicas, each replica holds its own DB session, so
 * `pg_try_advisory_lock` guarantees exactly-one active dispatcher globally.
 */
@Injectable()
export class SchedulerLockService implements OnModuleDestroy {
  private readonly logger = new Logger(SchedulerLockService.name);
  private readonly held = new Set<string>();
  private client?: PrismaClient;

  private lockId(key: string): bigint {
    // Deterministic 64-bit signed int from the key (pg advisory locks take bigint).
    let h = 0n;
    for (let i = 0; i < key.length; i++) {
      h = (h * 31n + BigInt(key.charCodeAt(i))) & 0x7fffffffffffffffn;
    }
    return h;
  }

  private getClient(): PrismaClient {
    if (!this.client) {
      this.client = new PrismaClient({
        datasources: {
          db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/doloyal' },
        },
      });
      // One connection only — required for correct session-lock semantics.
      (this.client as any)._connectionLimit = 1;
    }
    return this.client;
  }

  /** Attempts to take a named advisory lock. Returns false if already held elsewhere or locally. */
  async tryAcquire(key: string): Promise<boolean> {
    if (this.held.has(key)) return false;
    const id = this.lockId(key);
    try {
      const client = this.getClient();
      await client.$connect();
      const rows: any[] = await client.$queryRawUnsafe(
        'SELECT pg_try_advisory_lock($1) AS ok',
        id,
      );
      const ok = Array.isArray(rows) && rows[0]?.ok === true;
      if (ok) this.held.add(key);
      return ok;
    } catch (err: any) {
      this.logger.warn(`Advisory lock acquire failed (${key}): ${err?.message}`);
      return false;
    }
  }

  async release(key: string): Promise<void> {
    if (!this.held.has(key)) return;
    this.held.delete(key);
    if (!this.client) return;
    try {
      await this.client.$queryRawUnsafe(
        'SELECT pg_advisory_unlock($1)',
        this.lockId(key),
      );
    } catch {
      // Session-scoped locks auto-release when the connection dies.
    }
  }

  async onModuleDestroy() {
    const keys = Array.from(this.held.keys());
    await Promise.all(keys.map((k) => this.release(k)));
    await this.client?.$disconnect().catch(() => undefined);
  }
}
