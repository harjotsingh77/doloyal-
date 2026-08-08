"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Rocket,
  Monitor,
  Smartphone,
  Tablet,
  GripVertical,
  ExternalLink,
  Copy,
  Undo2,
  Redo2,
  QrCode,
  Globe,
  Palette,
  Layout,
  Search,
  Link2,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Input,
  Field,
  Textarea,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@doloyal/ui";
import type {
  BookingLink,
  BookingPageConfig,
  BookingPageSection,
  BookingBrandingConfig,
  BookingSeoConfig,
  BookingDomainConfig,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ViewMode = "desktop" | "tablet" | "mobile";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  about: "About",
  services: "Services",
  staff: "Staff",
  gallery: "Gallery",
  testimonials: "Testimonials",
  membership: "Membership",
  loyalty: "Loyalty",
  booking: "Booking Form",
  faq: "FAQ",
  contact: "Contact",
  map: "Map",
  footer: "Footer",
};

const DEFAULT_SECTIONS: BookingPageSection[] = [
  { id: "hero", enabled: true },
  { id: "about", enabled: true },
  { id: "services", enabled: true },
  { id: "staff", enabled: true },
  { id: "gallery", enabled: false },
  { id: "testimonials", enabled: true },
  { id: "membership", enabled: false },
  { id: "loyalty", enabled: false },
  { id: "booking", enabled: true },
  { id: "faq", enabled: true },
  { id: "contact", enabled: true },
  { id: "map", enabled: true },
  { id: "footer", enabled: true },
];

function defaultPageConfig(): BookingPageConfig {
  return {
    sections: DEFAULT_SECTIONS.map((s) => ({ ...s })),
    tagline: "Book your next appointment online",
    about: "We provide premium services with experienced professionals.",
    heroCta: "Book Now",
    policies: "Cancellations must be made at least 24 hours in advance.",
    faqs: [
      { question: "How do I book?", answer: "Select a service, choose staff and a time, then confirm." },
    ],
    gallery: [],
    testimonials: [{ name: "Happy Customer", rating: 5, text: "Great experience!" }],
    membershipBlurb: "Members enjoy priority booking.",
    loyaltyBlurb: "Earn points on every visit.",
  };
}

