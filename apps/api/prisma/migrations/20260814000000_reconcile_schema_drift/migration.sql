-- Reconcile the migration-produced schema to match schema.prisma.
-- Historically several tables/columns/enum variants were created with `prisma db push`
-- rather than via migrations. This migration closes that gap so a fresh replay of the
-- migration chain produces exactly the schema.prisma shape. Every statement is guarded
-- so it is a no-op on databases that already have the modern shape.

-- RedemptionStatus: schema wants (PENDING, FULFILLED, CANCELLED, EXPIRED);
-- init created (PENDING, REDEEMED, CANCELLED, EXPIRED).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'RedemptionStatus' AND e.enumlabel = 'FULFILLED') THEN
    CREATE TYPE "RedemptionStatus_new" AS ENUM ('PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED');
    ALTER TABLE "RewardRedemption" ALTER COLUMN "status" TYPE "RedemptionStatus_new" USING ("status"::text::"RedemptionStatus_new");
    ALTER TYPE "RedemptionStatus" RENAME TO "RedemptionStatus_old";
    ALTER TYPE "RedemptionStatus_new" RENAME TO "RedemptionStatus";
    DROP TYPE "RedemptionStatus_old";
  END IF;
END $$;

-- Appointment
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentAmount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "rescheduledFrom" TEXT,
ADD COLUMN IF NOT EXISTS "serviceId" TEXT,
ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'DASHBOARD';

-- BookingLink: theme was TEXT in old chain, JSONB in schema
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BookingLink' AND column_name = 'type') THEN
    ALTER TABLE "BookingLink" ALTER COLUMN "type" SET DEFAULT 'PERSONAL';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BookingLink' AND column_name = 'name') THEN
    ALTER TABLE "BookingLink" ALTER COLUMN "name" DROP NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BookingLink' AND column_name = 'theme' AND data_type = 'text') THEN
    ALTER TABLE "BookingLink" DROP COLUMN "theme";
    ALTER TABLE "BookingLink" ADD COLUMN "theme" JSONB;
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BookingLink' AND column_name = 'theme') THEN
    ALTER TABLE "BookingLink" ADD COLUMN "theme" JSONB;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'BookingLink' AND column_name = 'updatedAt') THEN
    ALTER TABLE "BookingLink" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

-- Campaign
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Campaign' AND column_name = 'status') THEN
    ALTER TABLE "Campaign" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Campaign' AND column_name = 'recipients') THEN
    ALTER TABLE "Campaign" ALTER COLUMN "recipients" SET DEFAULT 0;
  END IF;
END $$;

-- Customer
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'status') THEN
    ALTER TABLE "Customer" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'tags') THEN
    ALTER TABLE "Customer" ALTER COLUMN "tags" SET DEFAULT ARRAY[]::TEXT[];
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'pointsBalance') THEN
    ALTER TABLE "Customer" ALTER COLUMN "pointsBalance" SET DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'totalSpent') THEN
    ALTER TABLE "Customer" ALTER COLUMN "totalSpent" SET DEFAULT 0.0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'totalVisits') THEN
    ALTER TABLE "Customer" ALTER COLUMN "totalVisits" SET DEFAULT 0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Customer' AND column_name = 'churnRiskScore') THEN
    ALTER TABLE "Customer" ALTER COLUMN "churnRiskScore" SET DEFAULT 0.0;
  END IF;
END $$;

-- Drop-table defaults that schema models no longer carry
DO $$
DECLARE t TEXT; c TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['FeatureFlag','LoyaltyAutomation','LoyaltyBadge','LoyaltyChallenge','LoyaltyFeatureEntity','ReferralCampaign','ReferralConversion','ReferralLeaderboard','ReferralLink','ReferralSource','RewardEngagementClaim','RewardProgramConfig','SurpriseRewardRule'] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'updatedAt') THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', t, 'updatedAt');
    END IF;
  END LOOP;
END $$;

