"use client";

import * as React from "react";
import { Calendar } from "lucide-react";
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
  CardHoverHint,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@doloyal/ui";
import type { BusinessHealthInsight, DashboardMetricDetail, DashboardMetricId, DashboardOverview } from "@doloyal/shared";
import { compareValues } from "@doloyal/shared";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useResource } from "@/lib/use-resource";
import { MetricDetailView } from "@/components/dashboard/metric-detail-view";

const HEALTH_LABEL: Record<"healthy" | "fair" | "at_risk", string> = {
  healthy: "Healthy",
  fair: "Fair",
  at_risk: "At Risk",
};

function healthStatusFromScore(score: number): keyof typeof HEALTH_LABEL {
  if (score >= 70) return "healthy";
  if (score >= 40) return "fair";
  return "at_risk";
}

function healthSignalPrompt(label: string, from?: string, to?: string) {
  const period = from && to ? ` for ${from} to ${to}` : "";
  return `Business Health signal: "${label}"${period}. Fetch live data from the whole Doloyal SaaS (customers, invoices, orders, products, reviews, appointments, loyalty, rewards, campaigns, referrals, memberships). First write What's happening, Why this problem is happening, How to fix it, and How the fix will work. After those sections output the exact line <<<STRATEGIST>>> then write a separate Business Strategist briefing: analyze the same numbers as a strategist (priority, risk, 90-day play, what to ignore). Keep the strategist part self-contained so it can be read on its own.`;
}

const METRIC_TITLES: Record<DashboardMetricId, string> = {
  revenue: "Revenue",
  customers: "Customer growth",
  repeat_rate: "Repeat customers",
  new_customers: "New customers",
  inactive: "Inactive customers",
  points: "Points redeemed",
  orders: "Order analytics",
  reviews: "Reviews",
  appointments: "Appointments",
  memberships: "Memberships",
  ai_revenue: "Revenue insight",
  ai_retention: "Retention insight",
};

const RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "Custom date", value: "custom" },
] as const;

