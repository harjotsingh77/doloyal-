"use client";

import * as React from "react";
import { LogoMark } from "@doloyal/ui";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Gift,
  Crown,
  Megaphone,
  LineChart,
  Globe,
  Search,
  Bell,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  CircleCheck,
  CircleAlert,
  Wallet,
  CalendarPlus,
  Star,
  Bot,
  Menu,
  MoreHorizontal,
  Zap,
  CreditCard,
  Phone,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaChart, Sparkline } from "./charts";

/* ------------------------------------------------------------------ */
/* Shared mock UI primitives (tiny, high-density, pixel-perfect)       */
/* ------------------------------------------------------------------ */

export function MockWindow({
  title,
  url,
  children,
  className,
  frame = false,
}: {
  title?: string;
  url?: string;
  children: React.ReactNode;
  className?: string;
  frame?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_64px_-24px_rgba(15,23,42,0.18)]",
        frame && "p-3",
        className,
      )}
    >
      {frame && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
          </div>
          <div className="flex h-6 flex-1 items-center gap-2 rounded-lg bg-white px-3 text-[11px] text-[rgb(var(--color-subtle))]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="0.5" y="0.5" width="9" height="9" rx="4.5" stroke="currentColor" />
              <path d="M2 5h4.5M5 2.5L7.5 5 5 7.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {url ?? "app.doloyal.ai/dashboard"}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: Users, label: "Customers" },
  { icon: CalendarDays, label: "Bookings" },
  { icon: Gift, label: "Loyalty" },
  { icon: Crown, label: "Memberships" },
  { icon: Megaphone, label: "Campaigns" },
  { icon: LineChart, label: "Analytics" },
  { icon: Globe, label: "Sites" },
];

