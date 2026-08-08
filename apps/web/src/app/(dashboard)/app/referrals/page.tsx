"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Plus,
  Download,
  Link2,
  Copy,
  QrCode,
  Play,
  Pause,
  Archive,
  Trash2,
  Pencil,
  Search,
  RefreshCw,
  Share2,
  Check,
  AlertCircle,
  X,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Button,
  Input,
  Badge,
  Skeleton,
  Field,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from "@doloyal/ui";
import type {
  ReferralOverview,
  ReferralCampaign,
  ReferralLink,
  ReferralConversionRow,
  ReferralFunnelStage,
  ReferralLeaderboardRow,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";

const RANGES = [
  { id: "7d", label: "Daily" },
  { id: "30d", label: "Weekly" },
  { id: "90d", label: "Monthly" },
  { id: "custom", label: "Custom Range" },
] as const;

const REWARD_TYPES = [
  "POINTS",
  "CASHBACK",
  "FLAT_DISCOUNT",
  "PERCENT_DISCOUNT",
  "COUPON",
  "GIFT",
  "FREE_SERVICE",
  "MEMBERSHIP_UPGRADE",
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "outline" | "danger" | "default"> = {
  ACTIVE: "success",
  DRAFT: "warning",
  PAUSED: "outline",
  SCHEDULED: "default",
  ENDED: "outline",
  ARCHIVED: "outline",
  DISABLED: "danger",
  PENDING: "warning",
  VISITED: "default",
  SIGNED_UP: "default",
  BOOKED: "default",
  CONVERTED: "success",
  REWARD_SENT: "success",
  REJECTED: "danger",
};

function safeMessage(err: unknown, fallback: string) {
  const raw = (err as any)?.message || fallback;
  const lower = String(raw).toLowerCase();
  if (
    lower.includes("prisma") ||
    lower.includes("localhost") ||
    lower.includes("database") ||
    lower.includes("econnrefused") ||
    lower.includes("p1001")
  ) {
    return fallback;
  }
  return String(raw);
}

function aggregateSeries(
  series: Array<{
    date: string;
    referrals: number;
    conversions: number;
    revenue: number;
    clicks: number;
    visits: number;
  }>,
  mode: "7d" | "30d" | "90d" | "custom",
) {
  if (!series?.length) return [];
  if (mode === "7d" || mode === "custom") return series;

  const bucket = new Map<
    string,
    { date: string; referrals: number; conversions: number; revenue: number; clicks: number; visits: number }
  >();

  for (const row of series) {
    const d = new Date(row.date + "T00:00:00");
    let key = row.date;
    if (mode === "30d") {
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      key = monday.toISOString().slice(0, 10);
    } else if (mode === "90d") {
      key = row.date.slice(0, 7);
    }
    const cur = bucket.get(key) || {
      date: key,
      referrals: 0,
      conversions: 0,
      revenue: 0,
      clicks: 0,
      visits: 0,
    };
    cur.referrals += row.referrals || 0;
    cur.conversions += row.conversions || 0;
    cur.revenue += row.revenue || 0;
    cur.clicks += row.clicks || 0;
    cur.visits += row.visits || 0;
    bucket.set(key, cur);
  }
  return [...bucket.values()];
}

export default function ReferralsPage() {
  const { format } = useCurrency();
  const [range, setRange] = React.useState("30d");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [overview, setOverview] = React.useState<ReferralOverview | null>(null);
  const [analytics, setAnalytics] = React.useState<any>(null);
  const [funnel, setFunnel] = React.useState<ReferralFunnelStage[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<ReferralLeaderboardRow[]>([]);
  const [campaigns, setCampaigns] = React.useState<ReferralCampaign[]>([]);
  const [links, setLinks] = React.useState<ReferralLink[]>([]);
  const [conversions, setConversions] = React.useState<ReferralConversionRow[]>([]);
  const [search, setSearch] = React.useState("");
  const [campaignOpen, setCampaignOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReferralCampaign | null>(null);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [selectedLink, setSelectedLink] = React.useState<ReferralLink | null>(null);
  const [exportOpen, setExportOpen] = React.useState(false);

  const rangeParams = React.useMemo(() => {
    if (range === "custom" && customFrom && customTo) {
      return { range: "custom", from: customFrom, to: customTo };
    }
    return { range: range === "custom" ? "30d" : range };
  }, [range, customFrom, customTo]);

  const load = React.useCallback(
    async (opts?: { soft?: boolean }) => {
      try {
        if (opts?.soft) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const [ov, an, fn, lb, camps, ln, conv] = await Promise.all([
          api.getReferralOverview(rangeParams),
          api.getReferralAnalytics(rangeParams),
          api.getReferralFunnel(rangeParams),
          api.getReferralLeaderboard(),
          api.listReferralCampaigns(),
          api.listReferralLinks(),
          api.listReferralConversions({ search: search || undefined, pageSize: 30 }),
        ]);
        setOverview(ov);
        setAnalytics(an);
        setFunnel(Array.isArray(fn) ? fn : []);
        setLeaderboard(Array.isArray(lb) ? lb : []);
        setCampaigns(
          (camps || []).map((c: any) => ({
            ...c,
            startsAt: c.startsAt?.toISOString?.() || c.startsAt,
            endsAt: c.endsAt?.toISOString?.() || c.endsAt,
            createdAt: c.createdAt?.toISOString?.() || c.createdAt,
            updatedAt: c.updatedAt?.toISOString?.() || c.updatedAt,
          })),
        );
        setLinks(ln || []);
        setConversions(conv?.items || []);
        if (an?.summary && !an.summary.topCustomer && lb?.[0]?.name) {
          an.summary.topCustomer = lb[0].name;
          setAnalytics({ ...an });
        }
      } catch (e: unknown) {
        const msg = safeMessage(e, "Unable to load referral analytics. Please try again.");
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [rangeParams, search],
  );

  React.useEffect(() => {
    void load();
    const t = setInterval(() => void load({ soft: true }), 20000);
    let es: EventSource | null = null;
    try {
      es = api.subscribeReferralEvents();
      const refresh = () => void load({ soft: true });
      [
        "LINK_CREATED",
        "LINK_SHARED",
        "LINK_OPENED",
        "LANDING_VIEWED",
        "REGISTRATION_COMPLETED",
        "APPOINTMENT_BOOKED",
        "REWARD_CREDITED",
        "LEADERBOARD_UPDATED",
        "CAMPAIGN_CREATED",
        "CAMPAIGN_UPDATED",
      ].forEach((ev) => es?.addEventListener(ev, refresh));
      es.onmessage = refresh;
    } catch {
      /* polling remains */
    }
    return () => {
      clearInterval(t);
      es?.close();
    };
  }, [load]);

  const chartSeries = React.useMemo(() => {
    const raw = analytics?.series || analytics?.timeseries || [];
    return aggregateSeries(raw, range as "7d" | "30d" | "90d" | "custom");
  }, [analytics, range]);

  const hasChartData = chartSeries.some(
    (r) => r.referrals || r.conversions || r.revenue || r.clicks || r.visits,
  );

  const kpis = [
    { label: "Referral Revenue", value: format(overview?.referralRevenue ?? 0), empty: !(overview?.referralRevenue) },
    { label: "Links Generated", value: overview?.totalLinks ?? 0, empty: !(overview?.totalLinks) },
    { label: "Total Shares", value: overview?.totalShares ?? 0, empty: !(overview?.totalShares) },
    { label: "Total Clicks", value: overview?.totalClicks ?? 0, empty: !(overview?.totalClicks) },
    { label: "Landing Visits", value: overview?.landingVisits ?? 0, empty: !(overview?.landingVisits) },
    {
      label: "Successful Referrals",
      value: overview?.successfulReferrals ?? 0,
      empty: !(overview?.successfulReferrals),
    },
    { label: "Pending Referrals", value: overview?.pendingReferrals ?? 0, empty: !(overview?.pendingReferrals) },
    { label: "Rewards Given", value: overview?.rewardsGiven ?? 0, empty: !(overview?.rewardsGiven) },
    {
      label: "Conversion Rate",
      value: `${overview?.conversionRate ?? 0}%`,
      empty: !(overview?.conversionRate),
    },
    {
      label: "Top Referrer",
      value: overview?.topReferrer && overview.topReferrer !== "—" ? overview.topReferrer : "—",
      empty: !overview?.topReferrer || overview.topReferrer === "—",
    },
  ];

  const summary = analytics?.summary;

  const exportReport = async (formatType: "csv" | "excel" | "pdf") => {
    try {
      const { blob, filename } = await api.exportReferralReport(formatType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${formatType.toUpperCase()} report`);
      setExportOpen(false);
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to export report. Please try again."));
    }
  };

  const setCampaignStatus = async (id: string, status: string) => {
    try {
      await api.setReferralCampaignStatus(id, status);
      toast.success(`Campaign ${status.toLowerCase()}`);
      void load({ soft: true });
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to update campaign."));
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    try {
      await api.deleteReferralCampaign(id);
      toast.success("Campaign deleted");
      void load({ soft: true });
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to delete campaign."));
    }
  };

  const disableLink = async (id: string) => {
    try {
      await api.setReferralLinkStatus(id, "DISABLED");
      toast.success("Link disabled");
      void load({ soft: true });
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to disable link."));
    }
  };

  const deleteLink = async (id: string) => {
    if (!confirm("Delete this referral link?")) return;
    try {
      await api.deleteReferralLink(id);
      toast.success("Link deleted");
      void load({ soft: true });
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to delete link."));
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-[1.7rem]">
            Referral Program
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Create referral campaigns, generate secure referral links, and track referral performance
            in real time.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || refreshing}
            onClick={() => void load()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
            <Download className="h-3.5 w-3.5" />
            Export Report
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setLinkOpen(true)}>
            <Link2 className="h-3.5 w-3.5" />
            Generate Referral Link
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setCampaignOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Create Campaign
          </Button>
        </div>
      </header>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div>
              <p className="text-sm font-medium text-rose-900">Unable to load referral analytics.</p>
              <p className="text-xs text-rose-700">{error}</p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setRange(r.id)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition",
              range === r.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/70",
            )}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="ml-2 flex items-center gap-2">
            <Input
              type="date"
              className="h-8 text-xs"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              className="h-8 text-xs"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-7 w-16" />
              </div>
            ))
          : kpis.map((k) => (
              <div
                key={k.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {k.label}
                </p>
                <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
                  {k.value}
                </p>
                {k.empty ? (
                  <p className="mt-1 text-[10px] text-slate-400">No activity yet</p>
                ) : null}
              </div>
            ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Referrals & Conversions Over Time">
          {loading ? (
            <Skeleton className="h-[240px] w-full rounded-xl" />
          ) : hasChartData ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartSeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="referrals" stroke="#6366f1" strokeWidth={2} dot={false} name="Referrals" />
                <Line type="monotone" dataKey="conversions" stroke="#16a34a" strokeWidth={2} dot={false} name="Conversions" />
                <Line type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} dot={false} name="Clicks" />
                <Line type="monotone" dataKey="visits" stroke="#f59e0b" strokeWidth={2} dot={false} name="Visits" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Empty
              title="Referral analytics will appear after customer activity."
              description="Share a referral link to start collecting clicks, visits, and conversions."
            />
          )}
        </ChartCard>

        <ChartCard title="Referral Funnel">
          {loading ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : funnel.some((s) => s.count > 0) ? (
            <div className="space-y-3 pt-2">
              {funnel.map((s, i) => (
                <div key={s.key || s.stage || s.label}>
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>{s.label}</span>
                    <span>
                      {s.count.toLocaleString()} · {s.percentage ?? 0}% success
                      {i > 0 ? ` · ${s.dropRate ?? 0}% drop` : ""}
                    </span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(4, (s.count / (funnel[0]?.count || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  {i < funnel.length - 1 ? (
                    <div className="py-1 text-center text-[10px] text-slate-300">↓</div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No funnel data yet"
              description="Landing visits, clicks, signups, purchases, and rewards will populate this funnel."
            />
          )}
        </ChartCard>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Referral Analytics</h2>
          <p className="text-xs text-slate-500">ROI and performance calculated from live referral activity.</p>
        </div>
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Revenue", value: format(summary.revenue ?? 0) },
              { label: "Referral ROI", value: `${summary.referralRoi ?? 0}%` },
              { label: "Avg Referral Value", value: format(summary.averageReferralValue ?? 0) },
              { label: "Conversion %", value: `${summary.conversionRate ?? 0}%` },
              { label: "Click Through Rate", value: `${summary.clickThroughRate ?? 0}%` },
              { label: "Visit Rate", value: `${summary.visitRate ?? 0}%` },
              { label: "Top Campaign", value: summary.topCampaign || "—" },
              { label: "Top Customer", value: summary.topCustomer || leaderboard[0]?.name || "—" },
              {
                label: "Most Shared Link",
                value: summary.mostSharedLink?.code || "—",
              },
              {
                label: "Most Revenue Generated",
                value: summary.mostRevenueLink
                  ? `${summary.mostRevenueLink.code} (${format(summary.mostRevenueLink.revenue || 0)})`
                  : "—",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {item.label}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="Referral analytics will appear after customer activity."
            description="Create a campaign and generate links to unlock ROI metrics."
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Referral Campaigns</h2>
            <p className="text-xs text-slate-500">Create, pause, resume, and archive referral promotions.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(null);
              setCampaignOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Add Campaign
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <Empty
            title="No referral campaigns created yet."
            description="Create your first campaign to define rewards, dates, and rules."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setCampaignOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Create Campaign
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{c.name}</h3>
                    <Badge variant={STATUS_VARIANT[c.status] || "default"}>{c.status}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {c.description || "No description provided."}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">
                        Referrer Gets
                      </span>
                      <span className="font-bold text-slate-800">
                        {c.rewardValue} {c.rewardType}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5">
                      <span className="mb-0.5 block text-[10px] font-semibold uppercase text-slate-400">
                        Friend Gets
                      </span>
                      <span className="font-bold text-slate-800">
                        {c.friendRewardValue} {c.friendRewardType}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                    <span>
                      {c.startsAt ? new Date(c.startsAt).toLocaleDateString() : "No start"} →{" "}
                      {c.endsAt ? new Date(c.endsAt).toLocaleDateString() : "Open"}
                    </span>
                    <span className="text-right">
                      Usage {c.usageCount ?? 0}
                      {c.usageLimit != null ? ` / ${c.usageLimit}` : ""}
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>
                    {c.totalLinksCount ?? 0} links · {c.conversionCount ?? c.totalConversions ?? 0}{" "}
                    converted · {format(c.revenueTotal ?? 0)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Edit"
                      onClick={() => {
                        setEditing(c);
                        setCampaignOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    </Button>
                    {c.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Pause"
                        onClick={() => void setCampaignStatus(c.id, "PAUSED")}
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        title="Resume"
                        onClick={() => void setCampaignStatus(c.id, "ACTIVE")}
                      >
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Archive"
                      onClick={() => void setCampaignStatus(c.id, "ARCHIVED")}
                    >
                      <Archive className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Delete"
                      onClick={() => void deleteCampaign(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Recent Referral Links</h2>
            <p className="text-sm text-slate-500">
              Unique links with live click, visit, conversion, and revenue tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-8 w-44 pl-8 text-xs"
                placeholder="Search conversions…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button size="sm" variant="secondary" onClick={() => setLinkOpen(true)}>
              <Link2 className="h-3.5 w-3.5" /> Generate Link
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referral Code</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Conversions</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8">
                    <Skeleton className="h-24 w-full" />
                  </TableCell>
                </TableRow>
              ) : links.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-slate-400">
                    Generate your first referral link to start tracking shares and conversions.
                  </TableCell>
                </TableRow>
              ) : (
                links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="min-w-[140px]">
                        <p className="font-mono text-xs font-semibold text-blue-700">{l.code}</p>
                        <p className="truncate text-[11px] text-slate-400">{l.name || l.url}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {l.customerName || "Generic"}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {l.campaignName || "Default"}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{l.clickCount ?? 0}</TableCell>
                    <TableCell className="text-xs font-medium">
                      {l.landingViews ?? l.uniqueVisitors ?? 0}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {l.conversionCount ?? l.orders ?? 0}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{format(l.revenue ?? 0)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[l.status] || "default"}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(l.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Copy"
                          onClick={async () => {
                            await navigator.clipboard.writeText(l.url);
                            toast.success("Link copied");
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Share"
                          onClick={() => setSelectedLink(l)}
                        >
                          <Share2 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Analytics"
                          onClick={() => setSelectedLink(l)}
                        >
                          <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        {l.status === "ACTIVE" ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Disable"
                            onClick={() => void disableLink(l.id)}
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Delete"
                          onClick={() => void deleteLink(l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      {conversions.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Recent Conversions</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Friend</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{c.referrer}</TableCell>
                    <TableCell className="text-xs">{c.friend}</TableCell>
                    <TableCell className="text-xs">{c.campaign}</TableCell>
                    <TableCell className="text-xs">{format((c.orderValue || 0) + (c.bookingValue || 0))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status] || "default"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(c.date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ) : null}

      <CampaignDrawer
        open={campaignOpen}
        campaign={editing}
        onClose={() => setCampaignOpen(false)}
        onSaved={() => {
          setCampaignOpen(false);
          void load({ soft: true });
        }}
      />

      <GenerateLinkModal
        open={linkOpen}
        campaigns={campaigns}
        onClose={() => setLinkOpen(false)}
        onCreated={(link) => {
          setLinkOpen(false);
          setSelectedLink(link);
          void load({ soft: true });
        }}
      />

      <LinkSuccessModal
        link={selectedLink}
        onClose={() => setSelectedLink(null)}
        onShared={() => void load({ soft: true })}
      />

      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Export Report</DialogTitle>
            <DialogDescription>
              Download revenue, campaigns, referrals, conversions, and rewards.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Button variant="secondary" onClick={() => void exportReport("csv")}>
              CSV
            </Button>
            <Button variant="secondary" onClick={() => void exportReport("excel")}>
              Excel
            </Button>
            <Button variant="secondary" onClick={() => void exportReport("pdf")}>
              PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

function CampaignDrawer({
  open,
  campaign,
  onClose,
  onSaved,
}: {
  open: boolean;
  campaign: ReferralCampaign | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    description: "",
    campaignType: "STANDARD",
    rewardType: "POINTS",
    rewardValue: "100",
    friendRewardType: "POINTS",
    friendRewardValue: "50",
    minPurchase: "0",
    minAppointmentValue: "0",
    maxRewardLimit: "",
    startsAt: "",
    endsAt: "",
    status: "DRAFT",
    usageLimit: "",
    referralExpiryDays: "30",
    terms: "",
  });

  React.useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        description: campaign.description || "",
        campaignType: campaign.campaignType || "STANDARD",
        rewardType: campaign.rewardType || "POINTS",
        rewardValue: String(campaign.rewardValue ?? 100),
        friendRewardType: campaign.friendRewardType || "POINTS",
        friendRewardValue: String(campaign.friendRewardValue ?? 50),
        minPurchase: String(campaign.minPurchase ?? 0),
        minAppointmentValue: String(campaign.minAppointmentValue ?? 0),
        maxRewardLimit: campaign.maxRewardLimit ? String(campaign.maxRewardLimit) : "",
        startsAt: campaign.startsAt ? campaign.startsAt.slice(0, 10) : "",
        endsAt: campaign.endsAt ? campaign.endsAt.slice(0, 10) : "",
        status: campaign.status || "DRAFT",
        usageLimit: campaign.usageLimit ? String(campaign.usageLimit) : "",
        referralExpiryDays: String(campaign.referralExpiryDays ?? 30),
        terms: campaign.terms || "",
      });
    } else {
      setForm({
        name: "",
        description: "",
        campaignType: "STANDARD",
        rewardType: "POINTS",
        rewardValue: "100",
        friendRewardType: "POINTS",
        friendRewardValue: "50",
        minPurchase: "0",
        minAppointmentValue: "0",
        maxRewardLimit: "",
        startsAt: "",
        endsAt: "",
        status: "DRAFT",
        usageLimit: "",
        referralExpiryDays: "30",
        terms: "",
      });
    }
  }, [campaign, open]);

  if (!open) return null;

  const save = async (publish: boolean) => {
    if (!form.name.trim() || form.name.trim().length < 2) {
      toast.error("Campaign name must be at least 2 characters");
      return;
    }
    if (form.startsAt && form.endsAt && form.startsAt > form.endsAt) {
      toast.error("Start date must be before end date");
      return;
    }
    try {
      setSaving(true);
      const body = {
        ...form,
        rewardValue: parseFloat(form.rewardValue) || 0,
        friendRewardValue: parseFloat(form.friendRewardValue) || 0,
        minPurchase: parseFloat(form.minPurchase) || 0,
        minAppointmentValue: parseFloat(form.minAppointmentValue) || 0,
        maxRewardLimit: form.maxRewardLimit ? parseFloat(form.maxRewardLimit) : undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit, 10) : undefined,
        referralExpiryDays: parseInt(form.referralExpiryDays, 10) || 30,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        status: publish ? "ACTIVE" : form.status || "DRAFT",
      };

      if (campaign?.id) {
        await api.updateReferralCampaign(campaign.id, body);
        toast.success("Campaign updated");
      } else {
        await api.createReferralCampaign(body);
        toast.success(publish ? "Campaign published" : "Draft saved");
      }
      onSaved();
    } catch (e: unknown) {
      toast.error(safeMessage(e, "Unable to save campaign. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer title={campaign ? "Edit Campaign" : "Create Campaign"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Campaign Name">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Reward Type">
            <Select value={form.rewardType} onValueChange={(v) => setForm({ ...form, rewardType: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "CASHBACK"
                      ? "Cashback"
                      : t === "POINTS"
                        ? "Points"
                        : t.includes("DISCOUNT")
                          ? "Discount"
                          : t === "GIFT"
                            ? "Gift"
                            : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Referral Reward">
            <Input
              type="number"
              value={form.rewardValue}
              onChange={(e) => setForm({ ...form, rewardValue: e.target.value })}
            />
          </Field>
          <Field label="Friend Reward Type">
            <Select
              value={form.friendRewardType}
              onValueChange={(v) => setForm({ ...form, friendRewardType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Friend Reward">
            <Input
              type="number"
              value={form.friendRewardValue}
              onChange={(e) => setForm({ ...form, friendRewardValue: e.target.value })}
            />
          </Field>
          <Field label="Start Date">
            <Input
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
            />
          </Field>
          <Field label="End Date">
            <Input
              type="date"
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
            />
          </Field>
          <Field label="Maximum Referrals">
            <Input
              type="number"
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["DRAFT", "ACTIVE", "SCHEDULED", "PAUSED", "ENDED", "ARCHIVED"].map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Rules">
          <Textarea
            placeholder="Eligibility, reward timing, fraud rules…"
            value={form.terms}
            onChange={(e) => setForm({ ...form, terms: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-6 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => void save(false)}>
          Save Draft
        </Button>
        <Button className="flex-1 bg-blue-600 text-white" disabled={saving} onClick={() => void save(true)}>
          Publish
        </Button>
      </div>
    </Drawer>
  );
}

function GenerateLinkModal({
  open,
  campaigns,
  onClose,
  onCreated,
}: {
  open: boolean;
  campaigns: ReferralCampaign[];
  onClose: () => void;
  onCreated: (link: ReferralLink) => void;
}) {
  const [linkName, setLinkName] = React.useState("");
  const [q, setQ] = React.useState("");
  const [customers, setCustomers] = React.useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = React.useState<any | null>(null);
  const [campaignId, setCampaignId] = React.useState("");
  const [customSlug, setCustomSlug] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [slugStatus, setSlugStatus] = React.useState<{ available?: boolean; message?: string } | null>(
    null,
  );
  const [checkingSlug, setCheckingSlug] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setLinkName("");
      setQ("");
      setCustomers([]);
      setSelectedCustomer(null);
      setCampaignId("");
      setCustomSlug("");
      setExpiresAt("");
      setSlugStatus(null);
      setSaving(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!customSlug.trim()) {
      setSlugStatus(null);
      return;
    }
    const clean = customSlug.trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(clean)) {
      setSlugStatus({
        available: false,
        message: "Only lowercase letters, numbers, and hyphens allowed",
      });
      return;
    }
    if (clean.length < 3 || clean.length > 30) {
      setSlugStatus({ available: false, message: "Must be between 3 and 30 characters" });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setCheckingSlug(true);
        setSlugStatus(await api.checkReferralSlug(clean));
      } catch {
        setSlugStatus({ available: false, message: "Unable to check slug. Please try again." });
      } finally {
        setCheckingSlug(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [customSlug]);

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "https://doloyal.ai");
  const previewSlug = customSlug.trim() ? customSlug.trim().toLowerCase() : "auto-generated";
  const previewUrl = `${appBase.replace(/\/$/, "")}/r/${previewSlug}`;
  const canSubmit = !saving && !(slugStatus && !slugStatus.available);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Generate Referral Link</DialogTitle>
          <DialogDescription>
            Create a unique link for a customer, partner, influencer, or public campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Referral Name">
            <Input
              placeholder="Optional — e.g. VIP Influencer, Summer Promo"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
            />
          </Field>

          <Field label="Customer">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Search existing customer…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && q.trim()) {
                      e.preventDefault();
                      try {
                        setCustomers(await api.searchLoyaltyCustomers(q));
                      } catch (err: unknown) {
                        toast.error(safeMessage(err, "Unable to search customers."));
                      }
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={async () => {
                    if (!q.trim()) return;
                    try {
                      setCustomers(await api.searchLoyaltyCustomers(q));
                    } catch (err: unknown) {
                      toast.error(safeMessage(err, "Unable to search customers."));
                    }
                  }}
                >
                  <Search className="h-3.5 w-3.5" />
                  Search
                </Button>
              </div>

              {selectedCustomer ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-xs text-blue-900">
                  <span className="font-medium">
                    {selectedCustomer.name ||
                      `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()}
                  </span>
                  <button
                    type="button"
                    className="text-blue-600 hover:underline"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Clear
                  </button>
                </div>
              ) : customers.length > 0 ? (
                <div className="max-h-36 space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 p-1">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomers([]);
                      }}
                    >
                      {c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim()}{" "}
                      <span className="text-slate-400">({c.email || c.phone || "No contact"})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Optional — leave blank for employee, influencer, partner, or public campaign links.
                </p>
              )}
            </div>
          </Field>

          <Field label="Campaign">
            <Select
              value={campaignId || "none"}
              onValueChange={(v) => setCampaignId(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default program</SelectItem>
                {campaigns
                  .filter((c) => ["ACTIVE", "DRAFT", "SCHEDULED"].includes(c.status))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Custom Slug">
            <div className="space-y-1.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                  /r/
                </span>
                <Input
                  className="pl-9 font-mono text-xs"
                  placeholder="harjot"
                  value={customSlug}
                  onChange={(e) =>
                    setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                  }
                  maxLength={30}
                />
              </div>
              {checkingSlug ? (
                <p className="flex items-center gap-1 text-[11px] text-slate-400">
                  Checking availability…
                </p>
              ) : slugStatus ? (
                <p
                  className={cn(
                    "flex items-center gap-1 text-[11px] font-medium",
                    slugStatus.available ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {slugStatus.available ? <Check className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {slugStatus.message}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Optional — leave blank to auto-generate a secure code.
                </p>
              )}
            </div>
          </Field>

          <Field label="Expiration Date">
            <Input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </Field>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Live URL preview
            </p>
            <p className="mt-1 truncate font-mono text-xs text-blue-700">{previewUrl}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit}
            onClick={async () => {
              try {
                setSaving(true);
                const link = await api.generateReferralLink({
                  name: linkName || undefined,
                  customerId: selectedCustomer?.id || undefined,
                  campaignId: campaignId || undefined,
                  customSlug: customSlug.trim() || undefined,
                  expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
                });
                toast.success("Referral link generated");
                onCreated(link);
              } catch (e: unknown) {
                toast.error(safeMessage(e, "Unable to generate referral link."));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Generating…" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LinkSuccessModal({
  link,
  onClose,
  onShared,
}: {
  link: ReferralLink | null;
  onClose: () => void;
  onShared: () => void;
}) {
  if (!link) return null;

  const share = async (channel: string) => {
    try {
      await api.shareReferralLink(link.id, channel);
    } catch {
      /* share channel open still useful */
    }
    const text = encodeURIComponent(`Join with my referral link: ${link.url}`);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${text}`,
      sms: `sms:?&body=${text}`,
      email: `mailto:?subject=${encodeURIComponent("You're invited")}&body=${text}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(link.url)}&text=${text}`,
    };

    if (channel === "native" && typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: "Doloyal Referral",
        url: link.url,
        text: `Join with my referral: ${link.url}`,
      });
    } else if (urls[channel]) {
      window.open(urls[channel], "_blank", "noopener,noreferrer");
    }
    onShared();
  };

  return (
    <Dialog open={!!link} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Referral link ready</DialogTitle>
          <DialogDescription>
            Copy, download QR, regenerate, or share instantly. Tracking starts on the first click.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">
              Referral code
            </p>
            <p className="mt-1 font-mono text-xl font-semibold text-slate-900">{link.code}</p>
            <Badge className="mt-2" variant={STATUS_VARIANT[link.status] || "default"}>
              {link.status}
            </Badge>
          </div>

          <Field label="Referral URL">
            <div className="flex gap-2">
              <Input readOnly value={link.url} className="bg-slate-50 font-mono text-xs" />
              <Button
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(link.url);
                  toast.success("Link copied");
                }}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
            </div>
          </Field>

          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={link.qrUrl}
              alt={`QR for ${link.code}`}
              className="h-40 w-40 rounded-xl border border-slate-100 p-2"
            />
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(link.qrUrl, "_blank", "noopener,noreferrer")}
              >
                <QrCode className="h-3.5 w-3.5" />
                QR Code
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  try {
                    const next = await api.regenerateReferralLink(link.id);
                    toast.success("Link regenerated");
                    onClose();
                    setTimeout(() => {
                      /* parent reloads via onShared after close path */
                    }, 0);
                    void api.shareReferralLink(next.id, "regenerate").catch(() => undefined);
                    onShared();
                  } catch (e: unknown) {
                    toast.error(safeMessage(e, "Unable to regenerate link."));
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
              {link.status === "ACTIVE" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.setReferralLinkStatus(link.id, "DISABLED");
                      toast.success("Link disabled");
                      onShared();
                      onClose();
                    } catch (e: unknown) {
                      toast.error(safeMessage(e, "Unable to disable link."));
                    }
                  }}
                >
                  Disable
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await api.setReferralLinkStatus(link.id, "ACTIVE");
                      toast.success("Link enabled");
                      onShared();
                      onClose();
                    } catch (e: unknown) {
                      toast.error(safeMessage(e, "Unable to enable link."));
                    }
                  }}
                >
                  Enable
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Share</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => void share("whatsapp")}>
                WhatsApp
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void share("email")}>
                Email
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void share("sms")}>
                SMS
              </Button>
              <Button variant="secondary" size="sm" onClick={() => void share("telegram")}>
                Telegram
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Drawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </>
  );
}
