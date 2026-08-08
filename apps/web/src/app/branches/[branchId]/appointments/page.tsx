"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  LayoutGrid,
  List,
  GitCommitHorizontal,
  Plus,
  CalendarClock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  PageHeader,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  KpiCard,
  EmptyState,
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateAppointments } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";
import type { BranchAppointment } from "@/lib/branches";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "accent" | "primary" | "outline"> = {
  Completed: "success",
  "In Progress": "accent",
  Upcoming: "primary",
  "No-show": "warning",
  Cancelled: "danger",
};

export default function BranchAppointmentsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);
  const [tab, setTab] = React.useState<"calendar" | "list" | "timeline">("list");

  const appts = React.useMemo(() => (branchId ? generateAppointments(branchId) : []), [branchId]);

  const counts = React.useMemo(() => ({
    upcoming: appts.filter((a) => a.status === "Upcoming" || a.status === "In Progress").length,
    completed: appts.filter((a) => a.status === "Completed").length,
    cancelled: appts.filter((a) => a.status === "Cancelled" || a.status === "No-show").length,
  }), [appts]);

  if (loading || !selectedBranch) return <PageSkeleton cards={3} />;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments"
        description={`Appointments booked at ${selectedBranch.name} only.`}
        actions={
          <Button>
            <Plus className="h-4 w-4" />
            New Appointment
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Upcoming" value={counts.upcoming} icon={<CalendarClock className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Completed" value={counts.completed} icon={<CheckCircle2 className="h-5 w-5" />} accent="success" />
        <KpiCard label="Cancelled / No-show" value={counts.cancelled} icon={<XCircle className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Today" value={appts.filter((a) => a.date === today).length} icon={<CalendarClock className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="flex items-center gap-1 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-1 w-fit">
        {([
          { id: "calendar", label: "Calendar", icon: LayoutGrid },
          { id: "list", label: "List", icon: List },
          { id: "timeline", label: "Timeline", icon: GitCommitHorizontal },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
              tab === t.id ? "bg-[rgb(var(--color-primary))] text-white" : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "calendar" && <CalendarView appts={appts} fmt={fmt} branchId={branchId} />}
      {tab === "list" && <ListView appts={appts} fmt={fmt} />}
      {tab === "timeline" && <TimelineView appts={appts} fmt={fmt} />}
    </div>
  );
}

function ListView({ appts, fmt }: { appts: BranchAppointment[]; fmt: (n: number) => string }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Assigned Staff</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {appts.length === 0 ? (
            <tr><td colSpan={8} className="py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">No appointments</td></tr>
          ) : (
            appts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.customer}</TableCell>
                <TableCell className="text-sm">{a.service}</TableCell>
                <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{a.staff}</TableCell>
                <TableCell className="text-sm">{a.date}</TableCell>
                <TableCell className="text-sm">{a.time}</TableCell>
                <TableCell><Badge variant={STATUS_TONE[a.status] ?? "outline"} className="text-[0.6rem]">{a.status}</Badge></TableCell>
                <TableCell className="text-sm">{a.payment}</TableCell>
                <TableCell className="text-sm font-semibold">{fmt(a.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CalendarView({ appts, fmt, branchId }: { appts: BranchAppointment[]; fmt: (n: number) => string; branchId: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<string, number>();
  appts.forEach((a) => {
    const d = a.date;
    if (d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) {
      byDay.set(d, (byDay.get(d) ?? 0) + 1);
    }
  });

  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
      <p className="mb-4 text-sm font-semibold">
        {now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} — {branchId}
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="pb-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = byDay.get(key) ?? 0;
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div
              key={i}
              className={`flex h-16 flex-col items-center justify-center rounded-lg border text-sm transition-colors ${
                isToday
                  ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.1)]"
                  : "border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-muted))]"
              }`}
            >
              <span className="font-medium">{day}</span>
              {count > 0 && (
                <span className="mt-0.5 rounded-full bg-[rgb(var(--color-primary))] px-1.5 text-[0.6rem] font-semibold text-white">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({ appts, fmt }: { appts: BranchAppointment[]; fmt: (n: number) => string }) {
  const groups = appts.reduce<Record<string, BranchAppointment[]>>((acc, a) => {
    (acc[a.date] ??= []).push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {Object.keys(groups).length === 0 ? (
        <EmptyState icon={<LayoutGrid className="h-6 w-6" />} title="No appointments to show" />
      ) : (
        Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CalendarClock className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              {new Date(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <div className="border-l-2 border-[rgb(var(--color-border))] pl-4">
              {items.map((a) => (
                <div key={a.id} className="relative mb-3 rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3">
                  <span className="absolute -left-[1.375rem] top-4 h-2.5 w-2.5 rounded-full bg-[rgb(var(--color-primary))]" />
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.customer}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {a.time} · {a.service} · {a.staff}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-semibold">{fmt(a.amount)}</span>
                      <Badge variant={STATUS_TONE[a.status] ?? "outline"} className="text-[0.6rem]">{a.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

