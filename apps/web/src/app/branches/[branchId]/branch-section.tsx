"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { Card, CardContent, PageHeader, Badge } from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranchWorkspace } from "./layout";

/**
 * Shared shell for branch-workspace sections that are managed centrally in
 * the main app (customers, campaigns, etc.). It renders the REAL branch
 * header plus an honest pointer to where the feature lives — no fabricated
 * per-branch data.
 */
export function BranchCentralizedSection({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  const { stats, refresh } = useBranchWorkspace();
  void refresh;
  const b = stats.branch;

  return (
    <div className="space-y-6">
      <BranchHeader title={title} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Team members" value={String(stats.teamSize)} />
        <MiniStat label="Appointments today" value={String(stats.appointmentsToday)} />
        <MiniStat label="Appointments (30d)" value={String(stats.appointments30d)} />
        <RevenueStat value={stats.revenue30d} />
      </div>

      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{title} is managed for your whole business</p>
            <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--color-muted-foreground))]">
              {description}
            </p>
          </div>
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[rgb(var(--color-primary))] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[rgb(var(--color-primary)/0.9)]"
          >
            {linkLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function BranchHeader({ title }: { title: string }) {
  const { stats } = useBranchWorkspace();
  const b = stats.branch;

  return (
    <PageHeader
      title={title}
      description={b.name + ([b.address, b.city].filter(Boolean).length ? ` — ${[b.address, b.city].filter(Boolean).join(", ")}` : "")}
      actions={
        <Badge variant="accent">
          {stats.teamSize} team member{stats.teamSize === 1 ? "" : "s"}
        </Badge>
      }
    />
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function RevenueStat({ value }: { value: number }) {
  const { format: fmt } = useCurrency();
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[0.7rem] uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Revenue (30d)</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">{fmt(value)}</p>
      </CardContent>
    </Card>
  );
}
