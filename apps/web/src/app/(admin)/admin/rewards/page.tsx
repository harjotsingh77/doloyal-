"use client";

import * as React from "react";
import { Gift, Info, Percent } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import type { AdminRewardsOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminRewardsPage() {
  const [data, setData] = React.useState<AdminRewardsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminRewardsOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
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
          <EmptyState icon={<Gift className="h-10 w-10" />} title="Rewards data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rewards"
        description="Redemption performance and most-used rewards."
        breadcrumbs={[{ label: "Admin" }, { label: "Rewards" }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Redemption rate" value={`${data.redemptionRate}%`} icon={<Percent className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Total redemptions" value={data.totalRedemptions} icon={<Gift className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Created (30d)" value={data.created30d} icon={<Gift className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Expired (30d)" value={data.expired30d} icon={<Gift className="h-4 w-4" />} tone="warning" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most-used rewards</CardTitle>
        </CardHeader>
        <CardContent>
          {data.mostUsed.length === 0 ? (
            <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
              No rewards have been redeemed yet.
            </p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {data.mostUsed.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="w-5 text-sm font-semibold text-[rgb(var(--color-muted-foreground))]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">{r.name}</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{r.businessName}</p>
                  </div>
                  <Badge variant="outline">{r.redeemedCount} redeemed</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}