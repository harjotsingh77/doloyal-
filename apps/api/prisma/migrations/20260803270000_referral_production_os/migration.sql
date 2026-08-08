-- Referral Growth OS v3 — production architecture extensions

ALTER TABLE "ReferralCampaign" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "ReferralCampaign" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "shortUrl" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "ReferralVisit" ADD COLUMN IF NOT EXISTS "deviceType" TEXT;

ALTER TABLE "ReferralConversion" ADD COLUMN IF NOT EXISTS "conversionType" TEXT;
ALTER TABLE "ReferralConversion" ADD COLUMN IF NOT EXISTS "suspicious" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ReferralRewardRecord" ADD COLUMN IF NOT EXISTS "walletTransactionId" TEXT;
ALTER TABLE "ReferralRewardRecord" ADD COLUMN IF NOT EXISTS "couponId" TEXT;
ALTER TABLE "ReferralRewardRecord" ADD COLUMN IF NOT EXISTS "membershipId" TEXT;
ALTER TABLE "ReferralRewardRecord" ADD COLUMN IF NOT EXISTS "creditedAt" TIMESTAMP(3);

ALTER TABLE "ReferralEvent" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;

CREATE TABLE IF NOT EXISTS "ReferralRegistration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "linkId" TEXT,
    "referrerId" TEXT,
    "newCustomerId" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralRegistration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralSource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT,
    "source" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "registrations" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralLeaderboard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "referrals" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralLeaderboard_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ReferralCampaign_tenantId_deletedAt_idx" ON "ReferralCampaign"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_deletedAt_idx" ON "ReferralLink"("tenantId", "deletedAt");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_status_idx" ON "ReferralLink"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ReferralVisit_linkId_sessionId_idx" ON "ReferralVisit"("linkId", "sessionId");
CREATE INDEX IF NOT EXISTS "ReferralConversion_tenantId_rewardStatus_idx" ON "ReferralConversion"("tenantId", "rewardStatus");
CREATE INDEX IF NOT EXISTS "ReferralRewardRecord_conversionId_idx" ON "ReferralRewardRecord"("conversionId");

CREATE INDEX IF NOT EXISTS "ReferralRegistration_tenantId_registeredAt_idx" ON "ReferralRegistration"("tenantId", "registeredAt");
CREATE INDEX IF NOT EXISTS "ReferralRegistration_linkId_idx" ON "ReferralRegistration"("linkId");
CREATE INDEX IF NOT EXISTS "ReferralRegistration_newCustomerId_idx" ON "ReferralRegistration"("newCustomerId");

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralSource_tenantId_linkId_source_key" ON "ReferralSource"("tenantId", "linkId", "source");
CREATE INDEX IF NOT EXISTS "ReferralSource_tenantId_source_idx" ON "ReferralSource"("tenantId", "source");

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLeaderboard_tenantId_customerId_key" ON "ReferralLeaderboard"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "ReferralLeaderboard_tenantId_revenueGenerated_idx" ON "ReferralLeaderboard"("tenantId", "revenueGenerated");
CREATE INDEX IF NOT EXISTS "ReferralLeaderboard_tenantId_referrals_idx" ON "ReferralLeaderboard"("tenantId", "referrals");

DO $$ BEGIN ALTER TABLE "ReferralRegistration" ADD CONSTRAINT "ReferralRegistration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRegistration" ADD CONSTRAINT "ReferralRegistration_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRegistration" ADD CONSTRAINT "ReferralRegistration_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRegistration" ADD CONSTRAINT "ReferralRegistration_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRegistration" ADD CONSTRAINT "ReferralRegistration_newCustomerId_fkey" FOREIGN KEY ("newCustomerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ReferralSource" ADD CONSTRAINT "ReferralSource_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralSource" ADD CONSTRAINT "ReferralSource_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ReferralLeaderboard" ADD CONSTRAINT "ReferralLeaderboard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralLeaderboard" ADD CONSTRAINT "ReferralLeaderboard_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
