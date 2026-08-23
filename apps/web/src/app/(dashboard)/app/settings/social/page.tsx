"use client";

import * as React from "react";
import { toast } from "sonner";
import { ExternalLink, CheckCircle2, CircleDashed } from "lucide-react";
import { Input, Button, cn } from "@doloyal/ui";
import type { SocialLinksSettings, Tenant } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome, useUnsavedGuard } from "../settings-chrome";
import {
  SettingsSection,
  SaveBar,
  SettingsSkeleton,
  SettingsError,
  isValidUrl,
  jsonEqual,
} from "../settings-ui";

type SocialKey = keyof SocialLinksSettings;

const SOCIAL_FIELDS: Array<{ key: SocialKey; label: string; placeholder: string }> = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourbusiness" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourbusiness" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourbusiness" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourbusiness" },
  {
    key: "googleBusiness",
    label: "Google Business Profile",
    placeholder: "https://g.page/r/yourbusiness",
  },
  { key: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/919876543210" },
];

function draftFrom(t: Tenant): SocialLinksSettings {
  return {
    instagram: t.socialLinks?.instagram ?? "",
    facebook: t.socialLinks?.facebook ?? "",
    linkedin: t.socialLinks?.linkedin ?? "",
    youtube: t.socialLinks?.youtube ?? "",
    googleBusiness: t.socialLinks?.googleBusiness ?? "",
    whatsapp: t.socialLinks?.whatsapp ?? "",
  };
}

export default function SocialSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<SocialLinksSettings | null>(null);
  const [baseline, setBaseline] = React.useState<SocialLinksSettings | null>(null);
  const [touched, setTouched] = React.useState<Partial<Record<SocialKey, boolean>>>({});

  React.useEffect(() => {
    if (tenant && !draft) {
      const d = draftFrom(tenant);
      setDraft(d);
      setBaseline(d);
    }
  }, [tenant, draft]);

  const dirty = !!draft && !!baseline && !jsonEqual(draft, baseline);
  useUnsavedGuard(dirty);

  if (isLoading || !tenant || !draft) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const invalidEntries = Object.entries(draft).filter(
    ([key, value]) => touched[key as SocialKey] && !isValidUrl(String(value)),
  );

  const handleSave = async () => {
    if (!draft) return;
    if (invalidEntries.length > 0) {
      toast.error("Some links are not valid URLs");
      return;
    }
    setStatus("saving");
    try {
      await updateTenant.mutateAsync({ socialLinks: draft });
      setBaseline(draft);
      setTouched({});
      setStatus("saved");
      toast.success("Social links updated");
    } catch {
      setStatus("error");
    }
  };

  const discard = () => baseline && setDraft(baseline);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Social Links</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Profiles shown on your public booking page.
        </p>
      </div>

      <SettingsSection>
        <div className="divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))]">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => {
            const value = draft[key] ?? "";
            const connected = value.trim().length > 0;
            const invalid = touched[key] && !isValidUrl(value);
            return (
              <div key={key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex w-full min-w-0 items-center gap-2.5 sm:w-56 sm:shrink-0">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
                  {connected && !invalid ? (
                    <span className="hidden items-center gap-1 text-xs font-medium text-[rgb(var(--color-success))] sm:inline-flex">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  ) : (
                    <span className="hidden items-center gap-1 text-xs text-[rgb(var(--color-subtle))] sm:inline-flex">
                      <CircleDashed className="h-3.5 w-3.5" />
                      Not connected
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Input
                    value={value}
                    onChange={(e) =>
                      setDraft((p) => (p ? { ...p, [key]: e.target.value } : p))
                    }
                    onBlur={() => setTouched((p) => ({ ...p, [key]: true }))}
                    placeholder={placeholder}
                    type="url"
                    inputMode="url"
                    aria-label={label}
                    className={cn("text-sm", invalid && "border-[rgb(var(--color-danger))]")}
                  />
                  {connected ? (
                    <a
                      href={value}
                      target="_blank"
                      rel="noreferrer noopener"
                      aria-label={`Open ${label}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
                {invalid ? (
                  <p className="text-xs font-medium text-[rgb(var(--color-danger))] sm:hidden">
                    Enter a full URL starting with http:// or https://
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
        {invalidEntries.length > 0 ? (
          <p className="mt-2 text-xs font-medium text-[rgb(var(--color-danger))]">
            Links must be full URLs starting with http:// or https://
          </p>
        ) : null}
      </SettingsSection>

      <SaveBar dirty={dirty} saving={updateTenant.isPending} onSave={handleSave} onDiscard={discard} />
    </div>
  );
}
