"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";
import { Badge, Button, Skeleton, cn } from "@doloyal/ui";
import type { BillingSubscription } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useSettingsChrome } from "../settings-chrome";
import { SettingsSection, SettingsError } from "../settings-ui";

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function planPrice(sub: BillingSubscription): string {
  const plan = sub.planDetails;
  if (!plan) return sub.plan;
  const amount = sub.billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  return `₹${amount.toLocaleString("en-IN")} / ${sub.billingCycle === "yearly" ? "year" : "month"}`;
}

export default function BillingSummaryPage() {
  const [sub, setSub] = React.useState<BillingSubscription | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { setStatus } = useSettingsChrome();

  React.useEffect(() => {
    let cancelled = false;
    api
      .getSubscription()
      .then((s) => !cancelled && setSub(s))
      .catch((err) =>
        !cancelled && setError(err instanceof Error ? err.message : "Failed to load billing"),
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

  const statusVariant =
    sub?.status === "ACTIVE"
      ? "success"
      : sub?.status === "TRIAL"
        ? "primary"
        : sub?.status === "PAST_DUE" || sub?.status === "CANCELED"
          ? "danger"
          : "outline";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Billing & Plan</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          A summary of your subscription. Full management lives in Billing.
        </p>
      </div>

      <SettingsSection title="Current plan">
        {sub === null ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-[rgb(var(--color-border))] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-base font-semibold capitalize">{sub.plan}</span>
                <Badge variant={statusVariant as never}>{sub.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
                {planPrice(sub)} · billed {sub.billingCycle}
              </p>
            </div>
            <div className="text-sm text-[rgb(var(--color-muted-foreground))]">
              <span className="block text-xs">Next billing date</span>
              <span className="font-medium text-[rgb(var(--color-foreground))]">
                {formatDate(sub.nextBillingDate || sub.currentPeriodEnd)}
              </span>
            </div>
          </div>
        )}
      </SettingsSection>

      {sub?.usage ? (
        <SettingsSection title="Usage this cycle">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["customers", "Customers"],
                ["staff", "Staff"],
                ["branches", "Branches"],
                ["campaigns", "Campaigns"],
                ["aiQueries", "AI queries"],
              ] as const
            ).map(([key, label]) => {
              const metric = sub.usage![key];
              if (!metric) return null;
              const pct = metric.limit ? Math.min(100, (metric.used / metric.limit) * 100) : 0;
              return (
                <li key={key} className="rounded-xl border border-[rgb(var(--color-border))] p-3.5">
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
                  <p className="mt-1 text-sm font-semibold tabular-nums">
                    {metric.used.toLocaleString()}
                    {metric.limit != null ? (
                      <span className="font-normal text-[rgb(var(--color-subtle))]">
                        {" "}
                        / {metric.limit.toLocaleString()}
                      </span>
                    ) : null}
                  </p>
                  {metric.limit != null ? (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          pct >= 90
                            ? "bg-[rgb(var(--color-danger))]"
                            : pct >= 70
                              ? "bg-[rgb(var(--color-warning))]"
                              : "bg-[rgb(var(--color-primary))]",
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </SettingsSection>
      ) : null}

      <SettingsSection title="Manage">
        <div className="flex flex-wrap gap-3">
          <Link href="/app/billing" prefetch>
            <Button variant="secondary" size="sm">
              Manage billing
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/app/billing#invoices" prefetch>
            <Button variant="ghost" size="sm">
              <Receipt className="h-4 w-4" />
              View invoices
            </Button>
          </Link>
        </div>
      </SettingsSection>
    </div>
  );
}
