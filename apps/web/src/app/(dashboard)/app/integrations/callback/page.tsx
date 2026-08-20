"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

/**
 * OAuth popup callback for integration providers (e.g. Google Calendar).
 *
 * The provider redirects here with a one-time `code` + `state`. The code is
 * exchanged server-side by the API (which also persists the connection against
 * the authenticated tenant), then the result is relayed to the opener window
 * via postMessage so the Integrations page can refresh without a reload.
 */
function IntegrationOAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    const origin = window.location.origin;
    const redirect = `${origin}/app/integrations/callback`;

    const notify = (type: string, extra?: Record<string, unknown>) => {
      window.opener?.postMessage({ type, ...extra }, origin);
    };

    const finish = (next: "success" | "error", message?: string) => {
      if (cancelled) return;
      setStatus(next);
      if (message) setErrorMessage(message);
      setTimeout(() => window.close(), 2000);
    };

    (async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const oauthError = searchParams.get("error");

      if (oauthError) {
        const msg = searchParams.get("error_description") || oauthError;
        notify("oauth-error", { error: msg });
        finish("error", msg);
        return;
      }

      if (!code || !state) {
        const msg = "Missing authorization code. Please try connecting again.";
        notify("oauth-error", { error: msg });
        finish("error", msg);
        return;
      }

      try {
        const states = JSON.parse(sessionStorage.getItem("doloyal_oauth_states") || "{}");
        const type: string | undefined = states[state];
        if (!type) throw new Error("Unknown OAuth session. Please try connecting again.");

        await api.handleOAuthCallback(type, code, redirect, state);
        notify("oauth-success", { integrationType: type });
        finish("success");
      } catch (err: any) {
        const msg = err?.message || "Failed to connect integration.";
        notify("oauth-error", { error: msg });
        finish("error", msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--color-background))]">
      <div className="flex flex-col items-center gap-4 text-center">
        {status === "processing" && (
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-primary))]" />
        )}
        {status === "success" && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-success)/0.1)]">
            <CheckCircle2 className="h-6 w-6 text-[rgb(var(--color-success))]" aria-hidden="true" />
          </div>
        )}
        {status === "error" && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--color-danger)/0.1)]">
            <XCircle className="h-6 w-6 text-[rgb(var(--color-danger))]" aria-hidden="true" />
          </div>
        )}
        <p className="max-w-xs text-sm text-[rgb(var(--color-muted-foreground))]">
          {status === "processing" && "Completing connection..."}
          {status === "success" && "Connected! You can close this window."}
          {status === "error" && errorMessage}
        </p>
      </div>
    </div>
  );
}

export default function IntegrationOAuthCallbackPage() {
  return (
    <React.Suspense fallback={null}>
      <IntegrationOAuthCallbackContent />
    </React.Suspense>
  );
}
