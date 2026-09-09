"use client";

import * as React from "react";
import Link from "next/link";
import { Columns2, RotateCcw, Square } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  cn,
} from "@doloyal/ui";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import {
  CLIENT_SIGNIN_DEFAULTS,
  CLIENT_SIGNIN_FONTS,
  resolveClientSignInPublicConfig,
  type ClientSignInBranding,
  type Tenant,
} from "@doloyal/shared";
import {
  ClientAuthBrandScope,
  ClientAuthShell,
  ClientSignInForm,
} from "@/components/auth/client-auth-forms";
import { ImageUploadField } from "../settings/settings-ui";

function brandingFromTenant(tenant: Tenant | undefined): ClientSignInBranding {
  const saved = (tenant?.clientSignInBranding || {}) as ClientSignInBranding;
  const customized = saved.customized === true;
  return {
    customized,
    welcomeMessage: saved.welcomeMessage || (tenant ? `Welcome to ${tenant.name}` : "Welcome"),
    tagline: customized ? saved.tagline || "" : tenant?.tagline || "",
    primaryColor: (customized ? saved.primaryColor : null) || tenant?.brandColor || CLIENT_SIGNIN_DEFAULTS.primaryColor,
    backgroundColor: (customized ? saved.backgroundColor : null) || tenant?.backgroundColor || CLIENT_SIGNIN_DEFAULTS.backgroundColor,
    textColor: (customized ? saved.textColor : null) || tenant?.textColor || CLIENT_SIGNIN_DEFAULTS.textColor,
    accentColor: (customized && saved.accentColor && saved.accentColor.toUpperCase() !== "#F59E0B" ? saved.accentColor : null) || CLIENT_SIGNIN_DEFAULTS.accentColor,
    logoUrl: tenant?.logoUrl || null,
    layout: customized && saved.layout === "split" ? "split" : "centered",
    fontFamily: (customized ? saved.fontFamily : null) || CLIENT_SIGNIN_DEFAULTS.fontFamily,
    cardColor: (customized ? saved.cardColor : null) || CLIENT_SIGNIN_DEFAULTS.cardColor,
    cornerRadius: customized ? saved.cornerRadius ?? CLIENT_SIGNIN_DEFAULTS.cornerRadius : CLIENT_SIGNIN_DEFAULTS.cornerRadius,
    buttonLabel: (customized ? saved.buttonLabel : null) || CLIENT_SIGNIN_DEFAULTS.buttonLabel,
    showGoogle: customized ? saved.showGoogle ?? true : true,
    showForgotPassword: customized ? saved.showForgotPassword ?? true : true,
    showLogo: customized ? saved.showLogo ?? true : true,
    heroImageUrl: customized ? saved.heroImageUrl || null : null,
  };
}

