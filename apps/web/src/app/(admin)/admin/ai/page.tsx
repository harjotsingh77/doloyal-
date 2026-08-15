"use client";

import * as React from "react";
import { Bot, FileCode2, Info, MessageSquare, Sparkles, TrendingDown, Wallet } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, StatChart, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@doloyal/ui";
import { formatCompact } from "@doloyal/shared";
import type { AdminAiOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminAiPage() {
  const [data, setData] = React.useState<AdminAiOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState("30d");

  React.useEffect(() => {
    setLoading(true);
    api
      .adminAiOverview(range)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [range]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Sparkles className="h-10 w-10" />} title="AI usage data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI"
        description="Assistant, retention AI, and website generation usage."
        breadcrumbs={[{ label: "Admin" }, { label: "AI" }]}
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="AI queries (30d)" value={data.aiQueries30d} icon={<Bot className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Assistant sessions" value={data.assistantUsage30d} icon={<MessageSquare className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Retention AI calls" value={data.retentionAiUsage30d} icon={<Sparkles className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Site generations" value={data.websiteGenerationUsage30d} icon={<FileCode2 className="h-4 w-4" />} />
        <AdminStatCard label="AI errors (30d)" value={data.aiErrors30d} icon={<TrendingDown className="h-4 w-4" />} tone={data.aiErrors30d > 0 ? "danger" : "success"} />
        <AdminStatCard label="Est. cost" value={`₹${formatCompact(data.costEstimate)}`} icon={<Wallet className="h-4 w-4" />} tone="warning" />
      </div>

      {data.aiRequestVolume.length > 0 ? (
        <StatChart
          title="AI request volume"
          description="Queries per day in the selected range."
          data={data.aiRequestVolume.map((p) => ({ date: p.label, value: p.newUsers }))}
          series={[{ key: "value", label: "Queries" }]}
          xKey="date"
          type="area"
          valueFormat={(v) => String(v)}
        />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Usage by plan</CardTitle>
          </CardHeader>
          <CardContent>
            {data.usageByPlan.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No AI usage recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {data.usageByPlan.map((p) => (
                  <div key={p.plan} className="rounded-lg border border-[rgb(var(--color-border))] px-4 py-3">
                    <Badge variant="outline" className="mb-2 capitalize">
                      {p.plan}
                    </Badge>
                    <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                      {p.queries} queries · {formatCompact(p.tokens)} tokens
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top businesses</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.topBusinesses.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No AI usage recorded.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead className="text-right">Queries</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topBusinesses.map((b) => (
                    <TableRow key={b.businessName}>
                      <TableCell className="font-medium">{b.businessName}</TableCell>
                      <TableCell className="text-right">{b.queries}</TableCell>
                      <TableCell className="text-right">{formatCompact(b.tokens)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}