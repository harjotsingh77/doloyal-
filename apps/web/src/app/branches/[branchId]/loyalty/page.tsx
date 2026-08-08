"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Sparkles, Gift, Users, Percent, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
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
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateCustomers, generateRewards, createSeededRandom } from "@/lib/branches";
import { PageSkeleton, SectionCard, usePageLoading } from "@/components/branch-ui";

export default function BranchLoyaltyPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);

  const data = React.useMemo(() => {
    if (!branchId) return null;
    const customers = generateCustomers(branchId).slice(0, 6);
    const rewards = generateRewards(branchId);
    const rng = createSeededRandom(branchId, 41);
    const issued = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
    const redeemed = Math.round(issued * (0.28 + rng() * 0.2));
    const members = customers.filter((c) => c.loyaltyPoints > 0).length;
    const ledger = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      customer: customers[i % customers.length]!.name,
      type: rng() > 0.55 ? "Earned" : "Redeemed",
      points: Math.round((50 + rng() * 350) / 10) * 10,
      detail: rng() > 0.5 ? "Service purchase" : "Reward redemption",
      at: `${1 + i}h ago`,
    }));
    return { customers, rewards, issued, redeemed, members, ledger };
  }, [branchId]);

  if (loading || !data || !selectedBranch) return <PageSkeleton cards={3} />;

  const redemptionRate = data.issued > 0 ? Math.round((data.redeemed / data.issued) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty"
        description={`Loyalty programme activity at ${selectedBranch.name}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Points Issued" value={data.issued} format={(v) => v.toLocaleString("en-IN")} icon={<Sparkles className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Points Redeemed" value={data.redeemed} format={(v) => v.toLocaleString("en-IN")} icon={<Gift className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Redemption Rate" value={redemptionRate} format={(v) => `${v}%`} icon={<Percent className="h-5 w-5" />} accent="success" />
        <KpiCard label="Loyalty Members" value={data.members} icon={<Users className="h-5 w-5" />} accent="accent" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Top Loyalty Customers" icon={<Sparkles className="h-4 w-4 text-[rgb(var(--color-primary))]" />}>
          <div className="space-y-1">
            {data.customers.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted))]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-primary)/0.1)] text-xs font-semibold text-[rgb(var(--color-primary))]">
                  {c.name.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{c.visits} visits</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--color-warning))]" />
                  {c.loyaltyPoints.toLocaleString("en-IN")}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Points Ledger" icon={<Gift className="h-4 w-4 text-[rgb(var(--color-warning))]" />}>
          <div className="space-y-1">
            {data.ledger.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted))]">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    l.type === "Earned"
                      ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                      : "bg-[rgb(var(--color-warning)/0.15)] text-[rgb(var(--color-warning))]"
                  }`}
                >
                  {l.type === "Earned" ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.customer}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{l.detail} · {l.at}</p>
                </div>
                <span className={`text-sm font-semibold ${l.type === "Earned" ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-warning))]"}`}>
                  {l.type === "Earned" ? "+" : "−"}{l.points}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Rewards" icon={<Gift className="h-4 w-4 text-[rgb(var(--color-warning))]" />}>
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
            {data.rewards.map((r) => (
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
      </SectionCard>
    </div>
  );
}