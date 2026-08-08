"use client";

import * as React from "react";
import { Code, Copy, Check, Eye } from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Field,
  Skeleton,
  Label,
} from "@doloyal/ui";
import { toast } from "sonner";
import { WidgetPreview } from "@/components/widget/widget-preview";
import { api } from "@/lib/api";
import type { WidgetSettings } from "@doloyal/shared";

const FONT_OPTIONS = ["Inter", "Roboto", "Open Sans", "Poppins"];
const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Auto" },
];

const STYLE_OPTIONS = [
  { value: "floating", label: "Floating", description: "Button floats at a corner of the page" },
  { value: "inline", label: "Inline", description: "Button sits within the page content" },
  { value: "popup", label: "Popup", description: "Trigger button opens a modal popup" },
];

const POSITION_OPTIONS = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
];

interface WidgetSettingsData {
  id?: string;
  tenantId: string;
  isActive: boolean;
  buttonStyle: string;
  buttonColor: string;
  buttonText: string;
  position: string;
  primaryColor: string;
  fontFamily: string;
  theme: string;
  services: string[];
  staff: string[];
}

function toWidgetForm(tenantId: string, data: WidgetSettings): WidgetSettingsData {
  return {
    tenantId: data.tenantId || tenantId,
    isActive: data.isActive ?? true,
    buttonStyle: data.buttonStyle ?? "floating",
    buttonColor: data.buttonColor ?? "#2563EB",
    buttonText: data.buttonText ?? "Book Appointment",
    position: data.position ?? "bottom-right",
    primaryColor: data.primaryColor ?? "#2563EB",
    fontFamily: data.fontFamily ?? "Inter",
    theme: data.theme ?? "light",
    services: data.services ?? [],
    staff: data.staff ?? [],
    id: data.id,
  };
}

export default function WidgetPage() {
  const [settings, setSettings] = React.useState<WidgetSettingsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [tenantName, setTenantName] = React.useState("");
  const [slug, setSlug] = React.useState("your-business");

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [tenant, widget] = await Promise.all([
        api.getTenant(),
        api.getWidgetSettings(),
      ]);
      setTenantName(tenant.name);
      setSlug(
        tenant.name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      );
      setSettings(toWidgetForm(tenant.id, widget));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load widget settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const update = <K extends keyof WidgetSettingsData>(key: K, value: WidgetSettingsData[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const updated = await api.updateWidgetSettings({
        isActive: settings.isActive,
        buttonStyle: settings.buttonStyle,
        buttonColor: settings.buttonColor,
        buttonText: settings.buttonText,
        position: settings.position,
        primaryColor: settings.primaryColor,
        fontFamily: settings.fontFamily,
        theme: settings.theme,
        services: settings.services,
        staff: settings.staff,
      });
      setSettings(toWidgetForm(settings.tenantId, updated));
      toast.success("Widget settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const embedCode = settings
    ? `<script src="https://app.doloyal.ai/widget.js" data-slug="${slug}" data-primary="${settings.primaryColor}" data-position="${settings.position}"></script>`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      toast.success("Embed code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-[var(--radius)]" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-[400px] w-full rounded-[var(--radius)]" />
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Website Widget"
          description="Embed the booking widget on your website"
        />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {loadError ?? "Could not load widget settings"}
            </p>
            <Button onClick={() => void load()}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Widget"
        description="Embed the booking widget on your website"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Settings form */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Widget Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] p-4">
                <div>
                  <Label className="text-sm font-medium">Enable Widget</Label>
                  <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                    Make the booking widget available on your website
                  </p>
                </div>
                <Switch
                  checked={settings.isActive}
                  onCheckedChange={(v) => update("isActive", v)}
                />
              </div>

              {/* Widget style */}
              <Field label="Widget Style">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update("buttonStyle", opt.value)}
                      className={`flex flex-col items-center gap-2 rounded-[var(--radius-sm)] border-2 p-4 text-center transition-all ${
                        settings.buttonStyle === opt.value
                          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.06)]"
                          : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-muted-foreground))]"
                      }`}
                    >
                      {opt.value === "floating" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--color-muted))]">
                          <span className="text-xs font-bold">F</span>
                        </div>
                      ) : opt.value === "inline" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgb(var(--color-muted))]">
                          <span className="text-xs font-bold">I</span>
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[rgb(var(--color-muted))]">
                          <span className="text-xs font-bold">P</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">{opt.label}</p>
                        <p className="mt-0.5 text-[10px] text-[rgb(var(--color-muted-foreground))] leading-tight">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </Field>

              {/* Button text */}
              <Field label="Button Text">
                <Input
                  value={settings.buttonText}
                  onChange={(e) => update("buttonText", e.target.value)}
                  placeholder="Book Appointment"
                />
              </Field>

              {/* Button color */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Button Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.buttonColor}
                      onChange={(e) => update("buttonColor", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-transparent p-0.5"
                    />
                    <Input
                      value={settings.buttonColor}
                      onChange={(e) => update("buttonColor", e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </Field>

                <Field label="Primary Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-transparent p-0.5"
                    />
                    <Input
                      value={settings.primaryColor}
                      onChange={(e) => update("primaryColor", e.target.value)}
                      className="font-mono"
                    />
                  </div>
                </Field>
              </div>

              {/* Position (only for floating) */}
              {settings.buttonStyle === "floating" && (
                <Field label="Position">
                  <Select
                    value={settings.position}
                    onValueChange={(v) => update("position", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              {/* Font & Theme row */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Font Family">
                  <Select
                    value={settings.fontFamily}
                    onValueChange={(v) => update("fontFamily", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font} value={font}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="Theme">
                  <Select
                    value={settings.theme}
                    onValueChange={(v) => update("theme", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {THEME_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* Save button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving} size="lg">
              Save Settings
            </Button>
          </div>

          {/* Embed code */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Embed Code</CardTitle>
                <div className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                  <Code className="h-3.5 w-3.5" />
                  Copy & paste into your website
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="overflow-x-auto rounded-[var(--radius-sm)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-4 text-xs leading-relaxed">
                  <code className="text-[rgb(var(--color-foreground))]">{embedCode}</code>
                </pre>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-surface))] hover:text-[rgb(var(--color-foreground))]"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-[rgb(var(--color-success))]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="space-y-3 rounded-lg border border-[rgb(var(--color-border))] p-4">
                <h4 className="text-sm font-medium">How to embed</h4>
                <ol className="ml-4 list-decimal space-y-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                  <li>Copy the embed code above</li>
                  <li>
                    Paste it just before the closing <code className="rounded bg-[rgb(var(--color-muted))] px-1 py-0.5 font-mono text-[10px]">&lt;/body&gt;</code> tag on your website
                  </li>
                  <li>The widget will appear automatically with your configured settings</li>
                  <li>Supports all major website builders: WordPress, Shopify, Wix, Squarespace, and custom HTML sites</li>
                  <li>Changes made here are reflected immediately — no need to re-paste the code</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="sticky top-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-[rgb(var(--color-muted-foreground))]">
              <Eye className="h-4 w-4" />
              <span>Live Preview</span>
            </div>
            <WidgetPreview
              settings={{
                id: settings.id,
                tenantId: settings.tenantId,
                isActive: settings.isActive,
                buttonStyle: settings.buttonStyle,
                buttonColor: settings.buttonColor,
                buttonText: settings.buttonText,
                position: settings.position,
                primaryColor: settings.primaryColor,
                fontFamily: settings.fontFamily,
                theme: settings.theme,
                services: settings.services,
                staff: settings.staff,
              }}
              slug={slug}
              tenantName={tenantName}
            />
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Preview updates in real-time as you change settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
