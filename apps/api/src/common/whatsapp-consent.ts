/**
 * WhatsApp consent, stored as customer tags so no schema migration is needed.
 *
 * Meta's WhatsApp Business Messaging Policy requires opt-in before
 * business-initiated (marketing) messages and that opt-out requests are honored.
 */
export const WHATSAPP_OPT_IN_TAG = 'whatsapp-opt-in';
export const WHATSAPP_OPT_OUT_TAG = 'whatsapp-opt-out';

export const WHATSAPP_NOT_OPTED_IN_MESSAGE =
  'This customer has not opted in to WhatsApp messages.';
export const WHATSAPP_OPTED_OUT_MESSAGE =
  'This customer has opted out of WhatsApp messages (replied STOP).';

/** Prisma `where` fragment: customers that may receive business-initiated WhatsApp messages. */
export const WHATSAPP_MARKETING_WHERE = {
  AND: [
    { tags: { has: WHATSAPP_OPT_IN_TAG } },
    { NOT: { tags: { has: WHATSAPP_OPT_OUT_TAG } } },
  ],
};

export function hasWhatsAppOptIn(tags: string[] | null | undefined): boolean {
  const list = tags || [];
  return list.includes(WHATSAPP_OPT_IN_TAG) && !list.includes(WHATSAPP_OPT_OUT_TAG);
}

export function hasWhatsAppOptOut(tags: string[] | null | undefined): boolean {
  return (tags || []).includes(WHATSAPP_OPT_OUT_TAG);
}

/** Tags after recording an explicit opt-in (clears any earlier opt-out). */
export function withWhatsAppOptIn(tags: string[] | null | undefined): string[] {
  const list = (tags || []).filter((t) => t !== WHATSAPP_OPT_OUT_TAG);
  return list.includes(WHATSAPP_OPT_IN_TAG) ? list : [...list, WHATSAPP_OPT_IN_TAG];
}

/** Tags after recording an opt-out. */
export function withWhatsAppOptOut(tags: string[] | null | undefined): string[] {
  const list = (tags || []).filter((t) => t !== WHATSAPP_OPT_IN_TAG);
  return list.includes(WHATSAPP_OPT_OUT_TAG) ? list : [...list, WHATSAPP_OPT_OUT_TAG];
}

const OPT_OUT_KEYWORDS = new Set(['stop', 'unsubscribe', 'stop all', 'opt out', 'optout', 'cancel', 'band karo', 'band']);
const OPT_IN_KEYWORDS = new Set(['start', 'subscribe', 'opt in', 'optin', 'unstop']);

export function whatsAppConsentKeyword(text: unknown): 'OPT_OUT' | 'OPT_IN' | null {
  const normalized = String(text || '').trim().toLowerCase().replace(/[.!]+$/, '');
  if (OPT_OUT_KEYWORDS.has(normalized)) return 'OPT_OUT';
  if (OPT_IN_KEYWORDS.has(normalized)) return 'OPT_IN';
  return null;
}
