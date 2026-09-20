import { afterEach, describe, expect, it } from 'vitest';
import { isAuthProduction, isLocalhostDatabaseUrl, normalizeDatabaseUrl, validateVercelProductionEnv } from './production-env';

const original = { ...process.env };

function validEnv() {
  process.env.DATABASE_URL =
    'postgresql://postgres.ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
  process.env.DIRECT_URL =
    'postgresql://postgres:password@db.example.supabase.co:5432/postgres';
  process.env.JWT_SECRET = 'j'.repeat(48);
  process.env.ENCRYPTION_KEY = 'e'.repeat(48);
  process.env.CRON_SECRET = 'c'.repeat(48);
}

afterEach(() => {
  process.env = { ...original };
});

describe('isAuthProduction', () => {
  it('is true on Vercel production even when NODE_ENV was copied from local', () => {
    process.env.NODE_ENV = 'development';
    process.env.VERCEL_ENV = 'production';
    expect(isAuthProduction()).toBe(true);
  });

  it('is false for local development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.VERCEL_ENV;
    expect(isAuthProduction()).toBe(false);
  });
});

describe('normalizeDatabaseUrl', () => {
  it('adds pgbouncer, connection_limit, pool_timeout, and sslmode when missing', () => {
    const out = normalizeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    );
    const url = new URL(out);
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.get('connection_limit')).toBe('5');
    expect(url.searchParams.get('pool_timeout')).toBe('20');
    expect(url.searchParams.get('sslmode')).toBe('require');
  });

  it('raises a too-small connection_limit so dashboard overview can run', () => {
    const out = normalizeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?connection_limit=1',
    );
    expect(new URL(out).searchParams.get('connection_limit')).toBe('5');
  });
});

describe('validateVercelProductionEnv', () => {
  it('accepts the Supabase transaction pooler for runtime', () => {
    validEnv();
    expect(() => validateVercelProductionEnv()).not.toThrow();
    expect(process.env.DATABASE_URL).toContain('sslmode=require');
  });

  it('rejects a direct runtime database connection', () => {
    validEnv();
    process.env.DATABASE_URL =
      'postgresql://postgres:password@db.example.supabase.co:5432/postgres';
    expect(() => validateVercelProductionEnv()).toThrow(/port 6543/);
  });

  it('fills serverless pool constraints instead of failing', () => {
    validEnv();
    process.env.DATABASE_URL =
      'postgresql://postgres.ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    expect(() => validateVercelProductionEnv()).not.toThrow();
    expect(process.env.DATABASE_URL).toContain('connection_limit=5');
  });

  it('rejects localhost, which is unreachable from Vercel', () => {
    validEnv();
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/doloyal';
    expect(() => validateVercelProductionEnv()).toThrow(/localhost/);
  });

  it('rejects 127.0.0.1 the same way', () => {
    validEnv();
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@127.0.0.1:5432/doloyal';
    expect(() => validateVercelProductionEnv()).toThrow(/localhost/);
  });
});

describe('isLocalhostDatabaseUrl', () => {
  it('detects loopback hosts', () => {
    expect(isLocalhostDatabaseUrl('postgresql://postgres:postgres@localhost:5432/doloyal')).toBe(true);
    expect(isLocalhostDatabaseUrl('postgresql://postgres:postgres@127.0.0.1:5432/doloyal')).toBe(true);
    expect(
      isLocalhostDatabaseUrl('postgresql://postgres.ref:x@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'),
    ).toBe(false);
  });
});
