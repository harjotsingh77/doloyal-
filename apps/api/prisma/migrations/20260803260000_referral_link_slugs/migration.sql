-- Alter ReferralLink for custom slugs, optional customer, tracking fields
ALTER TABLE "ReferralLink" ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "customSlug" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "secureToken" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "referralUrl" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "ReferralLink" ADD COLUMN IF NOT EXISTS "revenue" DOUBLE PRECISION NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "ReferralLink_tenantId_customerId_campaignId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "ReferralLink_customSlug_key" ON "ReferralLink"("customSlug");
CREATE INDEX IF NOT EXISTS "ReferralLink_tenantId_customSlug_idx" ON "ReferralLink"("tenantId", "customSlug");

-- Allow conversions without a customer referrer (generic / public campaign links)
ALTER TABLE "ReferralConversion" ALTER COLUMN "referrerId" DROP NOT NULL;
