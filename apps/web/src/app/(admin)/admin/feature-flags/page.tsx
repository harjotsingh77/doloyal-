"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  Switch,
} from "@doloyal/ui";
import type { AdminFeatureFlagCatalogItem } from "@doloyal/shared";
import { api } from "@/lib/api";

export default function AdminFeatureFlagsPage() {
  const [catalog, setCatalog] = React.useState<AdminFeatureFlagCatalogItem[]>([]);
  const [tenantCount, setTenantCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [tenantId, setTenantId] = React.useState("");
  const [tenantName, setTenantName] = React.useState("");
  const [features, setFeatures] = React.useState<Array<{ key: string; name: string; description: string; category: string; core: boolean; enabled: boolean }>>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .adminFeatureFlagOverview()
      .then((res) => {
        setCatalog(res.catalog || []);
        setTenantCount(res.tenantCount || 0);
      })
      .catch(() => setCatalog([]))
      .finally(() => setLoading(false));
  }, []);

  const loadTenant = async () => {
    if (!tenantId.trim()) {
      toast.error("Enter a business ID");
      return;
    }
    try {
      const res = await api.adminTenantFeatureFlags(tenantId.trim());
      setTenantName(res.tenant.name);
      setFeatures(res.features || []);
    } catch {
      toast.error("Business not found");
      setFeatures([]);
    }
  };

  const toggle = async (key: string, enabled: boolean) => {
    setBusy(key);
    try {
      await api.adminSetTenantFeatureFlag(tenantId.trim(), key, enabled);
      setFeatures((prev) => prev.map((f) => (f.key === key ? { ...f, enabled } : f)));
      toast.success(enabled ? "Feature enabled" : "Feature disabled");
    } catch {
      toast.error("Could not update feature flag");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Flags"
        description="Tenant-level loyalty and product modules. Core flags cannot be disabled."
        breadcrumbs={[{ label: "Admin" }, { label: "Feature Flags" }]}
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : catalog.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState title="No feature catalog" description="Loyalty feature definitions were not found." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((f) => (
            <Card key={f.key}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{f.name}</p>
                    <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">{f.description}</p>
                  </div>
                  {f.core ? <Badge variant="outline">Core</Badge> : null}
                </div>
                <p className="mt-3 text-xs text-[rgb(var(--color-muted-foreground))]">
                  Enabled for {f.enabledTenants} of {tenantCount} businesses
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Toggle for one business</p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Paste a business ID from the Businesses page. Changes persist and are enforced server-side.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="Business ID" />
            <Button onClick={loadTenant}>Load flags</Button>
          </div>
          {tenantName ? <p className="text-sm font-medium">{tenantName}</p> : null}
          {features.length > 0 ? (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {features.map((f) => (
                <li key={f.key} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{f.name}</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{f.description}</p>
                  </div>
                  <Switch
                    checked={f.enabled}
                    disabled={f.core || busy === f.key}
                    onCheckedChange={(v) => toggle(f.key, v)}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
