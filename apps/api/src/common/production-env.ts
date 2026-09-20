function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required in production.`);
  return value;
}

/**
 * Auth must follow the hosting environment, not a copied local NODE_ENV.
 * Vercel sets VERCEL_ENV=production even when NODE_ENV was pasted as development.
 */
export function isAuthProduction(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
}

/**
 * Adds serverless-safe Prisma/Supabase query params without logging secrets.
 * Transaction-mode PgBouncer needs pgbouncer=true, a single Prisma connection,
 * and TLS. Missing any of these is a common Vercel boot failure.
 */
export function normalizeDatabaseUrl(raw: string): string {
  const url = new URL(raw);
  if (url.searchParams.get('pgbouncer') !== 'true') {
    url.searchParams.set('pgbouncer', 'true');
  }
  if (url.searchParams.get('connection_limit') !== '1') {
    url.searchParams.set('connection_limit', '1');
  }
  if (!url.searchParams.get('sslmode')) {
    url.searchParams.set('sslmode', 'require');
  }
  return url.toString();
}

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

export function isLocalhostDatabaseUrl(raw: string): boolean {
  try {
    return isLoopbackHost(new URL(raw).hostname);
  } catch {
    return /localhost|127\.0\.0\.1/.test(raw);
  }
}

function isDirectSupabaseRuntimeUrl(url: URL): boolean {
  const host = url.hostname;
  const port = url.port || (url.protocol === 'postgresql:' || url.protocol === 'postgres:' ? '5432' : '');
  const looksLikePooler = host.includes('pooler.supabase.com');
  if (isLoopbackHost(host)) return true;
  if (looksLikePooler && (port === '6543' || port === '')) return false;
  if (port === '6543') return false;
  if (host.startsWith('db.') && host.endsWith('.supabase.co') && port === '5432') return true;
  if (port === '5432' && !looksLikePooler) return true;
  return false;
}

/**
 * Validates (and normalizes) the database topology required by Vercel Functions.
 *
 * Runtime traffic must use the Supabase transaction pooler. DIRECT_URL remains
 * the direct port-5432 URL for Prisma migrate only.
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
  if (isLocalhostDatabaseUrl(databaseUrl)) {
    throw new Error(
      'DATABASE_URL points at localhost, which is unreachable from Vercel. Set it to the Supabase transaction pooler on port 6543 (Dashboard → Database → Connect → Transaction pooler).',
    );
  }
  if (isDirectSupabaseRuntimeUrl(runtime)) {
    throw new Error(
      'DATABASE_URL must use the Supabase transaction pooler on port 6543, not a direct database connection.',
    );
  }
  if (!['postgresql:', 'postgres:'].includes(direct.protocol)) {
    throw new Error('DIRECT_URL must use the PostgreSQL protocol.');
  }
  if (direct.port && direct.port !== '5432') {
    throw new Error('DIRECT_URL must use the direct PostgreSQL port 5432.');
  }

  process.env.DATABASE_URL = normalizeDatabaseUrl(databaseUrl);
}
