import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Prefer `loadSupabase()` from ./supabase-config: importing this module
// statically puts supabase-js in the importing route's initial bundle.
export * from './supabase-config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

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
