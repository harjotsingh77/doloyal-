import { afterEach, describe, expect, it } from 'vitest';
import {
  authFailurePath,
  authFailureReasonFromUnknown,
  messageForAuthQuery,
} from '../../../web/src/lib/oauth-errors';

const originalSession = globalThis.sessionStorage;

function mockSessionStorage() {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: mock });
  (globalThis as { window?: unknown }).window = globalThis;
}

afterEach(() => {
  if (originalSession) {
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: originalSession });
  }
});

describe('authFailureReasonFromUnknown', () => {
  it('maps DATABASE_UNAVAILABLE to unavailable', () => {
    expect(authFailureReasonFromUnknown({ code: 'DATABASE_UNAVAILABLE', status: 503 })).toBe('unavailable');
  });

  it('maps localhost Prisma errors to unavailable', () => {
    expect(
      authFailureReasonFromUnknown({
        message: "Can't reach database server at `localhost:5432`",
      }),
    ).toBe('unavailable');
  });

  it('maps generic failures to error', () => {
    expect(authFailureReasonFromUnknown({ code: 'INVALID_TOKEN', status: 401 })).toBe('error');
  });
});

describe('authFailurePath', () => {
  it('sends owner failures to /sign-in', () => {
    expect(authFailurePath(null, 'oauth')).toBe('/sign-in?auth=oauth');
    expect(authFailurePath(null, 'unavailable')).toBe('/sign-in?auth=unavailable');
  });
});

describe('messageForAuthQuery', () => {
  it('names DATABASE_UNAVAILABLE instead of a generic Google error', () => {
    mockSessionStorage();
    sessionStorage.setItem(
      'doloyal_auth_failure_detail',
      JSON.stringify({ reason: 'oauth', code: 'DATABASE_UNAVAILABLE', message: 'Prisma init failed' }),
    );
    expect(messageForAuthQuery('oauth')).toMatch(/DATABASE_UNAVAILABLE/);
  });
});
