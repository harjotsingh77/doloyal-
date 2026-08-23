-- Per-integration provider configuration (phone number ids, waba ids, etc.)
ALTER TABLE "IntegrationToken" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
