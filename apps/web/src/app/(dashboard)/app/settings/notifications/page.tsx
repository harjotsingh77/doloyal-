"use client";

import * as React from "react";
import { Mail, MessageSquare, Smartphone, Megaphone } from "lucide-react";
import { Switch } from "@doloyal/ui";
import type { NotificationPrefsSettings } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome } from "../settings-chrome";
import {
  SettingsSection,
  SettingsSkeleton,
  SettingsError,
} from "../settings-ui";

function ChannelIcon({ channel }: { channel: "email" | "whatsapp" | "sms" }) {
  const cls = "h-4 w-4 text-[rgb(var(--color-muted-foreground))]";
  if (channel === "email") return <Mail className={cls} />;
  if (channel === "whatsapp") return <MessageSquare className={cls} />;
  return <Smartphone className={cls} />;
}

export default function NotificationsSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  // Toggles persist immediately (optimistic) — no Save button needed.
  const setPref = (patch: Partial<NotificationPrefsSettings>) => {
    if (!tenant?.notificationPrefs) return;
    updateTenant.mutate(
      { notificationPrefs: { ...tenant.notificationPrefs, ...patch } },
      {
        onSuccess: () => setStatus("saved"),
        onError: () => setStatus("error"),
      },
    );
  };

  if (isLoading || !tenant) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const prefs: Required<NotificationPrefsSettings> = {
    email: true,
    sms: true,
    whatsapp: true,
    marketingEmails: false,
    ...tenant.notificationPrefs,
  };

  const channels: Array<{ key: "email" | "whatsapp" | "sms"; label: string }> = [
    { key: "email", label: "Email" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "sms", label: "SMS" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Notifications</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Channels used for customer messages. Changes save automatically.
        </p>
      </div>

      <SettingsSection
        title="Transactional"
        description="Booking confirmations, reminders and cancellations sent to your customers."
      >
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]">
          <div className="hidden items-center gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.5)] px-4 py-2.5 text-xs font-medium text-[rgb(var(--color-muted-foreground))] sm:flex">
            <span className="flex-1">Channel</span>
            <span className="w-11 text-center">On</span>
          </div>
          {channels.map((ch) => (
            <div
              key={ch.key}
              className="flex w-full items-center gap-3 px-4 py-3"
            >
              <ChannelIcon channel={ch.key} />
              <span className="flex-1 text-sm font-medium">{ch.label}</span>
              <Switch
                checked={prefs[ch.key]}
                onCheckedChange={(v) => setPref({ [ch.key]: v })}
                aria-label={ch.label}
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[rgb(var(--color-muted-foreground))]">
          Per-event templates (confirmations, reminders, cancellations) are managed in
          Appointments → Notifications.
        </p>
      </SettingsSection>

      <SettingsSection
        title="Marketing"
        description="Offers, promotions and newsletters — separate from operational messages."
      >
        <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] px-4 py-3">
          <Megaphone className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Marketing emails</span>
            <span className="block text-xs text-[rgb(var(--color-muted-foreground))]">
              Campaign updates from your workspace
            </span>
          </span>
          <Switch
            checked={prefs.marketingEmails}
            onCheckedChange={(v) => setPref({ marketingEmails: v })}
            aria-label="Marketing emails"
          />
        </div>
      </SettingsSection>
    </div>
  );
}
