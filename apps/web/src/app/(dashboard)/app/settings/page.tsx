"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Building2,
  Phone,
  Palette,
  Globe2,
  SunMoon,
  Clock3,
  Share2,
  Scale,
  Activity,
  Bell,
  Shield,
  Save,
  RotateCcw,
  AlertTriangle,
  Monitor,
  Moon,
  Sun,
  Lock,
  LogOut,
} from "lucide-react";
import {
  Button,
  Input,
  Textarea,
  Field,
  PageHeader,
  Skeleton,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  EmptyState,
  cn,
} from "@doloyal/ui";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_LABELS,
  type BusinessCategory,
  type Tenant,
  type AuthSessionInfo,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { CURRENCIES } from "@/lib/currency";
import { useAuth } from "@/lib/auth";
import { deepMergeDefaults } from "@/lib/persistent-store";
import {
  ImageUploadField,
  RichTextEditor,
  SectionCard,
  ToggleRow,
} from "./settings-ui";

const WEEK_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

type FormState = Tenant;

function defaultsFromTenant(t: Tenant): FormState {
  return {
    ...t,
    website: t.website ?? "",
    tagline: t.tagline ?? "",
    description: t.description ?? "",
    gst: t.gst ?? "",
    registrationNumber: t.registrationNumber ?? "",
    whatsapp: t.whatsapp ?? "",
    mapsUrl: t.mapsUrl ?? "",
    address: t.address ?? "",
    language: t.language ?? "en",
    dateFormat: t.dateFormat ?? "DD/MM/YYYY",
    timeFormat: t.timeFormat ?? "12h",
    secondaryColor: t.secondaryColor ?? "#64748B",
    accentColor: t.accentColor ?? "#F59E0B",
    fontFamily: t.fontFamily ?? "Inter",
    businessHours: deepMergeDefaults(t.businessHours, {
      openingTime: "09:00",
      closingTime: "18:00",
      weeklyOff: ["Sunday"],
      breakStart: "",
      breakEnd: "",
    }),
    socialLinks: deepMergeDefaults(t.socialLinks, {
      instagram: "",
      facebook: "",
      linkedin: "",
      youtube: "",
      googleBusiness: "",
      whatsapp: "",
    }),
    legalPolicies: deepMergeDefaults(t.legalPolicies, {
      privacyPolicy: "",
      termsAndConditions: "",
      refundPolicy: "",
      cancellationPolicy: "",
    }),
    businessStatus: deepMergeDefaults(t.businessStatus, {
      activeBusiness: true,
      onlineBooking: true,
      walkIns: true,
      showOnWebsite: true,
    }),
    notificationPrefs: deepMergeDefaults(t.notificationPrefs, {
      email: true,
      sms: true,
      whatsapp: true,
      marketingEmails: false,
    }),
  };
}

