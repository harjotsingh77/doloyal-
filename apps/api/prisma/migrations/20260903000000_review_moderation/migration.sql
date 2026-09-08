-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewType" AS ENUM ('TEXT', 'VIDEO');

-- AlterTable
ALTER TABLE "Review" ADD COLUMN "type" "ReviewType" NOT NULL DEFAULT 'TEXT';
ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Review" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "Review" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "rejectedAt" TIMESTAMP(3);
ALTER TABLE "Review" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Review" ALTER COLUMN "body" SET DEFAULT '';

-- Existing reviews were already public. Keep them visible after this change.
UPDATE "Review" SET "status" = 'APPROVED', "approvedAt" = COALESCE("publishedAt", "createdAt") WHERE "status" = 'PENDING';

-- CreateIndex
CREATE INDEX "Review_tenantId_status_publishedAt_idx" ON "Review"("tenantId", "status", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_tenantId_type_publishedAt_idx" ON "Review"("tenantId", "type", "publishedAt");
