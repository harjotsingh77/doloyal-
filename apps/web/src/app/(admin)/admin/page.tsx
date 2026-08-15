"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  Info,
  LifeBuoy,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Webhook,
} from "lucide-react";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiCard,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatChart,
} from "@doloyal/ui";
import { formatCompact, relativeTime } from "@doloyal/shared";
import type { AdminDashboardOverview } from "@doloyal/shared";
import { api } from "@/lib/api";

const RANGE_OPTIONS = ["30d", "7d", "90d", "month", "quarter", "year"] as const;

export default function AdminDashboardPage() {
  const [data, setData] = React.useState<AdminDashboardOverview | null>(null);
  const [range, setRange] = React.useState<string>("30d");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    api
      .adminDashboardOverview(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="A real-time view of the Doloyal platform — businesses, revenue, trials, and health."
        breadcrumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "30d" ? "Last 30 days" : r === "7d" ? "Last 7 days" : r === "90d" ? "Last 90 days" : r.charAt(0).toUpperCase() + r.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState
              icon={<Info className="h-10 w-10" />}
              title="Could not load the dashboard"
              description="The admin API may be unavailable. Check that the API server is running, then refresh."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total businesses"
              value={data.kpis.totalBusinesses.value}
              delta={data.kpis.activeBusinesses.delta ?? undefined}
              icon={<Building2 className="h-4 w-4" />}
              accent="primary"
            />
            <KpiCard
              label="New signups"
              value={data.kpis.newSignups.value}
              delta={data.kpis.newSignups.delta ?? undefined}
              icon={<Users className="h-4 w-4" />}
              accent="accent"
            />
            <KpiCard
              label="Paid businesses"
              value={data.kpis.paidBusinesses.value}
              delta={data.kpis.paidBusinesses.delta ?? undefined}
              icon={<CreditCard className="h-4 w-4" />}
              accent="success"
            />
            <KpiCard
              label="Monthly recurring revenue"
              value={data.kpis.mrr.value}
              format={(v) => formatCompact(v)}
              delta={data.kpis.mrr.delta ?? undefined}
              icon={<TrendingUp className="h-4 w-4" />}
              accent="violet"
            />
            <KpiCard
              label="ARR"
              value={data.kpis.arr.value}
              format={(v) => formatCompact(v)}
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <KpiCard
              label="Trial → paid rate"
              value={`${data.kpis.trialToPaidRate.value}%`}
              icon={<Sparkles className="h-4 w-4" />}
              accent="warning"
            />
            <KpiCard
              label="Churn (30d)"
              value={`${data.kpis.churnRate.value}%`}
              icon={<TrendingDown className="h-4 w-4" />}
              accent="danger"
            />
            <KpiCard
              label="Open tickets"
              value={data.kpis.openTickets.value}
              icon={<LifeBuoy className="h-4 w-4" />}
            />
          </div>

          {/* Alerts */}
          {data.alerts.length > 0 ? (
            <div className="space-y-2">
              {data.alerts.map((a) => (
                <div
                  key={a.id}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    a.severity === "danger"
                      ? "border-[rgb(var(--color-danger)/0.25)] bg-[rgb(var(--color-danger)/0.06)] text-[rgb(var(--color-danger))]"
                      : a.severity === "warning"
                        ? "border-[rgb(var(--color-warning)/0.3)] bg-[rgb(var(--color-warning)/0.08)] text-[rgb(var(--color-warning))]"
                        : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.4)] text-[rgb(var(--color-muted-foreground))]"
                  }`}
                >
                  {a.severity === "danger" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : a.severity === "warning" ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs opacity-90">{a.message}</p>
                  </div>
                  {a.link ? (
                    <Link href={a.link} className="ml-auto shrink-0 text-xs font-medium underline-offset-2 hover:underline">
                      View
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {/* Revenue + growth charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue trend</CardTitle>
              </CardHeader>
              <CardContent>
                <StatChart
                  data={data.revenueTrend}
                  xKey="label"
                  type="area"
                  height={240}
                  series={[
                    { key: "revenue", label: "Revenue", color: "#2563EB" },
                    { key: "netRevenue", label: "Net", color: "#10B981" },
                  ]}
                  valueFormat={(v) => formatCompact(v)}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <StatChart
                  data={data.growth}
                  xKey="label"
                  type="bar"
                  height={240}
                  series={[
                    { key: "newUsers", label: "New users", color: "#60A5FA" },
                    { key: "newBusinesses", label: "New businesses", color: "#2563EB" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>

          {/* AI insights */}
          {data.insights.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>AI Insights</CardTitle>
                <Sparkles className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.insights.map((i) => (
                    <div key={i.id} className="flex items-start gap-3 rounded-lg border border-[rgb(var(--color-border))] p-3">
                      {i.direction === "up" ? (
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-success))]" />
                      ) : i.direction === "down" ? (
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-danger))]" />
                      ) : (
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{i.title}</p>
                        <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">{i.description}</p>
                      </div>
                      {i.metric ? <Badge variant="outline">{i.metric}</Badge> : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Recent activity */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[rgb(var(--color-border))]">
                  {data.recentActivity.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          a.type.toLowerCase().includes("payment") || a.type.toLowerCase().includes("refund")
                            ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                            : "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                        }`}
                      >
                        {a.type.toLowerCase().includes("payment") || a.type.toLowerCase().includes("refund") ? (
                          <CreditCard className="h-3 w-3" />
                        ) : (
                          <Building2 className="h-3 w-3" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-xs font-medium text-[rgb(var(--color-foreground))]">{a.message}</p>
                        <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(a.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recent signups */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Recent signups</CardTitle>
                <Link href="/admin/businesses" className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline">
                  All businesses <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-[rgb(var(--color-border))]">
                  {data.recentSignups.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-[rgb(var(--color-foreground))]">{s.name}</p>
                        <p className="truncate text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{s.email}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline">{s.plan}</Badge>
                        <span className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(s.createdAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recent tickets + payments */}
            <Card className="lg:col-span-1">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Support</CardTitle>
                <Link href="/admin/support" className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline">
                  All tickets <ArrowRight className="h-3 w-3" />
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {data.recentTickets.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No tickets yet.</p>
                ) : (
                  <ul className="divide-y divide-[rgb(var(--color-border))]">
                    {data.recentTickets.map((t) => (
                      <li key={t.id} className="px-5 py-3">
                        <p className="line-clamp-1 text-xs font-medium text-[rgb(var(--color-foreground))]">
                          <span className="text-[rgb(var(--color-primary))]">{t.ticketNumber}</span> {t.subject}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <Badge variant="outline">{t.status}</Badge>
                          <span className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(t.updatedAt)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Feature adoption */}
          <Card>
            <CardHeader>
              <CardTitle>Feature adoption</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.featureAdoption.map((f) => (
                  <div key={f.key} className="rounded-lg border border-[rgb(var(--color-border))] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium capitalize text-[rgb(var(--color-foreground))]">{f.label}</p>
                      <span className="text-lg font-semibold text-[rgb(var(--color-primary))]">{f.percentage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div
                        className="h-full rounded-full bg-[rgb(var(--color-primary))]"
                        style={{ width: `${Math.min(100, f.percentage)}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                      {f.activeBusinesses} of {f.totalBusinesses} businesses
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
