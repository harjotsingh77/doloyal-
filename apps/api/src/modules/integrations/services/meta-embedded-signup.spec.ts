import { describe, expect, it } from 'vitest';
import {
  EMBEDDED_SIGNUP_STATE_TTL_MS,
  assessBusinessToken,
  createSignupState,
  describeConfigProblem,
  readEmbeddedSignupConfig,
  signupStateKey,
  verifySignupState,
} from './meta-embedded-signup';
import { isMetaOrigin, parseEmbeddedSignupMessage } from '../../../../../web/src/lib/whatsapp-embedded-signup';

const APP_ID = '123456789012345';
const SECRET = 'a'.repeat(32);
const CONFIG_ID = '987654321098765';

describe('readEmbeddedSignupConfig', () => {
  it('reports every missing variable by name only', () => {
    const config = readEmbeddedSignupConfig({} as NodeJS.ProcessEnv);
    expect(config.missing).toEqual(['META_APP_ID', 'META_APP_SECRET', 'META_EMBEDDED_SIGNUP_CONFIG_ID']);
    expect(describeConfigProblem(config)).toContain('missing META_APP_ID, META_APP_SECRET, META_EMBEDDED_SIGNUP_CONFIG_ID');
  });

  it('flags malformed values without echoing them', () => {
    const config = readEmbeddedSignupConfig({
      META_APP_ID: 'my-app',
      META_APP_SECRET: 'not-a-secret',
      META_EMBEDDED_SIGNUP_CONFIG_ID: CONFIG_ID,
    } as NodeJS.ProcessEnv);
    expect(config.missing).toEqual([]);
    expect(config.invalid).toEqual(['META_APP_ID', 'META_APP_SECRET']);
    const problem = describeConfigProblem(config)!;
    expect(problem).not.toContain('my-app');
    expect(problem).not.toContain('not-a-secret');
  });

  it('accepts a complete configuration and never exposes the secret', () => {
    const config = readEmbeddedSignupConfig({
      META_APP_ID: ` ${APP_ID} `,
      META_APP_SECRET: SECRET,
      META_EMBEDDED_SIGNUP_CONFIG_ID: CONFIG_ID,
    } as NodeJS.ProcessEnv);
    expect(describeConfigProblem(config)).toBeNull();
    expect(config.appId).toBe(APP_ID);
    expect(JSON.stringify(config)).not.toContain(SECRET);
  });
});

describe('signup state', () => {
  const key = signupStateKey({ ENCRYPTION_KEY: 'test-encryption-key' } as NodeJS.ProcessEnv);

  it('round-trips for the same workspace and user', () => {
    const { state } = createSignupState(key, 'tenant-1', 'user-1');
    const check = verifySignupState(key, state, 'tenant-1', 'user-1');
    expect(check.ok).toBe(true);
  });

  it('rejects another workspace or user', () => {
    const { state } = createSignupState(key, 'tenant-1', 'user-1');
    expect(verifySignupState(key, state, 'tenant-2', 'user-1')).toEqual({ ok: false, reason: 'mismatch' });
    expect(verifySignupState(key, state, 'tenant-1', 'user-2')).toEqual({ ok: false, reason: 'mismatch' });
  });

  it('rejects expired, tampered, or foreign-key states', () => {
    const now = Date.now();
    const { state } = createSignupState(key, 'tenant-1', 'user-1', now);
    expect(verifySignupState(key, state, 'tenant-1', 'user-1', now + EMBEDDED_SIGNUP_STATE_TTL_MS + 1)).toEqual({
      ok: false,
      reason: 'expired',
    });

    const [body, sig] = state.split('.');
    const forgedBody = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), t: 'tenant-2' }),
    ).toString('base64url');
    expect(verifySignupState(key, `${forgedBody}.${sig}`, 'tenant-2', 'user-1').ok).toBe(false);

    const otherKey = signupStateKey({ ENCRYPTION_KEY: 'other-key' } as NodeJS.ProcessEnv);
    expect(verifySignupState(otherKey, state, 'tenant-1', 'user-1').ok).toBe(false);
    expect(verifySignupState(key, undefined, 'tenant-1', 'user-1').ok).toBe(false);
    expect(verifySignupState(key, 'garbage', 'tenant-1', 'user-1').ok).toBe(false);
  });

  it('refuses to derive a key in production without a secret', () => {
    expect(() => signupStateKey({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toThrow();
  });
});

describe('assessBusinessToken', () => {
  const expected = { appId: APP_ID, wabaId: '111222333444555' };
  const good = {
    is_valid: true,
    app_id: APP_ID,
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: ['111222333444555'] }],
  };

  it('accepts a valid token for this app and WABA', () => {
    expect(assessBusinessToken(good, expected)).toBeNull();
  });

  it('rejects invalid tokens, other apps, missing scopes, and unshared WABAs', () => {
    expect(assessBusinessToken(null, expected)).toMatch(/invalid authorization/);
    expect(assessBusinessToken({ ...good, is_valid: false }, expected)).toMatch(/invalid authorization/);
    expect(assessBusinessToken({ ...good, app_id: '999' }, expected)).toMatch(/different app/);
    expect(assessBusinessToken({ ...good, scopes: ['whatsapp_business_management'] }, expected)).toMatch(
      /whatsapp_business_messaging/,
    );
    expect(
      assessBusinessToken(
        { ...good, granular_scopes: [{ scope: 'whatsapp_business_management', target_ids: ['000'] }] },
        expected,
      ),
    ).toMatch(/not shared/);
  });
});

describe('embedded signup browser messages', () => {
  it('only trusts https facebook.com origins', () => {
    expect(isMetaOrigin('https://www.facebook.com')).toBe(true);
    expect(isMetaOrigin('https://business.facebook.com')).toBe(true);
    expect(isMetaOrigin('https://facebook.com')).toBe(true);
    expect(isMetaOrigin('https://evilfacebook.com')).toBe(false);
    expect(isMetaOrigin('https://facebook.com.evil.io')).toBe(false);
    expect(isMetaOrigin('http://www.facebook.com')).toBe(false);
    expect(isMetaOrigin('null')).toBe(false);
  });

  it('parses finish, WABA-only, cancel, and error events', () => {
    expect(
      parseEmbeddedSignupMessage(
        JSON.stringify({
          type: 'WA_EMBEDDED_SIGNUP',
          event: 'FINISH',
          data: { phone_number_id: '106540352242922', waba_id: '524126980791429', business_id: '2729063490586005' },
        }),
      ),
    ).toEqual({
      kind: 'finish',
      session: { phoneNumberId: '106540352242922', wabaId: '524126980791429', businessId: '2729063490586005' },
    });
    expect(
      parseEmbeddedSignupMessage({ type: 'WA_EMBEDDED_SIGNUP', event: 'FINISH_ONLY_WABA', data: { waba_id: '1' } }),
    ).toMatchObject({ kind: 'failure', message: expect.stringMatching(/No phone number/) });
    expect(
      parseEmbeddedSignupMessage({ type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL', data: { current_step: 'PHONE_NUMBER_SETUP' } }),
    ).toMatchObject({ kind: 'failure', message: expect.stringMatching(/cancelled/) });
    expect(
      parseEmbeddedSignupMessage({ type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL', data: { error_message: 'Business verification required' } }),
    ).toMatchObject({ kind: 'failure', message: expect.stringMatching(/Business verification required/) });
    expect(parseEmbeddedSignupMessage('not json')).toBeNull();
    expect(parseEmbeddedSignupMessage({ type: 'OTHER' })).toBeNull();
  });
});
