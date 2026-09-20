import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'placeholder-anon-key'
  );
};

/**
 * Returns the names of the build-time Supabase env vars that are missing or
 * still set to their placeholder value. An empty array means fully configured.
 * Only the variable *names* are returned — never the values (the anon key is
 * safe to expose, but keeping this helper secret-free is simpler to audit).
 */
export function getMissingSupabaseConfig(): string[] {
  const missing: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || url === 'https://placeholder.supabase.co') missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!key || key === 'placeholder-anon-key') missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return missing;
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: 'pkce',
    // The /auth/callback page exchanges `?code=` itself. Leaving the default
    // (true) races that call and treats a used PKCE code as a Google failure.
    detectSessionInUrl: false,
  },
});

/**
 * Live production origin. Apex doloyal.com 308s to www; PKCE is origin-scoped,
 * so OAuth must start and finish on www or the code verifier is lost.
 */
export const PRODUCTION_APP_ORIGIN = 'https://www.doloyal.com';

const MANAGED_AUTH_HOSTS = new Set([
  'doloyal.com',
  'www.doloyal.com',
  'doloyal.ai',
  'www.doloyal.ai',
]);

export function isManagedAuthHost(hostname: string): boolean {
  return MANAGED_AUTH_HOSTS.has(hostname.toLowerCase());
}

export function getBrowserAuthOrigin(): string {
  if (typeof window === 'undefined') return '';
  if (isManagedAuthHost(window.location.hostname)) return PRODUCTION_APP_ORIGIN;
  return window.location.origin;
}

/**
 * If production traffic is still on the apex origin, hop to www before
 * starting Google OAuth so the PKCE verifier is stored on the same origin
 * that receives `/auth/callback`.
 *
 * @returns false when a navigation was started (caller must stop).
 */
export function ensureCanonicalAuthOrigin(): boolean {
  if (typeof window === 'undefined') return true;
  if (!isManagedAuthHost(window.location.hostname)) return true;
  if (window.location.origin === PRODUCTION_APP_ORIGIN) return true;
  window.location.replace(
    `${PRODUCTION_APP_ORIGIN}${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return false;
}

/**
 * Absolute URL Google OAuth redirects back to after authentication.
 * Local development: http://localhost:3000/auth/callback
 * Production:        https://www.doloyal.com/auth/callback
 *
 * The Supabase Auth project must allow-list both:
 *   https://www.doloyal.com/auth/callback
 *   https://doloyal.com/auth/callback
 * (apex still 308s to www, preserving `?code=`).
 */
export function getAuthCallbackUrl(opts?: { clientSlug?: string }): string {
  const origin = getBrowserAuthOrigin();
  if (!origin) return '';
  const base = `${origin}/auth/callback`;
  if (opts?.clientSlug) {
    return `${base}?client=${encodeURIComponent(opts.clientSlug)}`;
  }
  return base;
}
