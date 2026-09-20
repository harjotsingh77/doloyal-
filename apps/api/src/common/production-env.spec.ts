import { afterEach, describe, expect, it } from 'vitest';
import { normalizeDatabaseUrl, validateVercelProductionEnv } from './production-env';

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

describe('normalizeDatabaseUrl', () => {
  it('adds pgbouncer, connection_limit, and sslmode when missing', () => {
    const out = normalizeDatabaseUrl(
      'postgresql://postgres.ref:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    );
    const url = new URL(out);
    expect(url.searchParams.get('pgbouncer')).toBe('true');
    expect(url.searchParams.get('connection_limit')).toBe('1');
    expect(url.searchParams.get('sslmode')).toBe('require');
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
    expect(process.env.DATABASE_URL).toContain('connection_limit=1');
  });
});
