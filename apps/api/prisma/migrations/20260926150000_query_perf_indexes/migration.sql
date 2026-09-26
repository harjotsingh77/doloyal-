-- Hot-path indexes from the database optimization audit.
-- CREATE INDEX IF NOT EXISTS (not CONCURRENTLY) so Prisma can run inside its transaction.

CREATE INDEX IF NOT EXISTS "Branch_tenantId_idx" ON "Branch"("tenantId");

CREATE INDEX IF NOT EXISTS "Staff_tenantId_branchId_idx" ON "Staff"("tenantId", "branchId");
CREATE INDEX IF NOT EXISTS "Staff_tenantId_isAvailable_idx" ON "Staff"("tenantId", "isAvailable");

CREATE INDEX IF NOT EXISTS "Service_tenantId_isActive_idx" ON "Service"("tenantId", "isActive");

CREATE INDEX IF NOT EXISTS "Appointment_tenantId_status_startTime_idx" ON "Appointment"("tenantId", "status", "startTime");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_createdAt_idx" ON "Appointment"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_customerId_idx" ON "Appointment"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "Appointment_tenantId_staffId_startTime_idx" ON "Appointment"("tenantId", "staffId", "startTime");

CREATE INDEX IF NOT EXISTS "MembershipTier_tenantId_rank_idx" ON "MembershipTier"("tenantId", "rank");
CREATE INDEX IF NOT EXISTS "CustomerMembership_tierId_idx" ON "CustomerMembership"("tierId");

CREATE INDEX IF NOT EXISTS "Membership_tenantId_idx" ON "Membership"("tenantId");

CREATE INDEX IF NOT EXISTS "EmployeeNote_tenantId_staffProfileId_idx" ON "EmployeeNote"("tenantId", "staffProfileId");

CREATE INDEX IF NOT EXISTS "PointsLedger_tenantId_customerId_createdAt_idx" ON "PointsLedger"("tenantId", "customerId", "createdAt");

CREATE INDEX IF NOT EXISTS "RewardRedemption_tenantId_customerId_idx" ON "RewardRedemption"("tenantId", "customerId");
CREATE INDEX IF NOT EXISTS "RewardRedemption_rewardId_idx" ON "RewardRedemption"("rewardId");

CREATE INDEX IF NOT EXISTS "ReferralConversion_tenantId_convertedAt_idx" ON "ReferralConversion"("tenantId", "convertedAt");
CREATE INDEX IF NOT EXISTS "ReferralConversion_campaignId_idx" ON "ReferralConversion"("campaignId");
CREATE INDEX IF NOT EXISTS "ReferralConversion_linkId_idx" ON "ReferralConversion"("linkId");

CREATE INDEX IF NOT EXISTS "WorkflowRunStep_status_type_idx" ON "WorkflowRunStep"("status", "type");
