-- Client Sign-in: link customers to user accounts, track login activity,
-- and store Client Sign-in visual branding independently of workspace data.

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "clientSignInBranding" JSONB;

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "signupSource" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_userId_key" ON "Customer"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "Customer_userId_idx" ON "Customer"("userId");

ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_userId_fkey";
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
