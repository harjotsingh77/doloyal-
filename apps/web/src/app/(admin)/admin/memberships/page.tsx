"use client";

import * as React from "react";
import { Info, SquareStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import { formatCompact } from "@doloyal/shared";
import type { AdminMembershipsOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminMembershipsPage() {
  const [data, setData] = React.useState<AdminMembershipsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminMembershipsOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
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
          <EmptyState icon={<SquareStack className="h-10 w-10" />} title="Memberships data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Memberships"
        description="Paid membership plans and subscriber revenue."
        breadcrumbs={[{ label: "Admin" }, { label: "Memberships" }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Active memberships" value={data.activeMemberships} icon={<SquareStack className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="New (30d)" value={data.newMemberships30d} icon={<SquareStack className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Canceled (30d)" value={data.canceledMemberships30d} icon={<SquareStack className="h-4 w-4" />} tone="danger" />
        <AdminStatCard label="Membership revenue" value={formatCompact(data.membershipRevenue)} icon={<SquareStack className="h-4 w-4" />} tone="accent" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By business</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byBusiness.length === 0 ? (
            <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No membership plans in use.</p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {data.byBusiness.map((b, i) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{b.businessName}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {b.count} members · {formatCompact(b.revenue)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}