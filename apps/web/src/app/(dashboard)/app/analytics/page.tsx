"use client";

import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ShoppingCart,
  Repeat,
  Award,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  Button,
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
import {
  formatPercent,
} from "@doloyal/shared";
import type { DashboardOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Custom date", value: "custom" },
] as const;

const TOP_SERVICES = [
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
        const overview = await api.getDashboardOverview();
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
    return () => { cancelled = true; };
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
  if (!data) return <EmptyState icon={<BarChart3 className="h-7 w-7" />} title="No analytics data" description="Analytics will appear here once your business has activity." />;

  const { kpis, revenueTrend, customerTrend } = data;

  const totalCustomers = kpis.todayCustomers + kpis.repeatCustomers + kpis.inactiveCustomers;
  const avgOrderValue = kpis.todayCustomers > 0 ? kpis.todayRevenue / kpis.todayCustomers : 0;
  const repeatRate = kpis.todayCustomers > 0
    ? (kpis.repeatCustomers / kpis.todayCustomers) * 100
    : 0;
  const healthScore = Math.round(
    (repeatRate / 100) * 35 +
      (kpis.monthlyGrowthPct > 0 ? Math.min(kpis.monthlyGrowthPct / 2, 25) : 0) +
      (kpis.activeRewards / 10) * 20 +
      (kpis.inactiveCustomers === 0 ? 20 : Math.max(20 - kpis.inactiveCustomers, 0))
  );

  const healthFactors = [];
  if (repeatRate >= 50) healthFactors.push({ label: "Repeat rate is strong", positive: true });
  else healthFactors.push({ label: "Repeat rate needs improvement", positive: false });
  if (kpis.monthlyGrowthPct > 0) healthFactors.push({ label: "Revenue is growing", positive: true });
  else healthFactors.push({ label: "Revenue is declining", positive: false });
  if (kpis.activeRewards >= 5) healthFactors.push({ label: "Active rewards program", positive: true });
  else healthFactors.push({ label: "Few active rewards", positive: false });
  if (kpis.inactiveCustomers <= 5) healthFactors.push({ label: "Low inactivity rate", positive: true });
  else healthFactors.push({ label: `${kpis.inactiveCustomers} inactive customers`, positive: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={
          range === "custom"
            ? `${customFrom} – ${customTo}`
            : `${data.period.from} – ${data.period.to}`
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Revenue"
          value={kpis.todayRevenue}
          format={(v) => fmt(v)}
          delta={kpis.monthlyGrowthPct}
          icon={<DollarSign className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Total Customers"
          value={totalCustomers}
          icon={<Users className="h-5 w-5" />}
          accent="accent"
        />
        <KpiCard
          label="Avg Order Value"
          value={avgOrderValue}
          format={(v) => fmt(v)}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="violet"
        />
        <KpiCard
          label="Repeat Rate"
          value={repeatRate}
          format={(v) => formatPercent(v / 100)}
          icon={<Repeat className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Active Members"
          value={kpis.repeatCustomers}
          icon={<Award className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Points Issued (30d)"
          value={kpis.pointsRedeemed30d}
          format={(v) => v.toLocaleString("en-IN")}
          icon={<Activity className="h-5 w-5" />}
          accent="danger"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatChart
          title="Revenue Trend"
          description={`Last ${range} days`}
          data={revenueTrend}
          series={[{ key: "revenue", label: "Revenue" }]}
          xKey="date"
          type="area"
          valueFormat={(v) => fmtCompact(v)}
        />
        <StatChart
          title="Customer Acquisition"
          description={`Last ${range} days`}
          data={customerTrend}
          series={[{ key: "customers", label: "Customers" }]}
          xKey="date"
          type="bar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                  Top Services
                </div>
              </CardTitle>
              <CardDescription>
                Revenue and growth by service category
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                    <TableHead className="text-right">Growth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TOP_SERVICES.map((s) => (
                    <TableRow key={s.service}>
                      <TableCell className="font-medium">{s.service}</TableCell>
                      <TableCell className="text-right">{fmt(s.revenue)}</TableCell>
                      <TableCell className="text-right">{s.customers}</TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            s.growth >= 0
                              ? "text-[rgb(var(--color-success))]"
                              : "text-[rgb(var(--color-danger))]"
                          }
                        >
                          {formatPercent(s.growth / 100)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[rgb(var(--color-accent))]" />
                Business Health
              </div>
            </CardTitle>
            <CardDescription>
              Overall score based on key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-4">
              <div className="relative flex h-24 w-24 items-center justify-center">
                <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--color-border))" strokeWidth="8" />
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
                variant={healthScore >= 70 ? "success" : healthScore >= 40 ? "warning" : "danger"}
                className="mt-3 text-[0.65rem] uppercase tracking-wider"
              >
                {healthScore >= 70 ? "Healthy" : healthScore >= 40 ? "Fair" : "At Risk"}
              </Badge>
            </div>
            <div className="mt-4 space-y-2 border-t border-[rgb(var(--color-border))] pt-4">
              {healthFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                      f.positive ? "bg-[rgb(var(--color-success))]" : "bg-[rgb(var(--color-danger))]"
                    }`}
                  />
                  <span className="text-[rgb(var(--color-muted-foreground))]">{f.label}</span>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-32" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-1 h-3 w-48" />
            <Skeleton className="mt-6 h-[280px] w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
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
