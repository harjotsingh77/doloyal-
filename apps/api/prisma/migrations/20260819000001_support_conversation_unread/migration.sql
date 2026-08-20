-- AlterTable
ALTER TABLE "SupportConversation" ADD COLUMN     "lastReadAt" TIMESTAMP(3),
ADD COLUMN     "unreadCount" INTEGER NOT NULL DEFAULT 0;
