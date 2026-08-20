-- Invitation lifecycle extension: custom message, resend tracking and
-- cancellation / acceptance audit fields.
-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN     "acceptedByUserId" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "message" TEXT;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;