export function ScreenSidebar({ active, className }: { active?: string; className?: string }) {
  return (
    <aside
      className={cn(
        "flex w-[168px] shrink-0 flex-col gap-0.5 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2 px-2 pt-1">
        <LogoMark size={20} />
        <span className="text-[13px] font-bold tracking-tight">Doloyal</span>
      </div>
      {NAV_ITEMS.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[11.5px] font-medium transition-colors",
            active === item.label
              ? "bg-white text-[rgb(var(--color-foreground))] shadow-[0_1px_2px_rgba(15,23,42,0.08)]"
              : "text-[rgb(var(--color-subtle))]",
          )}
        >
          <item.icon className="h-3.5 w-3.5" />
          {item.label}
        </div>
      ))}
      <div className="mt-auto rounded-xl border border-[rgb(var(--color-border))] bg-white p-2.5">
        <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
          <Sparkles className="h-3 w-3 text-[#7C3AED]" /> AI Score
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold tracking-tight">92</span>
          <span className="text-[10px] text-emerald-600 font-semibold">▲ 12 pts</span>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ title, children }: { title?: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between border-b border-[rgb(var(--color-border))] bg-white px-4">
      <div className="flex items-center gap-3">
        <Menu className="h-3.5 w-3.5 text-[rgb(var(--color-subtle))] lg:hidden" />
        {title ? <span className="text-[12px] font-bold tracking-tight">{title}</span> : null}
        <div className="hidden items-center gap-1.5 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-2.5 py-1.5 sm:flex">
          <Search className="h-3 w-3 text-[rgb(var(--color-subtle))]" />
          <span className="text-[10.5px] text-[rgb(var(--color-subtle))]">Search customers, bookings…</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {children}
        <div className="relative">
          <Bell className="h-3.5 w-3.5 text-[rgb(var(--color-subtle))]" />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
        </div>
        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] ring-2 ring-white" />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  up = true,
  icon: Icon,
  spark,
}: {
  label: string;
  value: string;
  delta: string;
  up?: boolean;
  icon?: React.ElementType;
  spark?: number[];
}) {
  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
          {label}
        </span>
        {Icon ? <Icon className="h-3 w-3 text-[rgb(var(--color-subtle))]" /> : null}
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-[17px] font-bold tracking-tight">{value}</div>
          <div
            className={cn(
              "flex items-center gap-0.5 text-[10px] font-semibold",
              up ? "text-emerald-600" : "text-rose-500",
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        </div>
        {spark ? <Sparkline data={spark} width={56} height={20} /> : null}
      </div>
    </div>
  );
}

function Tag({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "violet" | "green" | "amber" | "rose" | "slate" }) {
  const tones: Record<string, string> = {
    blue: "bg-[#2563EB]/10 text-[#1D4ED8]",
    violet: "bg-[#7C3AED]/10 text-[#6D28D9]",
    green: "bg-emerald-500/10 text-emerald-700",
    amber: "bg-amber-500/10 text-amber-700",
    rose: "bg-rose-500/10 text-rose-600",
    slate: "bg-slate-500/10 text-slate-600",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[9.5px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

const AVATARS = [
  "from-[#2563EB] to-[#60A5FA]",
  "from-[#7C3AED] to-[#C084FC]",
  "from-[#10B981] to-[#6EE7B7]",
  "from-[#F59E0B] to-[#FCD34D]",
  "from-[#EC4899] to-[#F9A8D4]",
  "from-[#0EA5E9] to-[#7DD3FC]",
];

export function Avatar({ i = 0, size = 6, className }: { i?: number; size?: number; className?: string }) {
  return (
    <div
      className={cn(
        "shrink-0 rounded-full bg-gradient-to-br",
        AVATARS[i % AVATARS.length],
        size === 6 ? "h-6 w-6" : size === 7 ? "h-7 w-7" : "h-8 w-8",
        className,
      )}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Dashboard                                                   */
/* ------------------------------------------------------------------ */

const REVENUE_DATA = [32, 38, 36, 44, 52, 48, 61, 58, 66, 78, 72, 88, 96, 91, 104, 112, 108, 122, 118, 132, 128, 140, 149];

export function DashboardScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Overview" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Overview" />
          <div className="flex-1 space-y-3 overflow-hidden bg-[rgb(var(--color-surface-2))] p-3 sm:p-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Revenue" value="₹4.82L" delta="18.2%" up spark={[20, 26, 24, 32, 30, 38, 42]} />
              <Kpi label="Retention" value="68.4%" delta="12.6%" up spark={[30, 34, 38, 40, 44, 50, 55]} icon={Zap} />
              <Kpi label="Customers" value="3,847" delta="214 new" up icon={Users} />
              <Kpi label="At-risk" value="12" delta="8 fewer" up icon={CircleAlert} />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-4 lg:col-span-2">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold">Revenue</div>
                    <div className="text-[10px] text-[rgb(var(--color-subtle))]">Last 30 days</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9.5px] font-semibold text-[rgb(var(--color-subtle))]">
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />This month</span>
                    <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-border))]" />Last month</span>
                  </div>
                </div>
                <AreaChart data={REVENUE_DATA} height={128} />
                <div className="mt-2 flex justify-between text-[9px] font-medium text-[rgb(var(--color-subtle))]">
                  {["Jun 1", "Jun 7", "Jun 14", "Jun 21", "Jun 30"].map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[11px] font-bold">
                      <Bot className="h-3.5 w-3.5 text-[#7C3AED]" /> Doloyal AI
                    </span>
                    <Tag tone="violet">LIVE</Tag>
                  </div>
                  <div className="space-y-2">
                    {[
                      "12 at-risk customers this week — send a 10% win-back offer?",
                      "Sana visited 3× this month. Birthday reward ready.",
                    ].map((m, i) => (
                      <div key={i} className="rounded-lg bg-[#F5F3FF] p-2.5 text-[10px] leading-snug text-[#4C1D95]">
                        {m}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                  <div className="mb-2 text-[11px] font-bold">Today's bookings</div>
                  <div className="space-y-2">
                    {[
                      { t: "10:30", n: "Priya S.", s: "Hair + Color" },
                      { t: "12:00", n: "Aisha K.", s: "Facial" },
                      { t: "16:15", n: "Riya M.", s: "Manicure" },
                    ].map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Avatar i={i} size={6} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[10.5px] font-semibold">{b.n}</div>
                          <div className="truncate text-[9px] text-[rgb(var(--color-subtle))]">{b.s}</div>
                        </div>
                        <span className="text-[9.5px] font-semibold text-[rgb(var(--color-subtle))]">{b.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Customers                                                   */
/* ------------------------------------------------------------------ */

const CUSTOMERS = [
  { name: "Sana Kapoor", visits: 24, spend: "₹12,400", tier: "Gold", score: 94, status: "Loyal" },
  { name: "Rahul Mehta", visits: 9, spend: "₹3,200", tier: "Silver", score: 62, status: "Engaged" },
  { name: "Anaya Shah", visits: 3, spend: "₹940", tier: "Member", score: 28, status: "At risk" },
  { name: "Kabir Jain", visits: 15, spend: "₹6,800", tier: "Gold", score: 81, status: "Loyal" },
  { name: "Meera Nair", visits: 5, spend: "₹2,150", tier: "Silver", score: 45, status: "Engaged" },
  { name: "Dev Sharma", visits: 1, spend: "₹420", tier: "New", score: 12, status: "New" },
];

export function CustomersScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Customers" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Customers" />
          <div className="flex-1 overflow-hidden bg-white p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[13px] font-bold">3,847 customers</div>
              <div className="flex gap-1.5">
                <Tag tone="slate">All</Tag>
                <Tag tone="green">Loyal</Tag>
                <Tag tone="amber">Engaged</Tag>
                <Tag tone="rose">At risk</Tag>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]">
              <div className="hidden grid-cols-12 gap-2 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3.5 py-2 text-[9.5px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))] sm:grid">
                <span className="col-span-4">Customer</span>
                <span className="col-span-2">Visits</span>
                <span className="col-span-2">Spend</span>
                <span className="col-span-2">Tier</span>
                <span className="col-span-2">Status</span>
              </div>
              {CUSTOMERS.map((c, i) => (
                <div
                  key={c.name}
                  className="grid grid-cols-4 items-center gap-2 border-b border-[rgb(var(--color-border))] px-3.5 py-2.5 last:border-0 sm:grid-cols-12"
                >
                  <div className="col-span-4 flex items-center gap-2 sm:col-span-4">
                    <Avatar i={i} size={6} />
                    <div>
                      <div className="text-[10.5px] font-semibold">{c.name}</div>
                      <div className="flex items-center gap-1 text-[9px] text-[rgb(var(--color-subtle))]">
                        <span className={cn("h-1 w-1 rounded-full", c.score > 60 ? "bg-emerald-500" : c.score > 30 ? "bg-amber-400" : "bg-rose-400")} />
                        AI score {c.score}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10.5px] font-medium sm:col-span-2">{c.visits}×</div>
                  <div className="text-[10.5px] font-medium sm:col-span-2">{c.spend}</div>
                  <div className="sm:col-span-2">
                    <Tag tone={c.tier === "Gold" ? "violet" : c.tier === "Silver" ? "blue" : "slate"}>{c.tier}</Tag>
                  </div>
                  <div className="flex justify-end sm:col-span-2">
                    <Tag tone={c.status === "Loyal" ? "green" : c.status === "At risk" ? "rose" : c.status === "New" ? "blue" : "amber"}>
                      {c.status}
                    </Tag>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Booking                                                     */
/* ------------------------------------------------------------------ */

const SLOTS = [
  { t: "10:30", n: "Priya S.", s: "Hair + Color", free: false },
  { t: "11:00", free: true },
  { t: "11:30", free: true },
  { t: "12:00", n: "Aisha K.", s: "Facial", free: false },
  { t: "12:30", free: true },
  { t: "13:00", n: "Riya M.", s: "Manicure", free: false },
  { t: "13:30", free: true },
  { t: "14:00", free: true },
];

export function BookingScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Bookings" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Bookings" />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden bg-[rgb(var(--color-surface-2))] p-3 sm:p-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-bold">Thursday, June 30</div>
                    <div className="text-[10px] text-[rgb(var(--color-subtle))]">12 booked · 6 open</div>
                  </div>
                  <CalendarPlus className="h-4 w-4 text-[#2563EB]" />
                </div>
                <div className="space-y-1.5">
                  {SLOTS.map((s, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-[10px] font-bold text-[rgb(var(--color-subtle))]">{s.t}</span>
                      {s.free ? (
                        <div className="flex h-7 flex-1 items-center rounded-lg border border-dashed border-[rgb(var(--color-border))] px-3 text-[9.5px] font-medium text-[rgb(var(--color-subtle))]">
                          Available
                        </div>
                      ) : (
                        <div className="flex h-7 flex-1 items-center gap-2 rounded-lg bg-[#EFF6FF] px-2.5">
                          <Avatar i={i} size={5} />
                          <span className="text-[10px] font-semibold text-[#1E40AF]">{s.n}</span>
                          <span className="text-[9px] text-[#3B82F6]">{s.s}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-3 lg:col-span-2">
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold">Booking link</span>
                  <Tag tone="blue">LIVE</Tag>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-[rgb(var(--color-surface-2))] px-3 py-2">
                  <span className="truncate text-[10px] text-[rgb(var(--color-subtle))]">doloyal.app/book/bloom</span>
                  <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                </div>
                <div className="mt-2 text-[9.5px] text-[rgb(var(--color-subtle))]">
                  62% of bookings come from this link this week
                </div>
              </div>
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <span className="text-[11px] font-bold">No-show protection</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-lg bg-[#F0FDF4] px-2.5 py-2 text-[10px] font-semibold text-emerald-700">
                    <Phone className="h-3 w-3" /> Auto-reminder sent 24h before
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[9.5px] text-[rgb(var(--color-subtle))]">
                  <span>No-shows down</span>
                  <span className="font-bold text-emerald-600">−34%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Loyalty                                                     */
/* ------------------------------------------------------------------ */

export function LoyaltyScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Loyalty" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Loyalty" />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden bg-[rgb(var(--color-surface-2))] p-3 sm:p-4 lg:grid-cols-5">
            <div className="flex flex-col gap-3 lg:col-span-3">
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { l: "Points issued", v: "2.1M", d: "+8.2%" },
                  { l: "Redeemed", v: "1.6M", d: "+11.4%" },
                  { l: "Members", v: "2,940", d: "+3.1%" },
                ].map((k) => (
                  <div key={k.l} className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3">
                    <div className="text-[9.5px] font-semibold uppercase tracking-wider text-[rgb(var(--color-subtle))]">{k.l}</div>
                    <div className="mt-1 text-[15px] font-bold tracking-tight">{k.v}</div>
                    <div className="text-[9.5px] font-semibold text-emerald-600">{k.d}</div>
                  </div>
                ))}
              </div>
              <div className="flex-1 rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold">Earning rules</span>
                  <Tag tone="green">Active</Tag>
                </div>
                <div className="space-y-2">
                  {[
                    { rule: "1 point per ₹100 spent", pct: 100 },
                    { rule: "10 points on every 5th visit", pct: 72 },
                    { rule: "2× points on birthdays", pct: 64 },
                    { rule: "100 points for referrals", pct: 48 },
                  ].map((r) => (
                    <div key={r.rule} className="flex items-center gap-3 rounded-lg bg-[rgb(var(--color-surface-2))] px-3 py-2">
                      <div className="h-2 w-full max-w-[160px] overflow-hidden rounded-full bg-[rgb(var(--color-border))]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="truncate text-[10px] font-medium">{r.rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="rounded-xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#4C1D95] p-4 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">Gold Member · Sana K.</span>
                  <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                </div>
                <div className="mt-2 text-[22px] font-bold tracking-tight">12,480 pts</div>
                <div className="text-[9.5px] text-white/60">Worth ₹2,496 in rewards · 18% from VIP tier</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#60A5FA] to-[#C084FC]" />
                </div>
                <div className="mt-1.5 flex justify-between text-[9px] text-white/50">
                  <span>Next tier: Platinum</span>
                  <span>28% away</span>
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <span className="text-[11px] font-bold">Redemptions this month</span>
                <div className="mt-2.5 space-y-2.5">
                  {[
                    { name: "Free facial", used: 142, pct: 78 },
                    { name: "20% off service", used: 96, pct: 54 },
                    { name: "2× points day", used: 61, pct: 33 },
                  ].map((r) => (
                    <div key={r.name}>
                      <div className="mb-1 flex justify-between text-[9.5px]">
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-[rgb(var(--color-subtle))]">{r.used} used</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-border))]">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#D946EF]" style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Website builder                                             */
/* ------------------------------------------------------------------ */

export function BuilderScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Sites" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Website Builder" />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden bg-[rgb(var(--color-surface-2))] p-3 sm:p-4 lg:grid-cols-4">
            <div className="hidden flex-col gap-1.5 lg:flex">
              <span className="mb-1 text-[9.5px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">Blocks</span>
              {["Hero", "Services", "Team", "Gallery", "Reviews", "Booking", "Contact", "Footer"].map((b, i) => (
                <div
                  key={b}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium",
                    i === 0 ? "bg-white text-[rgb(var(--color-foreground))] shadow-[0_1px_2px_rgba(15,23,42,0.08)]" : "text-[rgb(var(--color-subtle))]",
                  )}
                >
                  <div className={cn("h-2 w-2 rounded", i === 0 ? "bg-[#2563EB]" : "bg-[rgb(var(--color-border))]")} />
                  {b}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-white lg:col-span-3">
              <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[rgb(var(--color-subtle))]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> bloom-studio.doloyal.site
                </div>
                <div className="flex gap-1.5">
                  <Tag tone="blue">Desktop</Tag>
                  <Tag tone="slate">Tablet</Tag>
                  <Tag tone="slate">Mobile</Tag>
                </div>
              </div>
              <div className="flex-1 overflow-hidden bg-[#F8FAFC] px-6 pb-4 pt-3">
                <div className="mx-auto max-w-[440px] rounded-xl border border-[rgb(var(--color-border))] bg-white shadow-[0_8px_24px_-12px_rgba(15,23,42,0.15)]">
                  <div className="bg-gradient-to-br from-[#1E1B4B] to-[#4C1D95] p-5 text-white">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-white/50">Bloom Beauty Studio</div>
                    <div className="mt-1 text-[16px] font-bold leading-tight">Look good. <br /> Come back often.</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-[#4C1D95]">
                      Book now <ArrowUpRight className="h-2.5 w-2.5" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 p-3">
                    {["Hair", "Skin", "Nails"].map((s) => (
                      <div key={s} className="rounded-lg bg-[#F8FAFC] p-2.5 text-center">
                        <div className="mx-auto mb-1.5 h-8 w-8 rounded-full bg-gradient-to-br from-[#2563EB]/15 to-[#7C3AED]/15" />
                        <div className="text-[9.5px] font-bold">{s}</div>
                        <div className="text-[8.5px] text-[rgb(var(--color-subtle))]">from ₹499</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-[rgb(var(--color-border))] px-4 py-2.5">
                    <span className="text-[9px] font-semibold text-emerald-600">★ 4.9 · 1,240 reviews</span>
                    <span className="text-[9px] font-medium text-[rgb(var(--color-subtle))]">Loyalty: 1 pt / ₹100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Screen: Analytics                                                   */
/* ------------------------------------------------------------------ */

export function AnalyticsScreen({ className }: { className?: string }) {
  return (
    <MockWindow frame className={cn("select-none", className)}>
      <div className="flex h-[420px] overflow-hidden rounded-xl border border-[rgb(var(--color-border))] lg:h-[460px]">
        <ScreenSidebar active="Analytics" className="hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title="Analytics" />
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-hidden bg-[rgb(var(--color-surface-2))] p-3 sm:p-4 lg:grid-cols-3">
            <div className="flex flex-col gap-3 lg:col-span-2">
              <div className="flex-1 rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold">Retention curve</span>
                  <Tag tone="green">+12.6% vs last quarter</Tag>
                </div>
                <div className="text-[9.5px] text-[rgb(var(--color-subtle))]">% of customers returning each month</div>
                <AreaChart data={[22, 26, 25, 34, 33, 42, 47, 52, 58, 63, 68]} height={110} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                  <span className="text-[11px] font-bold">Repeat visit rate</span>
                  <div className="mt-1 text-[20px] font-bold tracking-tight">71.2%</div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <ArrowUpRight className="h-3 w-3" /> +9.8%
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-border))]">
                    <div className="h-full w-[71%] rounded-full bg-gradient-to-r from-[#10B981] to-[#6EE7B7]" />
                  </div>
                </div>
                <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                  <span className="text-[11px] font-bold">Churn risk</span>
                  <div className="mt-1 text-[20px] font-bold tracking-tight">2.1%</div>
                  <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <ArrowDownRight className="h-3 w-3" /> −1.4%
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-border))]">
                    <div className="h-full w-[21%] rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <span className="text-[11px] font-bold">Revenue by channel</span>
                <div className="mt-3 space-y-2.5">
                  {[
                    { label: "Loyalty & rewards", pct: 44, color: "from-[#2563EB] to-[#60A5FA]" },
                    { label: "Bookings", pct: 28, color: "from-[#7C3AED] to-[#C084FC]" },
                    { label: "Memberships", pct: 18, color: "from-[#10B981] to-[#6EE7B7]" },
                    { label: "Referrals", pct: 10, color: "from-[#F59E0B] to-[#FCD34D]" },
                  ].map((c) => (
                    <div key={c.label}>
                      <div className="mb-1 flex justify-between text-[9.5px]">
                        <span className="font-semibold">{c.label}</span>
                        <span className="font-bold">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-border))]">
                        <div className={cn("h-full rounded-full bg-gradient-to-r", c.color)} style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 rounded-xl border border-[rgb(var(--color-border))] bg-white p-3.5">
                <span className="text-[11px] font-bold">AI insights</span>
                <div className="mt-2 space-y-2">
                  {[
                    { icon: Zap, text: "Wednesday is your lowest-margin day. Launch a mid-week offer.", tone: "amber" },
                    { icon: Users, text: "12 VIP members haven't visited in 30 days. Win-back ready.", tone: "rose" },
                    { icon: Wallet, text: "Reward redemptions lift spend by ₹412 on average.", tone: "green" },
                  ].map((ins, i) => (
                    <div key={i} className="flex gap-2 rounded-lg bg-[rgb(var(--color-surface-2))] p-2.5">
                      <ins.icon className="mt-0.5 h-3 w-3 shrink-0 text-[#7C3AED]" />
                      <span className="text-[9.5px] leading-snug text-[rgb(var(--color-muted-foreground))]">{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

/* ------------------------------------------------------------------ */
/* Floating cards (hero)                                               */
/* ------------------------------------------------------------------ */

export function FloatingRetentionCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[210px] rounded-2xl border border-[rgb(var(--color-border))] bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[rgb(var(--color-muted-foreground))]">Retention</span>
        <Tag tone="green">+38%</Tag>
      </div>
      <div className="text-[22px] font-bold tracking-tight">68.4%</div>
      <AreaChart data={[30, 34, 38, 40, 44, 50, 55, 60, 68]} height={44} />
      <div className="mt-1.5 flex justify-between text-[9px] text-[rgb(var(--color-subtle))]">
        <span>Last quarter</span>
        <span className="font-semibold text-emerald-600">This month</span>
      </div>
    </div>
  );
}

export function FloatingWalletCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[210px] rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#4C1D95] p-4 text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_24px_48px_-16px_rgba(76,29,149,0.45)]",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/70">
          <Wallet className="h-3 w-3" /> Loyalty wallet
        </span>
        <span className="text-[9px] font-bold text-white/50">GOLD</span>
      </div>
      <div className="mt-2 text-[22px] font-bold tracking-tight">12,480 pts</div>
      <div className="text-[10px] text-white/60">Worth ₹2,496 · 2 rewards ready</div>
      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white/10 px-2.5 py-1.5 text-[9.5px] font-semibold">
        <span className="text-white/70">Next: Free facial</span>
        <span className="text-white">420 pts away</span>
      </div>
    </div>
  );
}

export function FloatingBookingCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-[210px] rounded-2xl border border-[rgb(var(--color-border))] bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[rgb(var(--color-muted-foreground))]">New booking</span>
        <Clock className="h-3.5 w-3.5 text-[#2563EB]" />
      </div>
      <div className="flex items-center gap-2.5">
        <Avatar i={2} size={7} />
        <div>
          <div className="text-[12px] font-bold">Aisha Kapoor</div>
          <div className="text-[10px] text-[rgb(var(--color-subtle))]">Hair + Color · Thu 2:00 PM</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-[#F0FDF4] px-2.5 py-1.5 text-[9.5px] font-semibold text-emerald-700">
        <CircleCheck className="h-3 w-3" /> Confirmed · deposit ₹500
      </div>
    </div>
  );
}

export function FloatingToast({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-[240px] items-center gap-2.5 rounded-2xl border border-[rgb(var(--color-border))] bg-white/95 p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_48px_-16px_rgba(15,23,42,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10">
        <Bot className="h-4 w-4 text-[#7C3AED]" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-bold">Win-back sent</div>
        <div className="truncate text-[10px] text-[rgb(var(--color-muted-foreground))]">
          12 at-risk customers · 10% off via WhatsApp
        </div>
      </div>
      <Sparkles className="ml-auto h-3.5 w-3.5 shrink-0 text-[#D946EF]" />
    </div>
  );
}