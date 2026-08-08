"use client";

import * as React from "react";
import { Settings2, Save } from "lucide-react";
import {
  Button,
  Input,
  Field,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Skeleton,
  EmptyState,
} from "@doloyal/ui";
import type { ConnectedWebsite } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ConnectionSettingsPage() {
  const [sites, setSites] = React.useState<ConnectedWebsite[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [name, setName] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [syncEnabled, setSyncEnabled] = React.useState(true);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    api
      .listConnectedWebsites()
      .then((data) => {
        setSites(data);
        if (data[0]) {
          setSelectedId(data[0].id);
          setName(data[0].name);
          setWebsiteUrl(data[0].websiteUrl);
          setSyncEnabled(Boolean((data[0].settings as any)?.syncEnabled ?? true));
        }
      })
      .catch(() => toast.error("Failed to load connections"))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    const site = sites.find((s) => s.id === selectedId);
    if (!site) return;
    setName(site.name);
    setWebsiteUrl(site.websiteUrl);
    setSyncEnabled(Boolean((site.settings as any)?.syncEnabled ?? true));
  }, [selectedId, sites]);

  const handleSave = async () => {
    if (!selectedId) return;
    if (!name.trim() || !websiteUrl.trim()) {
      toast.error("Name and URL are required");
      return;
    }
    try {
      setSaving(true);
      const updated = await api.updateConnectedWebsiteSettings(selectedId, {
        name: name.trim(),
        websiteUrl: websiteUrl.trim(),
        settings: { syncEnabled },
      });
      setSites((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
      toast.success("Connection settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Connection Settings" description="Manage sync preferences for each website" />
        <EmptyState
          icon={<Settings2 className="h-7 w-7" />}
          title="No connections yet"
          description="Connect a website first to manage its settings."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connection Settings"
        description="Update website details and sync preferences"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Website</CardTitle>
          <CardDescription>Choose a connected website to edit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Connected website">
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Website name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Website URL" required>
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] px-4 py-3">
            <div>
              <div className="text-sm font-medium">Automatic sync</div>
              <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                Keep CRM, appointments, and loyalty in sync with this website
              </div>
            </div>
            <Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
          </div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
