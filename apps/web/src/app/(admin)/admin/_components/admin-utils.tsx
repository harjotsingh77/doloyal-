"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button, Skeleton } from "@doloyal/ui";
import { cn } from "@doloyal/ui";
import {
  BUSINESS_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  formatCompact,
  type AdminBusinessStatus,
  type AdminSubscriptionStatus,
} from "@doloyal/shared";

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  ACTIVE: "success",
  TRIAL: "primary",
  PAUSED: "warning",
  SUSPENDED: "danger",
  CANCELED: "danger",
  TRIALING: "primary",
  PAST_DUE: "warning",
  CANCELING: "warning",
  PAYMENT_FAILED: "danger",
  CONNECTED: "success",
  PENDING: "warning",
  DISCONNECTED: "default",
  DRAFT: "default",
  GENERATING: "primary",
  PUBLISHED: "success",
  ARCHIVED: "outline",
  REQUESTED: "primary",
  COMPLETED: "success",
  REJECTED: "danger",
  OPERATIONAL: "success",
  DEGRADED: "warning",
  DOWN: "danger",
  OPEN: "warning",
  WAITING_FOR_CUSTOMER: "accent",
  RESOLVED: "success",
  CLOSED: "default",
  NEW: "primary",
  REVIEWING: "accent",
  PLANNED: "default",
  RELEASED: "success",
};

export function statusBadgeVariant(status?: string | null) {
  return STATUS_VARIANT[status ?? ""] ?? "default";
}

export function BusinessStatusBadge({ status }: { status?: AdminBusinessStatus | string | null }) {
  if (!status) return null;
  return <Badge variant={statusBadgeVariant(status)}>{BUSINESS_STATUS_LABELS[status as AdminBusinessStatus] ?? status}</Badge>;
}

export function SubscriptionStatusBadge({ status }: { status?: AdminSubscriptionStatus | string | null }) {
  if (!status) return null;
  return (
    <Badge variant={statusBadgeVariant(status)}>
      {SUBSCRIPTION_STATUS_LABELS[status as AdminSubscriptionStatus] ?? status}
    </Badge>
  );
}

export function AdminStatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]",
    primary: "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]",
    accent: "bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]",
    success: "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]",
    warning: "bg-[rgb(var(--color-warning)/0.15)] text-[rgb(var(--color-warning))]",
    danger: "bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))]",
  }[tone];

  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      <div className="flex items-center gap-3">
        {icon ? <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass)}>{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-[0.72rem] font-medium uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">{label}</p>
          <p className="truncate text-xl font-semibold text-[rgb(var(--color-foreground))]">{value}</p>
          {sub ? <p className="mt-0.5 truncate text-xs text-[rgb(var(--color-muted-foreground))]">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AdminStatCardSkeleton() {
  return <Skeleton className="h-[4.5rem] w-full rounded-xl" />;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
  label,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
  label?: string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
        {label ?? "Items"} · page {page} of {totalPages} · {total.toLocaleString("en-IN")} total
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-3.5 w-3.5" />
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ExportCsvButton({ entity, label = "Export CSV" }: { entity: string; label?: string }) {
  const [busy, setBusy] = React.useState(false);
  const doExport = async () => {
    setBusy(true);
    try {
      const { filename, csv } = await import("@/lib/api").then((m) => m.api.adminExport(entity));
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* quiet */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button variant="outline" size="sm" onClick={doExport} loading={busy}>
      {label}
    </Button>
  );
}

export function currency(amount: number) {
  return formatCompact(amount);
}
