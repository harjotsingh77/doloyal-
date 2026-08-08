-- Website Connections module
CREATE TYPE "WebsiteConnectionStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'PENDING');
CREATE TYPE "WebsiteFramework" AS ENUM ('HTML', 'PHP', 'REACT', 'NEXTJS', 'VUE', 'LARAVEL', 'WORDPRESS', 'SHOPIFY', 'ANGULAR', 'NODE', 'EXPRESS', 'CUSTOM');
CREATE TYPE "ConnectionLogLevel" AS ENUM ('INFO', 'WARN', 'ERROR', 'DEBUG');

CREATE TABLE "ConnectedWebsite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "framework" "WebsiteFramework" NOT NULL DEFAULT 'HTML',
    "status" "WebsiteConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "connectionToken" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "stats" JSONB,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConnectedWebsite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectedWebsiteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "secretKeyHash" TEXT NOT NULL,
    "secretKeyPrefix" TEXT NOT NULL,
    "webhookSecretHash" TEXT NOT NULL,
    "webhookSecretPrefix" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteWebhook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectedWebsiteId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "secretPrefix" TEXT NOT NULL,
    "events" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "lastDeliveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteWebhook_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ConnectionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectedWebsiteId" TEXT,
    "businessId" TEXT NOT NULL,
    "level" "ConnectionLogLevel" NOT NULL DEFAULT 'INFO',
    "event" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConnectionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SdkInstallation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectedWebsiteId" TEXT,
    "businessId" TEXT NOT NULL,
    "framework" "WebsiteFramework" NOT NULL DEFAULT 'HTML',
    "version" TEXT,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SdkInstallation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ConnectedWebsite_connectionToken_key" ON "ConnectedWebsite"("connectionToken");
CREATE INDEX "ConnectedWebsite_tenantId_idx" ON "ConnectedWebsite"("tenantId");
CREATE INDEX "ConnectedWebsite_businessId_idx" ON "ConnectedWebsite"("businessId");
CREATE INDEX "ConnectedWebsite_status_idx" ON "ConnectedWebsite"("status");

CREATE UNIQUE INDEX "WebsiteApiKey_publicKey_key" ON "WebsiteApiKey"("publicKey");
CREATE INDEX "WebsiteApiKey_tenantId_idx" ON "WebsiteApiKey"("tenantId");
CREATE INDEX "WebsiteApiKey_connectedWebsiteId_idx" ON "WebsiteApiKey"("connectedWebsiteId");
CREATE INDEX "WebsiteApiKey_businessId_idx" ON "WebsiteApiKey"("businessId");
CREATE INDEX "WebsiteApiKey_publicKey_idx" ON "WebsiteApiKey"("publicKey");

CREATE INDEX "WebsiteWebhook_tenantId_idx" ON "WebsiteWebhook"("tenantId");
CREATE INDEX "WebsiteWebhook_connectedWebsiteId_idx" ON "WebsiteWebhook"("connectedWebsiteId");
CREATE INDEX "WebsiteWebhook_businessId_idx" ON "WebsiteWebhook"("businessId");

CREATE INDEX "ConnectionLog_tenantId_createdAt_idx" ON "ConnectionLog"("tenantId", "createdAt");
CREATE INDEX "ConnectionLog_connectedWebsiteId_createdAt_idx" ON "ConnectionLog"("connectedWebsiteId", "createdAt");
CREATE INDEX "ConnectionLog_businessId_idx" ON "ConnectionLog"("businessId");

CREATE INDEX "SdkInstallation_tenantId_idx" ON "SdkInstallation"("tenantId");
CREATE INDEX "SdkInstallation_connectedWebsiteId_idx" ON "SdkInstallation"("connectedWebsiteId");
CREATE INDEX "SdkInstallation_businessId_idx" ON "SdkInstallation"("businessId");
CREATE INDEX "SdkInstallation_domain_idx" ON "SdkInstallation"("domain");

ALTER TABLE "ConnectedWebsite" ADD CONSTRAINT "ConnectedWebsite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteApiKey" ADD CONSTRAINT "WebsiteApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteApiKey" ADD CONSTRAINT "WebsiteApiKey_connectedWebsiteId_fkey" FOREIGN KEY ("connectedWebsiteId") REFERENCES "ConnectedWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteWebhook" ADD CONSTRAINT "WebsiteWebhook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteWebhook" ADD CONSTRAINT "WebsiteWebhook_connectedWebsiteId_fkey" FOREIGN KEY ("connectedWebsiteId") REFERENCES "ConnectedWebsite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectionLog" ADD CONSTRAINT "ConnectionLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConnectionLog" ADD CONSTRAINT "ConnectionLog_connectedWebsiteId_fkey" FOREIGN KEY ("connectedWebsiteId") REFERENCES "ConnectedWebsite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SdkInstallation" ADD CONSTRAINT "SdkInstallation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SdkInstallation" ADD CONSTRAINT "SdkInstallation_connectedWebsiteId_fkey" FOREIGN KEY ("connectedWebsiteId") REFERENCES "ConnectedWebsite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
