-- Referral Growth OS
DO $$ BEGIN
  CREATE TYPE "ReferralCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReferralLifecycleStatus" AS ENUM ('PENDING', 'VISITED', 'SIGNED_UP', 'BOOKED', 'CONVERTED', 'REJECTED', 'REWARD_SENT', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ReferralCampaign" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "campaignType" TEXT NOT NULL DEFAULT 'STANDARD',
    "rewardType" TEXT NOT NULL DEFAULT 'POINTS',
    "rewardValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "friendRewardType" TEXT NOT NULL DEFAULT 'POINTS',
    "friendRewardValue" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "minPurchase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "minAppointmentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxRewardLimit" DOUBLE PRECISION,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "ReferralCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "usageLimit" INTEGER,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "referralExpiryDays" INTEGER NOT NULL DEFAULT 30,
    "terms" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "revenueTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardsGiven" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "campaignId" TEXT,
    "name" TEXT,
    "code" TEXT NOT NULL,
    "customSlug" TEXT,
    "secureToken" TEXT,
    "referralUrl" TEXT,
    "qrCode" TEXT,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralVisit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "campaignId" TEXT,
    "referrerCustomerId" TEXT,
    "sessionId" TEXT NOT NULL,
    "ip" TEXT,
    "fingerprint" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "userAgent" TEXT,
    "referrerUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'direct',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "landingPage" TEXT,
    "isUnique" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralShare" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralShare_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralConversion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "linkId" TEXT,
    "referrerId" TEXT,
    "friendId" TEXT,
    "friendEmail" TEXT,
    "friendPhone" TEXT,
    "status" "ReferralLifecycleStatus" NOT NULL DEFAULT 'PENDING',
    "source" TEXT,
    "bookingValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "appointmentId" TEXT,
    "invoiceId" TEXT,
    "rewardType" TEXT,
    "rewardValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "friendRewardType" TEXT,
    "friendRewardValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rewardStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectReason" TEXT,
    "fraudFlags" JSONB,
    "visitedAt" TIMESTAMP(3),
    "signedUpAt" TIMESTAMP(3),
    "bookedAt" TIMESTAMP(3),
    "convertedAt" TIMESTAMP(3),
    "rewardedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralConversion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralRewardRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversionId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "rewardType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREDITED',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralRewardRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReferralEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT,
    "linkId" TEXT,
    "conversionId" TEXT,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLink_code_key" ON "ReferralLink"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLink_customSlug_key" ON "ReferralLink"("customSlug");
CREATE INDEX IF NOT EXISTS "ReferralCampaign_tenantId_status_idx" ON "ReferralCampaign"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_code_idx" ON "ReferralLink"("tenantId", "code");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_customerId_idx" ON "ReferralLink"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_customSlug_idx" ON "ReferralLink"("tenantId", "customSlug");
CREATE INDEX IF NOT EXISTS "ReferralVisit_tenantId_createdAt_idx" ON "ReferralVisit"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralVisit_tenantId_source_idx" ON "ReferralVisit"("tenantId", "source");
CREATE INDEX IF NOT EXISTS "ReferralVisit_linkId_fingerprint_idx" ON "ReferralVisit"("linkId", "fingerprint");
CREATE INDEX IF NOT EXISTS "ReferralShare_tenantId_channel_idx" ON "ReferralShare"("tenantId", "channel");
CREATE INDEX IF NOT EXISTS "ReferralShare_linkId_idx" ON "ReferralShare"("linkId");
CREATE INDEX IF NOT EXISTS "ReferralConversion_tenantId_status_idx" ON "ReferralConversion"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ReferralConversion_tenantId_createdAt_idx" ON "ReferralConversion"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralConversion_referrerId_idx" ON "ReferralConversion"("referrerId");
CREATE INDEX IF NOT EXISTS "ReferralConversion_friendId_idx" ON "ReferralConversion"("friendId");
CREATE INDEX IF NOT EXISTS "ReferralRewardRecord_tenantId_createdAt_idx" ON "ReferralRewardRecord"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralEvent_tenantId_createdAt_idx" ON "ReferralEvent"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReferralEvent_tenantId_type_idx" ON "ReferralEvent"("tenantId", "type");

DO $$ BEGIN ALTER TABLE "ReferralCampaign" ADD CONSTRAINT "ReferralCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralLink" ADD CONSTRAINT "ReferralLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralVisit" ADD CONSTRAINT "ReferralVisit_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralShare" ADD CONSTRAINT "ReferralShare_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralShare" ADD CONSTRAINT "ReferralShare_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralConversion" ADD CONSTRAINT "ReferralConversion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralConversion" ADD CONSTRAINT "ReferralConversion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralConversion" ADD CONSTRAINT "ReferralConversion_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralConversion" ADD CONSTRAINT "ReferralConversion_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralConversion" ADD CONSTRAINT "ReferralConversion_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRewardRecord" ADD CONSTRAINT "ReferralRewardRecord_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRewardRecord" ADD CONSTRAINT "ReferralRewardRecord_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "ReferralConversion"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralRewardRecord" ADD CONSTRAINT "ReferralRewardRecord_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "ReferralLink"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_conversionId_fkey" FOREIGN KEY ("conversionId") REFERENCES "ReferralConversion"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