export default function AnalyticsPage() {
  const router = useRouter();
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();
  const [range, setRange] = React.useState("30");
  const [customFrom, setCustomFrom] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customTo, setCustomTo] = React.useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [openMetric, setOpenMetric] = React.useState<DashboardMetricId | null>(null);
  const [openPanel, setOpenPanel] = React.useState<"services" | "health" | null>(null);

  const overviewParams =
    range === "custom"
      ? { from: customFrom, to: customTo }
      : { days: range };

  const overviewQuery = useResource<DashboardOverview>({
    queryKey: ["analytics-overview", range, customFrom, customTo],
    queryFn: () => api.getDashboardOverview(overviewParams),
    scopes: ["dashboard", "customers", "orders", "products", "reviews", "campaigns", "invoices", "loyalty", "appointments", "rewards"],
    keepPrevious: true,
  });
  const healthQuery = useResource<BusinessHealthInsight>({
    queryKey: ["analytics-health", range, customFrom, customTo],
    queryFn: () => api.getBusinessHealth(overviewParams),
    scopes: ["dashboard", "customers", "orders", "reviews", "campaigns", "loyalty", "appointments"],
    keepPrevious: true,
  });
  const data = overviewQuery.data ?? null;
  const health = healthQuery.data ?? null;
  const loading = overviewQuery.isLoading && !data;
  const error = overviewQuery.error
    ? overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : "Failed to load analytics"
    : null;

  const fromDate = data?.period?.from || (range === "custom" ? customFrom : "");
  const toDate = data?.period?.to || (range === "custom" ? customTo : "");

  const detailQuery = useResource<DashboardMetricDetail>({
    queryKey: ["analytics-metric", openMetric, fromDate, toDate],
    queryFn: () => api.getDashboardMetricDetail(openMetric as DashboardMetricId, { from: fromDate, to: toDate }),
    scopes: ["dashboard"],
    enabled: Boolean(openMetric && fromDate && toDate),
  });
  const detail = openMetric ? detailQuery.data ?? null : null;
  const detailLoading = Boolean(openMetric) && detailQuery.isFetching && !detailQuery.data;
  const detailError = detailQuery.error
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : "Failed to load details"
    : null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h3 className="text-lg font-semibold">Failed to load analytics</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
          {error}
        </p>
        <button
          onClick={() => void overviewQuery.refetch()}
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

  const totalRevenue = kpis.periodRevenue ?? 0;
  const totalCustomers = kpis.totalCustomers ?? kpis.todayCustomers ?? 0;
  const newInPeriod = kpis.newCustomers ?? 0;
  const orderCount = kpis.orderCount ?? 0;
  const avgOrderValue =
    orderCount > 0
      ? (kpis.orderRevenue || 0) / orderCount
      : 0;

  const repeatRate =
    kpis.repeatCustomers + newInPeriod > 0
      ? (kpis.repeatCustomers / (kpis.repeatCustomers + newInPeriod)) * 100
      : 0;

  const revenueChange = compareValues(totalRevenue, kpis.previousPeriodRevenue ?? 0);

  const fallbackScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (Math.min(repeatRate, 100) / 100) * 35 +
          ((kpis.monthlyGrowthPct ?? 0) > 0 ? Math.min((kpis.monthlyGrowthPct as number) / 2, 25) : 10) +
          Math.min(kpis.activeRewards * 4, 20) +
          (kpis.inactiveCustomers === 0 ? 20 : Math.max(20 - kpis.inactiveCustomers, 5))
      )
    )
  );

  const fallbackFactors = [];
  if (repeatRate >= 50) {
    fallbackFactors.push({ label: "Repeat rate is strong", positive: true });
  } else {
    fallbackFactors.push({ label: "Repeat rate needs improvement", positive: false });
  }
  if ((kpis.monthlyGrowthPct ?? 0) > 0) {
    fallbackFactors.push({ label: "Revenue is growing", positive: true });
  } else {
    fallbackFactors.push({ label: "Revenue is declining", positive: false });
  }
  if (kpis.activeRewards >= 5) {
    fallbackFactors.push({ label: "Active rewards program", positive: true });
  } else {
    fallbackFactors.push({ label: "Few active rewards", positive: false });
  }
  if (kpis.inactiveCustomers <= 5) {
    fallbackFactors.push({ label: "Low customer inactivity", positive: true });
  } else {
    fallbackFactors.push({
      label: `${kpis.inactiveCustomers} inactive customers`,
      positive: false,
    });
  }

  const healthScore = health?.score ?? fallbackScore;
  const healthFactors = health?.factors?.length ? health.factors : fallbackFactors;
  const healthStatus = health?.status ?? healthStatusFromScore(healthScore);
  const healthBadge = HEALTH_LABEL[healthStatus];

  const periodLabel =
    range === "custom"
      ? `${customFrom} – ${customTo}`
      : `Last ${range} days`;

  const topServices = (data as any).topServices ?? [];

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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          compact
          label="Total Revenue"
          value={totalRevenue}
          format={(v) => fmt(v)}
          onClick={() => setOpenMetric("revenue")}
        />
        <KpiCard
          compact
          label="Total Customers"
          value={totalCustomers}
          onClick={() => setOpenMetric("customers")}
        />
        <KpiCard
          compact
          label="Avg Order Value"
          value={avgOrderValue}
          format={(v) => fmt(v)}
          onClick={() => setOpenMetric("orders")}
        />
        <KpiCard
          compact
          label="Repeat Rate"
          value={repeatRate}
          format={(v) => `${v.toFixed(1)}%`}
          onClick={() => setOpenMetric("repeat_rate")}
        />
        <KpiCard
          compact
          label="Active Members"
          value={kpis.repeatCustomers}
          onClick={() => setOpenMetric("repeat_rate")}
        />
        <KpiCard
          compact
          label="Points Issued"
          value={kpis.pointsRedeemed30d}
          format={(v) => v.toLocaleString("en-IN")}
          onClick={() => setOpenMetric("points")}
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
          onClick={() => setOpenMetric("revenue")}
        />
        <StatChart
          title="Customer Acquisition"
          description={periodLabel}
          data={customerTrend}
          series={[{ key: "customers", label: "Customers" }]}
          xKey="date"
          type="bar"
          height={280}
          onClick={() => setOpenMetric("new_customers")}
        />
      </div>

      {/* Row 3: Top Services & Business Health (Linked to selected period) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setOpenPanel("services")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenPanel("services");
            }
          }}
          className="relative flex h-full cursor-pointer flex-col transition-all hover:border-[rgb(var(--color-primary)/0.28)] hover:shadow-sm"
        >
          <CardHoverHint />
          <CardHeader>
            <div>
              <CardTitle>Top Services</CardTitle>
              <CardDescription>
                Revenue and growth by service category ({periodLabel})
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            {topServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
                <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">No service revenue yet</p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  Create paid invoices for services in this period to see your top performers.
                </p>
              </div>
            ) : (
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
                      {s.growth === null || s.growth === undefined ? (
                        <span className="text-[rgb(var(--color-muted-foreground))]">—</span>
                      ) : (
                        <span
                          className={`font-medium ${
                            s.growth >= 0
                              ? "text-[rgb(var(--color-success))]"
                              : "text-[rgb(var(--color-danger))]"
                          }`}
                        >
                          {s.growth >= 0 ? `+${Number(s.growth).toFixed(1)}%` : `${Number(s.growth).toFixed(1)}%`}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setOpenPanel("health")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpenPanel("health");
            }
          }}
          className="relative flex h-full cursor-pointer flex-col transition-all hover:border-[rgb(var(--color-primary)/0.28)] hover:shadow-sm"
        >
          <CardHoverHint />
          <CardHeader>
            <div>
              <CardTitle>Business Health</CardTitle>
              <CardDescription>
                Overall score based on key metrics ({periodLabel})
              </CardDescription>
            </div>
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
                {healthBadge}
              </Badge>
              <p className="mt-2 text-[10px] font-medium text-[rgb(var(--color-muted-foreground))]">
                {health?.source === "ai" ? "Analyzed by Doloyal AI" : "Doloyal AI"}
              </p>
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

      <MetricDetailView
        open={openMetric !== null}
        onOpenChange={(next) => {
          if (!next) setOpenMetric(null);
        }}
        title={openMetric ? METRIC_TITLES[openMetric] : "Metric"}
        loading={detailLoading}
        error={detailError}
        data={detail}
      />

      <Dialog open={openPanel !== null} onOpenChange={(next) => { if (!next) setOpenPanel(null); }}>
        <DialogContent className="max-w-3xl lg:max-w-4xl">
          {openPanel === "services" ? (
            <>
              <DialogHeader>
                <DialogTitle>Top Services</DialogTitle>
                <DialogDescription>
                  {data.period?.from} to {data.period?.to} · growth vs the previous equivalent period
                </DialogDescription>
              </DialogHeader>
              {topServices.length === 0 ? (
                <EmptyState
                  title="No data available for this period"
                  description="Create paid invoices for services in this period to see your top performers."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Current revenue</TableHead>
                        <TableHead>Customers</TableHead>
                        <TableHead>Change vs previous</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topServices.map((s: { service: string; revenue: number; customers: number; growth: number | null }) => (
                        <TableRow
                          key={s.service}
                          className="cursor-pointer"
                          onClick={() => {
                            setOpenPanel(null);
                            setOpenMetric("revenue");
                          }}
                        >
                          <TableCell className="font-medium">{s.service}</TableCell>
                          <TableCell className="tabular-nums">{fmt(s.revenue)}</TableCell>
                          <TableCell className="tabular-nums">{s.customers}</TableCell>
                          <TableCell>
                            {s.growth === null || s.growth === undefined ? (
                              <span className="text-[rgb(var(--color-muted-foreground))]">No change</span>
                            ) : (
                              <span
                                className={`font-medium tabular-nums ${
                                  s.growth >= 0
                                    ? "text-[rgb(var(--color-success))]"
                                    : "text-[rgb(var(--color-danger))]"
                                }`}
                              >
                                {s.growth >= 0 ? `+${Number(s.growth).toFixed(1)}%` : `${Number(s.growth).toFixed(1)}%`}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Business Health</DialogTitle>
                <DialogDescription>
                  {data.period?.from} to {data.period?.to} · {health?.source === "ai" ? "Doloyal AI using live SaaS data" : "score from current-period metrics"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
                    Health score
                  </p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{healthScore}%</p>
                  <Badge
                    variant={healthScore >= 70 ? "success" : healthScore >= 40 ? "warning" : "danger"}
                    className="mt-2 text-[0.65rem] font-semibold uppercase tracking-wider"
                  >
                    {healthBadge}
                  </Badge>
                  {health?.summary ? (
                    <p className="mt-3 text-sm leading-6 text-[rgb(var(--color-foreground))]">{health.summary}</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <HealthStat
                    label="Repeat rate"
                    value={`${repeatRate.toFixed(1)}%`}
                    onClick={() => {
                      setOpenPanel(null);
                      setOpenMetric("repeat_rate");
                    }}
                  />
                  <HealthStat
                    label="Revenue"
                    value={fmt(totalRevenue)}
                    hint={revenueChange.percentChangeLabel}
                    onClick={() => {
                      setOpenPanel(null);
                      setOpenMetric("revenue");
                    }}
                  />
                  <HealthStat
                    label="Inactive customers"
                    value={String(kpis.inactiveCustomers)}
                    onClick={() => {
                      setOpenPanel(null);
                      setOpenMetric("inactive");
                    }}
                  />
                  <HealthStat
                    label="Active rewards"
                    value={String(kpis.activeRewards)}
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Supporting signals</h4>
                  <div className="space-y-2">
                    {healthFactors.map((f) => (
                      <button
                        key={f.label}
                        type="button"
                        onClick={() => {
                          setOpenPanel(null);
                          router.push(
                            `/app/assistant?prompt=${encodeURIComponent(
                              healthSignalPrompt(f.label, data.period?.from, data.period?.to),
                            )}`,
                          );
                        }}
                        className="flex w-full items-center justify-between rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5 text-left text-sm transition-colors hover:border-[rgb(var(--color-primary)/0.28)] hover:bg-[rgb(var(--color-muted)/0.35)]"
                      >
                        <span>{f.label}</span>
                        <span className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium ${
                              f.positive
                                ? "text-[rgb(var(--color-success))]"
                                : "text-[rgb(var(--color-danger))]"
                            }`}
                          >
                            {f.positive ? "Good" : "Needs attention"}
                          </span>
                          <span className="text-[10px] font-medium text-[rgb(var(--color-muted-foreground))]">
                            Ask AI
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HealthStat({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5 text-left ${
        onClick ? "cursor-pointer hover:bg-[rgb(var(--color-muted)/0.35)]" : ""
      }`}
    >
      <p className="text-[11px] text-[rgb(var(--color-muted-foreground))]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-[rgb(var(--color-muted-foreground))]">{hint}</p> : null}
    </button>
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
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
