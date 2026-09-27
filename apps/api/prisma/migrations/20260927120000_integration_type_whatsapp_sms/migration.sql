-- IntegrationType was created without WHATSAPP / SMS (20260803235000) and no
-- later migration added them, so WhatsApp integrations could not be stored.
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'WHATSAPP';
ALTER TYPE "IntegrationType" ADD VALUE IF NOT EXISTS 'SMS';
