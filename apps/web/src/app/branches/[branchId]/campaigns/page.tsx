"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Megaphone, MousePointerClick, Users, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
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
import { generateCampaigns } from "@/lib/branches";
import { PageSkeleton, SectionCard, ProgressBar, usePageLoading } from "@/components/branch-ui";

export default function BranchCampaignsPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);

  const campaigns = React.useMemo(() => (branchId ? generateCampaigns(branchId) : []), [branchId]);

  const stats = React.useMemo(() => {
    const clicks = campaigns.reduce((s, c) => s + c.clicks, 0);
    const leads = campaigns.reduce((s, c) => s + c.leads, 0);
    const bookings = campaigns.reduce((s, c) => s + c.bookings, 0);
    const revenue = campaigns.reduce((s, c) => s + c.revenue, 0);
    const spend = campaigns.reduce((s, c) => s + c.spend, 0);
    return { clicks, leads, bookings, revenue, spend, roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0 };
  }, [campaigns]);

  if (loading || !selectedBranch) return <PageSkeleton cards={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description={`Campaign performance for ${selectedBranch.name}.`}
        actions={<Button><Megaphone className="h-4 w-4" /> New Campaign</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Clicks" value={stats.clicks} icon={<MousePointerClick className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Leads" value={stats.leads} icon={<Users className="h-5 w-5" />} accent="accent" />
        <KpiCard label="Bookings" value={stats.bookings} icon={<CalendarDays className="h-5 w-5" />} accent="success" />
        <KpiCard label="Revenue" value={stats.revenue} format={(v) => fmt(v)} icon={<DollarSign className="h-5 w-5" />} accent="violet" />
        <KpiCard label="ROI" value={stats.roi} format={(v) => `${v.toFixed(0)}%`} delta={stats.roi} icon={<TrendingUp className="h-5 w-5" />} accent="warning" />
        <KpiCard label="Ad Spend" value={stats.spend} format={(v) => fmt(v)} icon={<DollarSign className="h-5 w-5" />} accent="danger" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Bookings</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>ROI</TableHead>
              <TableHead>Sent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((c) => {
              const roi = c.spend > 0 ? ((c.revenue - c.spend) / c.spend) * 100 : 0;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[0.6rem]">{c.channel}</Badge></TableCell>
                  <TableCell className="text-sm">{c.clicks}</TableCell>
                  <TableCell className="text-sm">{c.leads}</TableCell>
                  <TableCell className="text-sm">{c.bookings}</TableCell>
                  <TableCell className="text-sm font-semibold">{fmt(c.revenue)}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${roi >= 0 ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-danger))]"}`}>
                      {roi >= 0 ? "+" : ""}{roi.toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{c.sentAt}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <SectionCard title="Campaign Performance" icon={<TrendingUp className="h-4 w-4 text-[rgb(var(--color-primary))]" />}>
        <div className="space-y-4">
          {campaigns.slice(0, 5).map((c) => {
            const pct = stats.clicks > 0 ? (c.clicks / stats.clicks) * 100 : 0;
            return (
              <div key={c.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-[rgb(var(--color-muted-foreground))]">{c.clicks} clicks · {fmt(c.revenue)}</span>
                </div>
                <ProgressBar value={pct} accent={selectedBranch.accent} />
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}