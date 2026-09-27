const DIAL_CODES: Record<string, string> = {
  IN: '91',
  US: '1',
  CA: '1',
  GB: '44',
  UK: '44',
  AE: '971',
  AU: '61',
  NZ: '64',
  SG: '65',
  MY: '60',
  PK: '92',
  BD: '880',
  LK: '94',
  NP: '977',
  SA: '966',
  QA: '974',
  KW: '965',
  OM: '968',
  BH: '973',
  ZA: '27',
  NG: '234',
  KE: '254',
  DE: '49',
  FR: '33',
  ES: '34',
  IT: '39',
  NL: '31',
  IE: '353',
  BR: '55',
  MX: '52',
  ID: '62',
  PH: '63',
  TH: '66',
};

const COUNTRY_ALIASES: Record<string, string> = {
  INDIA: 'IN',
  'UNITED STATES': 'US',
  USA: 'US',
  'UNITED KINGDOM': 'GB',
  CANADA: 'CA',
  'UNITED ARAB EMIRATES': 'AE',
  UAE: 'AE',
  AUSTRALIA: 'AU',
  SINGAPORE: 'SG',
  PAKISTAN: 'PK',
};

function dialCodeFor(country?: string | null): string | null {
  const raw = String(country || '').trim().toUpperCase();
  if (!raw) return null;
  const iso = COUNTRY_ALIASES[raw] || raw;
  return DIAL_CODES[iso] || null;
}

/**
 * Converts a stored customer phone into the international digits-only form
 * WhatsApp Cloud API expects in `to` (e.g. "919876543210").
 *
 * Numbers written with "+" or "00" are treated as already international.
 * National numbers (≤ 10 digits, optional trunk "0") get the business
 * country's dial code. Returns null when the value cannot be a WhatsApp number.
 */
export function toWhatsAppNumber(phone: string | null | undefined, country?: string | null): string | null {
  const raw = String(phone || '').trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;

  if (raw.startsWith('+')) {
    // Already international.
  } else if (raw.startsWith('00')) {
    digits = digits.slice(2);
  } else {
    const dial = dialCodeFor(country);
    const national = digits.replace(/^0+/, '');
    if (dial && national.length <= 10) {
      digits = `${dial}${national}`;
    }
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** "+91 98765 43210"-style display for an international digits string. */
export function formatWhatsAppNumber(digits: string | null | undefined): string | null {
  if (!digits) return null;
  if (digits.startsWith('91') && digits.length === 12) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.startsWith('1') && digits.length === 11) {
    return `+1 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}
