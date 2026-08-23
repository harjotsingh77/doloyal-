-- Webhook security & data integrity (additive, safe for existing data)

-- Idempotent webhook processing: dedupe provider events per integration.
ALTER TABLE "WebhookEvent" ADD COLUMN IF NOT EXISTS "externalEventId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_integrationId_externalEventId_key"
  ON "WebhookEvent"("integrationId", "externalEventId");

-- One authoritative credential row per integration.
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationToken_integrationId_key"
  ON "IntegrationToken"("integrationId");

-- One subscription row per tenant (billing state must be unambiguous).
CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- Invoice numbers are unique within a business.
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_tenantId_invoiceNumber_key"
  ON "Invoice"("tenantId", "invoiceNumber");
