import { describe, expect, it } from 'vitest';
import {
  hasWhatsAppOptIn,
  whatsAppConsentKeyword,
  withWhatsAppOptIn,
  withWhatsAppOptOut,
  WHATSAPP_OPT_IN_TAG,
  WHATSAPP_OPT_OUT_TAG,
} from './whatsapp-consent';

describe('whatsapp consent', () => {
  it('requires an explicit opt-in tag', () => {
    expect(hasWhatsAppOptIn([])).toBe(false);
    expect(hasWhatsAppOptIn(['VIP'])).toBe(false);
    expect(hasWhatsAppOptIn([WHATSAPP_OPT_IN_TAG])).toBe(true);
  });

  it('opt-out wins and replaces opt-in', () => {
    const tags = withWhatsAppOptOut(['VIP', WHATSAPP_OPT_IN_TAG]);
    expect(tags).toEqual(['VIP', WHATSAPP_OPT_OUT_TAG]);
    expect(hasWhatsAppOptIn(tags)).toBe(false);
    expect(withWhatsAppOptIn(tags)).toEqual(['VIP', WHATSAPP_OPT_IN_TAG]);
  });

  it('detects STOP / START replies', () => {
    expect(whatsAppConsentKeyword(' STOP ')).toBe('OPT_OUT');
    expect(whatsAppConsentKeyword('Unsubscribe.')).toBe('OPT_OUT');
    expect(whatsAppConsentKeyword('start')).toBe('OPT_IN');
    expect(whatsAppConsentKeyword('please stop by tomorrow')).toBeNull();
  });
});
