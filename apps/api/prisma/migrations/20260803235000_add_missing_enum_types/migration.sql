-- Reconcile enum types that exist in the database but were never created
-- by a migration (introduced via `prisma db push` during development).
-- Idempotent: safe to apply on both a fresh database and the existing dev DB.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RewardStatus') THEN
    CREATE TYPE "RewardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED', 'SCHEDULED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteStatus') THEN
    CREATE TYPE "WebsiteStatus" AS ENUM ('DRAFT', 'GENERATING', 'PUBLISHED', 'ARCHIVED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsitePageStatus') THEN
    CREATE TYPE "WebsitePageStatus" AS ENUM ('DRAFT', 'PUBLISHED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebsiteComponentType') THEN
    CREATE TYPE "WebsiteComponentType" AS ENUM ('HERO', 'FEATURES', 'SERVICES', 'GALLERY', 'TEAM', 'PRICING', 'TESTIMONIALS', 'FAQ', 'ABOUT', 'CONTACT', 'FOOTER', 'HEADER', 'CTA', 'BLOG', 'NEWSLETTER', 'STATS', 'VIDEO', 'MAP', 'TIMELINE', 'CUSTOM');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationType') THEN
    CREATE TYPE "IntegrationType" AS ENUM ('GOOGLE_CALENDAR', 'STRIPE', 'RAZORPAY', 'RESEND');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationStatus') THEN
    CREATE TYPE "IntegrationStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'ERROR', 'EXPIRED');
  END IF;
END $$;
