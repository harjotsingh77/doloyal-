-- Reconcile Reward to the modern schema shape.
-- The init migration created Reward with the legacy shape (title/costPoints/isActive),
-- but rewards_os assumes the modern shape (name/pointsCost/status/category/...).
-- This migration is idempotent so it no-ops on databases already in the modern shape.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'title')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'name') THEN
    ALTER TABLE "Reward" RENAME COLUMN "title" TO "name";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'costPoints')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'pointsCost') THEN
    ALTER TABLE "Reward" RENAME COLUMN "costPoints" TO "pointsCost";
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'isActive')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Reward' AND column_name = 'status') THEN
    ALTER TABLE "Reward" ADD COLUMN "status" "RewardStatus" NOT NULL DEFAULT 'DRAFT';
    UPDATE "Reward" SET "status" = CASE WHEN "isActive" THEN 'ACTIVE'::"RewardStatus" ELSE 'DRAFT'::"RewardStatus" END;
    ALTER TABLE "Reward" DROP COLUMN "isActive";
  END IF;
END $$;

ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'STANDARD';
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "quantity" INTEGER;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "redeemedCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "validityDays" INTEGER NOT NULL DEFAULT 90;
ALTER TABLE "Reward" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);