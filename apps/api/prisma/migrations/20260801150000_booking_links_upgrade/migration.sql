-- Booking Links production upgrade
CREATE TABLE IF NOT EXISTS "BookingLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "staffId" TEXT,
    "slug" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COMPANY',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowCustomTime" BOOLEAN NOT NULL DEFAULT true,
    "confirmationMessage" TEXT,
    "redirectUrl" TEXT,
    "theme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "BookingLink_slug_key" ON "BookingLink"("slug");
CREATE INDEX IF NOT EXISTS "BookingLink_tenantId_idx" ON "BookingLink"("tenantId");

ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "isPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "assignmentMode" TEXT NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "staffIds" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "serviceIds" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "customerFields" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "rules" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "payment" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "loyalty" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "membershipAccess" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "authMode" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "branding" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "automations" JSONB;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "webhookUrl" TEXT;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "visitCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "bookingCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "revenueGenerated" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "lastBookingAt" TIMESTAMP(3);
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "roundRobinIndex" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "metaTitle" TEXT;
ALTER TABLE "BookingLink" ADD COLUMN IF NOT EXISTS "metaDescription" TEXT;

CREATE TABLE IF NOT EXISTS "BookingLinkVisit" (
    "id" TEXT NOT NULL,
    "bookingLinkId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingLinkVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BookingLinkVisit_bookingLinkId_createdAt_idx" ON "BookingLinkVisit"("bookingLinkId", "createdAt");
CREATE INDEX IF NOT EXISTS "BookingLinkVisit_tenantId_createdAt_idx" ON "BookingLinkVisit"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "BookingLinkVisit" ADD CONSTRAINT "BookingLinkVisit_bookingLinkId_fkey"
    FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "bookingLinkId" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Appointment_bookingLinkId_idx" ON "Appointment"("bookingLinkId");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_startTime_idx" ON "Appointment"("tenantId", "startTime");

DO $$ BEGIN
  ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_bookingLinkId_fkey"
    FOREIGN KEY ("bookingLinkId") REFERENCES "BookingLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
