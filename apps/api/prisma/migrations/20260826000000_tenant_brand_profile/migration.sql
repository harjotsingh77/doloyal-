-- AlterTable Tenant: white-label brand identity + customer-facing surface colors
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "brandName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "brandShortName" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "backgroundColor" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "textColor" TEXT;
