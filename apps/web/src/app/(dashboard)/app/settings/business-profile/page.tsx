"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, RotateCcw } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Textarea,
  cn,
} from "@doloyal/ui";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  type BusinessCategory,
  type BusinessDayHours,
  type BusinessHoursSettings,
  type Tenant,
} from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { CURRENCIES } from "@/lib/currency";
import {
  BRAND_COLOR_DEFAULTS,
  failsContrastWithWhite,
  getBrandLogo,
  getBusinessDisplayName,
  hasCustomLogo,
  isHexColor,
  readableTextColor,
} from "@/lib/branding";
import { useSettingsChrome, useUnsavedGuard } from "../settings-chrome";
import {
  SettingsSection,
  SettingRow,
  SaveBar,
  SettingsSkeleton,
  SettingsError,
  ImageUploadField,
  jsonEqual,
} from "../settings-ui";

/* ── Constants ───────────────────────────────────────────────────────────── */

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

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

const PRIMARY_PRESETS = [
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#C026D3",
  "#DB2777",
  "#DC2626",
  "#EA580C",
  "#D97706",
  "#059669",
  "#0D9488",
  "#0284C7",
  "#111111",
];

/** Branding-only defaults used by "Reset to Default". Business data is never touched. */
function brandingDefaults() {
  return {
    logoUrl: null,
    faviconUrl: null,
    brandName: null,
    brandShortName: null,
    brandColor: BRAND_COLOR_DEFAULTS.primary,
    secondaryColor: BRAND_COLOR_DEFAULTS.secondary,
    accentColor: BRAND_COLOR_DEFAULTS.accent,
    backgroundColor: null,
    textColor: null,
    fontFamily: "Inter",
  };
}

/* ── Business hours helpers (moved from the standalone Business Hours page) ── */

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type DayDraft = Required<Pick<BusinessDayHours, "open" | "close" | "breakStart" | "breakEnd">> & {
  isAvailable: boolean;
};

type HoursDraft = Record<(typeof DAYS)[number], DayDraft>;

function hoursFrom(t: Tenant): HoursDraft {
  const days = t.businessHours?.days ?? null;
  return Object.fromEntries(
    DAYS.map((day) => {
      const stored = days?.[day];
      const closedByLegacy = (t.businessHours?.weeklyOff ?? []).includes(day);
      return [
        day,
        {
          open: stored?.open || t.businessHours?.openingTime || "09:00",
          close: stored?.close || t.businessHours?.closingTime || "18:00",
          breakStart: stored?.breakStart ?? "",
          breakEnd: stored?.breakEnd ?? "",
          isAvailable: stored ? stored.isAvailable !== false : !closedByLegacy,
        },
      ];
    }),
  ) as HoursDraft;
}

function toHoursSettings(draft: HoursDraft): BusinessHoursSettings {
  const openDays = DAYS.filter((d) => draft[d].isAvailable);
  const weeklyOff = DAYS.filter((d) => !draft[d].isAvailable);
  const first = openDays[0] ? draft[openDays[0]] : null;
  return {
    days: Object.fromEntries(
      DAYS.map((d) => [
        d,
        {
          open: draft[d].open,
          close: draft[d].close,
          breakStart: draft[d].breakStart,
          breakEnd: draft[d].breakEnd,
          isAvailable: draft[d].isAvailable,
        },
      ]),
    ),
    openingTime: first?.open ?? "",
    closingTime: first?.close ?? "",
    breakStart: first?.breakStart ?? "",
    breakEnd: first?.breakEnd ?? "",
    weeklyOff: [...weeklyOff],
  };
}

function validateHours(draft: HoursDraft): string | null {
  for (const day of DAYS) {
    const d = draft[day];
    if (!d.isAvailable) continue;
    if (!d.open || !d.close) return `${day}: opening and closing times are required`;
    if (d.close <= d.open) return `${day}: closing time must be after opening time`;
    if ((d.breakStart && !d.breakEnd) || (!d.breakStart && d.breakEnd))
      return `${day}: break needs both a start and an end time`;
    if (d.breakStart && d.breakEnd && (d.breakStart < d.open || d.breakEnd > d.close))
      return `${day}: break must fall inside opening hours`;
  }
  return null;
}

