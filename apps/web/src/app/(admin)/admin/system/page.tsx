"use client";

import * as React from "react";
import { Activity, Clock, Info, Server } from "lucide-react";
import { Badge, Card, CardContent, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminSystemHealth } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

const SERVICE_VARIANT: Record<string, string> = {
  OPERATIONAL: "success",
  DEGRADED: "warning",
  DOWN: "danger",
};

export default function AdminSystemPage() {
  const [data, setData] = React.useState<AdminSystemHealth | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminSystemHealth()
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
          <EmptyState icon={<Server className="h-10 w-10" />} title="System health unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Health"
        description="Live status of the services powering Doloyal."
        breadcrumbs={[{ label: "Admin" }, { label: "System" }]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard label="Overall status" value={data.overall.replace(/_/g, " ")} icon={<Activity className="h-4 w-4" />} tone={data.overall === "OPERATIONAL" ? "success" : data.overall === "DEGRADED" ? "warning" : "danger"} />
        <AdminStatCard label="Uptime" value={`${data.uptime}%`} icon={<Clock className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Incidents (24h)" value={data.incidents24h} icon={<Activity className="h-4 w-4" />} tone={data.incidents24h > 0 ? "warning" : "success"} />
        <AdminStatCard label="Last checked" value={relativeTime(data.lastChecked)} icon={<Clock className="h-4 w-4" />} />
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-[rgb(var(--color-border))]">
            {data.services.map((s) => (
              <li key={s.key} className="flex items-center gap-3 px-5 py-4">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.status === "OPERATIONAL" ? "bg-[rgb(var(--color-success))]" : s.status === "DEGRADED" ? "bg-[rgb(var(--color-warning))]" : "bg-[rgb(var(--color-danger))]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{s.label}</p>
                  <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                    {s.latencyMs !== undefined ? `${s.latencyMs}ms` : "—"}
                    {s.errorRate !== undefined ? ` · ${s.errorRate}% errors` : ""}
                    {s.uptime !== undefined ? ` · ${s.uptime}% uptime` : ""}
                  </p>
                </div>
                <Badge variant={(SERVICE_VARIANT[s.status] as any) ?? "outline"}>{s.status.replace(/_/g, " ")}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}