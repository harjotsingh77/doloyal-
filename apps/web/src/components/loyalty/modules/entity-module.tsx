"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { Button, Input, Field, Textarea, Badge } from "@doloyal/ui";
import { api } from "@/lib/api";
import {
  ModuleShell,
  ModuleCard,
  ModuleLoading,
  ModuleEmpty,
  type LoyaltyModuleProps,
} from "@/components/loyalty/module-shell";

type Entity = {
  id: string;
  name?: string | null;
  status: string;
  data: Record<string, unknown>;
  sortOrder: number;
};

export function createEntityModule(opts: {
  entityLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  fields: Array<{ key: string; label: string; type?: "text" | "number" | "textarea" }>;
  nameFrom?: (data: Record<string, unknown>) => string;
}) {
  return function EntityFeatureModule({ feature, onConfigure }: LoyaltyModuleProps) {
    const [loading, setLoading] = React.useState(true);
    const [entities, setEntities] = React.useState<Entity[]>([]);
    const [draft, setDraft] = React.useState<Record<string, string>>({});
    const [saving, setSaving] = React.useState(false);

    const load = React.useCallback(async () => {
      try {
        setLoading(true);
        const snap = await api.getLoyaltyModuleSnapshot(feature.key);
        setEntities((snap.entities || []) as Entity[]);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load module");
      } finally {
        setLoading(false);
      }
    }, [feature.key]);

    React.useEffect(() => {
      load();
    }, [load]);

    const create = async () => {
      const data: Record<string, unknown> = {};
      for (const f of opts.fields) {
        const raw = draft[f.key] ?? "";
        data[f.key] = f.type === "number" ? Number(raw) || 0 : raw;
      }
      const name = opts.nameFrom?.(data) || String(data[opts.fields[0]?.key] || opts.entityLabel);
      try {
        setSaving(true);
        await api.createLoyaltyModuleEntity(feature.key, { name, data, status: "ACTIVE" });
        toast.success(`${opts.entityLabel} created`);
        setDraft({});
        await load();
      } catch (e: any) {
        toast.error(e?.message || "Create failed");
      } finally {
        setSaving(false);
      }
    };

    const remove = async (id: string) => {
      try {
        await api.deleteLoyaltyModuleEntity(feature.key, id);
        toast.success("Removed");
        await load();
      } catch (e: any) {
        toast.error(e?.message || "Delete failed");
      }
    };

    return (
      <ModuleShell feature={feature} onConfigure={onConfigure} actions={
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }>
        {loading ? (
          <ModuleLoading />
        ) : (
          <div className="space-y-4">
            <ModuleCard>
              <p className="mb-3 text-sm font-medium text-slate-900">Add {opts.entityLabel}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {opts.fields.map((f) => (
                  <Field key={f.key} label={f.label}>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={draft[f.key] || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : "text"}
                        value={draft[f.key] || ""}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    )}
                  </Field>
                ))}
              </div>
              <div className="mt-4">
                <Button size="sm" onClick={create} disabled={saving}>
                  <Plus className="h-3.5 w-3.5" /> Create
                </Button>
              </div>
            </ModuleCard>

            {entities.length === 0 ? (
              <ModuleEmpty title={opts.emptyTitle} description={opts.emptyDescription} />
            ) : (
              <div className="space-y-2">
                {entities.map((e) => (
                  <ModuleCard key={e.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{e.name || opts.entityLabel}</p>
                        <Badge variant="outline">{e.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {Object.entries(e.data || {})
                          .slice(0, 6)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(" · ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => remove(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </ModuleCard>
                ))}
              </div>
            )}
          </div>
        )}
      </ModuleShell>
    );
  };
}
