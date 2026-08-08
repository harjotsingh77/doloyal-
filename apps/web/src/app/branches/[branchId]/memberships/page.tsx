"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Crown, UserPlus, Wallet, RotateCcw, Timer } from "lucide-react";
import {
  PageHeader,
  KpiCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateMemberships } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

const STATUS_TONE: Record<string, "success" | "danger" | "warning"> = {
  Active: "success",
  Expired: "danger",
  "Expiring Soon": "warning",
};

export default function BranchMembershipsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);

  const memberships = React.useMemo(() => (branchId ? generateMemberships(branchId) : []), [branchId]);

  const stats = React.useMemo(() => ({
    active: memberships.filter((m) => m.status === "Active").length,
    expired: memberships.filter((m) => m.status === "Expired").length,
    revenue: memberships.filter((m) => m.status !== "Expired").reduce((s, m) => s + m.price, 0),
    renewals: memberships.reduce((s, m) => s + m.renewals, 0),
  }), [memberships]);

  if (loading || !selectedBranch) return <PageSkeleton cards={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships"
        description={`Memberships sold at ${selectedBranch.name}.`}
        actions={<Button><UserPlus className="h-4 w-4" /> New Membership</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Memberships" value={stats.active} icon={<Crown className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Expired" value={stats.expired} icon={<Timer className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Membership Revenue" value={stats.revenue} format={(v) => fmt(v)} icon={<Wallet className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Total Renewals" value={stats.renewals} icon={<RotateCcw className="h-5 w-5" />} accent="success" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Renewals</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberships.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.customer}</TableCell>
                <TableCell>
                  <Badge variant="primary">{m.plan}</Badge>
                </TableCell>
                <TableCell className="text-sm font-semibold">{fmt(m.price)}</TableCell>
                <TableCell className="text-sm">{m.startedAt}</TableCell>
                <TableCell className="text-sm">{m.expiresAt}</TableCell>
                <TableCell className="text-sm">{m.renewals}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_TONE[m.status] ?? "outline"} className="text-[0.6rem]">{m.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}