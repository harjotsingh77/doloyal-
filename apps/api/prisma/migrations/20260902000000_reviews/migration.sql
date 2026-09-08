-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('DOLOYAL', 'GOOGLE');

-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE 'GOOGLE_BUSINESS_PROFILE';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN "googleReviewUrl" TEXT;
ALTER TABLE "Tenant" ADD COLUMN "googlePlaceId" TEXT;

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerId" TEXT,
    "source" "ReviewSource" NOT NULL DEFAULT 'DOLOYAL',
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorAvatarUrl" TEXT,
    "googleReviewId" TEXT,
    "googleAuthorUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_tenantId_googleReviewId_key" ON "Review"("tenantId", "googleReviewId");

-- CreateIndex
CREATE INDEX "Review_tenantId_source_publishedAt_idx" ON "Review"("tenantId", "source", "publishedAt");

-- CreateIndex
CREATE INDEX "Review_tenantId_rating_idx" ON "Review"("tenantId", "rating");

-- CreateIndex
CREATE INDEX "Review_tenantId_customerId_idx" ON "Review"("tenantId", "customerId");

-- CreateIndex
CREATE INDEX "Review_tenantId_publishedAt_idx" ON "Review"("tenantId", "publishedAt");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
