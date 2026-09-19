-- Durable suspend flags for users and businesses.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

-- Integration error resolution + operational indexes.
ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX IF NOT EXISTS "Subscription_plan_idx" ON "Subscription"("plan");
CREATE INDEX IF NOT EXISTS "SyncLog_status_startedAt_idx" ON "SyncLog"("status", "startedAt");
CREATE INDEX IF NOT EXISTS "WebhookEvent_status_createdAt_idx" ON "WebhookEvent"("status", "createdAt");
