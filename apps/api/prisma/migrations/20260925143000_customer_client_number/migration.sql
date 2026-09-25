-- Human-readable Client ID for Client Page visitors (e.g. CL-0001).

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "clientNumber" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Customer_tenantId_clientNumber_key"
  ON "Customer"("tenantId", "clientNumber");