/* ── Draft ───────────────────────────────────────────────────────────────── */

type Draft = {
  name: string;
  tagline: string;
  description: string;
  category: BusinessCategory;
  gst: string;
  registrationNumber: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  mapsUrl: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";
  hours: HoursDraft;
  logoUrl: string | null;
  coverBannerUrl: string | null;
  faviconUrl: string | null;
  brandName: string;
  brandShortName: string;
  fontFamily: string;
  brandColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
};

function draftFrom(t: Tenant): Draft {
  return {
    name: t.name ?? "",
    tagline: t.tagline ?? "",
    description: t.description ?? "",
    category: t.category,
    gst: t.gst ?? "",
    registrationNumber: t.registrationNumber ?? "",
    phone: t.phone ?? "",
    whatsapp: t.whatsapp ?? "",
    email: t.email ?? "",
    website: t.website ?? "",
    mapsUrl: t.mapsUrl ?? "",
    address: t.address ?? "",
    city: t.city ?? "",
    state: t.state ?? "",
    zip: t.zip ?? "",
    country: t.country ?? "",
    timezone: t.timezone ?? "UTC",
    currency: t.currency ?? "USD",
    language: t.language || "en",
    dateFormat: t.dateFormat || "DD/MM/YYYY",
    timeFormat: t.timeFormat === "24h" ? "24h" : "12h",
    hours: hoursFrom(t),
    logoUrl: t.logoUrl ?? null,
    coverBannerUrl: t.coverBannerUrl ?? null,
    faviconUrl: t.faviconUrl ?? null,
    brandName: t.brandName ?? "",
    brandShortName: t.brandShortName ?? "",
    fontFamily: t.fontFamily || "Inter",
    brandColor: t.brandColor || BRAND_COLOR_DEFAULTS.primary,
    secondaryColor: t.secondaryColor || BRAND_COLOR_DEFAULTS.secondary,
    accentColor: t.accentColor || BRAND_COLOR_DEFAULTS.accent,
    backgroundColor: t.backgroundColor || "#FFFFFF",
    textColor: t.textColor || "#111111",
  };
}

