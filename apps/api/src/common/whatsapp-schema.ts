import { Logger } from '@nestjs/common';

type PrismaRaw = { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> };

const STATEMENTS = [
  `ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'WHATSAPP'`,
  `ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'SMS'`,
  `ALTER TABLE "IntegrationToken" ADD COLUMN IF NOT EXISTS "metadata" JSONB`,
  `ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "externalEventId" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_integrationId_externalEventId_key" ON "WebhookEvent"("integrationId", "externalEventId")`,
  `ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_RECEIVED'`,
  `ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_SENT'`,
];

const RETRY_AFTER_MS = 60_000;
const logger = new Logger('WhatsAppSchema');

let ready: Promise<boolean> | null = null;
let lastFailureAt = 0;

/**
 * Idempotent schema patch for production drift when `prisma migrate deploy`
 * lagged behind a release that expects the WhatsApp integration enum values,
 * columns, and indexes. Every statement is a no-op once applied. A failed run
 * is retried at most once a minute.
 */
export async function ensureWhatsAppSchema(prisma: PrismaRaw): Promise<boolean> {
  if (!ready) {
    if (Date.now() - lastFailureAt < RETRY_AFTER_MS) return false;
    ready = (async () => {
      let ok = true;
      for (const sql of STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch (err: any) {
          ok = false;
          logger.warn(`Schema patch failed (${err?.meta?.code || err?.code || 'unknown'}): ${sql.slice(0, 80)}`);
        }
      }
      if (!ok) {
        lastFailureAt = Date.now();
        ready = null;
      }
      return ok;
    })();
  }
  return ready;
}
