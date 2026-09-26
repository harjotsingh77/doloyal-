-- Outbound WhatsApp messages recorded on the customer timeline
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'WHATSAPP_SENT';
