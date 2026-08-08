"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Gift, Plus, TrendingUp } from "lucide-react";
import {
  PageHeader,
  Button,
  KpiCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { generateRewards } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

export default function BranchRewardsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const loading = usePageLoading(420);

  const rewards = React.useMemo(() => (branchId ? generateRewards(branchId) : []), [branchId]);

  const stats = React.useMemo(() => ({
    total: rewards.length,
    redeemed: rewards.reduce((s, r) => s + r.redeemed, 0),
    stock: rewards.reduce((s, r) => s + r.stock, 0),
  }), [rewards]);

  if (loading || !selectedBranch) return <PageSkeleton cards={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards"
        description={`Rewards available at ${selectedBranch.name}.`}
        actions={<Button><Plus className="h-4 w-4" /> Create Reward</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Rewards" value={stats.total} icon={<Gift className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Redeemed (total)" value={stats.redeemed} icon={<TrendingUp className="h-5 w-5" />} accent="accent" />
        <KpiCard label="In Stock" value={stats.stock} icon={<Gift className="h-5 w-5" />} accent="success" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reward</TableHead>
              <TableHead>Points Cost</TableHead>
              <TableHead>Redeemed</TableHead>
              <TableHead>Availability</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rewards.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="text-sm">{r.pointsCost.toLocaleString("en-IN")} pts</TableCell>
                <TableCell className="text-sm">{r.redeemed}</TableCell>
                <TableCell>
                  <Badge variant={r.stock > 3 ? "success" : "warning"} className="text-[0.6rem]">
                    {r.stock > 3 ? "In stock" : `${r.stock} left`}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}