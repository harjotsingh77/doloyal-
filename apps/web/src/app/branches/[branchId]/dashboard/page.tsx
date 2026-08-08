"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  DollarSign,
  CalendarClock,
  Users,
  UserPlus,
  RotateCcw,
  Crown,
  Sparkles,
  IdCard,
  Clock,
  Wallet,
  XCircle,
  Receipt,
  Percent,
  Star,
  MessageSquare,
  TrendingUp,
  Scissors,
  Award,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from "lucide-react";
import { PageHeader, KpiCard, StatChart, Button, Badge } from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import {
  getBranchKpis,
  generateTrend,
  generateCustomerGrowth,
  generateStaff,
  generateAppointments,
  generateCustomers,
  SERVICES,
  createSeededRandom,
} from "@/lib/branches";
import { PageSkeleton, SectionCard, ProgressBar, usePageLoading } from "@/components/branch-ui";
import { BranchAvatar } from "@/components/branch-workspace";

function toShort(date: string) {
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function BranchDashboardPage() {
  const params = useParams<{ branchId: string }>();
  const router = useRouter();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();
  const loading = usePageLoading(500);

  const data = React.useMemo(() => {
    if (!branchId) return null;
    const kpis = getBranchKpis(branchId);
    const trend60 = generateTrend(branchId, 60);
    const trend30 = trend60.slice(30);
    const prev30 = trend60.slice(0, 30);
    const customerGrowth = generateCustomerGrowth(branchId, 30);
    const staff = generateStaff(branchId);
    const appts = generateAppointments(branchId);
    const customers = generateCustomers(branchId);
    const rng = createSeededRandom(branchId, 21);

    const weekNow = trend30.slice(-7).reduce((s, t) => s + (t.revenue ?? 0), 0);
    const weekPrev = trend30.slice(-14, -7).reduce((s, t) => s + (t.revenue ?? 0), 0);
    const weekApptsNow = trend30.slice(-7).reduce((s, t) => s + (t.appointments ?? 0), 0);
    const weekApptsPrev = trend30.slice(-14, -7).reduce((s, t) => s + (t.appointments ?? 0), 0);

    const monthNow = trend30.reduce((s, t) => s + (t.revenue ?? 0), 0);
    const monthPrev = prev30.reduce((s, t) => s + (t.revenue ?? 0), 0);

    const services = SERVICES.map((name, i) => ({
      name,
      count: Math.round((5 + rng() * 40) * (0.7 + (i % 3) * 0.15)),
    }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
    const maxService = services[0]!.count;

    const staffTop = staff.slice(0, 6);
    const maxStaffRevenue = staffTop[0]?.revenue ?? 1;

    const upcoming = appts
      .filter((a) => a.status === "Upcoming" || a.status === "In Progress")
      .slice(0, 6);

    const activity = [
      { id: 1, type: "INVOICE_PAID", text: `Invoice ${kpis.topService} generated ₹${(2000 + rng() * 4000).toFixed(0)}`, at: "2h ago", amount: 2400 },
      { id: 2, type: "POINTS_EARNED", text: `${customers[0]?.name} earned 120 loyalty points`, at: "3h ago", amount: 0 },
      { id: 3, type: "APPOINTMENT_BOOKED", text: `New appointment for ${upcoming[0]?.service ?? "Signature Haircut"}`, at: "5h ago", amount: 0 },
      { id: 4, type: "CUSTOMER_ADDED", text: `${customers[3]?.name} became a loyalty member`, at: "1d ago", amount: 0 },
      { id: 5, type: "REWARD_REDEEMED", text: "Customer redeemed ₹500 Off Services", at: "1d ago", amount: 500 },
    ];

    return {
      kpis,
      trend30,
      customerGrowth,
      staff,
      appts,
      services,
      maxService,
      staffTop,
      maxStaffRevenue,
      upcoming,
      activity,
      weekNow,
      weekPrev,
      weekApptsNow,
      weekApptsPrev,
      monthNow,
      monthPrev,
      weekDelta: weekPrev > 0 ? ((weekNow - weekPrev) / weekPrev) * 100 : 0,
      monthDelta: monthPrev > 0 ? ((monthNow - monthPrev) / monthPrev) * 100 : 0,
    };
  }, [branchId]);

  if (loading || !data || !selectedBranch) {
    return <PageSkeleton cards={8} />;
  }

  const { kpis } = data;

  const apptsTodaySeries = data.trend30.map((t) => ({
    date: toShort(t.date),
    appointments: t.appointments,
  }));
  const revenueSeries = data.trend30.map((t) => ({ date: toShort(t.date), revenue: t.revenue }));
  const growthSeries = data.customerGrowth.map((t) => ({ date: toShort(t.date), customers: t.customers }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <BranchAvatar branch={selectedBranch} size="lg" />
            {selectedBranch.name}
          </span>
        }
        description="Branch overview — every metric below is scoped to this location only."
        actions={
          <>
            <Button variant="outline" onClick={() => router.push(`/branches/${branchId}/appointments`)}>
              <Calendar className="h-4 w-4" />
              Book Appointment
            </Button>
            <Button variant="secondary" onClick={() => router.push(`/branches/${branchId}/settings`)}>
              <Settings className="h-4 w-4" />
              Branch Settings
            </Button>
          </>
        }
      />

      {/* KPI GRID */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Today's Revenue" value={kpis.revenueToday} format={(v) => fmt(v)} icon={<DollarSign className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Appointments Today" value={kpis.appointmentsToday} icon={<CalendarClock className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Customers" value={kpis.customers} icon={<Users className="h-5 w-5" />} accent="success" />
        <KpiCard label="New Customers" value={kpis.newCustomers} icon={<UserPlus className="h-5 w-5" />} accent="violet" />
        <KpiCard label="Repeat Customers" value={kpis.repeatCustomers} icon={<RotateCcw className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Memberships" value={kpis.memberships} hint={`${kpis.activeMemberships} active`} icon={<Crown className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Loyalty Members" value={kpis.loyaltyMembers} icon={<Sparkles className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Active Staff" value={kpis.activeStaff} hint={`${kpis.presentStaff} present now`} icon={<IdCard className="h-5 w-5" />} accent="success" />
        <KpiCard label="Present Staff" value={kpis.presentStaff} icon={<Clock className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Pending Payments" value={kpis.pendingPayments} format={(v) => fmt(v)} icon={<Wallet className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Cancelled Bookings" value={kpis.cancelled} icon={<XCircle className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Average Ticket Size" value={kpis.avgTicket} format={(v) => fmt(v)} icon={<Receipt className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Conversion Rate" value={kpis.conversionRate} format={(v) => `${v}%`} icon={<Percent className="h-5 w-5" />} accent="success" />
        <KpiCard label="Google Rating" value={kpis.googleRating} format={(v) => `★ ${v.toFixed(1)}`} icon={<Star className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Reviews" value={kpis.reviews} icon={<MessageSquare className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Monthly Growth" value={kpis.monthlyGrowth} delta={kpis.monthlyGrowth} icon={<TrendingUp className="h-5 w-5" />} accent="violet" />
      </div>

      {/* HIGHLIGHTS */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HighlightCard icon={<Scissors className="h-4 w-4" />} label="Top Service" value={kpis.topService} />
        <HighlightCard icon={<Award className="h-4 w-4" />} label="Top Staff" value={kpis.topStaff} />
        <HighlightCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Revenue (30d)"
          value={fmt(data.monthNow)}
          sub={`${fmt(data.monthPrev)} previous period`}
        />
        <HighlightCard
          icon={<Activity className="h-4 w-4" />}
          label="Status"
          value={selectedBranch.status}
          tone={selectedBranch.status === "Active" ? "success" : "muted"}
        />
      </div>

      {/* CHARTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StatChart
          title="Revenue Chart"
          description="Last 30 days"
          data={revenueSeries}
          series={[{ key: "revenue", label: "Revenue" }]}
          xKey="date"
          type="area"
          valueFormat={(v) => fmtCompact(v)}
        />
        <StatChart
          title="Appointments Trend"
          description="Last 30 days"
          data={apptsTodaySeries}
          series={[{ key: "appointments", label: "Appointments" }]}
          xKey="date"
          type="bar"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatChart
          title="Customer Growth"
          description="Cumulative customers, last 30 days"
          data={growthSeries}
          series={[{ key: "customers", label: "Customers" }]}
          xKey="date"
          type="line"
        />

        <SectionCard title="Top Selling Services" icon={<Scissors className="h-4 w-4 text-[rgb(var(--color-primary))]" />} delay={0.05}>
          <div className="space-y-4">
            {data.services.map((s) => (
              <div key={s.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[rgb(var(--color-muted-foreground))]">{s.count} bookings</span>
                </div>
                <ProgressBar value={(s.count / data.maxService) * 100} accent={selectedBranch.accent} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Revenue by Staff" icon={<Award className="h-4 w-4 text-[rgb(var(--color-accent))]" />} delay={0.05}>
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

        <div className="grid gap-6">
          <SectionCard title="Weekly Comparison" icon={<TrendingUp className="h-4 w-4 text-[rgb(var(--color-success))]" />}>
            <div className="grid grid-cols-2 gap-4">
              <ComparisonCell label="This Week" value={fmt(data.weekNow)} sub={`${data.weekApptsNow} appointments`} />
              <ComparisonCell label="Last Week" value={fmt(data.weekPrev)} sub={`${data.weekApptsPrev} appointments`} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <DeltaPill value={data.weekDelta} />
              <span className="text-[rgb(var(--color-muted-foreground))]">vs last week</span>
            </div>
          </SectionCard>

          <SectionCard title="Monthly Comparison" icon={<TrendingUp className="h-4 w-4 text-[rgb(var(--color-primary))]" />} delay={0.05}>
            <div className="grid grid-cols-2 gap-4">
              <ComparisonCell label="This Month" value={fmt(data.monthNow)} />
              <ComparisonCell label="Last Month" value={fmt(data.monthPrev)} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <DeltaPill value={data.monthDelta} />
              <span className="text-[rgb(var(--color-muted-foreground))]">vs last month</span>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Recent Activity" icon={<Activity className="h-4 w-4 text-[rgb(var(--color-primary))]" />} delay={0.05}>
          <div className="space-y-1">
            {data.activity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted))]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{a.text}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{a.at}</p>
                </div>
                {a.amount > 0 && <span className="shrink-0 text-sm font-medium">{fmt(a.amount)}</span>}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Upcoming Appointments" icon={<CalendarClock className="h-4 w-4 text-[rgb(var(--color-accent))]" />} action={<Badge variant="primary">{data.upcoming.length}</Badge>}>
          <div className="space-y-1">
            {data.upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-[rgb(var(--color-muted-foreground))]">No upcoming appointments</p>
            ) : (
              data.upcoming.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted))]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-xs font-semibold text-[rgb(var(--color-primary))]">
                    {a.time}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.customer}</p>
                    <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                      {a.service} · {a.staff}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{fmt(a.amount)}</span>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function HighlightCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone?: "success" | "muted";
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-primary))]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        {sub ? <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{sub}</p> : null}
      </div>
    </div>
  );
}

function ComparisonCell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[rgb(var(--color-border))] px-4 py-3">
      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
      {sub ? <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{sub}</p> : null}
    </div>
  );
}

function DeltaPill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        positive
          ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
          : "bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))]"
      }`}
    >
      {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}