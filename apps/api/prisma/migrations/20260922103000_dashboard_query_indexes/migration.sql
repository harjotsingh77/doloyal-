-- Dashboard and list queries filter by tenant plus a time or status column.
-- These indexes match those predicates. CREATE INDEX (not CONCURRENTLY) so
-- Prisma can run this migration inside its transaction.

CREATE INDEX IF NOT EXISTS "Customer_tenantId_createdAt_idx" ON "Customer"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_lastVisitAt_idx" ON "Customer"("tenantId", "lastVisitAt");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_status_idx" ON "Customer"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Customer_tenantId_totalSpent_idx" ON "Customer"("tenantId", "totalSpent");

CREATE INDEX IF NOT EXISTS "Invoice_tenantId_status_createdAt_idx" ON "Invoice"("tenantId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_tenantId_customerId_idx" ON "Invoice"("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_serviceId_idx" ON "InvoiceItem"("serviceId");

CREATE INDEX IF NOT EXISTS "PointsLedger_tenantId_createdAt_idx" ON "PointsLedger"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "PointsLedger_tenantId_customerId_idx" ON "PointsLedger"("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "Campaign_tenantId_status_sentAt_idx" ON "Campaign"("tenantId", "status", "sentAt");

CREATE INDEX IF NOT EXISTS "Activity_tenantId_createdAt_idx" ON "Activity"("tenantId", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_tenantId_type_status_idx" ON "Notification"("tenantId", "type", "status");
CREATE INDEX IF NOT EXISTS "Notification_tenantId_customerId_idx" ON "Notification"("tenantId", "customerId");

CREATE INDEX IF NOT EXISTS "EmailLog_tenantId_campaignId_createdAt_idx" ON "EmailLog"("tenantId", "campaignId", "createdAt");
