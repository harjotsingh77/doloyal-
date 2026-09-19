function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in production.`);
  return value;
}

/**
 * Validates the database topology required by Vercel Functions.
 *
 * Every warm function instance can own a Prisma pool, so using Supabase's
 * direct port 5432 URL at runtime can exhaust Postgres connections quickly.
 * Runtime traffic must use the transaction pooler; DIRECT_URL remains
 * available only to Prisma's migration CLI.
 */
export function validateVercelProductionEnv(): void {
  const databaseUrl = requireEnv('DATABASE_URL');
  const directUrl = requireEnv('DIRECT_URL');
  requireEnv('JWT_SECRET');
  requireEnv('ENCRYPTION_KEY');
  requireEnv('CRON_SECRET');

  let runtime: URL;
  let direct: URL;
  try {
    runtime = new URL(databaseUrl);
    direct = new URL(directUrl);
  } catch {
    throw new Error('DATABASE_URL and DIRECT_URL must be valid PostgreSQL URLs.');
  }

  if (!['postgresql:', 'postgres:'].includes(runtime.protocol)) {
    throw new Error('DATABASE_URL must use the PostgreSQL protocol.');
  }
  if (runtime.port !== '6543') {
    throw new Error(
      'DATABASE_URL must use the Supabase transaction pooler on port 6543, not a direct database connection.',
    );
  }
  if (runtime.searchParams.get('pgbouncer') !== 'true') {
    throw new Error('DATABASE_URL must include pgbouncer=true.');
  }
  if (runtime.searchParams.get('connection_limit') !== '1') {
    throw new Error('DATABASE_URL must include connection_limit=1 for serverless safety.');
  }
  if (!['postgresql:', 'postgres:'].includes(direct.protocol)) {
    throw new Error('DIRECT_URL must use the PostgreSQL protocol.');
  }
  if (direct.port && direct.port !== '5432') {
    throw new Error('DIRECT_URL must use the direct PostgreSQL port 5432.');
  }
}
