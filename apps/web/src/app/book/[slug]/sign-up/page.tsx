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
  ClientSignUpForm,
} from "@/components/auth/client-auth-forms";

export default function ClientSignUpPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { signUp, loginWithGoogle, isLoading, user } = useClientAuth();
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
    if (err) {
      setError("Google sign-in could not be completed. Please try again.");
    }
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
        subtitle={config.tagline || `Create your ${config.businessName} account`}
        footer={
          <p className="mt-6 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
            Already have an account?{" "}
            <Link href={`/book/${config.slug}/sign-in`} className="font-medium text-[rgb(var(--color-primary))] hover:underline">
              Sign in
            </Link>
          </p>
        }
      >
        <ClientSignUpForm
          isLoading={isLoading}
          error={error}
          showGoogle={config.showGoogle}
          showGuestLogin={config.showGuestLogin}
          cornerRadius={config.cornerRadius}
          onSubmit={async (data) => {
            setError(null);
            try {
              const next = await signUp({ ...data, slug: config.slug });
              window.location.href = destinationForClientUser(config.slug, next);
            } catch (err: any) {
              setError(err?.message || "Sign up failed. Please try again.");
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