-- Invoice / InvoiceItem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'discount') THEN
    ALTER TABLE "Invoice" ALTER COLUMN "discount" SET DEFAULT 0.0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Invoice' AND column_name = 'tax') THEN
    ALTER TABLE "Invoice" ALTER COLUMN "tax" SET DEFAULT 0.0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'InvoiceItem' AND column_name = 'quantity') THEN
    ALTER TABLE "InvoiceItem" ALTER COLUMN "quantity" SET DEFAULT 1;
  END IF;
END $$;

-- LoyaltyConfig
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'mode') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "mode" SET DEFAULT 'POINTS_PER_SPEND';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'pointsPerUnit') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "pointsPerUnit" SET DEFAULT 1;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'currencyUnit') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "currencyUnit" SET DEFAULT 1.0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'expiryDays') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "expiryDays" SET DEFAULT 365;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'pointsPerVisit') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "pointsPerVisit" SET DEFAULT 10;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'signupBonus') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "signupBonus" SET DEFAULT 50;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'LoyaltyConfig' AND column_name = 'referralBonus') THEN
    ALTER TABLE "LoyaltyConfig" ALTER COLUMN "referralBonus" SET DEFAULT 100;
  END IF;
END $$;

-- MembershipTier: old chain had minSpend/multiplier/perks, schema has the modern set
ALTER TABLE "MembershipTier" DROP COLUMN IF EXISTS "minSpend",
DROP COLUMN IF EXISTS "multiplier",
DROP COLUMN IF EXISTS "perks";
ALTER TABLE "MembershipTier" ADD COLUMN IF NOT EXISTS "benefits" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "bonusPointsPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "color" TEXT,
ADD COLUMN IF NOT EXISTS "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS "priorityBooking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "validityDays" INTEGER NOT NULL DEFAULT 365;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MembershipTier' AND column_name = 'minPoints') THEN
    ALTER TABLE "MembershipTier" ALTER COLUMN "minPoints" SET DEFAULT 0;
  END IF;
END $$;

-- Reward
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'discountVal') THEN
    ALTER TABLE "Reward" ALTER COLUMN "discountVal" SET DEFAULT 0.0;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RewardRedemption' AND column_name = 'status') THEN
    ALTER TABLE "RewardRedemption" ALTER COLUMN "status" SET DEFAULT 'PENDING';
  END IF;
END $$;

-- Subscription
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT,
ADD COLUMN IF NOT EXISTS "stripeSubId" TEXT,
ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Subscription' AND column_name = 'plan') THEN
    ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'free';
  END IF;
END $$;

-- Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "blockedDates" JSONB,
ADD COLUMN IF NOT EXISTS "bufferTime" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN IF NOT EXISTS "holidays" JSONB,
ADD COLUMN IF NOT EXISTS "maxAdvanceBookingDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS "maxDailyBookings" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN IF NOT EXISTS "minBookingNotice" INTEGER NOT NULL DEFAULT 60;

