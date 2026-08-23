"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, CalendarCheck2, IndianRupee, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, KpiCard, EmptyState } from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranchWorkspace } from "../layout";
import { BranchHeader } from "../branch-section";

export default function BranchDashboardPage() {
  const { stats, refresh } = useBranchWorkspace();
  const { format: fmt } = useCurrency();
  void refresh;

  const completionRate =
    stats.appointments30d > 0
      ? Math.round((stats.completed30d / stats.appointments30d) * 100)
      : null;

  return (
    <div className="space-y-6">
      <BranchHeader title="Dashboard" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Appointments today"
          value={stats.appointmentsToday}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Appointments (30d)"
          value={stats.appointments30d}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          accent="accent"
        />
        <KpiCard
          label="Completed (30d)"
          value={completionRate === null ? "—" : `${completionRate}%`}
          hint={`${stats.completed30d} of ${stats.appointments30d}`}
          icon={<CalendarCheck2 className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Revenue (30d)"
          value={stats.revenue30d}
          format={(v) => fmt(v)}
          hint="completed appointments"
          icon={<IndianRupee className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Team at this branch</CardTitle>
            <CardDescription>
              Staff assigned to this location. Appointments above are delivered by this team.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.staff.length === 0 ? (
              <EmptyState
                title="No team members yet"
                description="Assign staff to this branch to see its activity here."
              />
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {stats.staff.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{s.roleTitle || "Specialist"}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.isAvailable
                          ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                          : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
                      }`}
                    >
                      {s.isAvailable ? "Available" : "Off duty"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href={`/branches/${stats.branch.id}/staff`}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
            >
              View full team <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardIcon name={Users} />
            <CardTitle>Run your business centrally</CardTitle>
            <CardDescription>
              Customers, campaigns, loyalty and billing live in the main workspace — shared across
              every branch of your business.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {[
              { href: "/app/customers", label: "Customers" },
              { href: "/app/campaigns", label: "Campaigns" },
              { href: "/app/loyalty", label: "Loyalty program" },
              { href: "/app/analytics", label: "Business analytics" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 py-3 text-sm font-medium transition-colors hover:border-[rgb(var(--color-primary)/0.4)]"
              >
                {l.label}
                <ArrowRight className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CardIcon({ name: Icon }: { name: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
      <Icon className="h-5 w-5" />
    </span>
  );
}
