-- Modular loyalty OS: feature entities + audit logs
CREATE TABLE IF NOT EXISTS "LoyaltyFeatureEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "data" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyFeatureEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LoyaltyAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureKey" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyFeatureEntity_tenantId_featureKey_status_idx"
  ON "LoyaltyFeatureEntity"("tenantId", "featureKey", "status");
CREATE INDEX IF NOT EXISTS "LoyaltyFeatureEntity_tenantId_featureKey_sortOrder_idx"
  ON "LoyaltyFeatureEntity"("tenantId", "featureKey", "sortOrder");
CREATE INDEX IF NOT EXISTS "LoyaltyAuditLog_tenantId_createdAt_idx"
  ON "LoyaltyAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "LoyaltyAuditLog_tenantId_featureKey_idx"
  ON "LoyaltyAuditLog"("tenantId", "featureKey");

DO $$ BEGIN
  ALTER TABLE "LoyaltyFeatureEntity"
    ADD CONSTRAINT "LoyaltyFeatureEntity_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyAuditLog"
    ADD CONSTRAINT "LoyaltyAuditLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
