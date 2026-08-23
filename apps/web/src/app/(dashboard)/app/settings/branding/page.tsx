"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, cn } from "@doloyal/ui";
import type { Tenant } from "@doloyal/shared";

import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome } from "../settings-chrome";
import {
  SettingsSection,
  SettingRow,
  SettingsSkeleton,
  SettingsError,
  ImageUploadField,
  isHexColor,
} from "../settings-ui";

const FONTS = [
  "Inter",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Poppins",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Playfair Display",
];

type Draft = {
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  faviconUrl: string | null;
};

function draftFrom(t: Tenant): Draft {
  return {
    brandColor: t.brandColor || "#2563EB",
    secondaryColor: t.secondaryColor || "#64748B",
    accentColor: t.accentColor || "#F59E0B",
    fontFamily: t.fontFamily || "Inter",
    faviconUrl: t.faviconUrl ?? null,
  };
}

export default function BrandingSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = React.useRef<Draft | null>(null);

  React.useEffect(() => {
    if (tenant && !draft) setDraft(draftFrom(tenant));
  }, [tenant, draft]);

  // Debounced autosave: branding is a low-risk visual preference and the
  // preview updates instantly, so explicit saves would only add friction.
  const scheduleSave = React.useCallback(
    (next: Draft) => {
      latestRef.current = next;
      setStatus("saving");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        const payload = latestRef.current;
        if (!payload) return;
        try {
          await updateTenant.mutateAsync({
            brandColor: payload.brandColor,
            secondaryColor: payload.secondaryColor,
            accentColor: payload.accentColor,
            fontFamily: payload.fontFamily,
            faviconUrl: payload.faviconUrl,
          });
          setStatus("saved");
        } catch {
          setStatus("error");
        }
      }, 800);
    },
    [setStatus, updateTenant],
  );

  React.useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  if (isLoading || !tenant || !draft) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    scheduleSave(next);
  };

  const colorFields = [
    { key: "brandColor" as const, label: "Primary color" },
    { key: "secondaryColor" as const, label: "Secondary color" },
    { key: "accentColor" as const, label: "Accent color" },
  ];

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Branding</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Colors, typography and favicon. Changes save automatically.
        </p>
      </div>

      <SettingsSection title="Colors">
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
          {colorFields.map(({ key, label }) => {
            const value = draft[key];
            const valid = isHexColor(value);
            return (
              <SettingRow key={key} label={label} stacked>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={valid ? value : "#2563EB"}
                    onChange={(e) => set(key, e.target.value)}
                    className="h-10 w-11 shrink-0 cursor-pointer rounded-lg border border-[rgb(var(--color-border))] bg-transparent p-1"
                  />
                  <div className="relative flex-1">
                    <Input
                      value={value}
                      onChange={(e) => set(key, e.target.value)}
                      className={cn("pr-8 font-mono text-xs", !valid && "border-[rgb(var(--color-danger))]")}
                      aria-label={label}
                      maxLength={7}
                    />
                    {valid ? (
                      <Check className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-success))]" />
                    ) : null}
                  </div>
                </div>
              </SettingRow>
            );
          })}
        </div>
        {!isHexColor(draft.brandColor) || !isHexColor(draft.secondaryColor) || !isHexColor(draft.accentColor) ? (
          <p className="text-xs font-medium text-[rgb(var(--color-danger))]">
            Colors must be 6-digit hex values (e.g. #2563EB). Invalid values are not saved.
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Typography & icon">
        <SettingRow label="Font family" description="Applied to customer-facing pages.">
          <Select value={draft.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONTS.map((f) => (
                <SelectItem key={f} value={f}>
                  <span style={{ fontFamily: f }}>{f}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <div className="pt-3">
          <ImageUploadField
            label="Favicon"
            hint="Square icon, 64×64 or larger"
            value={draft.faviconUrl}
            onChange={(url) => set("faviconUrl", url)}
            aspect="icon"
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Preview" description="A miniature of your customer-facing booking page.">
        <div
          className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]"
          style={{ fontFamily: `${draft.fontFamily}, sans-serif` }}
        >
          {/* Brand header */}
          <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: draft.brandColor }}>
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-md text-[0.65rem] font-bold"
                style={{ backgroundColor: "rgba(255,255,255,0.22)" }}
              >
                {(tenant.name || "B").slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold">{tenant.name || "Your Business"}</span>
            </div>
            <span
              className="rounded-md px-2.5 py-1 text-[0.68rem] font-medium text-white"
              style={{ backgroundColor: draft.accentColor }}
            >
              Book now
            </span>
          </div>
          {/* Body */}
          <div className="space-y-3 bg-[rgb(var(--color-surface))] px-4 py-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: draft.brandColor }}>
                {tenant.tagline || "Your tagline appears here"}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                Services, staff and availability show up here for your customers.
              </p>
            </div>
            {/* Sample card + accent element */}
            <div className="flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-[rgb(var(--color-border))] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold">Haircut & styling</div>
                    <div className="text-[0.68rem] text-[rgb(var(--color-muted-foreground))]">45 min · ₹499</div>
                  </div>
                  <span
                    className="rounded px-2 py-1 text-[0.62rem] font-medium text-white"
                    style={{ backgroundColor: draft.accentColor }}
                  >
                    Select
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                  <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: draft.secondaryColor }} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[0.68rem] text-[rgb(var(--color-muted-foreground))]">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: draft.accentColor }} />
              Accent highlights and buttons use your accent color
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
