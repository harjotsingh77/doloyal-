"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Skeleton } from "@doloyal/ui";
import { api } from "@/lib/api";
import { useSettingsChrome } from "../settings-chrome";
import { SettingsSection, SettingsError } from "../settings-ui";

type Integration = {
  id?: string;
  type?: string;
  label?: string;
  status?: string;
};

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "outline"> = {
  CONNECTED: "success",
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRED: "warning",
  ERROR: "danger",
  DISCONNECTED: "outline",
};

function titleize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function IntegrationsSummaryPage() {
  const [integrations, setIntegrations] = React.useState<Integration[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { setStatus } = useSettingsChrome();

  React.useEffect(() => {
    let cancelled = false;
    api
      .listIntegrations()
      .then((list) => !cancelled && setIntegrations(list as Integration[]))
      .catch((err) =>
        !cancelled && setError(err instanceof Error ? err.message : "Failed to load integrations"),
      );
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    setStatus("idle");
    return () => setStatus("idle");
  }, [setStatus]);

  if (error)
    return <SettingsError message={error} onRetry={() => window.location.reload()} />;

  const connected = (integrations ?? []).filter(
    (i) => i.status && ["CONNECTED", "ACTIVE"].includes(i.status),
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Integrations</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Connected apps. Connect and configure them in the Integrations center.
        </p>
      </div>

      <SettingsSection title="Connected">
        {integrations === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : connected.length === 0 ? (
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            No integrations connected yet. Payments, WhatsApp and calendar sync start here.
          </p>
        ) : (
          <ul className="divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))]">
            {connected.map((i) => (
              <li key={i.id ?? i.type} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="truncate text-sm font-medium">
                  {i.label || titleize(i.type || "Integration")}
                </span>
                <Badge variant={STATUS_VARIANT[i.status!] ?? "outline"}>
                  {(i.status || "").toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>

      <SettingsSection>
        <Link
          href="/app/integrations"
          prefetch
          className="group flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] px-4 py-4 transition-colors hover:bg-[rgb(var(--color-muted)/0.4)]"
        >
          <div>
            <p className="text-sm font-medium">Manage integrations</p>
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              Connect Razorpay, WhatsApp, Google Calendar and more.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </SettingsSection>
    </div>
  );
}