export default function EditBookingPageEditor() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [link, setLink] = React.useState<BookingLink | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>("desktop");
  const [pageConfig, setPageConfig] = React.useState<BookingPageConfig>(defaultPageConfig());
  const [branding, setBranding] = React.useState<BookingBrandingConfig>({});
  const [seo, setSeo] = React.useState<BookingSeoConfig>({});
  const [domain, setDomain] = React.useState<BookingDomainConfig>({ status: "PENDING" });
  const [metaTitle, setMetaTitle] = React.useState("");
  const [metaDescription, setMetaDescription] = React.useState("");
  const [history, setHistory] = React.useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = React.useState(-1);
  const skipHistory = React.useRef(false);

  const snapshot = React.useCallback(() => {
    return JSON.stringify({ pageConfig, branding, seo, domain, metaTitle, metaDescription });
  }, [pageConfig, branding, seo, domain, metaTitle, metaDescription]);

  const pushHistory = React.useCallback(() => {
    if (skipHistory.current) return;
    const snap = snapshot();
    setHistory((prev) => {
      const next = prev.slice(0, historyIndex + 1);
      next.push(snap);
      return next.slice(-30);
    });
    setHistoryIndex((i) => Math.min(i + 1, 29));
  }, [snapshot, historyIndex]);

  React.useEffect(() => {
    if (!link) return;
    const t = setTimeout(() => pushHistory(), 400);
    return () => clearTimeout(t);
  }, [pageConfig, branding, seo, domain, metaTitle, metaDescription]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySnapshot = (raw: string) => {
    skipHistory.current = true;
    try {
      const data = JSON.parse(raw);
      setPageConfig(data.pageConfig);
      setBranding(data.branding);
      setSeo(data.seo);
      setDomain(data.domain);
      setMetaTitle(data.metaTitle);
      setMetaDescription(data.metaDescription);
    } finally {
      setTimeout(() => {
        skipHistory.current = false;
      }, 50);
    }
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    applySnapshot(history[next]);
    setHistoryIndex(next);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    applySnapshot(history[next]);
    setHistoryIndex(next);
  };

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getBookingPage(id);
      setLink(data);
      setPageConfig({ ...defaultPageConfig(), ...(data.pageConfig || {}) });
      setBranding({ ...(data.branding || {}) });
      setSeo({ ...(data.seo || {}) });
      setDomain({
        subdomain: data.domain?.subdomain || `${data.slug}.doloyal.ai`,
        customDomain: data.domain?.customDomain || "",
        status: data.domain?.status || "PENDING",
      });
      setMetaTitle(data.metaTitle || "");
      setMetaDescription(data.metaDescription || "");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load booking page");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveDraft = async () => {
    try {
      setSaving(true);
      const updated = await api.updateBookingPage(id, {
        pageConfig,
        branding,
        seo,
        domain: {
          ...domain,
          status: domain.customDomain ? "PENDING" : domain.status || "PENDING",
        },
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        status: "DRAFT",
      });
      setLink(updated);
      toast.success("Draft saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save draft");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    try {
      setPublishing(true);
      await api.updateBookingPage(id, {
        pageConfig,
        branding,
        seo,
        domain: {
          ...domain,
          status: domain.customDomain ? "PENDING" : domain.status || "PENDING",
        },
        metaTitle: metaTitle || undefined,
        metaDescription: metaDescription || undefined,
        status: "DRAFT",
      });
      const published = await api.publishBookingLink(id);
      setLink(published);
      toast.success("Booking page published");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  const moveSection = (index: number, dir: -1 | 1) => {
    const sections = [...(pageConfig.sections || [])];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const tmp = sections[index];
    sections[index] = sections[target];
    sections[target] = tmp;
    setPageConfig({ ...pageConfig, sections });
  };

  const toggleSection = (index: number, enabled: boolean) => {
    const sections = [...(pageConfig.sections || [])];
    sections[index] = { ...sections[index], enabled };
    setPageConfig({ ...pageConfig, sections });
  };

  const previewWidth =
    viewMode === "desktop" ? "100%" : viewMode === "tablet" ? "768px" : "390px";

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-[rgb(var(--color-muted-foreground))]">Booking link not found</p>
        <Button variant="secondary" className="mt-4" onClick={() => router.push("/app/appointments/booking-links")}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/appointments/booking-links")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-sm font-semibold">Edit Booking Page</h1>
            <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
              {link.name || link.slug} · {link.status || "PUBLISHED"}
            </p>
          </div>
          <Badge variant="outline" className="text-[0.55rem] uppercase">
            {domain.status === "PENDING" ? "Pending DNS" : domain.status || "PENDING"}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-[rgb(var(--color-border))] p-0.5">
            {(["desktop", "tablet", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md p-1.5 transition-colors ${
                  viewMode === mode
                    ? "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]"
                    : "text-[rgb(var(--color-muted-foreground))]"
                }`}
              >
                {mode === "desktop" ? <Monitor className="h-4 w-4" /> : mode === "tablet" ? <Tablet className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" onClick={undo} disabled={historyIndex <= 0}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open(link.url, "_blank")}>
            <ExternalLink className="h-4 w-4" /> Preview
          </Button>
          <Button variant="secondary" size="sm" loading={saving} onClick={() => void saveDraft()}>
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button size="sm" loading={publishing} onClick={() => void publish()}>
            <Rocket className="h-4 w-4" /> Publish
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="w-[360px] shrink-0 overflow-y-auto border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
          <Tabs defaultValue="sections">
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="sections" className="flex-1 text-xs"><Layout className="mr-1 h-3.5 w-3.5" />Sections</TabsTrigger>
              <TabsTrigger value="brand" className="flex-1 text-xs"><Palette className="mr-1 h-3.5 w-3.5" />Brand</TabsTrigger>
              <TabsTrigger value="seo" className="flex-1 text-xs"><Search className="mr-1 h-3.5 w-3.5" />SEO</TabsTrigger>
              <TabsTrigger value="domain" className="flex-1 text-xs"><Globe className="mr-1 h-3.5 w-3.5" />Domain</TabsTrigger>
            </TabsList>

            <TabsContent value="sections" className="space-y-4">
              <Field label="Tagline">
                <Input value={pageConfig.tagline || ""} onChange={(e) => setPageConfig({ ...pageConfig, tagline: e.target.value })} />
              </Field>
              <Field label="About">
                <Textarea rows={3} value={pageConfig.about || ""} onChange={(e) => setPageConfig({ ...pageConfig, about: e.target.value })} />
              </Field>
              <Field label="Hero CTA">
                <Input value={pageConfig.heroCta || ""} onChange={(e) => setPageConfig({ ...pageConfig, heroCta: e.target.value })} />
              </Field>
              <Field label="Policies">
                <Textarea rows={2} value={pageConfig.policies || ""} onChange={(e) => setPageConfig({ ...pageConfig, policies: e.target.value })} />
              </Field>
              <div className="space-y-2">
                <p className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Section order</p>
                {(pageConfig.sections || []).map((section, index) => (
                  <div
                    key={section.id}
                    className="flex items-center gap-2 rounded-md border border-[rgb(var(--color-border))] px-2 py-1.5"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />
                    <span className="flex-1 text-xs font-medium">{SECTION_LABELS[section.id] || section.id}</span>
                    <button type="button" className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]" onClick={() => moveSection(index, -1)}>↑</button>
                    <button type="button" className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]" onClick={() => moveSection(index, 1)}>↓</button>
                    <Switch checked={section.enabled} onCheckedChange={(v) => toggleSection(index, v)} />
                  </div>
                ))}
              </div>
              <Field label="Membership blurb">
                <Input value={pageConfig.membershipBlurb || ""} onChange={(e) => setPageConfig({ ...pageConfig, membershipBlurb: e.target.value })} />
              </Field>
              <Field label="Loyalty blurb">
                <Input value={pageConfig.loyaltyBlurb || ""} onChange={(e) => setPageConfig({ ...pageConfig, loyaltyBlurb: e.target.value })} />
              </Field>
            </TabsContent>

            <TabsContent value="brand" className="space-y-3">
              <Field label="Logo URL">
                <Input value={branding.logoUrl || ""} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Cover banner URL">
                <Input value={branding.coverBannerUrl || ""} onChange={(e) => setBranding({ ...branding, coverBannerUrl: e.target.value })} placeholder="https://..." />
              </Field>
              <Field label="Primary color">
                <Input type="color" value={branding.primaryColor || branding.themeColor || "#2563EB"} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value, themeColor: e.target.value })} />
              </Field>
              <Field label="Secondary color">
                <Input type="color" value={branding.secondaryColor || "#60A5FA"} onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })} />
              </Field>
              <Field label="Accent color">
                <Input type="color" value={branding.accentColor || "#10B981"} onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })} />
              </Field>
              <Field label="Font family">
                <Input value={branding.fontFamily || ""} onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })} placeholder="e.g. Georgia, serif" />
              </Field>
              <Field label="Border radius">
                <Input value={branding.borderRadius || ""} onChange={(e) => setBranding({ ...branding, borderRadius: e.target.value })} placeholder="0.625rem" />
              </Field>
              <Field label="Background color">
                <Input value={branding.backgroundColor || ""} onChange={(e) => setBranding({ ...branding, backgroundColor: e.target.value })} />
              </Field>
              <Field label="Background image URL">
                <Input value={branding.backgroundImage || ""} onChange={(e) => setBranding({ ...branding, backgroundImage: e.target.value })} />
              </Field>
              <Field label="QR color">
                <Input type="color" value={branding.qrColor || "#111827"} onChange={(e) => setBranding({ ...branding, qrColor: e.target.value })} />
              </Field>
              <Field label="Custom CSS (optional)">
                <Textarea rows={4} value={branding.customCss || ""} onChange={(e) => setBranding({ ...branding, customCss: e.target.value })} />
              </Field>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show rating</span>
                <Switch checked={branding.showRating !== false} onCheckedChange={(v) => setBranding({ ...branding, showRating: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show map</span>
                <Switch checked={branding.showMap !== false} onCheckedChange={(v) => setBranding({ ...branding, showMap: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show WhatsApp</span>
                <Switch checked={branding.showWhatsApp !== false} onCheckedChange={(v) => setBranding({ ...branding, showWhatsApp: v })} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Show social</span>
                <Switch checked={branding.showSocial !== false} onCheckedChange={(v) => setBranding({ ...branding, showSocial: v })} />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-3">
              <Field label="SEO title">
                <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} />
              </Field>
              <Field label="Meta description">
                <Textarea rows={3} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} />
              </Field>
              <Field label="Keywords">
                <Input value={seo.keywords || ""} onChange={(e) => setSeo({ ...seo, keywords: e.target.value })} />
              </Field>
              <Field label="Open Graph image URL">
                <Input value={seo.ogImage || ""} onChange={(e) => setSeo({ ...seo, ogImage: e.target.value })} />
              </Field>
              <Field label="Favicon URL">
                <Input value={seo.favicon || ""} onChange={(e) => setSeo({ ...seo, favicon: e.target.value })} />
              </Field>
            </TabsContent>

            <TabsContent value="domain" className="space-y-3">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                    <Link2 className="h-3.5 w-3.5" /> Primary public URL
                  </div>
                  <code className="block truncate rounded-md bg-[rgb(var(--color-muted)/0.4)] px-2 py-2 text-xs">{link.url}</code>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      void navigator.clipboard.writeText(link.url);
                      toast.success("Copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy URL
                  </Button>
                </CardContent>
              </Card>
              <Field label="Doloyal subdomain">
                <Input
                  value={domain.subdomain || `${link.slug}.doloyal.ai`}
                  onChange={(e) => setDomain({ ...domain, subdomain: e.target.value })}
                />
              </Field>
              <Field label="Custom domain">
                <Input
                  value={domain.customDomain || ""}
                  onChange={(e) =>
                    setDomain({
                      ...domain,
                      customDomain: e.target.value,
                      status: e.target.value.trim() ? "PENDING" : domain.status,
                    })
                  }
                  placeholder="booking.yourbusiness.com"
                />
              </Field>
              <Badge variant="outline">
                {domain.customDomain ? "Pending DNS" : domain.status || "Pending DNS"}
              </Badge>
              <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                DNS verification and live custom-domain routing will be enabled in a later release. Your `/book/{link.slug}` URL works now.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <img
                  src={link.qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(link.url)}`}
                  alt="QR"
                  className="h-24 w-24 rounded-md border border-[rgb(var(--color-border))]"
                />
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const a = document.createElement("a");
                      a.href = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=png&color=${(branding.qrColor || "111827").replace("#", "")}&data=${encodeURIComponent(link.url)}`;
                      a.download = `${link.slug}-qr.png`;
                      a.click();
                    }}
                  >
                    <QrCode className="h-3.5 w-3.5" /> Download PNG
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const w = window.open("", "_blank");
                      if (!w) return;
                      w.document.write(`<img src="${link.qrUrl || ""}" style="width:300px;height:300px" /><script>setTimeout(()=>window.print(),300)</script>`);
                    }}
                  >
                    Print QR
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>

        <div className="flex flex-1 items-start justify-center overflow-auto bg-[rgb(var(--color-muted)/0.35)] p-6">
          <div
            className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-white shadow-sm transition-all"
            style={{ width: previewWidth, maxWidth: "100%", height: "calc(100vh - 8rem)" }}
          >
            <iframe title="Booking preview" src={`${link.url}?src=preview`} className="h-full w-full border-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
