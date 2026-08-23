"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, Field } from "@doloyal/ui";
import { api } from "@/lib/api";
import { useBranchWorkspace } from "../layout";
import { BranchHeader } from "../branch-section";

export default function BranchSettingsPage() {
  const { stats, refresh } = useBranchWorkspace();
  const b = stats.branch;

  const [name, setName] = React.useState(b.name);
  const [phone, setPhone] = React.useState(b.phone || "");
  const [address, setAddress] = React.useState(b.address || "");
  const [city, setCity] = React.useState(b.city || "");
  const [saving, setSaving] = React.useState(false);

  const dirty =
    name !== b.name ||
    phone !== (b.phone || "") ||
    address !== (b.address || "") ||
    city !== (b.city || "");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Branch name is required.");
      return;
    }
    setSaving(true);
    try {
      await api.updateBranch(b.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      });
      toast.success("Branch settings saved.");
      refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save branch settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <BranchHeader title="Settings" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Location details</CardTitle>
          <CardDescription>
            Saved to your business record. Changes are visible across Doloyal immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <Field label="Branch name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Downtown Flagship" />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
            </Field>
            <Field label="Address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street and area" />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </Field>
            <div className="pt-2">
              <Button type="submit" disabled={saving || !dirty}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
        Business-wide settings (branding, hours, notifications) live in{" "}
        <a href="/app/settings" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
          Settings in the main workspace
        </a>
        .
      </p>
    </div>
  );
}
