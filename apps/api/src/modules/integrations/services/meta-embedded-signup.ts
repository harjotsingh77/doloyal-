import { createHmac, randomUUID, timingSafeEqual } from 'crypto';

export const EMBEDDED_SIGNUP_STATE_TTL_MS = 15 * 60 * 1000;

/** Purpose-scoped HMAC key for signup state, derived from the server's encryption secret. */
export function signupStateKey(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.ENCRYPTION_KEY?.trim() || env.JWT_SECRET?.trim();
  if (!base) {
    if (env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY (or JWT_SECRET) must be configured in production');
    return 'doloyal-dev-only-whatsapp-signup-state';
  }
  return createHmac('sha256', base).update('whatsapp-embedded-signup-state:v1').digest('hex');
}

function signState(key: string, body: string): string {
  return createHmac('sha256', key).update(body).digest('base64url');
}

export interface EmbeddedSignupConfig {
  appId: string | null;
  configId: string | null;
  hasAppSecret: boolean;
  /** Env var names that are not set. Never includes values. */
  missing: string[];
  /** Env var names whose value has the wrong shape (e.g. an App ID that is not numeric). */
  invalid: string[];
}

/** Reads the Meta Embedded Signup settings. The App Secret is only reported as present / absent. */
export function readEmbeddedSignupConfig(env: NodeJS.ProcessEnv = process.env): EmbeddedSignupConfig {
  const appId = env.META_APP_ID?.trim() || null;
  const configId = env.META_EMBEDDED_SIGNUP_CONFIG_ID?.trim() || null;
  const appSecret = env.META_APP_SECRET?.trim() || '';

  const missing: string[] = [];
  if (!appId) missing.push('META_APP_ID');
  if (!appSecret) missing.push('META_APP_SECRET');
  if (!configId) missing.push('META_EMBEDDED_SIGNUP_CONFIG_ID');

  const invalid: string[] = [];
  if (appId && !/^\d{6,20}$/.test(appId)) invalid.push('META_APP_ID');
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret)) invalid.push('META_APP_SECRET');
  if (configId && !/^\d{6,25}$/.test(configId)) invalid.push('META_EMBEDDED_SIGNUP_CONFIG_ID');

  return { appId, configId, hasAppSecret: Boolean(appSecret), missing, invalid };
}

export function describeConfigProblem(config: EmbeddedSignupConfig): string | null {
  if (config.missing.length) {
    return `Meta login is not configured on the server yet (missing ${config.missing.join(', ')}). Use Advanced credentials meanwhile.`;
  }
  if (config.invalid.length) {
    return `Meta login is misconfigured on the server (${config.invalid.join(', ')} has an invalid format). Use Advanced credentials meanwhile.`;
  }
  return null;
}

interface StatePayload {
  k: 'wa_es';
  t: string;
  u: string;
  n: string;
  e: number;
}

/**
 * HMAC-signed, expiring signup state bound to the workspace and user that
 * started Embedded Signup. The FB JS SDK flow has no redirect, so this is what
 * ties the later code exchange to the session this user started.
 */
export function createSignupState(key: string, tenantId: string, userId: string, now = Date.now()) {
  const payload: StatePayload = { k: 'wa_es', t: tenantId, u: userId, n: randomUUID(), e: now + EMBEDDED_SIGNUP_STATE_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return { state: `${body}.${signState(key, body)}`, nonce: payload.n, expiresAt: payload.e };
}

export type SignupStateCheck =
  | { ok: true; nonce: string; expiresAt: number }
  | { ok: false; reason: 'invalid' | 'expired' | 'mismatch' };

export function verifySignupState(
  key: string,
  state: string | undefined,
  tenantId: string,
  userId: string,
  now = Date.now(),
): SignupStateCheck {
  if (!state || typeof state !== 'string') return { ok: false, reason: 'invalid' };
  const [body, signature, extra] = state.split('.');
  if (!body || !signature || extra !== undefined) return { ok: false, reason: 'invalid' };
  const expected = Buffer.from(signState(key, body));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return { ok: false, reason: 'invalid' };
  }
  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (payload?.k !== 'wa_es' || !payload.n || typeof payload.e !== 'number') return { ok: false, reason: 'invalid' };
  if (payload.t !== tenantId || payload.u !== userId) return { ok: false, reason: 'mismatch' };
  if (payload.e < now) return { ok: false, reason: 'expired' };
  return { ok: true, nonce: payload.n, expiresAt: payload.e };
}

const REQUIRED_SCOPES = ['whatsapp_business_management', 'whatsapp_business_messaging'];

/**
 * Validates Meta's `debug_token` data for the business token returned by
 * Embedded Signup: it must be live, issued to this app, carry the WhatsApp
 * scopes, and (when Meta reports granular targets) cover the selected WABA.
 * Returns a user-facing problem, or null when the token is acceptable.
 */
export function assessBusinessToken(
  data: any,
  expected: { appId: string; wabaId: string },
): string | null {
  if (!data || data.is_valid !== true) {
    return 'Meta returned an invalid authorization. Please try Continue with Meta again.';
  }
  if (String(data.app_id || '') !== expected.appId) {
    return 'Meta authorized a different app than the one configured for Doloyal.';
  }
  const scopes: string[] = Array.isArray(data.scopes) ? data.scopes : [];
  const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  if (missingScopes.length) {
    return `Meta login did not grant ${missingScopes.join(' and ')}. Add these permissions to your Embedded Signup configuration and try again.`;
  }
  const granular: Array<{ scope?: string; target_ids?: string[] }> = Array.isArray(data.granular_scopes)
    ? data.granular_scopes
    : [];
  const management = granular.find((g) => g?.scope === 'whatsapp_business_management');
  if (management && Array.isArray(management.target_ids) && management.target_ids.length > 0) {
    if (!management.target_ids.map(String).includes(expected.wabaId)) {
      return 'The selected WhatsApp Business Account was not shared with Doloyal. Please try again and select it.';
    }
  }
  return null;
}
