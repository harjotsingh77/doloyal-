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
  },
});

/**
 * Absolute URL Google OAuth redirects back to after authentication.
 * Local development: http://localhost:3000/auth/callback
 * Production:        https://www.doloyal.com/auth/callback
 *
 * The Supabase Auth project must have the matching redirect URL allow-listed
 * (and the Google OAuth client must allow the same URI).
 */
export function getAuthCallbackUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/auth/callback`;
}
