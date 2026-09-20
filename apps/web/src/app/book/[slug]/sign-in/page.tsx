"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { destinationForClientUser, useClientAuth } from "@/lib/client-auth";
import type { ClientSignInPublicConfig } from "@doloyal/shared";
import {
  ClientAuthBrandScope,
  ClientAuthShell,
  ClientSignInForm,
} from "@/components/auth/client-auth-forms";
import { messageForAuthQuery } from "@/lib/oauth-errors";

export default function ClientSignInPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { login, loginWithGoogle, isLoading, user } = useClientAuth();
  const [config, setConfig] = React.useState<ClientSignInPublicConfig | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void api
      .getClientSignInConfig(slug)
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : "Business not found");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  React.useEffect(() => {
    if (user) {
      router.replace(destinationForClientUser(slug, user));
    }
  }, [user, slug, router]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error") || params.get("auth");
    const message = messageForAuthQuery(err);
    if (message) setError(message);
  }, []);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-primary))]" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{loadError}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-border))] border-t-[rgb(var(--color-primary))]" />
      </div>
    );
  }

  return (
    <ClientAuthBrandScope config={config}>
      <ClientAuthShell
        config={config}
        title={config.welcomeMessage}
        subtitle={config.tagline || `Sign in to ${config.businessName}`}
        footer={
          <p className="mt-6 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
            Don&apos;t have an account?{" "}
            <Link href={`/book/${config.slug}/sign-up`} className="font-medium text-[rgb(var(--color-primary))] hover:underline">
              Create one
            </Link>
          </p>
        }
      >
        <ClientSignInForm
          config={config}
          isLoading={isLoading}
          error={error}
          onSubmit={async (email, password) => {
            setError(null);
            try {
              const next = await login(email, password, config.slug);
              window.location.href = destinationForClientUser(config.slug, next);
            } catch (err: any) {
              setError(err?.message || "Login failed. Please try again.");
            }
          }}
          onGoogle={() => loginWithGoogle(config.slug)}
          onGuest={() => {
            window.location.href = `/book/${config.slug}`;
          }}
        />
      </ClientAuthShell>
    </ClientAuthBrandScope>
  );
}
