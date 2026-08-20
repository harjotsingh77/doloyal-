-- AlterEnum
ALTER TYPE "IntegrationStatus" ADD VALUE 'REAUTH_REQUIRED';

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT,
    "customerId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'RESEND',
    "providerMessageId" TEXT,
    "fromEmail" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "workflowId" TEXT,
    "campaignId" TEXT,
    "appointmentId" TEXT,
    "notificationType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResendDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resendDomainId" TEXT,
    "dnsRecords" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResendDomain_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_createdAt_idx" ON "EmailLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_tenantId_status_idx" ON "EmailLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EmailLog_customerId_idx" ON "EmailLog"("customerId");

-- CreateIndex
CREATE INDEX "ResendDomain_tenantId_idx" ON "ResendDomain"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ResendDomain_tenantId_domain_key" ON "ResendDomain"("tenantId", "domain");

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResendDomain" ADD CONSTRAINT "ResendDomain_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResendDomain" ADD CONSTRAINT "ResendDomain_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "Integration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

