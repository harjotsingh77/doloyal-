"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { destinationForClientUser, useClientAuth } from "@/lib/client-auth";
import type { ClientSignInPublicConfig } from "@doloyal/shared";
import {
  ClientAuthBrandScope,
  ClientAuthShell,
  CompleteProfileForm,
} from "@/components/auth/client-auth-forms";

export default function CompleteProfilePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { user, isLoading, completePhone } = useClientAuth();
  const [config, setConfig] = React.useState<ClientSignInPublicConfig | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void api.getClientSignInConfig(slug).then(setConfig).catch(() => setConfig(null));
  }, [slug]);

  React.useEffect(() => {
    if (!user) {
      router.replace(`/book/${slug}/sign-in`);
      return;
    }
    if (user && !user.needsPhone) {
      router.replace(`/book/${slug}`);
    }
  }, [user, slug, router]);

  if (!config || !user) {
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
        title="Complete your profile"
        subtitle={`Welcome to ${config.businessName}. Add your phone number to continue.`}
      >
        <CompleteProfileForm
          isLoading={isLoading}
          error={error}
          onSubmit={async (phone) => {
            setError(null);
            try {
              const next = await completePhone(phone);
              window.location.href = destinationForClientUser(config.slug, next);
            } catch (err: any) {
              setError(err?.message || "Enter a valid phone number.");
            }
          }}
        />
      </ClientAuthShell>
    </ClientAuthBrandScope>
  );
}