function ScaledAuthPreview({ children }: { children: React.ReactNode }) {
  const frame = { width: 1280, height: 800 };
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [area, setArea] = React.useState<{ width: number; height: number } | null>(null);

  React.useLayoutEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setArea((previous) =>
        previous && previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = area
    ? Math.min(area.width / frame.width, area.height / frame.height, 1)
    : 1;

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden p-4 sm:p-6">
      <div
        ref={stageRef}
        className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden"
      >
        <div
          className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-[0_18px_45px_rgba(15,23,42,.12)]"
          style={{
            width: frame.width * scale,
            height: frame.height * scale,
            visibility: area ? "visible" : "hidden",
          }}
        >
          <div
            className="overflow-hidden"
            style={{
              width: frame.width,
              height: frame.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientSignInSettingsPage() {
  const { data: tenant, isLoading } = useTenant();
  const updateTenant = useUpdateTenant();
  const [slug, setSlug] = React.useState("your-business");
  const [draft, setDraft] = React.useState<ClientSignInBranding>(brandingFromTenant(undefined));
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    void api.listBookingLinks().then((links) => {
      const preferred = links.find((item) => item.type === "COMPANY") ?? links[0];
      if (preferred?.slug) setSlug(preferred.slug);
    }).catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (tenant?.slug && slug === "your-business") setSlug(tenant.slug);
  }, [tenant?.slug, slug]);

  React.useEffect(() => {
    if (!tenant) return;
    setDraft(brandingFromTenant(tenant));
  }, [tenant]);

  const set = <K extends keyof ClientSignInBranding>(key: K, value: ClientSignInBranding[K]) => {
    setDraft((current) => ({ ...current, [key]: value, customized: true }));
  };

  const preview = resolveClientSignInPublicConfig({
    slug,
    tenantId: tenant?.id || "",
    businessName: tenant?.name || "Your business",
    logoUrl: tenant?.logoUrl || null,
    branding: draft,
    brand: {
      primaryColor: tenant?.brandColor,
      backgroundColor: tenant?.backgroundColor,
      textColor: tenant?.textColor,
      accentColor: tenant?.accentColor,
    },
  });

  const save = async (branding: ClientSignInBranding | null) => {
    setSaving(true);
    try {
      await updateTenant.mutateAsync({ clientSignInBranding: branding });
      toast.success(branding?.customized ? "Client Sign-in branding saved" : "Reset to Doloyal default");
    } catch (err: any) {
      toast.error(err?.message || "Could not save branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-4 flex min-h-[calc(100vh-3.5rem)] flex-col lg:-m-8 xl:h-[calc(100vh-3.5rem)] xl:min-h-0 xl:overflow-hidden">
      <div className="shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-5 py-4 sm:px-6">
        <h1 className="text-lg font-semibold tracking-tight">Client Sign-in</h1>
        <p className="mt-1 max-w-2xl text-sm text-[rgb(var(--color-muted-foreground))]">
          Guests see this page before your Client Page. Publish from Client Page to share the QR and link.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
        <aside className="min-h-0 w-full shrink-0 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] xl:w-[22.5rem] xl:overflow-y-auto xl:border-b-0 xl:border-r">
          <div className="space-y-6 p-5">
            <Section title="Copy">
              <Field label="Welcome message">
                <Input id="welcome" value={draft.welcomeMessage || ""} onChange={(e) => set("welcomeMessage", e.target.value)} />
              </Field>
              <Field label="Tagline (optional)">
                <Input
                  id="tagline"
                  value={draft.tagline || ""}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="Optional welcome line"
                />
              </Field>
              <Field label="Button label">
                <Input
                  id="button-label"
                  value={draft.buttonLabel || ""}
                  onChange={(e) => set("buttonLabel", e.target.value)}
                  placeholder="Sign in"
                />
              </Field>
            </Section>

            <Section title="Layout">
              <div className="grid grid-cols-2 gap-2">
                <LayoutChoice
                  active={draft.layout !== "split"}
                  label="Centered"
                  onClick={() => set("layout", "centered")}
                  icon={<Square className="h-4 w-4" />}
                />
                <LayoutChoice
                  active={draft.layout === "split"}
                  label="Split"
                  onClick={() => set("layout", "split")}
                  icon={<Columns2 className="h-4 w-4" />}
                />
              </div>
              <ToggleRow label="Show logo" checked={draft.showLogo !== false} onChange={(value) => set("showLogo", value)} />
              {draft.layout === "split" ? (
                <ImageUploadField
                  label="Side image"
                  hint="Shown on the left of the sign-in form"
                  value={draft.heroImageUrl}
                  onChange={(url) => set("heroImageUrl", url)}
                  aspect="banner"
                />
              ) : null}
            </Section>

            <Section title="Colors">
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Primary button" value={draft.primaryColor || CLIENT_SIGNIN_DEFAULTS.primaryColor} onChange={(v) => set("primaryColor", v)} />
                <ColorField label="Accent" value={draft.accentColor || CLIENT_SIGNIN_DEFAULTS.accentColor} onChange={(v) => set("accentColor", v)} />
                <ColorField label="Background" value={draft.backgroundColor || CLIENT_SIGNIN_DEFAULTS.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
                <ColorField label="Text" value={draft.textColor || CLIENT_SIGNIN_DEFAULTS.textColor} onChange={(v) => set("textColor", v)} />
                <ColorField label="Card" value={draft.cardColor || CLIENT_SIGNIN_DEFAULTS.cardColor} onChange={(v) => set("cardColor", v)} />
              </div>
            </Section>

            <Section title="Style">
              <Field label="Font">
                <Select value={draft.fontFamily || CLIENT_SIGNIN_DEFAULTS.fontFamily} onValueChange={(v) => set("fontFamily", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_SIGNIN_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: font }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Corner radius</Label>
                  <span className="text-xs tabular-nums text-[rgb(var(--color-muted-foreground))]">{draft.cornerRadius ?? 16}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={32}
                  value={draft.cornerRadius ?? 16}
                  onChange={(e) => set("cornerRadius", Number(e.target.value))}
                  className="w-full accent-[rgb(var(--color-primary))]"
                />
              </div>
            </Section>

            <Section title="Form">
              <ToggleRow label="Google sign-in" checked={draft.showGoogle !== false} onChange={(value) => set("showGoogle", value)} />
              <ToggleRow label="Forgot password" checked={draft.showForgotPassword !== false} onChange={(value) => set("showForgotPassword", value)} />
            </Section>

            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Logo and business name come from your business profile. Upload a logo there to replace Doloyal on this page.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                loading={saving}
                disabled={isLoading}
                onClick={() =>
                  void save({
                    ...draft,
                    customized: true,
                    logoUrl: tenant?.logoUrl || draft.logoUrl || null,
                  })
                }
              >
                Save branding
              </Button>
              <Button
                variant="secondary"
                loading={saving}
                onClick={() => {
                  if (!confirm("Reset Client Sign-in styling to Doloyal default? Customer accounts and business data are not deleted.")) return;
                  const reset = brandingFromTenant(tenant);
                  setDraft({
                    ...reset,
                    customized: false,
                    welcomeMessage: `Welcome to ${tenant?.name || "your business"}`,
                    tagline: "",
                    primaryColor: CLIENT_SIGNIN_DEFAULTS.primaryColor,
                    backgroundColor: CLIENT_SIGNIN_DEFAULTS.backgroundColor,
                    textColor: CLIENT_SIGNIN_DEFAULTS.textColor,
                    accentColor: CLIENT_SIGNIN_DEFAULTS.accentColor,
                    cardColor: CLIENT_SIGNIN_DEFAULTS.cardColor,
                    fontFamily: CLIENT_SIGNIN_DEFAULTS.fontFamily,
                    layout: "centered",
                    cornerRadius: CLIENT_SIGNIN_DEFAULTS.cornerRadius,
                    buttonLabel: CLIENT_SIGNIN_DEFAULTS.buttonLabel,
                    showGoogle: true,
                    showForgotPassword: true,
                    showLogo: true,
                    heroImageUrl: null,
                  });
                  void save({ customized: false });
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset to Doloyal default
              </Button>
            </div>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Share the guest link from{" "}
              <Link href="/app/client-page" className="font-medium text-[rgb(var(--color-primary))] hover:underline">
                Client Page → Publish
              </Link>
              . That QR opens this sign-in first, then your page.
            </p>
          </div>
        </aside>

        <div className="flex h-[28rem] min-h-[28rem] min-w-0 flex-1 flex-col overflow-hidden bg-[#eef2f6] sm:h-[34rem] xl:h-auto xl:min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-4 py-2">
            <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Live preview</p>
          </div>
          <ScaledAuthPreview>
            <ClientAuthBrandScope config={preview} preview>
              <ClientAuthShell
                config={preview}
                preview
                title={preview.welcomeMessage}
                subtitle={preview.tagline || `Sign in to ${preview.businessName}`}
              >
                <ClientSignInForm
                  config={preview}
                  preview
                  isLoading={false}
                  error={null}
                  onSubmit={async () => undefined}
                  onGoogle={() => toast.message("Customers use this Google button on the live page.")}
                />
              </ClientAuthShell>
            </ClientAuthBrandScope>
          </ScaledAuthPreview>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--color-muted-foreground))]">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function LayoutChoice({
  active,
  label,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition",
        active
          ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.06)] font-medium"
          : "border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-muted)/0.4)]",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#2563EB";
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={safe}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded-md border border-[rgb(var(--color-border))] bg-transparent"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}