export default function BusinessProfilePage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [baseline, setBaseline] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [resetOpen, setResetOpen] = React.useState(false);
  const [resetting, setResetting] = React.useState(false);

  React.useEffect(() => {
    if (tenant && !draft) {
      const d = draftFrom(tenant);
      setDraft(d);
      setBaseline(d);
    }
  }, [tenant, draft]);

  const dirty = !!draft && !!baseline && !jsonEqual(draft, baseline);
  useUnsavedGuard(dirty);

  if (isLoading || !tenant || !draft) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((p) => (p ? { ...p, [key]: value } : p));

  const setDay = (day: keyof HoursDraft, patch: Partial<DayDraft>) =>
    setDraft((p) => (p ? { ...p, hours: { ...p.hours, [day]: { ...p.hours[day], ...patch } } } : p));

  const applyMondayToWeekdays = () => {
    setDraft((p) => {
      if (!p) return p;
      const mon = p.hours.Monday;
      return {
        ...p,
        hours: {
          ...p.hours,
          ...Object.fromEntries(
            ["Tuesday", "Wednesday", "Thursday", "Friday"].map((d) => [d, { ...mon }]),
          ),
        } as HoursDraft,
      };
    });
  };

  const validate = (): string | null => {
    if (!draft.name.trim() || draft.name.trim().length < 2)
      return "Business name is required";
    if (!draft.phone.trim()) return "Business phone is required";
    if (!draft.email.trim() || !/^\S+@\S+\.\S+$/.test(draft.email))
      return "A valid business email is required";
    if (draft.website.trim() && !/^https?:\/\//i.test(draft.website.trim()))
      return "Website must start with http:// or https://";
    if (draft.mapsUrl.trim() && !/^https?:\/\//i.test(draft.mapsUrl.trim()))
      return "Google Maps link must start with http:// or https://";
    for (const [key, label] of [
      ["brandColor", "Primary color"],
      ["secondaryColor", "Secondary color"],
      ["accentColor", "Accent color"],
      ["backgroundColor", "Background color"],
      ["textColor", "Text color"],
    ] as const) {
      if (!isHexColor(draft[key])) return `${label} must be a 6-digit hex value (e.g. #2563EB)`;
    }
    return validateHours(draft.hours);
  };

  const handleSave = async () => {
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    setStatus("saving");
    try {
      await updateTenant.mutateAsync({
        name: draft.name.trim(),
        tagline: draft.tagline,
        description: draft.description,
        category: draft.category,
        gst: draft.gst,
        registrationNumber: draft.registrationNumber,
        phone: draft.phone.trim(),
        whatsapp: draft.whatsapp,
        email: draft.email.trim().toLowerCase(),
        website: draft.website.trim(),
        mapsUrl: draft.mapsUrl.trim(),
        address: draft.address,
        city: draft.city.trim(),
        state: draft.state.trim(),
        zip: draft.zip.trim(),
        country: draft.country.trim(),
        timezone: draft.timezone,
        currency: draft.currency,
        language: draft.language,
        dateFormat: draft.dateFormat,
        timeFormat: draft.timeFormat,
        businessHours: toHoursSettings(draft.hours),
        logoUrl: draft.logoUrl,
        coverBannerUrl: draft.coverBannerUrl,
        faviconUrl: draft.faviconUrl,
        brandName: draft.brandName.trim(),
        brandShortName: draft.brandShortName.trim(),
        fontFamily: draft.fontFamily,
        brandColor: draft.brandColor.toLowerCase(),
        secondaryColor: draft.secondaryColor.toLowerCase(),
        accentColor: draft.accentColor.toLowerCase(),
        backgroundColor: draft.backgroundColor.toLowerCase(),
        textColor: draft.textColor.toLowerCase(),
      });
      setBaseline(draft);
      setStatus("saved");
      toast.success("Business profile updated");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const discard = () => baseline && setDraft(baseline);

  /* Restores Doloyal's default look. Only branding fields are sent — business
     information, customers, bookings and loyalty data are never touched. */
  const handleResetBranding = async () => {
    setResetting(true);
    setStatus("saving");
    try {
      await updateTenant.mutateAsync(brandingDefaults());
      setDraft((p) =>
        p
          ? {
              ...p,
              logoUrl: null,
              faviconUrl: null,
              brandName: "",
              brandShortName: "",
              brandColor: BRAND_COLOR_DEFAULTS.primary,
              secondaryColor: BRAND_COLOR_DEFAULTS.secondary,
              accentColor: BRAND_COLOR_DEFAULTS.accent,
              backgroundColor: "#FFFFFF",
              textColor: "#111111",
              fontFamily: "Inter",
            }
          : p,
      );
      setBaseline((p) =>
        p
          ? {
              ...p,
              logoUrl: null,
              faviconUrl: null,
              brandName: "",
              brandShortName: "",
              brandColor: BRAND_COLOR_DEFAULTS.primary,
              secondaryColor: BRAND_COLOR_DEFAULTS.secondary,
              accentColor: BRAND_COLOR_DEFAULTS.accent,
              backgroundColor: "#FFFFFF",
              textColor: "#111111",
              fontFamily: "Inter",
            }
          : p,
      );
      setResetOpen(false);
      setStatus("saved");
      toast.success("Branding restored to Doloyal defaults");
    } catch {
      setStatus("error");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Business Profile</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Manage your business information, branding, and how your workspace appears to your team and customers.
        </p>
      </div>

      {/* ── Business information ── */}
      <SettingsSection title="Business Information" description="Your identity across Doloyal and customer-facing pages.">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="Business name" htmlFor="bp-name" stacked>
            <Input
              id="bp-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="organization"
            />
          </SettingRow>
          <SettingRow label="Display name" htmlFor="bp-tagline" stacked description="Shown under your name on booking pages.">
            <Input
              id="bp-tagline"
              value={draft.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Short memorable line"
            />
          </SettingRow>
        </div>
        <SettingRow label="Industry" description="Helps tailor templates and defaults.">
          <Select value={draft.category} onValueChange={(v) => set("category", v as BusinessCategory)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {BUSINESS_CATEGORY_LABELS[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingRow>
        <SettingRow label="Description" htmlFor="bp-desc" stacked>
          <Textarea
            id="bp-desc"
            rows={3}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Tell customers what makes your business special"
          />
        </SettingRow>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="Business email" htmlFor="bp-email" stacked>
            <Input id="bp-email" type="email" value={draft.email} onChange={(e) => set("email", e.target.value)} />
          </SettingRow>
          <SettingRow label="Business phone" htmlFor="bp-phone" stacked>
            <Input id="bp-phone" type="tel" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          </SettingRow>
          <SettingRow label="WhatsApp" htmlFor="bp-whatsapp" stacked>
            <Input id="bp-whatsapp" type="tel" value={draft.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+91…" />
          </SettingRow>
          <SettingRow label="Website" htmlFor="bp-website" stacked>
            <Input id="bp-website" type="url" value={draft.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
          </SettingRow>
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="GST number" htmlFor="bp-gst" stacked description="Used on invoices and legal documents.">
            <Input id="bp-gst" value={draft.gst} onChange={(e) => set("gst", e.target.value)} placeholder="e.g. 27AABCU9603R1ZM" />
          </SettingRow>
          <SettingRow label="Registration number" htmlFor="bp-reg" stacked>
            <Input id="bp-reg" value={draft.registrationNumber} onChange={(e) => set("registrationNumber", e.target.value)} />
          </SettingRow>
        </div>
      </SettingsSection>

      {/* ── Location & localization ── */}
      <SettingsSection title="Business Location" description="Where you operate and how amounts and dates are formatted.">
        <SettingRow label="Address" htmlFor="bp-address" stacked>
          <Textarea id="bp-address" rows={2} value={draft.address} onChange={(e) => set("address", e.target.value)} />
        </SettingRow>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="City" htmlFor="bp-city" stacked>
            <Input id="bp-city" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          </SettingRow>
          <SettingRow label="State" htmlFor="bp-state" stacked>
            <Input id="bp-state" value={draft.state} onChange={(e) => set("state", e.target.value)} />
          </SettingRow>
          <SettingRow label="Country" htmlFor="bp-country" stacked>
            <Input id="bp-country" value={draft.country} onChange={(e) => set("country", e.target.value)} placeholder="US" />
          </SettingRow>
          <SettingRow label="Postal / ZIP code" htmlFor="bp-zip" stacked>
            <Input id="bp-zip" value={draft.zip} onChange={(e) => set("zip", e.target.value)} />
          </SettingRow>
        </div>
        <SettingRow
          label="Google Maps location"
          htmlFor="bp-maps"
          stacked
          description="Paste a Google Maps link to show your location publicly."
        >
          <Input id="bp-maps" type="url" value={draft.mapsUrl} onChange={(e) => set("mapsUrl", e.target.value)} placeholder="https://maps.google.com/…" />
        </SettingRow>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="Time zone" description="Used for appointments, reminders and reports.">
            <Select value={draft.timezone} onValueChange={(v) => set("timezone", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Currency" description="Used everywhere amounts are shown.">
            <Select value={draft.currency} onValueChange={(v) => set("currency", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Language">
            <Select value={draft.language} onValueChange={(v) => set("language", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Date format">
            <Select value={draft.dateFormat} onValueChange={(v) => set("dateFormat", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>
          <SettingRow label="Time format">
            <Select value={draft.timeFormat} onValueChange={(v) => set("timeFormat", v as "12h" | "24h")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                <SelectItem value="24h">24-hour (14:30)</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </div>
      </SettingsSection>

      {/* ── Business hours ── */}
      <SettingsSection title="Business Hours" description="Your weekly schedule, shown to customers on your booking page.">
        <div className="mb-3 flex justify-end">
          <Button variant="secondary" size="sm" onClick={applyMondayToWeekdays}>
            Apply Monday to weekdays
          </Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]">
          <div className="hidden items-center gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.5)] px-4 py-2.5 text-xs font-medium text-[rgb(var(--color-muted-foreground))] md:flex">
            <span className="w-24 shrink-0">Day</span>
            <span className="grid flex-1 grid-cols-2 gap-3 xl:grid-cols-4">
              <span>Opens</span>
              <span>Closes</span>
              <span>
                Break start<span className="xl:hidden"> / end</span>
              </span>
              <span className="hidden xl:block">Break end</span>
            </span>
            <span className="w-14 shrink-0 text-right">Open</span>
          </div>
          {DAYS.map((day, idx) => {
            const d = draft.hours[day];
            return (
              <div
                key={day}
                className={cn(
                  "flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center",
                  idx > 0 && "border-t border-[rgb(var(--color-border))]",
                  !d.isAvailable && "bg-[rgb(var(--color-muted)/0.3)]",
                )}
              >
                <div className="flex w-24 shrink-0 items-center justify-between gap-3">
                  <span className="text-sm font-medium">{day}</span>
                  {!d.isAvailable ? (
                    <span className="text-xs text-[rgb(var(--color-subtle))] md:hidden">Closed</span>
                  ) : (
                    <span className="text-xs text-[rgb(var(--color-muted-foreground))] md:hidden">
                      {to12h(d.open)} – {to12h(d.close)}
                    </span>
                  )}
                </div>
                {d.isAvailable ? (
                  <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 xl:grid-cols-4">
                    <TimeInput label={`${day} opens`} value={d.open} onChange={(v) => setDay(day, { open: v })} />
                    <TimeInput label={`${day} closes`} value={d.close} onChange={(v) => setDay(day, { close: v })} />
                    <TimeInput label={`${day} break start`} value={d.breakStart} onChange={(v) => setDay(day, { breakStart: v })} optional />
                    <TimeInput label={`${day} break end`} value={d.breakEnd} onChange={(v) => setDay(day, { breakEnd: v })} optional />
                  </div>
                ) : (
                  <div className="hidden flex-1 text-sm text-[rgb(var(--color-subtle))] md:block">Closed</div>
                )}
                <div className="flex w-14 shrink-0 md:justify-end">
                  <Switch checked={d.isAvailable} onCheckedChange={(v) => setDay(day, { isAvailable: v })} aria-label={`${day} open`} />
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      {/* ── Brand identity ── */}
      <SettingsSection title="Brand Identity" description="Your logo and brand name replace the default Doloyal identity across your workspace.">
        <div className="pb-3">
          <ImageUploadField
            label="Logo"
            hint="PNG, JPG, SVG or WebP · up to 2MB · square works best"
            value={draft.logoUrl}
            onChange={(url) => set("logoUrl", url)}
          />
          {!hasCustomLogo({ logoUrl: draft.logoUrl }) ? (
            <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">
              Your workspace currently shows the default Doloyal logo.
            </p>
          ) : null}
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow
            label="Brand name"
            htmlFor="bp-brand-name"
            stacked
            description={`Shown instead of "${getBusinessDisplayName(tenant)}" inside your workspace.`}
          >
            <Input
              id="bp-brand-name"
              value={draft.brandName}
              onChange={(e) => set("brandName", e.target.value)}
              maxLength={60}
              placeholder={draft.name || "Doloyal"}
            />
          </SettingRow>
          <SettingRow label="Short brand name" htmlFor="bp-brand-short" stacked description="For tight spaces like the collapsed sidebar.">
            <Input
              id="bp-brand-short"
              value={draft.brandShortName}
              onChange={(e) => set("brandShortName", e.target.value)}
              maxLength={24}
              placeholder={(draft.brandName || draft.name || "Doloyal").split(/\s+/)[0]}
            />
          </SettingRow>
        </div>
        <div className="pt-1">
          <ImageUploadField
            label="Favicon"
            hint="Square icon, 64×64 or larger"
            value={draft.faviconUrl}
            onChange={(url) => set("faviconUrl", url)}
            aspect="icon"
          />
        </div>
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
            label="Cover banner"
            hint="Recommended 1600×400 · shown on your booking page"
            value={draft.coverBannerUrl}
            onChange={(url) => set("coverBannerUrl", url)}
            aspect="banner"
          />
        </div>
      </SettingsSection>

      {/* ── Brand colors ── */}
      <SettingsSection
        title="Brand Colors"
        description="Primary drives buttons, active navigation, links and highlights across your workspace."
      >
        <ColorField
          label="Primary color"
          value={draft.brandColor}
          onChange={(v) => set("brandColor", v)}
          presets={PRIMARY_PRESETS}
          warnLowContrast
        />
        <div className="grid gap-x-6 sm:grid-cols-2">
          <ColorField
            label="Secondary color"
            value={draft.secondaryColor}
            onChange={(v) => set("secondaryColor", v)}
          />
          <ColorField
            label="Accent color"
            value={draft.accentColor}
            onChange={(v) => set("accentColor", v)}
          />
          <ColorField
            label="Background color"
            value={draft.backgroundColor}
            onChange={(v) => set("backgroundColor", v)}
            hint="Customer-facing pages"
          />
          <ColorField
            label="Text color"
            value={draft.textColor}
            onChange={(v) => set("textColor", v)}
            hint="Customer-facing pages"
          />
        </div>
      </SettingsSection>

      {/* ── Live preview ── */}
      <SettingsSection
        title="Live Preview"
        description="How your brand appears inside your workspace and to customers."
      >
        <BrandPreview draft={draft} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
            Resetting restores the default Doloyal logo and colors. Your business data is never affected.
          </p>
          <Button variant="secondary" size="sm" onClick={() => setResetOpen(true)} disabled={resetting}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Default
          </Button>
        </div>
      </SettingsSection>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={discard}
        saveLabel="Save Changes"
      />

      {/* ── Reset confirmation ── */}
      <Dialog open={resetOpen} onOpenChange={(open) => !resetting && setResetOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset branding?</DialogTitle>
            <DialogDescription>
              This will restore Doloyal&apos;s default branding. Your business data will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" disabled={resetting} onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={resetting} onClick={handleResetBranding}>
              Reset to Default
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Color field with picker + hex input + live element previews ─────────── */

function ColorField({
  label,
  value,
  onChange,
  presets,
  hint,
  warnLowContrast,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: string[];
  hint?: string;
  warnLowContrast?: boolean;
}) {
  const valid = isHexColor(value);
  const lowContrast = warnLowContrast && failsContrastWithWhite(value);

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-0">
        <label className="text-sm font-medium text-[rgb(var(--color-foreground))]">
          {label}
          {hint ? <span className="ml-2 text-xs font-normal text-[rgb(var(--color-subtle))]">{hint}</span> : null}
        </label>
        <div className="flex shrink-0 items-center gap-2 sm:ml-auto sm:pl-4">
          <input
            type="color"
            aria-label={`${label} picker`}
            value={valid ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border border-[rgb(var(--color-border))] bg-transparent p-1"
          />
          <div className="relative w-28">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={cn("pr-8 font-mono text-xs", !valid && "border-[rgb(var(--color-danger))]")}
              aria-label={label}
              maxLength={7}
            />
            {valid ? (
              <Check className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-success))]" />
            ) : null}
          </div>
        </div>
      </div>
      {presets ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={`${label} presets`}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`Use ${preset}`}
              onClick={() => onChange(preset)}
              className={cn(
                "h-6 w-6 rounded-md border transition-transform hover:scale-110",
                value.toLowerCase() === preset.toLowerCase()
                  ? "border-[rgb(var(--color-foreground))] ring-2 ring-[rgb(var(--ring)/0.35)]"
                  : "border-black/10",
              )}
              style={{ backgroundColor: preset }}
            />
          ))}
        </div>
      ) : null}
      {!valid ? (
        <p className="mt-1.5 text-xs font-medium text-[rgb(var(--color-danger))]">
          Enter a 6-digit hex value (e.g. #2563EB).
        </p>
      ) : lowContrast ? (
        <p className="mt-1.5 text-xs font-medium text-[rgb(var(--color-warning))]">
          This color may have low contrast with white text.
        </p>
      ) : null}
      {valid && warnLowContrast ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium transition-colors"
            style={{ backgroundColor: value, color: readableTextColor(value) }}
          >
            Save Changes
          </span>
          <span className="text-xs font-semibold underline underline-offset-4" style={{ color: value }}>
            Link preview
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${value}1A`, color: value }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: value }} />
            Active state
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ── Compact live preview of the branded workspace ───────────────────────── */

function BrandPreview({ draft }: { draft: Draft }) {
  const displayName = getBusinessDisplayName({ name: draft.name, brandName: draft.brandName });
  const logoSrc = getBrandLogo({ logoUrl: draft.logoUrl });
  const primary = isHexColor(draft.brandColor) ? draft.brandColor : BRAND_COLOR_DEFAULTS.primary;
  const surfaceBg = isHexColor(draft.backgroundColor) ? draft.backgroundColor : undefined;
  const surfaceText = isHexColor(draft.textColor) ? draft.textColor : undefined;

  const navItems = [
    { label: "Dashboard", active: true },
    { label: "Customers", active: false },
    { label: "Loyalty", active: false },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[13rem_1fr]">
      {/* Workspace mockup */}
      <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2.5 border-b border-[rgb(var(--color-border))] px-3.5 py-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-md object-contain shrink-0" />
          <span className="truncate text-sm font-semibold">{displayName}</span>
        </div>
        <nav className="space-y-0.5 p-2">
          {navItems.map((item) => (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium",
                !item.active && "text-[rgb(var(--color-muted-foreground))]",
              )}
              style={item.active ? { backgroundColor: `${primary}1A`, color: primary } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: item.active ? primary : "currentColor", opacity: item.active ? 1 : 0.45 }}
              />
              {item.label}
            </div>
          ))}
        </nav>
        <div className="border-t border-[rgb(var(--color-border))] p-3">
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium"
            style={{ backgroundColor: primary, color: readableTextColor(primary) }}
          >
            Primary button
          </button>
        </div>
      </div>

      {/* Customer-facing mockup */}
      <div
        className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] shadow-[var(--shadow-soft)]"
        style={{
          backgroundColor: surfaceBg,
          color: surfaceText,
          fontFamily: `${draft.fontFamily}, sans-serif`,
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 text-white" style={{ backgroundColor: primary }}>
          <div className="flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" width={24} height={24} className="h-6 w-6 rounded bg-white/20 object-contain p-0.5 shrink-0" />
            <span className="truncate text-sm font-semibold">{displayName}</span>
          </div>
          <span
            className="shrink-0 rounded-md px-2.5 py-1 text-[0.68rem] font-medium text-white"
            style={{ backgroundColor: isHexColor(draft.accentColor) ? draft.accentColor : BRAND_COLOR_DEFAULTS.accent }}
          >
            Book now
          </span>
        </div>
        <div className="space-y-2.5 px-4 py-4">
          <div className="text-sm font-semibold" style={{ color: primary }}>
            {draft.tagline || "Your tagline appears here"}
          </div>
          <p className="text-xs leading-relaxed opacity-70">
            Booking pages, customer portals and emails pick up these colors automatically.
          </p>
          <div className="flex items-center gap-3 rounded-lg border border-black/10 p-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold">Haircut &amp; styling</div>
              <div className="text-[0.68rem] opacity-70">45 min</div>
            </div>
            <span
              className="shrink-0 rounded px-2 py-1 text-[0.62rem] font-medium text-white"
              style={{ backgroundColor: isHexColor(draft.secondaryColor) ? draft.secondaryColor : BRAND_COLOR_DEFAULTS.secondary }}
            >
              Select
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Shared small helpers ────────────────────────────────────────────────── */

function to12h(value: string): string {
  if (!value) return "—";
  const [hStr, m] = value.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

function TimeInput({
  label,
  value,
  onChange,
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn("h-9 text-sm", optional && !value && "text-[rgb(var(--color-subtle))]")}
      />
    </label>
  );
}
