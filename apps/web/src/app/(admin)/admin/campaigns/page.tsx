"use client";

import * as React from "react";
import { Info, Mail, Megaphone, MessageCircle, Percent, Smartphone } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader, Skeleton } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminCampaignOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminCampaignsPage() {
  const [data, setData] = React.useState<AdminCampaignOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .adminCampaignsOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
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
          <EmptyState icon={<Megaphone className="h-10 w-10" />} title="Campaign data unavailable" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Broadcast volume and delivery health across channels."
        breadcrumbs={[{ label: "Admin" }, { label: "Campaigns" }]}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <AdminStatCard label="Sent (30d)" value={data.totalSent30d} icon={<Megaphone className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Email" value={data.emailSent} icon={<Mail className="h-4 w-4" />} />
        <AdminStatCard label="SMS" value={data.smsSent} icon={<Smartphone className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="WhatsApp" value={data.whatsappSent} icon={<MessageCircle className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Delivery rate" value={`${data.deliveryRate}%`} icon={<Percent className="h-4 w-4" />} tone="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By business</CardTitle>
          </CardHeader>
          <CardContent>
            {data.byBusiness.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No campaigns sent yet.</p>
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {data.byBusiness.map((b, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{b.businessName}</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {b.sent} sent · <span className={b.failed ? "text-[rgb(var(--color-danger))]" : ""}>{b.failed} failed</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Provider failures</CardTitle>
          </CardHeader>
          <CardContent>
            {data.providerFailures.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No provider failures in the last 30 days.</p>
            ) : (
              <ul className="space-y-2">
                {data.providerFailures.map((f, i) => (
                  <li key={i} className="rounded-lg border border-[rgb(var(--color-danger)/0.3)] bg-[rgb(var(--color-danger)/0.05)] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="danger">{f.provider}</Badge>
                      <span className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(f.at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-[rgb(var(--color-foreground))]">{f.lastError}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}