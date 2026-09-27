type PrismaRaw = { $executeRawUnsafe: (query: string, ...values: unknown[]) => Promise<unknown> };

const STATEMENTS = [
  `ALTER TABLE "IntegrationToken" ADD COLUMN IF NOT EXISTS "metadata" JSONB`,
  `ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "externalEventId" TEXT`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_integrationId_externalEventId_key" ON "WebhookEvent"("integrationId", "externalEventId")`,
  `ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_RECEIVED'`,
  `ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_SENT'`,
];

const RETRY_AFTER_MS = 60_000;

let ready: Promise<boolean> | null = null;
let lastFailureAt = 0;

/**
 * Idempotent schema patch for production drift when `prisma migrate deploy`
 * lagged behind a release that expects the WhatsApp integration columns and
 * enum values. Every statement is a no-op once applied. A failed run is
 * retried at most once a minute.
 */
export async function ensureWhatsAppSchema(prisma: PrismaRaw): Promise<boolean> {
  if (!ready) {
    if (Date.now() - lastFailureAt < RETRY_AFTER_MS) return false;
    ready = (async () => {
      let ok = true;
      for (const sql of STATEMENTS) {
        try {
          await prisma.$executeRawUnsafe(sql);
        } catch {
          ok = false;
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
