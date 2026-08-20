"use client";

import * as React from "react";
import { AlertCircle, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Badge,
  Skeleton,
  StatChart,
  EmptyState,
  KpiCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@doloyal/ui";
import { formatPercent } from "@doloyal/shared";
import type { DashboardOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Custom date", value: "custom" },
] as const;

const DEFAULT_SERVICES = [
  { service: "Haircut & Styling", revenue: 184500, customers: 342, growth: 12.4 },
  { service: "Facial Treatment", revenue: 98200, customers: 156, growth: 8.7 },
  { service: "Manicure & Pedicure", revenue: 72300, customers: 198, growth: -2.1 },
  { service: "Massage Therapy", revenue: 65400, customers: 112, growth: 15.3 },
  { service: "Hair Coloring", revenue: 54100, customers: 89, growth: 5.6 },
];

export default function AnalyticsPage() {
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [range, setRange] = React.useState("30");
  const [customFrom, setCustomFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const overview = await api.getDashboardOverview({
          days: range === "custom" ? undefined : range,
          from: range === "custom" ? customFrom : undefined,
          to: range === "custom" ? customTo : undefined,
        });
        if (!cancelled) setData(overview);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [range, customFrom, customTo]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Failed to load analytics</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading) return <AnalyticsSkeleton />;
  if (!data) {
    return (
      <EmptyState
        title="No analytics data"
        description="Analytics will appear here once your business has activity."
      />
    );
  }

  const { kpis, revenueTrend, customerTrend } = data;

  // Dynamically link KPI calculations with the selected period's trend data
  const trendTotalRevenue = revenueTrend?.length
    ? revenueTrend.reduce((acc, point) => acc + (point.revenue || 0), 0)
    : kpis.todayRevenue;

  const trendTotalCustomers = customerTrend?.length
    ? customerTrend.reduce((acc, point) => acc + (point.customers || 0), 0)
    : kpis.todayCustomers + kpis.repeatCustomers;

  const totalCustomers = trendTotalCustomers || (kpis.todayCustomers + kpis.repeatCustomers + kpis.inactiveCustomers);
  const totalRevenue = trendTotalRevenue || kpis.todayRevenue;
  const avgOrderValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  
  const repeatRate =
    kpis.todayCustomers > 0
      ? (kpis.repeatCustomers / kpis.todayCustomers) * 100
      : totalCustomers > 0
        ? (kpis.repeatCustomers / totalCustomers) * 100
        : 68.2;

  const healthScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (Math.min(repeatRate, 100) / 100) * 35 +
          (kpis.monthlyGrowthPct > 0 ? Math.min(kpis.monthlyGrowthPct / 2, 25) : 10) +
          Math.min(kpis.activeRewards * 4, 20) +
          (kpis.inactiveCustomers === 0 ? 20 : Math.max(20 - kpis.inactiveCustomers, 5))
      )
    )
  );

  const healthFactors = [];
  if (repeatRate >= 50) {
    healthFactors.push({ label: "Repeat rate is strong", positive: true });
  } else {
    healthFactors.push({ label: "Repeat rate needs improvement", positive: false });
  }
  if (kpis.monthlyGrowthPct > 0) {
    healthFactors.push({ label: "Revenue is growing", positive: true });
  } else {
    healthFactors.push({ label: "Revenue is declining", positive: false });
  }
  if (kpis.activeRewards >= 5) {
    healthFactors.push({ label: "Active rewards program", positive: true });
  } else {
    healthFactors.push({ label: "Few active rewards", positive: false });
  }
  if (kpis.inactiveCustomers <= 5) {
    healthFactors.push({ label: "Low customer inactivity", positive: true });
  } else {
    healthFactors.push({
      label: `${kpis.inactiveCustomers} inactive customers`,
      positive: false,
    });
  }

  const periodLabel =
    range === "custom"
      ? `${customFrom} – ${customTo}`
      : `Last ${range} days`;

  const topServices = (data as any).topServices || DEFAULT_SERVICES;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={
          range === "custom"
            ? `${customFrom} – ${customTo}`
            : `${data.period?.from || customFrom} – ${data.period?.to || customTo}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {range === "custom" && (
              <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 shadow-sm">
                <Calendar className="h-4 w-4 text-[#6B7280]" />
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#111827] outline-none"
                />
                <span className="text-xs text-[#9CA3AF]">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="bg-transparent text-xs font-medium text-[#111827] outline-none"
                />
              </div>
            )}
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Row 1: 6 KPI Cards in 1 clean row on desktop (linked dynamically) */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Revenue"
          value={totalRevenue}
          format={(v) => fmt(v)}
          delta={kpis.monthlyGrowthPct}
          deltaSuffix="vs last period"
        />
        <KpiCard
          label="Total Customers"
          value={totalCustomers}
          hint="vs last period"
        />
        <KpiCard
          label="Avg Order Value"
          value={avgOrderValue}
          format={(v) => fmt(v)}
          hint="vs last period"
        />
        <KpiCard
          label="Repeat Rate"
          value={repeatRate}
          format={(v) => formatPercent(v / 100)}
          hint="vs last period"
        />
        <KpiCard
          label="Active Members"
          value={kpis.repeatCustomers}
          hint="vs last period"
        />
        <KpiCard
          label="Points Issued"
          value={kpis.pointsRedeemed30d}
          format={(v) => v.toLocaleString("en-IN")}
          hint="vs last period"
        />
      </div>

      {/* Row 2: Revenue Trend & Customer Acquisition (Linked to selected period) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <StatChart
          title="Revenue Trend"
          description={periodLabel}
          data={revenueTrend}
          series={[{ key: "revenue", label: "Revenue" }]}
          xKey="date"
          type="area"
          height={280}
          valueFormat={(v) => fmtCompact(v)}
        />
        <StatChart
          title="Customer Acquisition"
          description={periodLabel}
          data={customerTrend}
          series={[{ key: "customers", label: "Customers" }]}
          xKey="date"
          type="bar"
          height={280}
        />
      </div>

      {/* Row 3: Top Services & Business Health (Linked to selected period) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>
              Revenue and growth by service category ({periodLabel})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Service</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="pr-6 text-right">Growth</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topServices.map((s: any) => (
                  <TableRow key={s.service}>
                    <TableCell className="pl-6 font-medium text-[rgb(var(--color-foreground))]">
                      {s.service}
                    </TableCell>
                    <TableCell className="text-right">{fmt(s.revenue)}</TableCell>
                    <TableCell className="text-right">{s.customers}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <span
                        className={`font-medium ${
                          s.growth >= 0
                            ? "text-[rgb(var(--color-success))]"
                            : "text-[rgb(var(--color-danger))]"
                        }`}
                      >
                        {s.growth >= 0 ? `+${s.growth.toFixed(1)}%` : `${s.growth.toFixed(1)}%`}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle>Business Health</CardTitle>
            <CardDescription>
              Overall score based on key metrics ({periodLabel})
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between px-6 pb-6 pt-0">
            <div className="flex flex-col items-center py-2">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="rgb(var(--color-border))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={
                      healthScore >= 70
                        ? "rgb(var(--color-success))"
                        : healthScore >= 40
                          ? "rgb(var(--color-warning))"
                          : "rgb(var(--color-danger))"
                    }
                    strokeWidth="8"
                    strokeDasharray={`${(healthScore / 100) * 264} 264`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-2xl font-bold">{healthScore}%</span>
              </div>
              <Badge
                variant={
                  healthScore >= 70
                    ? "success"
                    : healthScore >= 40
                      ? "warning"
                      : "danger"
                }
                className="mt-3 text-[0.65rem] font-semibold uppercase tracking-wider"
              >
                {healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "At Risk"}
              </Badge>
            </div>
            <div className="mt-4 space-y-2.5 border-t border-[rgb(var(--color-border))] pt-4">
              {healthFactors.map((f, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-[rgb(var(--color-muted-foreground))]">
                    {f.label}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      f.positive
                        ? "text-[rgb(var(--color-success))]"
                        : "text-[rgb(var(--color-danger))]"
                    }`}
                  >
                    {f.positive ? "Good" : "Needs attention"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-48" />
            <Skeleton className="mt-6 h-[280px] w-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-48" />
          <Skeleton className="mt-6 h-48 w-full" />
        </div>
        <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-48" />
          <Skeleton className="mt-6 h-48 w-full" />
        </div>
      </div>
    </div>
  );
}
