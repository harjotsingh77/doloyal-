import { afterEach, describe, expect, it } from 'vitest';
import { validateVercelProductionEnv } from './production-env';

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

describe('validateVercelProductionEnv', () => {
  it('accepts the Supabase transaction pooler for runtime', () => {
    validEnv();
    expect(() => validateVercelProductionEnv()).not.toThrow();
  });

  it('rejects a direct runtime database connection', () => {
    validEnv();
    process.env.DATABASE_URL =
      'postgresql://postgres:password@db.example.supabase.co:5432/postgres';
    expect(() => validateVercelProductionEnv()).toThrow(/port 6543/);
  });

  it('requires serverless pool constraints', () => {
    validEnv();
    process.env.DATABASE_URL =
      'postgresql://postgres.ref:password@pooler.supabase.com:6543/postgres?pgbouncer=true';
    expect(() => validateVercelProductionEnv()).toThrow(/connection_limit=1/);
  });
});