-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT,
ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Tables that historically existed only via `prisma db push`
CREATE TABLE IF NOT EXISTS "SyncLog" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "recipient" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BlockedDate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isFullDay" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CalendarEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "externalId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
    "eventType" TEXT NOT NULL DEFAULT 'APPOINTMENT',
    "title" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WidgetSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563EB',
    "fontFamily" TEXT NOT NULL DEFAULT 'Inter',
    "borderRadius" TEXT NOT NULL DEFAULT '8px',
    "showStaff" BOOLEAN NOT NULL DEFAULT true,
    "showServices" BOOLEAN NOT NULL DEFAULT true,
    "showDuration" BOOLEAN NOT NULL DEFAULT true,
    "showPrice" BOOLEAN NOT NULL DEFAULT true,
    "customCss" TEXT,
    "greeting" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WidgetSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AvailabilityConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "monday" JSONB,
    "tuesday" JSONB,
    "wednesday" JSONB,
    "thursday" JSONB,
    "friday" JSONB,
    "saturday" JSONB,
    "sunday" JSONB,
    "slotIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AvailabilityConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Website" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "WebsiteStatus" NOT NULL DEFAULT 'DRAFT',
    "industry" TEXT,
    "theme" JSONB,
    "brandData" JSONB,
    "publishedAt" TIMESTAMP(3),
    "draftVersion" INTEGER NOT NULL DEFAULT 0,
    "liveVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsitePage" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "WebsitePageStatus" NOT NULL DEFAULT 'DRAFT',
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "seo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Integration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "IntegrationType" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "label" TEXT,
    "metadata" JSONB,
    "errorLog" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntegrationToken" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3),
    "apiKey" TEXT,
    "apiSecret" TEXT,
    "webhookSecret" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntegrationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteSection" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "component" "WebsiteComponentType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "content" JSONB NOT NULL,
    "styles" JSONB,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteSection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteAsset" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileKey" TEXT,
    "alt" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "isAi" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteAsset_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteDomain" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sslStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "dnsRecords" JSONB,
    "verifiedAt" TIMESTAMP(3),
    "provisionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WebsiteDeployment" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BUILDING',
    "errorLog" TEXT,
    "buildTimeMs" INTEGER,
    "previewUrl" TEXT,
    "liveUrl" TEXT,
    "lighthouse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteDeployment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AIWebsiteGeneration" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "mergedData" JSONB,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AIWebsiteGeneration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New chat',
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "model" TEXT,
    "provider" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "latencyMs" INTEGER,
    "toolCalls" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiAttachment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT,
    "textExtract" TEXT,
    "previewUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiFeedback" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AiUsage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "SyncLog_integrationId_idx" ON "SyncLog"("integrationId");
