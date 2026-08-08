"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  BarChart3,
  DollarSign,
  Users,
  CalendarDays,
  RotateCcw,
  XCircle,
  TrendingUp,
  Clock,
  Scissors,
  Award,
} from "lucide-react";
import {
  PageHeader,
  KpiCard,
  StatChart,
  EmptyState,
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import {
  getBranchKpis,
  generateTrend,
  generateCustomerGrowth,
  generateStaff,
  generateCustomers,
  createSeededRandom,
  SERVICES,
} from "@/lib/branches";
import { PageSkeleton, SectionCard, ProgressBar, usePageLoading } from "@/components/branch-ui";

function toShort(date: string) {
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function BranchAnalyticsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();
  const loading = usePageLoading(450);
  const [period, setPeriod] = React.useState<"weekly" | "monthly" | "yearly">("monthly");

  const data = React.useMemo(() => {
    if (!branchId) return null;
    const days = period === "weekly" ? 7 : period === "monthly" ? 30 : 90;
    const trend = generateTrend(branchId, days);
    const growth = generateCustomerGrowth(branchId, days);
    const kpis = getBranchKpis(branchId);
    const staff = generateStaff(branchId);
    const customers = generateCustomers(branchId);
    const rng = createSeededRandom(branchId, 31);

    const revenue = trend.reduce((s, t) => s + (t.revenue ?? 0), 0);
    const bookings = trend.reduce((s, t) => s + (t.appointments ?? 0), 0);
    const retention = customers.filter((c) => c.visits >= 3).length / Math.max(1, customers.length);
    const noShow = 12 + Math.floor(rng() * 9);

    const services = SERVICES.map((name, i) => ({
      name,
      count: Math.round((6 + rng() * 46) * (0.7 + (i % 3) * 0.16)),
    })).sort((a, b) => b.count - a.count).slice(0, 6);
    const maxService = services[0]!.count;

    const staffTop = staff.slice(0, 6);
    const maxStaffRevenue = staffTop[0]?.revenue ?? 1;

    const peakHours = [9, 11, 13, 15, 17, 19, 21].map((h) => ({
      hour: `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`,
      bookings: Math.round((6 + rng() * 34) * (h === 19 ? 1.6 : h === 17 ? 1.35 : 1)),
    }));

    return {
      kpis, revenue, bookings, growth, trend, retention, noShow, services, maxService,
      staffTop, maxStaffRevenue, peakHours,
    };
  }, [branchId, period]);

  if (loading || !data || !selectedBranch) return <PageSkeleton cards={4} />;

  const retentionPct = Math.round(data.retention * 100);
  const noShowRate = Math.round((data.noShow / Math.max(1, data.bookings)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description={`Branch-level analytics for ${selectedBranch.name}.`}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1">
            {(["weekly", "monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all ${
                  period === p ? "bg-[rgb(var(--color-primary))] text-white" : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={data.revenue} format={(v) => fmt(v)} icon={<DollarSign className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Bookings" value={data.bookings} icon={<CalendarDays className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Customers" value={data.growth[data.growth.length - 1]?.customers ?? 0} icon={<Users className="h-5 w-5" />} accent="success" />
        <KpiCard label="Retention Rate" value={retentionPct} format={(v) => `${v}%`} icon={<RotateCcw className="h-5 w-5" />} accent="violet" />
        <KpiCard label="No-show Rate" value={noShowRate} format={(v) => `${v}%`} icon={<XCircle className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Growth" value={data.kpis.monthlyGrowth} delta={data.kpis.monthlyGrowth} icon={<TrendingUp className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Top Service" value={data.services[0]?.name ?? "—"} icon={<Scissors className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Top Staff" value={data.staffTop[0]?.name ?? "—"} icon={<Award className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatChart
          title="Revenue Trend"
          data={data.trend.map((t) => ({ date: toShort(t.date), revenue: t.revenue }))}
          series={[{ key: "revenue", label: "Revenue" }]}
          xKey="date"
          type="area"
          valueFormat={(v) => fmtCompact(v)}
        />
        <StatChart
          title="Bookings Trend"
          data={data.trend.map((t) => ({ date: toShort(t.date), appointments: t.appointments }))}
          series={[{ key: "appointments", label: "Bookings" }]}
          xKey="date"
          type="bar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard title="Top Services" icon={<Scissors className="h-4 w-4 text-[rgb(var(--color-primary))]" />}>
          <div className="space-y-4">
            {data.services.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[rgb(var(--color-muted-foreground))]">{s.count}</span>
                </div>
                <ProgressBar value={(s.count / data.maxService) * 100} accent={selectedBranch.accent} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top Staff" icon={<Award className="h-4 w-4 text-[rgb(var(--color-accent))]" />}>
          <div className="space-y-4">
            {data.staffTop.map((s) => (
              <div key={s.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="font-semibold">{fmt(s.revenue)}</span>
                </div>
                <ProgressBar value={(s.revenue / data.maxStaffRevenue) * 100} accent="#06B6D4" />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Peak Hours" icon={<Clock className="h-4 w-4 text-[rgb(var(--color-warning))]" />}>
          <div className="space-y-2.5">
            {[...data.peakHours].sort((a, b) => b.bookings - a.bookings).map((h) => (
              <div key={h.hour} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-xs font-medium text-[rgb(var(--color-muted-foreground))]">{h.hour}</span>
                <ProgressBar value={(h.bookings / data.peakHours[data.peakHours.length - 1]!.bookings) * 100} accent="#F59E0B" />
                <span className="w-8 shrink-0 text-right text-xs">{h.bookings}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Customer Growth" icon={<Users className="h-4 w-4 text-[rgb(var(--color-success))]" />}>
        {data.growth.length === 0 ? (
          <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No growth data yet" />
        ) : (
          <StatChart
            data={data.growth.map((t) => ({ date: toShort(t.date), customers: t.customers }))}
            series={[{ key: "customers", label: "Customers" }]}
            xKey="date"
            type="line"
            minimal
          />
        )}
      </SectionCard>
    </div>
  );
}