"use client";

import * as React from "react";
import { Coins, Gift, Heart, TrendingUp } from "lucide-react";
import { Card, CardContent, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import type { AdminLoyaltyOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminLoyaltyPage() {
  const [data, setData] = React.useState<AdminLoyaltyOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminLoyaltyOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
          <EmptyState title="Loyalty data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loyalty"
        description="Points, rewards, and program adoption across all businesses."
        breadcrumbs={[{ label: "Admin" }, { label: "Loyalty" }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard label="Points issued" value={data.pointsIssued} tone="primary" />
        <AdminStatCard label="Points redeemed" value={data.pointsRedeemed} tone="success" />
        <AdminStatCard label="Rewards created" value={data.rewardsCreated} tone="accent" />
        <AdminStatCard label="Rewards redeemed" value={data.rewardsRedeemed} tone="accent" />
        <AdminStatCard label="Active programs" value={data.activePrograms} tone="warning" />
        <AdminStatCard label="Businesses with loyalty" value={data.totalBusinesses} />
      </div>
    </div>
  );
}