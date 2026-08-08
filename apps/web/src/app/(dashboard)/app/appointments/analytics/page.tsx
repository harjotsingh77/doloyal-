"use client";

import * as React from "react";
import {
  CalendarDays, CheckCircle2, XCircle, AlertCircle, DollarSign,
  TrendingUp, PieChart, Clock, Users, Repeat, Activity, BarChart3,
} from "lucide-react";
import {
  Button, Card, CardContent, CardHeader, CardTitle, CardDescription,
  PageHeader, KpiCard, Skeleton, Badge,
} from "@doloyal/ui";
import { CHART_PALETTE } from "@doloyal/ui";
import {
  LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { formatCompact, formatPercent } from "@doloyal/shared";
import type { BookingAnalytics } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";

const tooltipStyle = {
  borderRadius: "0.625rem",
  border: "1px solid rgb(var(--color-border))",
  background: "rgb(var(--color-surface))",
  color: "rgb(var(--color-foreground))",
  fontSize: "0.8rem",
  boxShadow: "var(--shadow-lifted)",
} as const;

const PIE_COLORS = [CHART_PALETTE[0], CHART_PALETTE[1], CHART_PALETTE[2], CHART_PALETTE[3], CHART_PALETTE[4]];

const HOUR_LABELS: Record<number, string> = {
  9: "9 AM", 10: "10 AM", 11: "11 AM", 12: "12 PM",
  14: "2 PM", 15: "3 PM", 16: "4 PM", 17: "5 PM",
};

const SOURCE_LABELS: Record<string, string> = {
  BOOKING_LINK: "Booking Link",
  DASHBOARD: "Dashboard",
  WHATSAPP: "WhatsApp",
  WEBSITE_WIDGET: "Website Widget",
  PHONE_CALL: "Phone Call",
};

const revenueData = [
  { month: "Jan", revenue: 185000 },
  { month: "Feb", revenue: 210000 },
  { month: "Mar", revenue: 195000 },
  { month: "Apr", revenue: 240000 },
  { month: "May", revenue: 225000 },
  { month: "Jun", revenue: 285000 },
];

export default function BookingAnalyticsPage() {
  const { format: fmt, formatCompact: fmtCompact } = useCurrency();
  const [data, setData] = React.useState<BookingAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const analytics = await api.getBookingAnalytics();
        if (!cancelled) setData(analytics);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load booking analytics");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Failed to load booking analytics</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button variant="ghost" className="mt-5" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  if (loading) return <AnalyticsSkeleton />;
  if (!data) return null;

  const { totalBookings, completed, cancelled, noShow, revenue, topServices, topStaff, peakHours, customerRetention, bookingConversionRate, monthlyGrowth, sourceBreakdown } = data;
  const noShowRate = totalBookings > 0 ? (noShow / totalBookings) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Analytics"
        description="Track your booking performance"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Total Bookings"
          value={totalBookings}
          icon={<CalendarDays className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Completed"
          value={completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="success"
          delta={completed / totalBookings * 100}
          deltaSuffix="completion rate"
        />
        <KpiCard
          label="Cancelled"
          value={cancelled}
          icon={<XCircle className="h-5 w-5" />}
          accent="danger"
        />
        <KpiCard
          label="No-Show Rate"
          value={noShowRate}
          format={(v) => `${v.toFixed(1)}%`}
          icon={<AlertCircle className="h-5 w-5" />}
          accent="warning"
        />
        <KpiCard
          label="Revenue"
          value={revenue}
          format={(v) => fmt(v)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="primary"
          delta={monthlyGrowth}
          deltaSuffix="vs last month"
        />
        <KpiCard
          label="Conversion Rate"
          value={bookingConversionRate.toFixed(1)}
          format={(v) => `${v}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="violet"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[rgb(var(--color-primary))]" />
                Revenue Trend
              </div>
            </CardTitle>
            <CardDescription>Monthly booking revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={revenueData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} dy={6} />
                <YAxis tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => fmtCompact(v)} />
                <Tooltip cursor={{ stroke: "rgb(var(--color-border))", strokeWidth: 1 }} contentStyle={tooltipStyle} formatter={(value: number) => [fmt(value), "Revenue"]} />
                <Line type="monotone" dataKey="revenue" stroke={CHART_PALETTE[0]} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[rgb(var(--color-accent))]" />
                Top Services
              </div>
            </CardTitle>
            <CardDescription>Most booked services by count</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topServices} layout="vertical" margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" strokeOpacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip cursor={{ stroke: "rgb(var(--color-border))", strokeWidth: 1 }} contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, name === "count" ? "Bookings" : "Revenue"]} />
                <Bar dataKey="count" fill={CHART_PALETTE[1]} radius={[0, 6, 6, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[rgb(var(--color-success))]" />
                Top Staff
              </div>
            </CardTitle>
            <CardDescription>Staff by booking count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topStaff.map((staff, i) => (
                <div key={staff.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-muted))] text-xs font-semibold text-[rgb(var(--color-muted-foreground))]">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{staff.name}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-[rgb(var(--color-muted-foreground))]">
                      <span>{staff.count} bookings</span>
                      <span>{fmt(staff.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-24 rounded-full bg-[rgb(var(--color-muted))] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(staff.count / Math.max(...topStaff.map((s) => s.count))) * 100}%`,
                        backgroundColor: CHART_PALETTE[i % CHART_PALETTE.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[rgb(var(--color-warning))]" />
                Peak Hours
              </div>
            </CardTitle>
            <CardDescription>Booking volume by hour</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={peakHours} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(h: number) => HOUR_LABELS[h] ?? `${h}`} />
                <YAxis tick={{ fill: "rgb(var(--color-muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip cursor={{ stroke: "rgb(var(--color-border))", strokeWidth: 1 }} contentStyle={tooltipStyle} labelFormatter={(h: number) => HOUR_LABELS[h] ?? `${h}:00`} formatter={(value: number) => [value, "Bookings"]} />
                <Bar dataKey="count" fill={CHART_PALETTE[4]} radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-[rgb(var(--color-violet))]" />
                Booking Source
              </div>
            </CardTitle>
            <CardDescription>How customers are booking</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={sourceBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="count"
                  nameKey="source"
                >
                  {sourceBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [value, SOURCE_LABELS[name] ?? name]} />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {sourceBreakdown.map((s, i) => (
                <div key={s.source} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[rgb(var(--color-muted-foreground))]">{SOURCE_LABELS[s.source] ?? s.source}</span>
                  <span className="ml-auto font-medium">{s.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-[rgb(var(--color-accent))]" />
                Customer Retention
              </div>
            </CardTitle>
            <CardDescription>Repeat booking rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="rgb(var(--color-border))" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="42" fill="none"
                    stroke={customerRetention >= 60 ? "rgb(var(--color-success))" : customerRetention >= 40 ? "rgb(var(--color-warning))" : "rgb(var(--color-danger))"}
                    strokeWidth="8" strokeDasharray={`${(customerRetention / 100) * 264} 264`} strokeLinecap="round"
                  />
                </svg>
                <span className="absolute text-2xl font-bold">{customerRetention.toFixed(1)}%</span>
              </div>
              <Badge
                variant={customerRetention >= 60 ? "success" : customerRetention >= 40 ? "warning" : "danger"}
                className="mt-3 text-[0.65rem] uppercase tracking-wider"
              >
                {customerRetention >= 60 ? "Strong" : customerRetention >= 40 ? "Moderate" : "Low"}
              </Badge>
              <p className="mt-4 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
                {customerRetention >= 60
                  ? "Your customers are coming back. Great retention!"
                  : "Consider loyalty programs to boost repeat visits."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[rgb(var(--color-success))]" />
                Monthly Growth
              </div>
            </CardTitle>
            <CardDescription>Revenue growth indicator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center py-6">
              <div className="flex h-28 w-28 items-center justify-center">
                <div className={`flex h-full w-full items-center justify-center rounded-full ${
                  monthlyGrowth > 0
                    ? "bg-[rgb(var(--color-success)/0.1)]"
                    : "bg-[rgb(var(--color-danger)/0.1)]"
                }`}>
                  <div className="text-center">
                    <TrendingUp className={`mx-auto h-8 w-8 ${
                      monthlyGrowth > 0 ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-danger))] rotate-180"
                    }`} />
                    <span className={`mt-1 block text-2xl font-bold ${
                      monthlyGrowth > 0 ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-danger))]"
                    }`}>
                      {formatPercent(monthlyGrowth / 100)}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-[rgb(var(--color-muted-foreground))] max-w-xs">
                {monthlyGrowth > 0
                  ? "Revenue is growing compared to last month. Keep up the momentum!"
                  : "Revenue has declined this month. Consider running a promotion."}
              </p>
              <div className="mt-6 grid w-full grid-cols-3 gap-4 border-t border-[rgb(var(--color-border))] pt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold">{data.completed}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{data.rescheduled}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Rescheduled</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold">{data.cancelled}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Cancelled</p>
                </div>
              </div>
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-3 w-40" />
            <Skeleton className="mt-6 h-[240px] w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-1 h-3 w-48" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
