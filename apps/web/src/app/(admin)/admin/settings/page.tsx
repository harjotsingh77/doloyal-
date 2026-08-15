"use client";

import * as React from "react";
import { Info, Save } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState, Input, Label, PageHeader, Skeleton, Switch } from "@doloyal/ui";
import type { AdminSettingsBundle } from "@doloyal/shared";
import { api } from "@/lib/api";

const GROUP_LABELS: Record<string, string> = {
  general: "General",
  brand: "Brand",
  email: "Email",
  notifications: "Notifications",
  billing: "Billing",
  auth: "Authentication",
  security: "Security",
  ai: "AI",
  integrations: "Integrations",
  support: "Support",
};

const FIELD_LABELS: Record<string, string> = {
  platformName: "Platform name",
  supportEmail: "Support email",
  defaultCurrency: "Default currency",
  primaryColor: "Primary color",
  landingLogo: "Landing logo URL",
  fromName: "From name",
  fromAddress: "From address",
  enableAdminAlerts: "Admin alert emails",
  digestFrequency: "Admin digest frequency",
  currency: "Billing currency",
  trialDays: "Trial days",
  allowGoogleOAuth: "Google sign-in",
  requireTwoFactorAdmins: "Require 2FA for admins",
  adminSessionTtlHours: "Admin session TTL (hrs)",
  provider: "AI provider",
  model: "AI model",
  sandboxMode: "Sandbox mode",
  slaHours: "SLA (hrs)",
};

export default function AdminSettingsPage() {
  const [bundle, setBundle] = React.useState<AdminSettingsBundle | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [draft, setDraft] = React.useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api
      .adminGetSettings()
      .then((b) => {
        setBundle(b);
        const next: Record<string, Record<string, unknown>> = {};
        for (const [g, vals] of Object.entries(b)) {
          if (g === "_definitions") continue;
          next[g] = { ...(vals as Record<string, unknown>) };
        }
        setDraft(next);
      })
      .catch(() => setBundle(null))
      .finally(() => setLoading(false));
  }, []);

  const set = (group: string, key: string, value: unknown) => {
    setDraft((d) => ({ ...d, [group]: { ...(d[group] ?? {}), [key]: value } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.adminUpdateSettings(draft);
      toast.success(`Saved ${res.updated.length} setting${res.updated.length === 1 ? "" : "s"}`);
    } catch {
      toast.error("Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !bundle) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (!bundle) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Info className="h-10 w-10" />} title="Settings unavailable" />
        </CardContent>
      </Card>
    );
  }

  const groups = Object.keys(draft);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Platform-wide settings for the entire product."
        breadcrumbs={[{ label: "Admin" }, { label: "Settings" }]}
        actions={
          <Button onClick={save} loading={saving}>
            <Save className="h-4 w-4" />
            Save settings
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => {
          const values = draft[g] ?? {};
          const defs = ((bundle as any)._definitions ?? []).filter((d: { group: string }) => d.group === g);
          return (
            <Card key={g}>
              <CardHeader>
                <CardTitle>{GROUP_LABELS[g] ?? g}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(values).map(([key, value]) => {
                  const def = defs.find((d: { key: string }) => d.key.split(".")[1] === key);
                  const type = def?.type ?? (typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string");
                  if (type === "boolean") {
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{FIELD_LABELS[key] ?? key}</p>
                          {def?.description ? <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{def.description}</p> : null}
                        </div>
                        <Switch checked={Boolean(value)} onCheckedChange={(v) => set(g, key, v)} />
                      </div>
                    );
                  }
                  return (
                    <div key={key}>
                      <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">{FIELD_LABELS[key] ?? key}</Label>
                      <Input
                        type={type === "number" ? "number" : "text"}
                        value={String(value ?? "")}
                        onChange={(e) => set(g, key, type === "number" ? Number(e.target.value) : e.target.value)}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}