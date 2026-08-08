-- Loyalty platform expansion

-- Enum additions
ALTER TYPE "LoyaltyMode" ADD VALUE IF NOT EXISTS 'HYBRID';
ALTER TYPE "LoyaltyMode" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION';

DO $$ BEGIN
  CREATE TYPE "ChallengeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AutomationStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'COMPLETED', 'REWARDED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- LoyaltyConfig settings JSON
ALTER TABLE "LoyaltyConfig" ADD COLUMN IF NOT EXISTS "settings" JSONB;

-- MembershipTier enrichment
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "minPoints" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "rank" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "exclusiveRewards" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "badgeLabel" TEXT;

-- Customer loyalty fields
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "visitStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "longestStreak" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_referralCode_key" ON "Customer"("tenantId", "referralCode");

-- Challenges
CREATE TABLE IF NOT EXISTS "LoyaltyChallenge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL DEFAULT 'VISITS',
  "targetValue" INTEGER NOT NULL DEFAULT 1,
  "rewardPoints" INTEGER NOT NULL DEFAULT 100,
  "rewardLabel" TEXT,
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endsAt" TIMESTAMP(3),
  "status" "ChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
  "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyChallenge_tenantId_status_idx" ON "LoyaltyChallenge"("tenantId", "status");

CREATE TABLE IF NOT EXISTS "ChallengeParticipant" (
  "id" TEXT NOT NULL,
  "challengeId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChallengeParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChallengeParticipant_challengeId_customerId_key" ON "ChallengeParticipant"("challengeId", "customerId");

-- Badges
CREATE TABLE IF NOT EXISTS "LoyaltyBadge" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "icon" TEXT NOT NULL DEFAULT 'award',
  "color" TEXT NOT NULL DEFAULT '#2563EB',
  "criteria" JSONB,
  "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyBadge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyBadge_tenantId_idx" ON "LoyaltyBadge"("tenantId");

CREATE TABLE IF NOT EXISTS "CustomerBadge" (
  "id" TEXT NOT NULL,
  "badgeId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerBadge_badgeId_customerId_key" ON "CustomerBadge"("badgeId", "customerId");

-- Automations
CREATE TABLE IF NOT EXISTS "LoyaltyAutomation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trigger" TEXT NOT NULL,
  "conditions" JSONB,
  "actions" JSONB NOT NULL,
  "status" "AutomationStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyAutomation_tenantId_status_idx" ON "LoyaltyAutomation"("tenantId", "status");

-- Referrals
CREATE TABLE IF NOT EXISTS "LoyaltyReferral" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "referredId" TEXT,
  "code" TEXT NOT NULL,
  "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "rewardPoints" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "LoyaltyReferral_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LoyaltyReferral_referredId_key" ON "LoyaltyReferral"("referredId");
CREATE INDEX IF NOT EXISTS "LoyaltyReferral_tenantId_status_idx" ON "LoyaltyReferral"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "LoyaltyReferral_tenantId_code_idx" ON "LoyaltyReferral"("tenantId", "code");

-- Surprise rewards
CREATE TABLE IF NOT EXISTS "SurpriseRewardRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "config" JSONB,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SurpriseRewardRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SurpriseRewardRule_tenantId_idx" ON "SurpriseRewardRule"("tenantId");

-- Config version history
CREATE TABLE IF NOT EXISTS "LoyaltyConfigVersion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyConfigVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoyaltyConfigVersion_tenantId_createdAt_idx" ON "LoyaltyConfigVersion"("tenantId", "createdAt");

-- Foreign keys
DO $$ BEGIN
  ALTER TABLE "LoyaltyChallenge" ADD CONSTRAINT "LoyaltyChallenge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "LoyaltyChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ChallengeParticipant" ADD CONSTRAINT "ChallengeParticipant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyBadge" ADD CONSTRAINT "LoyaltyBadge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerBadge" ADD CONSTRAINT "CustomerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "LoyaltyBadge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "CustomerBadge" ADD CONSTRAINT "CustomerBadge_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyAutomation" ADD CONSTRAINT "LoyaltyAutomation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyReferral" ADD CONSTRAINT "LoyaltyReferral_referredId_fkey" FOREIGN KEY ("referredId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "SurpriseRewardRule" ADD CONSTRAINT "SurpriseRewardRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "LoyaltyConfigVersion" ADD CONSTRAINT "LoyaltyConfigVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
