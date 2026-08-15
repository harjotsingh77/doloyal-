"use client";

import * as React from "react";
import { Activity, Info, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, StatChart } from "@doloyal/ui";
import { formatCompact } from "@doloyal/shared";
import type { AdminAnalyticsOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminAnalyticsPage() {
  const [data, setData] = React.useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState("30d");

  React.useEffect(() => {
    setLoading(true);
    api
      .adminAnalyticsOverview(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Activity className="h-10 w-10" />} title="Analytics unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Acquisition, activation, retention, and revenue trends."
        breadcrumbs={[{ label: "Admin" }, { label: "Analytics" }]}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="New signups" value={data.newSignups} icon={<Users className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Activation rate" value={`${data.activationRate}%`} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Onboarding completed" value={data.onboardingCompleted} icon={<Activity className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Activated businesses" value={data.activatedBusinesses} icon={<Users className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Active businesses" value={data.retention.activeBusinesses} icon={<Users className="h-4 w-4" />} />
        <AdminStatCard label="Weekly actives" value={data.retention.wau} icon={<Activity className="h-4 w-4" />} tone="warning" />
        <AdminStatCard label="Retention rate" value={`${data.retention.businessRetentionRate}%`} icon={<TrendingUp className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Churn rate" value={`${data.retention.churnRate}%`} icon={<TrendingUp className="h-4 w-4" />} tone={data.retention.churnRate > 5 ? "danger" : "warning"} />
      </div>

      {data.acquisition.length > 0 ? (
        <StatChart
          title="Acquisition"
          description="New businesses per day in the selected range."
          data={data.acquisition.map((p) => ({ date: p.label, value: p.newBusinesses }))}
          series={[{ key: "value", label: "New businesses" }]}
          xKey="date"
          type="area"
          valueFormat={(v) => String(v)}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[rgb(var(--color-muted))] p-3">
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">MRR</p>
                <p className="text-lg font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(data.revenue.mrr)}</p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--color-muted))] p-3">
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">ARR</p>
                <p className="text-lg font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(data.revenue.arr)}</p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--color-muted))] p-3">
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">ARPU</p>
                <p className="text-lg font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(data.revenue.arpu)}</p>
              </div>
              <div className="rounded-lg bg-[rgb(var(--color-muted))] p-3">
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">LTV</p>
                <p className="text-lg font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(data.revenue.ltv)}</p>
              </div>
            </div>
            {Object.keys(data.revenue.byPlan ?? {}).length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(data.revenue.byPlan).map(([plan, v]) => (
                  <span key={plan} className="rounded-full border border-[rgb(var(--color-border))] px-3 py-1 text-xs capitalize text-[rgb(var(--color-foreground))]">
                    {plan}: {formatCompact(v)}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signup sources</CardTitle>
          </CardHeader>
          <CardContent>
            {data.sources.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No signup source data.</p>
            ) : (
              <ul className="space-y-3">
                {data.sources.map((s) => (
                  <li key={s.source}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="capitalize text-[rgb(var(--color-foreground))]">{s.source || "direct"}</span>
                      <span className="font-medium text-[rgb(var(--color-muted-foreground))]">{s.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div className="h-full rounded-full bg-[rgb(var(--color-primary))]" style={{ width: `${data.sources.length ? Math.max(4, (s.count / Math.max(...data.sources.map((x) => x.count))) * 100) : 0}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature adoption</CardTitle>
          </CardHeader>
          <CardContent>
            {data.productUsage.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No feature usage data.</p>
            ) : (
              <ul className="space-y-3">
                {data.productUsage.map((f) => (
                  <li key={f.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[rgb(var(--color-foreground))]">{f.label}</span>
                      <span className="font-medium text-[rgb(var(--color-muted-foreground))]">{f.percentage}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div className="h-full rounded-full bg-[rgb(var(--color-accent))]" style={{ width: `${f.percentage}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}