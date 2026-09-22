"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  UserPlus,
  Gift,
  Trophy,
  CalendarClock,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  KpiCard,
  StatChart,
  PageHeader,
  Skeleton,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardHoverHint,
  EmptyState,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@doloyal/ui";
import {
  formatPercent,
  relativeTime,
} from "@doloyal/shared";
import type { DashboardMetricDetail, DashboardMetricId, DashboardOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useResource } from "@/lib/use-resource";
import { prefetchWorkspace } from "@/lib/prefetch-workspace";
import { MetricDetailView } from "@/components/dashboard/metric-detail-view";

const toYMD = (d: Date | string) => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

function DateRangePicker({
  fromDate,
  toDate,
  onChange,
}: {
  fromDate: string;
  toDate: string;
  onChange: (from: string, to: string) => void;
}) {
  const [activePreset, setActivePreset] = React.useState<string>("30d");

  const handlePreset = (preset: string) => {
    setActivePreset(preset);
    const end = new Date();
    const start = new Date();

    if (preset === "7d") {
      start.setDate(end.getDate() - 7);
    } else if (preset === "30d") {
      start.setDate(end.getDate() - 30);
    } else if (preset === "90d") {
      start.setDate(end.getDate() - 90);
    } else if (preset === "month") {
      start.setDate(1);
    }

    onChange(toYMD(start), toYMD(end));
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-1.5 shadow-sm transition-all focus-within:border-[rgb(var(--color-primary))] focus-within:ring-2 focus-within:ring-[rgb(var(--color-primary)/0.2)]">
        <input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setActivePreset("custom");
            onChange(e.target.value, toDate);
          }}
          className="bg-transparent text-xs font-semibold text-[rgb(var(--color-foreground))] outline-none border-none p-0 cursor-pointer"
        />
        <span className="text-xs text-[rgb(var(--color-muted-foreground))] font-medium">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => {
            setActivePreset("custom");
            onChange(fromDate, e.target.value);
          }}
          className="bg-transparent text-xs font-semibold text-[rgb(var(--color-foreground))] outline-none border-none p-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-1">
        {[
          { id: "7d", label: "7 Days" },
          { id: "30d", label: "30 Days" },
          { id: "90d", label: "90 Days" },
          { id: "month", label: "This Month" },
        ].map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePreset(p.id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              activePreset === p.id
                ? "bg-[rgb(var(--color-primary))] text-white shadow-sm font-semibold"
                : "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-muted-foreground))] border border-[rgb(var(--color-border))] hover:text-[rgb(var(--color-foreground))] hover:bg-[rgb(var(--color-muted))]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();

  const defaultEnd = new Date();
  const defaultStart = new Date(defaultEnd.getTime() - 30 * 86400000);
  const [fromDate, setFromDate] = React.useState<string>(toYMD(defaultStart));
  const [toDate, setToDate] = React.useState<string>(toYMD(defaultEnd));
  const [openMetric, setOpenMetric] = React.useState<DashboardMetricId | null>(null);

  const overviewQuery = useResource<DashboardOverview>({
    queryKey: ["dashboard-overview", fromDate, toDate],
    queryFn: () => api.getDashboardOverview({ from: fromDate, to: toDate }),
    scopes: ["dashboard", "customers", "orders", "reviews", "campaigns", "invoices", "loyalty", "appointments"],
    keepPrevious: true,
  });
  const data = overviewQuery.data ?? null;
  const loading = overviewQuery.isLoading && !data;
  const error = overviewQuery.error
    ? overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : "Failed to load dashboard"
    : null;

  const detailQuery = useResource<DashboardMetricDetail>({
    queryKey: ["dashboard-metric", openMetric, fromDate, toDate],
    queryFn: () => api.getDashboardMetricDetail(openMetric as DashboardMetricId, { from: fromDate, to: toDate }),
    scopes: ["dashboard"],
    enabled: Boolean(openMetric),
  });
  React.useEffect(() => {
    if (data) prefetchWorkspace();
  }, [data]);

  const detail = openMetric ? detailQuery.data ?? null : null;
  // Prefer last snapshot over skeleton — background refetch must not blank the modal.
  const detailLoading = Boolean(openMetric) && !detail && detailQuery.isFetching;
  const detailError = detailQuery.error && !detail
    ? detailQuery.error instanceof Error
      ? detailQuery.error.message
      : "Failed to load details"
    : null;

  const dynamicMetrics = React.useMemo(() => {
    if (!data) return null;

    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    let startMs = startDate.getTime();
    let endMs = endDate.getTime();
    if (isNaN(startMs) || isNaN(endMs)) {
      endDate.setTime(Date.now());
      startDate.setTime(Date.now() - 30 * 86400000);
      startMs = startDate.getTime();
      endMs = endDate.getTime();
    }

    let diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(diffDays) || diffDays <= 0) diffDays = 30;

    // Real server-computed series only. Missing days are genuine zero-revenue
    // days — never fabricated.
    const revenueTrend = (data.revenueTrend ?? []).map((item) => ({
      date: item.date,
      revenue: item.revenue,
    }));
    const customerTrend = (data.customerTrend ?? []).map((item) => ({
      date: item.date,
      customers: item.customers,
    }));

    return {
      diffDays,
      revenueTrend,
      customerTrend,
      periodRevenue: data.kpis?.periodRevenue ?? data.kpis?.todayRevenue ?? 0,
      periodCustomers: data.kpis?.totalCustomers ?? data.kpis?.newCustomers ?? 0,
      periodRepeatCustomers: data.kpis?.repeatCustomers ?? 0,
      periodNewCustomers: data.kpis?.newCustomers ?? 0,
      periodPointsRedeemed: data.kpis?.pointsRedeemed30d ?? 0,
      periodAppointments: data.kpis?.appointmentsInPeriod ?? data.kpis?.appointmentsToday ?? 0,
      periodMembershipSales: data.kpis?.membershipSales30d ?? 0,
      periodGrowthPct: data.kpis?.monthlyGrowthPct ?? null,
      orderCount: data.kpis?.orderCount ?? 0,
      approvedReviews: data.kpis?.approvedReviews ?? 0,
    };
  }, [data, fromDate, toDate]);

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h3 className="text-lg font-semibold">Failed to load dashboard</h3>
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

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data || !dynamicMetrics) return <EmptyState title="No dashboard data" description="Dashboard will populate once your business has activity." />;

  // Defaulted rather than destructured bare: a partial overview response (an
  // older API build, or a section that failed server-side) would otherwise
  // crash the whole page on `topCustomers.map` or `kpis.appointmentsToday`.
  // Missing collections should render their existing "no data yet" rows.
  const {
    kpis = {} as NonNullable<typeof data.kpis>,
    topCustomers = [],
    topRewards = [],
    recentActivity = [],
  } = data;

  const {
    revenueTrend: displayRevenueTrend,
    customerTrend: displayCustomerTrend,
    periodRevenue,
    periodCustomers,
    periodRepeatCustomers,
    periodNewCustomers,
    periodPointsRedeemed,
    periodAppointments,
    periodMembershipSales,
    periodGrowthPct,
    diffDays,
    orderCount,
    approvedReviews,
  } = dynamicMetrics;

  const periodRepeatRate =
    periodRepeatCustomers + periodNewCustomers > 0
      ? Math.round((periodRepeatCustomers / Math.max(periodRepeatCustomers + periodNewCustomers, 1)) * 100)
      : 0;
  const growthLabel =
    periodGrowthPct === null ? "—" : formatPercent(periodGrowthPct);

  const openMetricTitle: Record<DashboardMetricId, string> = {
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onChange={(from, to) => {
              setFromDate(from);
              setToDate(to);
            }}
          />
        }
        actions={
          <Badge variant="primary">
            {growthLabel} vs last period
          </Badge>
        }
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <InsightCard
          title="AI Revenue Insight"
          badge={periodGrowthPct === null ? "New" : periodGrowthPct >= 0 ? "Growing" : "Declining"}
          badgeVariant={periodGrowthPct === null ? "accent" : periodGrowthPct >= 0 ? "success" : "danger"}
          onClick={() => setOpenMetric("ai_revenue")}
        >
          <p className="text-[13px] leading-5 text-[rgb(var(--color-foreground))]">
            {periodGrowthPct === null
              ? `No prior-period baseline yet. Revenue for this ${diffDays}-day window is ${fmt(periodRevenue)} across ${periodCustomers} customers. Growth tracking unlocks once the previous period has data.`
              : periodGrowthPct >= 0
              ? `Revenue is trending up ${formatPercent(periodGrowthPct)} over this ${diffDays}-day period (${fromDate} to ${toDate}). Total revenue of ${fmt(periodRevenue)} is driven by ${periodCustomers} customers.`
              : `Revenue declined ${Math.abs(periodGrowthPct).toFixed(1)}% in this period. Consider launching a win-back campaign to re-engage inactive customers.`}
          </p>
        </InsightCard>

        <InsightCard
          title="AI Retention Insight"
          badge={periodRepeatRate >= 50 ? "Healthy" : "Attention Needed"}
          badgeVariant={periodRepeatRate >= 50 ? "success" : "warning"}
          onClick={() => setOpenMetric("ai_retention")}
        >
          <p className="text-[13px] leading-5 text-[rgb(var(--color-foreground))]">
            {periodRepeatRate >= 50
              ? `Repeat rate is ${periodRepeatRate}% with ${periodRepeatCustomers} returning customers in this period. ${periodNewCustomers} new customers joined.`
              : `Only ${periodRepeatRate}% of customers in this period are repeat visitors. Target them with a loyalty re-engagement offer.`}
          </p>
        </InsightCard>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          compact
          label={`Revenue (${diffDays}d)`}
          value={periodRevenue}
          format={(v) => fmt(v)}
          onClick={() => setOpenMetric("revenue")}
        />
        <KpiCard
          compact
          label="Total Customers"
          value={periodCustomers}
          onClick={() => setOpenMetric("customers")}
        />
        <KpiCard
          compact
          label="Repeat Rate"
          value={periodRepeatRate}
          format={(v) => `${v}%`}
          onClick={() => setOpenMetric("repeat_rate")}
        />
        <KpiCard
          compact
          label="New Customers"
          value={periodNewCustomers}
          onClick={() => setOpenMetric("new_customers")}
        />
        <KpiCard
          compact
          label="Inactive Customers"
          value={kpis.inactiveCustomers}
          onClick={() => setOpenMetric("inactive")}
        />
        <KpiCard
          compact
          label={`Points Redeemed (${diffDays}d)`}
          value={periodPointsRedeemed}
          format={(v) => v.toLocaleString("en-IN")}
          onClick={() => setOpenMetric("points")}
        />
        <KpiCard
          compact
          label={`Orders (${diffDays}d)`}
          value={orderCount}
          onClick={() => setOpenMetric("orders")}
        />
        <KpiCard
          compact
          label="Reviews"
          value={approvedReviews}
          onClick={() => setOpenMetric("reviews")}
        />
        <KpiCard
          compact
          label={`Appointments (${diffDays}d)`}
          value={periodAppointments}
          onClick={() => setOpenMetric("appointments")}
        />
        <KpiCard
          compact
          label={`Memberships (${diffDays}d)`}
          value={periodMembershipSales}
          onClick={() => setOpenMetric("memberships")}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QuickActionButton
          label="Add Customer"
          onClick={() => router.push("/app/customers")}
        />
        <QuickActionButton
          label="Create Invoice"
          onClick={() => router.push("/app/invoices")}
        />
        <QuickActionButton
          label="Book Appointment"
          onClick={() => router.push("/app/appointments")}
        />
        <QuickActionButton
          label="Send Campaign"
          onClick={() => router.push("/app/campaigns")}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <StatChart
          title="Revenue Trend"
          description={`Selected range (${fromDate} – ${toDate})`}
          data={displayRevenueTrend}
          series={[{ key: "revenue", label: "Revenue" }]}
          xKey="date"
          type="area"
          height={220}
          valueFormat={(v) => fmtCompact(v)}
          onClick={() => setOpenMetric("revenue")}
        />
        <StatChart
          title="Customer Trend"
          description={`Selected range (${fromDate} – ${toDate})`}
          data={displayCustomerTrend}
          series={[{ key: "customers", label: "Customers" }]}
          xKey="date"
          type="bar"
          height={220}
          onClick={() => setOpenMetric("customers")}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CampaignPerformanceCard
          revenue={kpis.campaignRevenue ?? 0}
          customers={kpis.campaignCustomers ?? 0}
          reached={kpis.campaignReached ?? 0}
          campaignsSent={kpis.campaignsSent ?? 0}
          formatMoney={fmt}
          onView={() => router.push("/app/campaigns")}
        />

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div
                onClick={() => router.push("/app/appointments")}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted)/0.45)]"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {kpis.appointmentsToday > 0
                      ? `${kpis.appointmentsToday} appointment${kpis.appointmentsToday !== 1 ? "s" : ""} today`
                      : "No appointments today"}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {kpis.appointmentsToday > 0
                      ? "Check your schedule to prepare"
                      : "All clear for today"}
                  </p>
                </div>
                {kpis.appointmentsToday > 0 && (
                  <Badge variant="accent" className="shrink-0">
                    {kpis.appointmentsToday}
                  </Badge>
                )}
              </div>
              <div
                onClick={() => router.push("/app/reviews")}
                className="flex cursor-pointer items-center gap-3 rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted)/0.45)]"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {kpis.pendingReviews > 0
                      ? `${kpis.pendingReviews} pending review${kpis.pendingReviews !== 1 ? "s" : ""}`
                      : "No pending reviews"}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {kpis.pendingReviews > 0
                      ? "Open the reviews queue to approve or reject"
                      : "All reviews are handled"}
                  </p>
                </div>
                {kpis.pendingReviews > 0 && (
                  <Badge variant="warning" className="shrink-0">
                    {kpis.pendingReviews}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>LTV</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.visitCount}</TableCell>
                    <TableCell>{fmt(c.lifetimeValue)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          c.churnRisk === "LOW"
                            ? "success"
                            : c.churnRisk === "MEDIUM"
                              ? "warning"
                              : c.churnRisk === "HIGH"
                                ? "accent"
                                : "danger"
                        }
                        className="text-[0.65rem]"
                      >
                        {c.churnRisk}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {topCustomers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                      No customer data yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Rewards</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reward</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Redeemed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRewards.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.pointsCost.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{r.redeemedCount}</TableCell>
                  </TableRow>
                ))}
                {topRewards.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                      No rewards yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentActivity.map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[rgb(var(--color-muted)/0.45)]"
              >
                <ActivityIcon type={a.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[rgb(var(--color-foreground))]">
                    {a.message}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {relativeTime(a.createdAt)}
                  </p>
                </div>
                {a.amount != null && (
                  <span className="shrink-0 text-sm font-medium">
                    {fmt(a.amount)}
                  </span>
                )}
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="py-6 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                No recent activity
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <MetricDetailView
        open={openMetric !== null}
        onOpenChange={(next) => {
          if (!next) setOpenMetric(null);
        }}
        title={openMetric ? openMetricTitle[openMetric] : "Metric"}
        loading={detailLoading}
        error={detailError}
        data={detail}
      />
    </div>
  );
}

