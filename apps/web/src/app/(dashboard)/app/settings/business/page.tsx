"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@doloyal/ui";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_LABELS, type BusinessCategory, type Tenant } from "@doloyal/shared";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
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
  address: string;
  mapsUrl: string;
  logoUrl: string | null;
  coverBannerUrl: string | null;
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
    address: t.address ?? "",
    mapsUrl: t.mapsUrl ?? "",
    logoUrl: t.logoUrl ?? null,
    coverBannerUrl: t.coverBannerUrl ?? null,
  };
}

export default function BusinessSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();

  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [baseline, setBaseline] = React.useState<Draft | null>(null);

  React.useEffect(() => {
    if (tenant && !draft) {
      const d = draftFrom(tenant);
      setDraft(d);
      setBaseline(d);
    }
  }, [tenant, draft]);

  const dirty = !!draft && !!baseline && !jsonEqual(draft, baseline);
  useUnsavedGuard(dirty);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((p) => (p ? { ...p, [key]: value } : p));

  const validate = (): string | null => {
    if (!draft) return null;
    if (!draft.name.trim() || draft.name.trim().length < 2) return "Business name is required";
    if (!draft.phone.trim()) return "Business phone is required";
    if (!draft.email.trim() || !/^\S+@\S+\.\S+$/.test(draft.email))
      return "A valid business email is required";
    if (draft.website.trim() && !/^https?:\/\//i.test(draft.website.trim()))
      return "Website must start with http:// or https://";
    if (draft.mapsUrl.trim() && !/^https?:\/\//i.test(draft.mapsUrl.trim()))
      return "Google Maps link must start with http:// or https://";
    return null;
  };

  const handleSave = async () => {
    if (!draft) return;
    const problem = validate();
    if (problem) {
      toast.error(problem);
      return;
    }
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
        address: draft.address,
        mapsUrl: draft.mapsUrl.trim(),
        logoUrl: draft.logoUrl,
        coverBannerUrl: draft.coverBannerUrl,
      });
      setBaseline(draft);
      setStatus("saved");
      toast.success("Business details updated");
    } catch {
      setStatus("error");
    }
  };

  const discard = () => {
    if (baseline) setDraft(baseline);
  };

  if (isLoading || !tenant || !draft) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Business</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          How your business appears across Doloyal and to customers.
        </p>
      </div>

      <SettingsSection title="Identity">
        <div className="grid gap-6 pb-3 sm:grid-cols-2">
          <ImageUploadField
            label="Logo"
            hint="PNG or JPG, up to 2MB"
            value={draft.logoUrl}
            onChange={(url) => set("logoUrl", url)}
          />
          <ImageUploadField
            label="Cover banner"
            hint="Recommended 1600×400"
            value={draft.coverBannerUrl}
            onChange={(url) => set("coverBannerUrl", url)}
            aspect="banner"
          />
        </div>
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="Business name" htmlFor="biz-name" stacked>
            <Input
              id="biz-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="organization"
            />
          </SettingRow>
          <SettingRow label="Tagline" htmlFor="biz-tagline" stacked>
            <Input
              id="biz-tagline"
              value={draft.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Short memorable line"
            />
          </SettingRow>
        </div>
        <SettingRow label="Description" htmlFor="biz-desc" stacked>
          <Textarea
            id="biz-desc"
            rows={3}
            value={draft.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Tell customers what makes your business special"
          />
        </SettingRow>
        <SettingRow label="Category" description="Helps tailor templates and defaults.">
          <Select
            value={draft.category}
            onValueChange={(v) => set("category", v as BusinessCategory)}
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
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Registration details" description="Used on invoices and legal documents.">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="GST number" htmlFor="biz-gst" stacked>
            <Input
              id="biz-gst"
              value={draft.gst}
              onChange={(e) => set("gst", e.target.value)}
              placeholder="e.g. 27AABCU9603R1ZM"
            />
          </SettingRow>
          <SettingRow label="Registration number" htmlFor="biz-reg" stacked>
            <Input
              id="biz-reg"
              value={draft.registrationNumber}
              onChange={(e) => set("registrationNumber", e.target.value)}
            />
          </SettingRow>
        </div>
      </SettingsSection>

      <SettingsSection title="Contact" description="How customers reach and find your business.">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <SettingRow label="Phone" htmlFor="biz-phone" stacked>
            <Input
              id="biz-phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </SettingRow>
          <SettingRow label="WhatsApp" htmlFor="biz-wa" stacked>
            <Input
              id="biz-wa"
              type="tel"
              value={draft.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="+91…"
            />
          </SettingRow>
          <SettingRow label="Email" htmlFor="biz-email" stacked>
            <Input
              id="biz-email"
              type="email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </SettingRow>
          <SettingRow label="Website" htmlFor="biz-web" stacked>
            <Input
              id="biz-web"
              type="url"
              value={draft.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://"
            />
          </SettingRow>
        </div>
        <SettingRow label="Address" htmlFor="biz-address" stacked>
          <Textarea
            id="biz-address"
            rows={2}
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </SettingRow>
        <SettingRow
          label="Google Maps location"
          htmlFor="biz-maps"
          stacked
          description="Paste a Google Maps link to show your location publicly."
        >
          <Input
            id="biz-maps"
            type="url"
            value={draft.mapsUrl}
            onChange={(e) => set("mapsUrl", e.target.value)}
            placeholder="https://maps.google.com/…"
          />
        </SettingRow>
      </SettingsSection>

      <SaveBar
        dirty={dirty}
        saving={updateTenant.isPending}
        onSave={handleSave}
        onDiscard={discard}
      />
    </div>
  );
}
