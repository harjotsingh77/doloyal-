-- CreateEnum
CREATE TYPE "WebsiteProjectStatus" AS ENUM ('REQUESTED', 'REVIEWING', 'IN_DISCUSSION', 'IN_PROGRESS', 'DESIGN_REVIEW', 'DEVELOPMENT', 'READY_FOR_REVIEW', 'PUBLISHED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "WebsiteConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WebsiteProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteType" TEXT NOT NULL,
    "goal" TEXT,
    "status" "WebsiteProjectStatus" NOT NULL DEFAULT 'REQUESTED',
    "liveUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteProjectRequirement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "businessLocation" TEXT,
    "businessPhone" TEXT,
    "businessEmail" TEXT,
    "existingWebsiteUrl" TEXT,
    "websiteTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designStyle" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "designPreference" TEXT NOT NULL,
    "referenceUrl" TEXT,
    "hasLogo" BOOLEAN NOT NULL DEFAULT false,
    "logoUrl" TEXT,
    "pageCount" TEXT NOT NULL,
    "requiredFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalRequirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteProjectRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteProjectFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "uploadedByRole" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "category" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteConversation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assignedAdminId" TEXT,
    "assignedAdminName" TEXT,
    "status" "WebsiteConversationStatus" NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "attachmentMimeType" TEXT,
    "isLink" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteProjectStatusHistory" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "changedById" TEXT,
    "changedByName" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteProjectStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteConversationNote" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteConversationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteProject_tenantId_status_idx" ON "WebsiteProject"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WebsiteProject_customerUserId_idx" ON "WebsiteProject"("customerUserId");

-- CreateIndex
CREATE INDEX "WebsiteProject_status_updatedAt_idx" ON "WebsiteProject"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteProjectRequirement_projectId_key" ON "WebsiteProjectRequirement"("projectId");

-- CreateIndex
CREATE INDEX "WebsiteProjectFile_projectId_idx" ON "WebsiteProjectFile"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteConversation_projectId_key" ON "WebsiteConversation"("projectId");

-- CreateIndex
CREATE INDEX "WebsiteConversation_tenantId_status_idx" ON "WebsiteConversation"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WebsiteMessage_conversationId_createdAt_idx" ON "WebsiteMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteMessage_tenantId_createdAt_idx" ON "WebsiteMessage"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteProjectStatusHistory_projectId_createdAt_idx" ON "WebsiteProjectStatusHistory"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteConversationNote_conversationId_idx" ON "WebsiteConversationNote"("conversationId");

-- AddForeignKey
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProject" ADD CONSTRAINT "WebsiteProject_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProjectRequirement" ADD CONSTRAINT "WebsiteProjectRequirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProjectFile" ADD CONSTRAINT "WebsiteProjectFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteConversation" ADD CONSTRAINT "WebsiteConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteConversation" ADD CONSTRAINT "WebsiteConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteConversation" ADD CONSTRAINT "WebsiteConversation_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMessage" ADD CONSTRAINT "WebsiteMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WebsiteConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteMessage" ADD CONSTRAINT "WebsiteMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProjectStatusHistory" ADD CONSTRAINT "WebsiteProjectStatusHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "WebsiteProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteProjectStatusHistory" ADD CONSTRAINT "WebsiteProjectStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteConversationNote" ADD CONSTRAINT "WebsiteConversationNote_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WebsiteConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;