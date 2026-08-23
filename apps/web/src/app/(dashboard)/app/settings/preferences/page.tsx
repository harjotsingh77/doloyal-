"use client";

import * as React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@doloyal/ui";
import type { Tenant } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES } from "@/lib/currency";
import { useSettingsChrome } from "../settings-chrome";
import { SettingsSection, SettingRow, SettingsSkeleton, SettingsError } from "../settings-ui";

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

type Draft = Pick<Tenant, "currency" | "language" | "timezone" | "dateFormat" | "timeFormat">;

function draftFrom(t: Tenant): Draft {
  return {
    currency: t.currency,
    language: t.language || "en",
    timezone: t.timezone,
    dateFormat: t.dateFormat || "DD/MM/YYYY",
    timeFormat: t.timeFormat || "12h",
  };
}

export default function PreferencesSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setCurrency } = useCurrency();
  const { setStatus } = useSettingsChrome();

  // Simple preferences save immediately on change — no explicit Save button.
  const change = async (patch: Partial<Draft>) => {
    if (!tenant) return;
    setStatus("saving");
    try {
      await updateTenant.mutateAsync(patch as Record<string, unknown>);
      if (patch.currency) {
        setCurrency(patch.currency);
        localStorage.setItem("doloyal_currency", patch.currency);
      }
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  if (isLoading || !tenant) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const current = draftFrom(tenant);

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Language & Region</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          How money, dates and times are formatted across your workspace. Changes apply immediately.
        </p>
      </div>

      <SettingsSection>
        <SettingRow
          label="Currency"
          description="Used everywhere amounts are shown."
        >
          <Select value={current.currency} onValueChange={(v) => change({ currency: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Language">
          <Select value={current.language} onValueChange={(v) => change({ language: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow
          label="Timezone"
          description="Used for appointments, reminders and reports."
        >
          <Select value={current.timezone} onValueChange={(v) => change({ timezone: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Date format">
          <Select value={current.dateFormat} onValueChange={(v) => change({ dateFormat: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>

        <SettingRow label="Time format">
          <Select
            value={current.timeFormat}
            onValueChange={(v) => change({ timeFormat: v as "12h" | "24h" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
              <SelectItem value="24h">24-hour (14:30)</SelectItem>
            </SelectContent>
          </Select>
        </SettingRow>
      </SettingsSection>
    </div>
  );
}
