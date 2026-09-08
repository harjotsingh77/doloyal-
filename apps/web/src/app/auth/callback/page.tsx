"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured, getMissingSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { CLIENT_OAUTH_SLUG_KEY, useClientAuth, destinationForClientUser } from "@/lib/client-auth";
import type { AuthUser } from "@doloyal/shared";

/**
 * Supabase OAuth callback (PKCE).
 *
 * Owner Google sign-in lands on the dashboard.
 * Client Google sign-in (`?client=slug`) completes the customer session and
 * never opens the owner dashboard.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { resolveSupabaseSession } = useAuth();
  const { setSession } = useClientAuth();
  const handled = React.useRef(false);

  React.useEffect(() => {
    if (handled.current) return;

    const finish = (path: string) => {
      if (handled.current) return;
      handled.current = true;
      router.replace(path);
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error") || params.get("error_code");
    const clientSlug = params.get("client") || sessionStorage.getItem(CLIENT_OAUTH_SLUG_KEY);

    if (error || !isSupabaseConfigured()) {
      const missing = getMissingSupabaseConfig();
      console.error(
        "[auth/callback] Cannot complete sign-in:",
        error ? `OAuth error=${error}` : `missing Supabase env vars=${missing.join(", ")}`,
      );
      finish(clientSlug ? `/book/${clientSlug}/sign-in?auth=error` : "/sign-in?auth=error");
      return;
    }

    (async () => {
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn("exchangeCodeForSession warning:", exchangeError.message);
          }
        }

        if (clientSlug) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            finish(`/book/${clientSlug}/sign-in?auth=error`);
            return;
          }
          const result = await api.clientSupabaseExchange(session.access_token, clientSlug);
          if (result?.token && result?.user) {
            setSession(result.token, result.user as AuthUser);
            sessionStorage.removeItem(CLIENT_OAUTH_SLUG_KEY);
            window.location.href = destinationForClientUser(clientSlug, result.user as AuthUser);
            return;
          }
          finish(`/book/${clientSlug}/sign-in?auth=error`);
          return;
        }

        const user = await resolveSupabaseSession();
        if (user) {
          finish("/app/dashboard");
          return;
        }
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          finish("/app/dashboard");
          return;
        }
        finish("/sign-in?auth=error");
      } catch (err) {
        console.error("Auth callback error:", err);
        finish(clientSlug ? `/book/${clientSlug}/sign-in?auth=error` : "/sign-in?auth=error");
      }
    })();
  }, [router, resolveSupabaseSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--color-background))]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-primary))]" />
    </div>
  );
}
