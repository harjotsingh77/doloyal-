-- Rewards OS expansion
ALTER TYPE "RewardStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "cashbackBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Expand Reward
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "rewardValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "rewardType" TEXT NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "branchIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "tierRequired" TEXT;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "membershipRequired" TEXT;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "terms" TEXT;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Normalize category default
UPDATE "Reward" SET "category" = 'STANDARD' WHERE "category" IS NULL OR "category" = '';
ALTER TABLE "Reward" ALTER COLUMN "category" SET DEFAULT 'STANDARD';
ALTER TABLE "Reward" ALTER COLUMN "category" SET NOT NULL;
ALTER TABLE "Reward" ALTER COLUMN "pointsCost" SET DEFAULT 0;
ALTER TABLE "Reward" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "Reward_tenantId_category_status_idx" ON "Reward"("tenantId", "category", "status");
CREATE INDEX IF NOT EXISTS "Reward_tenantId_status_idx" ON "Reward"("tenantId", "status");

-- Expand RewardRedemption
ALTER TABLE "RewardRedemption" ADD COLUMN IF NOT EXISTS "pointsUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RewardRedemption" ADD COLUMN IF NOT EXISTS "cashbackAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "RewardRedemption" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "RewardRedemption" ADD COLUMN IF NOT EXISTS "branchName" TEXT;

CREATE INDEX IF NOT EXISTS "RewardRedemption_tenantId_createdAt_idx" ON "RewardRedemption"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "RewardRedemption_tenantId_status_idx" ON "RewardRedemption"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "RewardProgramConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "programType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardProgramConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RewardProgramConfig_tenantId_programType_key"
  ON "RewardProgramConfig"("tenantId", "programType");
CREATE INDEX IF NOT EXISTS "RewardProgramConfig_tenantId_enabled_idx"
  ON "RewardProgramConfig"("tenantId", "enabled");

CREATE TABLE IF NOT EXISTS "CashbackTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "pointsUsed" INTEGER NOT NULL,
    "cashbackAmount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashbackTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CashbackTransaction_tenantId_createdAt_idx"
  ON "CashbackTransaction"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "CashbackTransaction_tenantId_customerId_idx"
  ON "CashbackTransaction"("tenantId", "customerId");

CREATE TABLE IF NOT EXISTS "RewardEngagementClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "programType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evidence" JSONB,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "rewardId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RewardEngagementClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RewardEngagementClaim_tenantId_programType_status_idx"
  ON "RewardEngagementClaim"("tenantId", "programType", "status");
CREATE INDEX IF NOT EXISTS "RewardEngagementClaim_tenantId_customerId_idx"
  ON "RewardEngagementClaim"("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "Customer_tenantId_dob_idx" ON "Customer"("tenantId", "dob");

DO $$ BEGIN
  ALTER TABLE "RewardProgramConfig"
    ADD CONSTRAINT "RewardProgramConfig_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CashbackTransaction"
    ADD CONSTRAINT "CashbackTransaction_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "CashbackTransaction"
    ADD CONSTRAINT "CashbackTransaction_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RewardEngagementClaim"
    ADD CONSTRAINT "RewardEngagementClaim_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RewardEngagementClaim"
    ADD CONSTRAINT "RewardEngagementClaim_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
