"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  IdCard,
  UserPlus,
  Star,
  TrendingUp,
  Percent,
  CalendarOff,
  Clock,
  Wallet,
  CalendarDays,
  Users,
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
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateStaff } from "@/lib/branches";
import { PageSkeleton, ProgressBar, usePageLoading } from "@/components/branch-ui";
import type { BranchStaff } from "@/lib/branches";

export default function BranchStaffPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);

  const staff = React.useMemo(() => (branchId ? generateStaff(branchId) : []), [branchId]);

  const totals = React.useMemo(() => ({
    revenue: staff.reduce((s, x) => s + x.revenue, 0),
    appointments: staff.reduce((s, x) => s + x.appointments, 0),
    present: staff.filter((x) => x.present).length,
    leaves: staff.reduce((s, x) => s + x.leaves, 0),
  }), [staff]);

  if (loading || !selectedBranch) return <PageSkeleton cards={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description={`Team members assigned to ${selectedBranch.name} only.`}
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Staff Members" value={staff.length} icon={<IdCard className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Present Today" value={totals.present} icon={<Users className="h-5 w-5" />} accent="success" />
        <KpiCard label="Total Revenue" value={totals.revenue} format={(v) => fmt(v)} icon={<Wallet className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Total Appointments" value={totals.appointments} icon={<CalendarDays className="h-5 w-5" />} accent="violet" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Appointments</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Performance</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Leaves</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.id} className="cursor-pointer hover:bg-[rgb(var(--color-muted)/0.5)]">
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-primary)/0.1)] text-xs font-semibold text-[rgb(var(--color-primary))]">
                      {s.name.split(" ").map((w) => w[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{s.role}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="w-28">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{s.attendance}%</span>
                    <ProgressBar value={s.attendance} accent="#10B981" />
                  </div>
                </TableCell>
                <TableCell className="text-sm font-semibold">{fmt(s.revenue)}</TableCell>
                <TableCell className="text-sm">{s.appointments}</TableCell>
                <TableCell className="text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-[rgb(var(--color-warning))]" />
                    {s.rating.toFixed(1)}
                  </span>
                </TableCell>
                <TableCell className="w-28">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{s.performance}%</span>
                    <ProgressBar value={s.performance} accent={selectedBranch.accent} />
                  </div>
                </TableCell>
                <TableCell className="text-sm">{fmt(s.commission)}</TableCell>
                <TableCell className="text-sm">{s.leaves}</TableCell>
                <TableCell className="text-sm">{s.workingHours}h</TableCell>
                <TableCell>
                  <Badge variant={s.present ? "success" : "outline"} className="text-[0.6rem]">
                    {s.present ? "Present" : "Off"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricStrip icon={<TrendingUp className="h-4 w-4" />} label="Avg Performance" value={`${Math.round(staff.reduce((s, x) => s + x.performance, 0) / Math.max(1, staff.length))}%`} />
        <MetricStrip icon={<Star className="h-4 w-4" />} label="Avg Rating" value={`${(staff.reduce((s, x) => s + x.rating, 0) / Math.max(1, staff.length)).toFixed(1)} / 5`} />
        <MetricStrip icon={<Percent className="h-4 w-4" />} label="Avg Attendance" value={`${(staff.reduce((s, x) => s + x.attendance, 0) / Math.max(1, staff.length)).toFixed(0)}%`} />
        <MetricStrip icon={<CalendarOff className="h-4 w-4" />} label="Total Leaves" value={`${totals.leaves}d`} />
      </div>
    </div>
  );
}

function MetricStrip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgb(var(--color-muted))] text-[rgb(var(--color-primary))]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}