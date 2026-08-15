"use client";

import * as React from "react";
import { Info, Link2, ShieldAlert } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminIntegrationsOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

const STATUS_VARIANT: Record<string, string> = {
  CONNECTED: "success",
  ACTIVE: "success",
  ERROR: "danger",
  DISABLED: "outline",
  DISCONNECTED: "warning",
  PENDING: "warning",
};

export default function AdminIntegrationsPage() {
  const [data, setData] = React.useState<AdminIntegrationsOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminIntegrationsOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <EmptyState icon={<Link2 className="h-10 w-10" />} title="Integrations data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        description="Third-party integrations connected across all businesses."
        breadcrumbs={[{ label: "Admin" }, { label: "Integrations" }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AdminStatCard label="Total connected" value={data.totalConnected} icon={<Link2 className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Failures (24h)" value={data.failures24h} icon={<ShieldAlert className="h-4 w-4" />} tone={data.failures24h > 0 ? "danger" : "success"} />
        <AdminStatCard label="Payments" value={data.paymentsStatus.replace(/_/g, " ")} icon={<Link2 className="h-4 w-4" />} tone={data.paymentsStatus.includes("FAIL") ? "danger" : "accent"} />
      </div>

      <Card>
        <CardContent className="p-0">
          {data.items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<Link2 className="h-10 w-10" />} title="No integrations connected" description="Integration connections appear here as businesses connect them." />
            </div>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {data.items.map((i) => (
                <li key={i.type} className="flex items-center gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{i.label}</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {i.connectedCount} connected · {i.usage} events
                      {i.lastSyncAt ? ` · synced ${relativeTime(i.lastSyncAt)}` : ""}
                    </p>
                    {i.lastError ? <p className="mt-1 truncate text-[0.62rem] text-[rgb(var(--color-danger))]">{i.lastError}</p> : null}
                  </div>
                  <Badge variant={(STATUS_VARIANT[i.status] as any) ?? "outline"}>{i.status.replace(/_/g, " ")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}