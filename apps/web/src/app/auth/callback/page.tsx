"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

/**
 * Supabase OAuth callback (PKCE).
 *
 * Supabase redirects here after Google sign-in with a one-time `code` param.
 * The code is exchanged for a session in the browser (the PKCE code verifier
 * lives in localStorage), then the Supabase session is bridged into the
 * existing app session before redirecting to the dashboard, so the dashboard
 * never mounts with a stale/mock identity.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { resolveSupabaseSession } = useAuth();
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

    if (error || !isSupabaseConfigured()) {
      console.error("Auth callback error param:", error);
      finish("/sign-in?auth=error");
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
        finish("/sign-in?auth=error");
      }
    })();
  }, [router, resolveSupabaseSession]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--color-background))]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-primary))]" />
    </div>
  );
}
