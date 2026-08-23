"use client";

import * as React from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@doloyal/ui";
import type { LegalPoliciesSettings, Tenant } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome, useUnsavedGuard } from "../settings-chrome";
import {
  SettingsSection,
  SaveBar,
  SettingsSkeleton,
  SettingsError,
  RichTextEditor,
  jsonEqual,
} from "../settings-ui";

const POLICIES = [
  { key: "privacyPolicy" as const, label: "Privacy Policy" },
  { key: "termsAndConditions" as const, label: "Terms & Conditions" },
  { key: "refundPolicy" as const, label: "Refund Policy" },
  { key: "cancellationPolicy" as const, label: "Cancellation Policy" },
];

type Draft = Required<LegalPoliciesSettings>;

function draftFrom(t: Tenant): Draft {
  return {
    privacyPolicy: t.legalPolicies?.privacyPolicy ?? "",
    termsAndConditions: t.legalPolicies?.termsAndConditions ?? "",
    refundPolicy: t.legalPolicies?.refundPolicy ?? "",
    cancellationPolicy: t.legalPolicies?.cancellationPolicy ?? "",
  };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

export default function LegalSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [baseline, setBaseline] = React.useState<Draft | null>(null);
  const [activeTab, setActiveTab] = React.useState<string>(POLICIES[0].key);
  const [saving, setSaving] = React.useState(false);

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

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    setStatus("saving");
    try {
      await updateTenant.mutateAsync({ legalPolicies: draft });
      setBaseline(draft);
      setStatus("saved");
      toast.success("Policies updated");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => baseline && setDraft(baseline);

  const lastUpdated = tenant.updatedAt
    ? new Date(tenant.updatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Legal</h2>
          <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
            Policies shown on your booking and public pages.
          </p>
        </div>
        {lastUpdated ? (
          <p className="shrink-0 text-xs text-[rgb(var(--color-subtle))]">
            Last updated {lastUpdated}
          </p>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full flex-wrap justify-start gap-1 sm:inline-flex">
          {POLICIES.map((p) => {
            const filled = stripHtml(draft[p.key]).length > 0;
            return (
              <TabsTrigger key={p.key} value={p.key} className="gap-1.5 text-xs sm:text-sm">
                {p.label}
                <span
                  aria-hidden
                  className={
                    filled
                      ? "h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-success))]"
                      : "h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-border))]"
                  }
                />
              </TabsTrigger>
            );
          })}
        </TabsList>

        {POLICIES.map((p) => {
          const html = draft[p.key];
          const chars = stripHtml(html).length;
          return (
            <TabsContent key={p.key} value={p.key} className="mt-4 space-y-2">
              <RichTextEditor
                value={html}
                onChange={(next) =>
                  setDraft((prev) => (prev ? { ...prev, [p.key]: next } : prev))
                }
                placeholder={`Write your ${p.label.toLowerCase()}…`}
              />
              <div className="flex items-center justify-between text-xs text-[rgb(var(--color-subtle))]">
                <span>{chars.toLocaleString()} characters</span>
                {dirty ? <span className="font-medium text-[rgb(var(--color-warning))]">Unsaved edits</span> : null}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={discard}
        hint="Saving publishes all four policies together."
      />
    </div>
  );
}