export default function SettingsPage() {
  const { setCurrency } = useCurrency();
  const { logout, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [baseline, setBaseline] = React.useState<FormState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [sessions, setSessions] = React.useState<AuthSessionInfo[]>([]);
  const [twoFactor, setTwoFactor] = React.useState(false);
  const [passwordForm, setPasswordForm] = React.useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [changingPassword, setChangingPassword] = React.useState(false);
  const saveLock = React.useRef(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (user?.twoFactorEnabled != null) setTwoFactor(Boolean(user.twoFactorEnabled));
  }, [user?.twoFactorEnabled]);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tenant, sessionList] = await Promise.all([
        api.getTenant(),
        api.listSessions().catch(() => []),
      ]);
      const normalized = defaultsFromTenant(tenant);
      setForm(normalized);
      setBaseline(normalized);
      setSessions(sessionList as AuthSessionInfo[]);
      if (tenant.currency) {
        setCurrency(tenant.currency);
        localStorage.setItem("doloyal_currency", tenant.currency);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [setCurrency]);

  React.useEffect(() => {
    load();
  }, [load]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const dirty = React.useMemo(() => {
    if (!form || !baseline) return false;
    return JSON.stringify(form) !== JSON.stringify(baseline);
  }, [form, baseline]);

  const validate = (): string | null => {
    if (!form) return "Settings not loaded";
    if (!form.name?.trim() || form.name.trim().length < 2) return "Business name is required";
    if (!form.phone?.trim()) return "Phone number is required";
    if (!form.email?.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) return "Valid business email is required";
    if (form.website && form.website.trim() && !/^https?:\/\//i.test(form.website)) {
      return "Website URL must start with http:// or https://";
    }
    if (form.brandColor && !/^#[0-9a-fA-F]{6}$/.test(form.brandColor)) return "Primary color must be a hex value";
    if (form.secondaryColor && !/^#[0-9a-fA-F]{6}$/.test(form.secondaryColor)) return "Secondary color must be a hex value";
    if (form.accentColor && !/^#[0-9a-fA-F]{6}$/.test(form.accentColor)) return "Accent color must be a hex value";
    return null;
  };

  const handleSave = async () => {
    if (!form || saveLock.current) return;
    const validationError = validate();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    try {
      saveLock.current = true;
      setSaving(true);
      const updated = await api.updateTenantSettings({
        name: form.name.trim(),
        category: form.category,
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        website: form.website || "",
        address: form.address || "",
        gst: form.gst || "",
        registrationNumber: form.registrationNumber || "",
        logoUrl: form.logoUrl ?? null,
        coverBannerUrl: form.coverBannerUrl ?? null,
        faviconUrl: form.faviconUrl ?? null,
        tagline: form.tagline || "",
        description: form.description || "",
        whatsapp: form.whatsapp || "",
        mapsUrl: form.mapsUrl || "",
        currency: form.currency,
        timezone: form.timezone,
        language: form.language,
        dateFormat: form.dateFormat,
        timeFormat: form.timeFormat,
        brandColor: form.brandColor,
        secondaryColor: form.secondaryColor,
        accentColor: form.accentColor,
        fontFamily: form.fontFamily,
        taxRate: form.taxRate,
        businessHours: form.businessHours,
        socialLinks: form.socialLinks,
        legalPolicies: form.legalPolicies,
        businessStatus: form.businessStatus,
        notificationPrefs: form.notificationPrefs,
      });
      const normalized = defaultsFromTenant(updated);
      setForm(normalized);
      setBaseline(normalized);
      if (updated.currency) setCurrency(updated.currency);
      localStorage.setItem("doloyal_currency", updated.currency);
      toast.success("Settings saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  const handleCancel = () => {
    if (!baseline) return;
    setForm(baseline);
    toast.message("Unsaved changes discarded");
  };

  const handleChangePassword = async () => {
    if (passwordForm.next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    try {
      setChangingPassword(true);
      await api.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: "", next: "", confirm: "" });
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-24">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="h-10 w-10 text-[rgb(var(--color-danger))]" />
        <h3 className="mt-4 text-lg font-semibold">Failed to load settings</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <Button variant="ghost" className="mt-4" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  if (!form) {
    return (
      <EmptyState
        icon={<Building2 className="h-7 w-7" />}
        title="No settings found"
        description="Your business settings will appear here once your account is set up."
      />
    );
  }

  const themeValue = mounted ? theme ?? "light" : "light";

  return (
    <div className="relative mx-auto max-w-5xl space-y-6 pb-28">
      <style>{`
        @keyframes settingsFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <PageHeader
        title="Settings"
        description="Manage your business information & preferences"
      />

      {/* Business Information */}
      <SectionCard
        icon={Building2}
        title="Business Information"
        description="Core identity, branding assets, and registration details"
        delay={0.02}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ImageUploadField
            label="Business Logo"
            hint="PNG or JPG up to 2MB"
            value={form.logoUrl}
            onChange={(url) => update("logoUrl", url)}
          />
          <ImageUploadField
            label="Cover Banner"
            hint="Recommended 1600×400"
            value={form.coverBannerUrl}
            onChange={(url) => update("coverBannerUrl", url)}
            aspect="banner"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Name" required>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Business Tagline">
            <Input
              value={form.tagline ?? ""}
              onChange={(e) => update("tagline", e.target.value)}
              placeholder="Short memorable line"
            />
          </Field>
          <Field label="Business Description" className="sm:col-span-2">
            <Textarea
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              rows={4}
              placeholder="Tell customers what makes your business special"
            />
          </Field>
          <Field label="Business Category" required>
            <Select
              value={form.category}
              onValueChange={(v) => update("category", v as BusinessCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {BUSINESS_CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="GST Number">
            <Input value={form.gst ?? ""} onChange={(e) => update("gst", e.target.value)} />
          </Field>
          <Field label="Registration Number" className="sm:col-span-2">
            <Input
              value={form.registrationNumber ?? ""}
              onChange={(e) => update("registrationNumber", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard
        icon={Phone}
        title="Contact Information"
        description="How customers reach and find your business"
        delay={0.05}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone Number" required>
            <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp Number">
            <Input
              value={form.whatsapp ?? ""}
              onChange={(e) => update("whatsapp", e.target.value)}
            />
          </Field>
          <Field label="Business Email" required>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
          <Field label="Website URL">
            <Input
              value={form.website ?? ""}
              onChange={(e) => update("website", e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Complete Address" className="sm:col-span-2">
            <Textarea
              value={form.address ?? ""}
              onChange={(e) => update("address", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Google Maps Location" className="sm:col-span-2">
            <Input
              value={form.mapsUrl ?? ""}
              onChange={(e) => update("mapsUrl", e.target.value)}
              placeholder="Paste Google Maps link or embed URL"
            />
          </Field>
        </div>
      </SectionCard>

      {/* Branding */}
      <SectionCard
        icon={Palette}
        title="Branding"
        description="Colors, typography, and live preview of your brand"
        delay={0.08}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {(
            [
              ["brandColor", "Primary Color"],
              ["secondaryColor", "Secondary Color"],
              ["accentColor", "Accent Color"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={(form[key] as string) || "#2563EB"}
                  onChange={(e) => update(key, e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-[rgb(var(--color-border))] bg-transparent p-1"
                />
                <Input
                  value={(form[key] as string) || ""}
                  onChange={(e) => update(key, e.target.value)}
                />
              </div>
            </Field>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Font Family">
            <Select
              value={form.fontFamily || "Inter"}
              onValueChange={(v) => update("fontFamily", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <ImageUploadField
            label="Favicon"
            hint="Square icon, 64×64 or larger"
            value={form.faviconUrl}
            onChange={(url) => update("faviconUrl", url)}
            aspect="icon"
          />
        </div>
        <div
          className="overflow-hidden rounded-2xl border border-[rgb(var(--color-border))]"
          style={{ fontFamily: form.fontFamily || "Inter" }}
        >
          <div
            className="px-5 py-8 text-white"
            style={{
              background: `linear-gradient(135deg, ${form.brandColor}, ${form.accentColor})`,
            }}
          >
            <div className="text-xs uppercase tracking-[0.2em] opacity-80">Live preview</div>
            <div className="mt-2 text-2xl font-semibold">{form.name || "Your Business"}</div>
            <div className="mt-1 text-sm opacity-90">
              {form.tagline || "Your brand tagline appears here"}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 bg-[rgb(var(--color-background))] px-5 py-4">
            <div>
              <div className="text-sm font-medium" style={{ color: form.secondaryColor || undefined }}>
                Secondary text sample
              </div>
              <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                Accent buttons and highlights use your accent color
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium text-white"
              style={{ backgroundColor: form.accentColor || "#F59E0B" }}
            >
              Book now
            </button>
          </div>
        </div>
      </SectionCard>

      {/* Preferences */}
      <SectionCard
        icon={Globe2}
        title="Business Preferences"
        description="Regional formatting for money, language, and time"
        delay={0.11}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Currency">
            <Select value={form.currency} onValueChange={(v) => update("currency", v)}>
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
          </Field>
          <Field label="Language">
            <Select
              value={form.language || "en"}
              onValueChange={(v) => update("language", v)}
            >
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
          </Field>
          <Field label="Timezone">
            <Select value={form.timezone} onValueChange={(v) => update("timezone", v)}>
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
          </Field>
          <Field label="Date Format">
            <Select
              value={form.dateFormat || "DD/MM/YYYY"}
              onValueChange={(v) => update("dateFormat", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Time Format">
            <Select
              value={form.timeFormat || "12h"}
              onValueChange={(v) => update("timeFormat", v as "12h" | "24h")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard
        icon={SunMoon}
        title="Appearance"
        description="Choose how Doloyal looks on this device. Preference is saved automatically."
        delay={0.14}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { id: "light", label: "Light", icon: Sun, desc: "Bright interface" },
              { id: "dark", label: "Dark", icon: Moon, desc: "Low-light friendly" },
              { id: "system", label: "System Default", icon: Monitor, desc: "Match device setting" },
            ] as const
          ).map((opt) => {
            const active = themeValue === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition-all",
                  active
                    ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.08)] shadow-sm"
                    : "border-[rgb(var(--color-border))] hover:bg-[rgb(var(--color-muted)/0.5)]",
                )}
              >
                <opt.icon className="h-5 w-5 text-[rgb(var(--color-primary))]" />
                <div className="mt-3 text-sm font-semibold">{opt.label}</div>
                <div className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                  {opt.desc}
                  {opt.id === "system" && mounted
                    ? ` · currently ${resolvedTheme}`
                    : ""}
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Hours */}
      <SectionCard
        icon={Clock3}
        title="Business Hours"
        description="Opening times, weekly offs, and break windows"
        delay={0.17}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Opening Time">
            <Input
              type="time"
              value={form.businessHours?.openingTime || ""}
              onChange={(e) =>
                update("businessHours", { ...form.businessHours, openingTime: e.target.value })
              }
            />
          </Field>
          <Field label="Closing Time">
            <Input
              type="time"
              value={form.businessHours?.closingTime || ""}
              onChange={(e) =>
                update("businessHours", { ...form.businessHours, closingTime: e.target.value })
              }
            />
          </Field>
          <Field label="Break Start Time">
            <Input
              type="time"
              value={form.businessHours?.breakStart || ""}
              onChange={(e) =>
                update("businessHours", { ...form.businessHours, breakStart: e.target.value })
              }
            />
          </Field>
          <Field label="Break End Time">
            <Input
              type="time"
              value={form.businessHours?.breakEnd || ""}
              onChange={(e) =>
                update("businessHours", { ...form.businessHours, breakEnd: e.target.value })
              }
            />
          </Field>
        </div>
        <Field label="Weekly Off">
          <div className="flex flex-wrap gap-2">
            {WEEK_DAYS.map((day) => {
              const selected = form.businessHours?.weeklyOff?.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    const current = form.businessHours?.weeklyOff || [];
                    const next = selected
                      ? current.filter((d) => d !== day)
                      : [...current, day];
                    update("businessHours", { ...form.businessHours, weeklyOff: next });
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    selected
                      ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white"
                      : "border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))]",
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </Field>
      </SectionCard>

      {/* Social */}
      <SectionCard
        icon={Share2}
        title="Social Links"
        description="Profiles customers can follow and message"
        delay={0.2}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["instagram", "Instagram"],
              ["facebook", "Facebook"],
              ["linkedin", "LinkedIn"],
              ["youtube", "YouTube"],
              ["googleBusiness", "Google Business Profile"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <Input
                value={form.socialLinks?.[key] || ""}
                onChange={(e) =>
                  update("socialLinks", { ...form.socialLinks, [key]: e.target.value })
                }
                placeholder="https://"
              />
            </Field>
          ))}
        </div>
      </SectionCard>

      {/* Legal */}
      <SectionCard
        icon={Scale}
        title="Legal"
        description="Policies shown on booking and public pages"
        delay={0.23}
      >
        {(
          [
            ["privacyPolicy", "Privacy Policy"],
            ["termsAndConditions", "Terms & Conditions"],
            ["refundPolicy", "Refund Policy"],
            ["cancellationPolicy", "Cancellation Policy"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <RichTextEditor
              value={form.legalPolicies?.[key] || ""}
              onChange={(html) =>
                update("legalPolicies", { ...form.legalPolicies, [key]: html })
              }
              placeholder={`Write your ${label.toLowerCase()}…`}
            />
          </Field>
        ))}
      </SectionCard>

      {/* Status */}
      <SectionCard
        icon={Activity}
        title="Business Status"
        description="Control visibility and how customers can engage"
        delay={0.26}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Active Business"
            description="Business is open for operations"
            checked={!!form.businessStatus?.activeBusiness}
            onCheckedChange={(v) =>
              update("businessStatus", { ...form.businessStatus, activeBusiness: v })
            }
          />
          <ToggleRow
            label="Online Booking"
            description="Accept appointments online"
            checked={!!form.businessStatus?.onlineBooking}
            onCheckedChange={(v) =>
              update("businessStatus", { ...form.businessStatus, onlineBooking: v })
            }
          />
          <ToggleRow
            label="Walk-ins"
            description="Allow walk-in customers"
            checked={!!form.businessStatus?.walkIns}
            onCheckedChange={(v) =>
              update("businessStatus", { ...form.businessStatus, walkIns: v })
            }
          />
          <ToggleRow
            label="Show Business on Website"
            description="List this business publicly"
            checked={!!form.businessStatus?.showOnWebsite}
            onCheckedChange={(v) =>
              update("businessStatus", { ...form.businessStatus, showOnWebsite: v })
            }
          />
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Choose which channels you want to receive"
        delay={0.29}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <ToggleRow
            label="Email Notifications"
            checked={!!form.notificationPrefs?.email}
            onCheckedChange={(v) =>
              update("notificationPrefs", { ...form.notificationPrefs, email: v })
            }
          />
          <ToggleRow
            label="SMS Notifications"
            checked={!!form.notificationPrefs?.sms}
            onCheckedChange={(v) =>
              update("notificationPrefs", { ...form.notificationPrefs, sms: v })
            }
          />
          <ToggleRow
            label="WhatsApp Notifications"
            checked={!!form.notificationPrefs?.whatsapp}
            onCheckedChange={(v) =>
              update("notificationPrefs", { ...form.notificationPrefs, whatsapp: v })
            }
          />
          <ToggleRow
            label="Marketing Emails"
            checked={!!form.notificationPrefs?.marketingEmails}
            onCheckedChange={(v) =>
              update("notificationPrefs", { ...form.notificationPrefs, marketingEmails: v })
            }
          />
        </div>
      </SectionCard>

      {/* Security */}
      <SectionCard
        icon={Shield}
        title="Security"
        description="Password, two-factor authentication, and active sessions"
        delay={0.32}
      >
        <div className="space-y-4 rounded-xl border border-[rgb(var(--color-border))] p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="h-4 w-4" />
            Change Password
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Current password">
              <Input
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
              />
            </Field>
            <Field label="New password">
              <Input
                type="password"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
              />
            </Field>
            <Field label="Confirm new password">
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              />
            </Field>
          </div>
          <Button
            type="button"
            variant="secondary"
            loading={changingPassword}
            onClick={handleChangePassword}
          >
            Update Password
          </Button>
        </div>

        <ToggleRow
          label="Two-Factor Authentication (2FA)"
          description="Require an extra verification step when signing in"
          checked={twoFactor}
          onCheckedChange={async (v) => {
            try {
              const res = await api.setTwoFactor(v);
              setTwoFactor(res.twoFactorEnabled);
              toast.success(v ? "2FA enabled" : "2FA disabled");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Could not update 2FA");
            }
          }}
        />

        <div className="space-y-3">
          <div className="text-sm font-medium">Active Login Sessions</div>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-medium">
                    {s.device}
                    {s.current ? (
                      <span className="ml-2 text-xs text-[rgb(var(--color-success))]">Current</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {s.ip || "IP unknown"} · Last active{" "}
                    {new Date(s.lastActiveAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="danger"
            onClick={async () => {
              try {
                await api.logoutAllDevices();
                toast.success("Logged out from all devices");
                logout();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not logout all devices");
              }
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout From All Devices
          </Button>
        </div>
      </SectionCard>

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/0.92)] backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
            {dirty ? "You have unsaved changes" : "All changes saved"}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={!dirty || saving}
              onClick={handleCancel}
            >
              <RotateCcw className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="button" loading={saving} disabled={!dirty} onClick={handleSave}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