CREATE INDEX IF NOT EXISTS "WebhookEvent_integrationId_idx" ON "WebhookEvent"("integrationId");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX IF NOT EXISTS "Notification_appointmentId_idx" ON "Notification"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationTemplate_tenantId_type_channel_key" ON "NotificationTemplate"("tenantId", "type", "channel");
CREATE INDEX IF NOT EXISTS "BlockedDate_tenantId_date_idx" ON "BlockedDate"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "CalendarEvent_tenantId_provider_idx" ON "CalendarEvent"("tenantId", "provider");
CREATE INDEX IF NOT EXISTS "CalendarEvent_appointmentId_idx" ON "CalendarEvent"("appointmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "WidgetSettings_tenantId_key" ON "WidgetSettings"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "AvailabilityConfig_tenantId_key" ON "AvailabilityConfig"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Website_slug_key" ON "Website"("slug");
CREATE INDEX IF NOT EXISTS "Website_tenantId_idx" ON "Website"("tenantId");
CREATE INDEX IF NOT EXISTS "Website_slug_idx" ON "Website"("slug");
CREATE INDEX IF NOT EXISTS "WebsitePage_websiteId_idx" ON "WebsitePage"("websiteId");
CREATE INDEX IF NOT EXISTS "Integration_tenantId_idx" ON "Integration"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Integration_tenantId_type_key" ON "Integration"("tenantId", "type");
CREATE INDEX IF NOT EXISTS "IntegrationToken_integrationId_idx" ON "IntegrationToken"("integrationId");
CREATE INDEX IF NOT EXISTS "WebsiteSection_pageId_idx" ON "WebsiteSection"("pageId");
CREATE INDEX IF NOT EXISTS "WebsiteAsset_websiteId_idx" ON "WebsiteAsset"("websiteId");
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteDomain_domain_key" ON "WebsiteDomain"("domain");
CREATE INDEX IF NOT EXISTS "WebsiteDomain_websiteId_idx" ON "WebsiteDomain"("websiteId");
CREATE INDEX IF NOT EXISTS "WebsiteDomain_domain_idx" ON "WebsiteDomain"("domain");
CREATE INDEX IF NOT EXISTS "WebsiteDeployment_websiteId_idx" ON "WebsiteDeployment"("websiteId");
CREATE INDEX IF NOT EXISTS "AIWebsiteGeneration_websiteId_idx" ON "AIWebsiteGeneration"("websiteId");
CREATE INDEX IF NOT EXISTS "AiConversation_tenantId_userId_updatedAt_idx" ON "AiConversation"("tenantId", "userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "AiConversation_tenantId_pinned_idx" ON "AiConversation"("tenantId", "pinned");
CREATE INDEX IF NOT EXISTS "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiMessage_tenantId_createdAt_idx" ON "AiMessage"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiAttachment_conversationId_idx" ON "AiAttachment"("conversationId");
CREATE INDEX IF NOT EXISTS "AiAttachment_messageId_idx" ON "AiAttachment"("messageId");
CREATE INDEX IF NOT EXISTS "AiAttachment_tenantId_idx" ON "AiAttachment"("tenantId");
CREATE INDEX IF NOT EXISTS "AiFeedback_tenantId_idx" ON "AiFeedback"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "AiFeedback_messageId_userId_key" ON "AiFeedback"("messageId", "userId");
CREATE INDEX IF NOT EXISTS "AiUsage_tenantId_createdAt_idx" ON "AiUsage"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingLink_slug_idx" ON "BookingLink"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");

-- Foreign keys (guarded: no-op if already present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SyncLog_integrationId_fkey') THEN
    ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebhookEvent_integrationId_fkey') THEN
    ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingLink_tenantId_fkey') THEN
    ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BookingLink_staffId_fkey') THEN
    ALTER TABLE "BookingLink" ADD CONSTRAINT "BookingLink_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_tenantId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_appointmentId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_customerId_fkey') THEN
    ALTER TABLE "Notification" ADD CONSTRAINT "Notification_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'NotificationTemplate_tenantId_fkey') THEN
    ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedDate_tenantId_fkey') THEN
    ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BlockedDate_staffId_fkey') THEN
    ALTER TABLE "BlockedDate" ADD CONSTRAINT "BlockedDate_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_tenantId_fkey') THEN
    ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEvent_appointmentId_fkey') THEN
    ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WidgetSettings_tenantId_fkey') THEN
    ALTER TABLE "WidgetSettings" ADD CONSTRAINT "WidgetSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AvailabilityConfig_tenantId_fkey') THEN
    ALTER TABLE "AvailabilityConfig" ADD CONSTRAINT "AvailabilityConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Website_tenantId_fkey') THEN
    ALTER TABLE "Website" ADD CONSTRAINT "Website_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsitePage_websiteId_fkey') THEN
    ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Integration_tenantId_fkey') THEN
    ALTER TABLE "Integration" ADD CONSTRAINT "Integration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Integration_userId_fkey') THEN
    ALTER TABLE "Integration" ADD CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntegrationToken_integrationId_fkey') THEN
    ALTER TABLE "IntegrationToken" ADD CONSTRAINT "IntegrationToken_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteSection_pageId_fkey') THEN
    ALTER TABLE "WebsiteSection" ADD CONSTRAINT "WebsiteSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteAsset_websiteId_fkey') THEN
    ALTER TABLE "WebsiteAsset" ADD CONSTRAINT "WebsiteAsset_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteDomain_websiteId_fkey') THEN
    ALTER TABLE "WebsiteDomain" ADD CONSTRAINT "WebsiteDomain_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebsiteDeployment_websiteId_fkey') THEN
    ALTER TABLE "WebsiteDeployment" ADD CONSTRAINT "WebsiteDeployment_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AIWebsiteGeneration_websiteId_fkey') THEN
    ALTER TABLE "AIWebsiteGeneration" ADD CONSTRAINT "AIWebsiteGeneration_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiConversation_tenantId_fkey') THEN
    ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiMessage_conversationId_fkey') THEN
    ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiAttachment_conversationId_fkey') THEN
    ALTER TABLE "AiAttachment" ADD CONSTRAINT "AiAttachment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiAttachment_messageId_fkey') THEN
    ALTER TABLE "AiAttachment" ADD CONSTRAINT "AiAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiFeedback_conversationId_fkey') THEN
    ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiFeedback_messageId_fkey') THEN
    ALTER TABLE "AiFeedback" ADD CONSTRAINT "AiFeedback_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "AiMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AiUsage_tenantId_fkey') THEN
    ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;