function CampaignPerformanceCard({
  revenue,
  customers,
  reached,
  campaignsSent,
  formatMoney,
  onView,
}: {
  revenue: number;
  customers: number;
  reached: number;
  campaignsSent: number;
  formatMoney: (v: number) => string;
  onView: () => void;
}) {
  const conversionPct = reached > 0 ? Math.round((customers / reached) * 1000) / 10 : 0;
  const hasActivity = revenue > 0 || customers > 0 || reached > 0 || campaignsSent > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Campaign Performance</CardTitle>
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              Customers and revenue after a campaign send
            </p>
          </div>
          <span className="shrink-0 rounded-md bg-[rgb(var(--color-muted))] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--color-muted-foreground))]">
            {campaignsSent} sent
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {hasActivity ? (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
                Revenue
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                {formatMoney(revenue)}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-[rgb(var(--color-muted-foreground))]">Converted</span>
                <span className="font-semibold tabular-nums">{conversionPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                <motion.div
                  className="h-full rounded-full bg-[rgb(var(--color-primary))]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, conversionPct)}%` }}
                  transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5">
                <p className="text-[11px] text-[rgb(var(--color-muted-foreground))]">Customers</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {customers.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-md border border-[rgb(var(--color-border))] px-3 py-2.5">
                <p className="text-[11px] text-[rgb(var(--color-muted-foreground))]">Reached</p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums">
                  {reached.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onView}
              className="h-9 w-full rounded-md bg-[rgb(var(--color-primary))] px-4 text-sm font-medium text-white hover:brightness-110"
            >
              View campaigns
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium">No campaign results yet</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-[rgb(var(--color-muted-foreground))]">
              Send a campaign to see how many customers came back and how much they spent.
            </p>
            <button
              type="button"
              onClick={onView}
              className="mt-3 h-8 rounded-md border border-[rgb(var(--color-border))] px-3 text-sm font-medium hover:bg-[rgb(var(--color-muted)/0.45)]"
            >
              Create campaign
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  badge,
  badgeVariant,
  onClick,
  children,
}: {
  title: string;
  badge: string;
  badgeVariant: "success" | "warning" | "danger" | "primary" | "accent";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`relative rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 ${
        onClick
          ? "cursor-pointer transition-all hover:border-[rgb(var(--color-primary)/0.28)] hover:shadow-sm"
          : ""
      }`}
      aria-label={onClick ? `${title} details` : undefined}
    >
      {onClick ? <CardHoverHint /> : null}
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">{title}</span>
        <Badge variant={badgeVariant} className="text-[0.6rem] uppercase tracking-wider">
          {badge}
        </Badge>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function QuickActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 items-center justify-center rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 text-[13px] font-medium transition-colors hover:bg-[rgb(var(--color-muted)/0.45)]"
    >
      {label}
    </button>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    INVOICE_PAID: <DollarSign className="h-4 w-4 text-[rgb(var(--color-success))]" />,
    REWARD_REDEEMED: <Gift className="h-4 w-4 text-[rgb(var(--color-warning))]" />,
    POINTS_EARNED: <TrendingUp className="h-4 w-4 text-[rgb(var(--color-primary))]" />,
    CUSTOMER_ADDED: <UserPlus className="h-4 w-4 text-[rgb(var(--color-accent))]" />,
    MEMBERSHIP_SOLD: <Trophy className="h-4 w-4 text-[rgb(var(--color-violet, #8B5CF6))]" />,
    APPOINTMENT_BOOKED: <CalendarClock className="h-4 w-4 text-[rgb(var(--color-cyan, #06B6D4))]" />,
    CAMPAIGN_SENT: <Activity className="h-4 w-4 text-[rgb(var(--color-danger))]" />,
  };
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[rgb(var(--color-muted))]">
      {icons[type] ?? <Activity className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-10 w-full" />
            <Skeleton className="mt-3 h-3 w-36" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-48" />
          <Skeleton className="mt-6 h-[280px] w-full" />
        </div>
        <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-1 h-3 w-48" />
          <Skeleton className="mt-6 h-[280px] w-full" />
        </div>
      </div>
    </div>
  );
}
