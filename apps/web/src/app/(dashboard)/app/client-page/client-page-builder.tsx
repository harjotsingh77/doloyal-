"use client";

import * as React from "react";
import { ArrowLeft, CalendarDays, Copy, Eye, Gift, GripVertical, Image as ImageIcon, LayoutTemplate, MapPin, Monitor, Palette, Plus, Save, Smartphone, Sparkles, Star, Trash2, Users, Check, RotateCcw } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Input, Label, Switch, cn } from "@doloyal/ui";
import type { BookingLink, Tenant, PublicService } from "@doloyal/shared";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import { getBusinessDisplayName, hasCustomLogo, PAGE_SURFACE_DEFAULTS } from "@/lib/branding";
import { type MasterConfig } from "./master-template";
import { ClientPageRenderer } from "./client-page-renderer";
import { PreviewViewport, PREVIEW_VIEWPORTS, type PreviewDevice } from "./preview-viewport";
import { FRIENDLY_TITLES, PORTAL_TO_SECTION } from "./portal-shared";
import { PublishShareDialog, customerPageUrl } from "./publish-share-dialog";
import { ImageUploadField } from "../settings/settings-ui";
import { brandingGaps, liveCopy } from "./client-page-brand";
import { useLiveTenant } from "./use-live-tenant";

type SectionId = string;
type Section = { id: SectionId; enabled: boolean; hidden?: boolean; title?: string };
type Config = { sections: Section[]; heroHeading?: string; heroDescription?: string; heroBadge?: string; showSearch?: boolean; featuredTitle?: string; draft?: boolean; clientPageCreated?: boolean; [key: string]: unknown };

const LIBRARY: Array<[SectionId, string, React.ElementType, string]> = [
  ["hero", "Home / Hero", LayoutTemplate, "Highlights your brand and helps customers get started."],
  ["services", "Categories", Sparkles, "Service categories with counts."],
  ["featured", "Featured treatments", Sparkles, "Grid of services pulled from your Services."],
  ["booking", "Booking", CalendarDays, "Let customers discover availability and book."],
  ["loyalty", "Loyalty", Sparkles, "Points and progress."],
  ["rewards", "Rewards", Gift, "Rewards customers can redeem."],
  ["membership", "Membership", Users, "Member perks and plans."],
  ["referrals", "Referrals", Users, "Help customers share your business."],
  ["reviews", "Reviews", Star, "Leave a Doloyal review or review on Google."],
  ["about", "About business", ImageIcon, "Your story and highlights."],
  ["contact", "Contact", MapPin, "Make it easy to reach you."],
  ["footer", "Footer", LayoutTemplate, "Links and business details."],
  ["gallery", "Gallery", ImageIcon, "Photos of your work or space."],
  ["offers", "Featured offers", Gift, "Campaigns and special offers."],
  ["faq", "FAQ", LayoutTemplate, "Answer common questions."],
];

const SECTIONS_META: Record<string, { label: string; icon: React.ElementType }> = Object.fromEntries(LIBRARY.map(([id, label, icon]) => [id, { label, icon }]));
const DEFAULT_SECTIONS: SectionId[] = ["hero", "services", "featured", "booking", "rewards", "membership", "referrals", "reviews"];

const DEVICE_ICONS: Record<PreviewDevice, React.ElementType> = { desktop: Monitor, tablet: LayoutTemplate, mobile: Smartphone };

export function ClientPageBuilder({ tenant: tenantProp, link, initialConfig, onSave }: { tenant: Tenant | null; link: BookingLink | null; initialConfig: Config; onSave: (config: Config, publish?: boolean) => Promise<void> }) {
  const { tenant, draft, patchBrand, flush } = useLiveTenant(tenantProp);
  const [config, setConfig] = React.useState<Config>(initialConfig);
  const [selected, setSelected] = React.useState<string>(initialConfig.sections[0]?.id ?? "hero");
  const [focusKey, setFocusKey] = React.useState(0);
  const [screen, setScreen] = React.useState<PreviewDevice>("desktop");
  const [library, setLibrary] = React.useState(false);
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [dragged, setDragged] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [hasUnsaved, setHasUnsaved] = React.useState(false);
  const [shareOpen, setShareOpen] = React.useState(false);
  const [services, setServices] = React.useState<PublicService[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(true);

  const BASE_URL = getApiBaseUrl();

  React.useEffect(() => { setHasUnsaved(JSON.stringify(config) !== JSON.stringify(initialConfig)); }, [config, initialConfig]);

  React.useEffect(() => {
    async function loadServices() {
      if (!link?.slug) { setServices([]); setServicesLoading(false); return; }
      try {
        const res = await fetch(`${BASE_URL}/public/book/${link.slug}/services`);
        const json = await res.json();
        setServices((json.data ?? []) as PublicService[]);
      } catch { setServices([]); }
      finally { setServicesLoading(false); }
    }
    loadServices();
  }, [link?.slug, BASE_URL]);

  const sections = config.sections.filter((item) => item.enabled !== false && !item.hidden);
  const allSections = config.sections;
  const current = config.sections.find((item) => item.id === selected) ?? { id: "hero" as SectionId, enabled: true };

  const selectSection = React.useCallback((id: string) => {
    setSelected(id);
    setFocusKey((key) => key + 1);
  }, []);
  const mutate = (update: (items: Section[]) => Section[]) => setConfig((old) => ({ ...old, sections: update(old.sections) }));
  const updateSection = (id: string, patch: Partial<Section>) => mutate((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateConfig = (patch: Partial<Config>) => setConfig((old) => ({ ...old, ...patch }));

  const add = (id: SectionId) => {
    const exists = config.sections.find((item) => item.id === id);
    if (exists) mutate((items) => items.map((item) => item.id === id ? { ...item, enabled: true, hidden: false } : item));
    else mutate((items) => [...items, { id, enabled: true }]);
    setSelected(id);
    setFocusKey((key) => key + 1);
    setLibrary(false);
  };
  const reorder = (target: string) => {
    if (!dragged || dragged === target) return;
    mutate((items) => { const a = [...items]; const from = a.findIndex((i) => i.id === dragged); const to = a.findIndex((i) => i.id === target); if (from === -1 || to === -1) return a; a.splice(to, 0, a.splice(from, 1)[0]); return a; });
    setDragged(null);
  };

  const persist = async (publish = false) => {
    if (!link?.id) {
      toast.error("Your customer page isn’t ready yet. Refresh and try again.");
      return;
    }
    setSaving(true);
    try {
      await flush();
      await onSave({
        ...config,
        clientPageCreated: true,
        heroHeading: liveCopy(config.heroHeading as string) || undefined,
        heroDescription: liveCopy(config.heroDescription as string) || undefined,
        heroBadge: liveCopy(config.heroBadge as string) || undefined,
        draft: !publish,
      }, publish);
      setHasUnsaved(false);
      if (publish) setShareOpen(true);
    } catch {
      // Parent `onSave` already surfaces the error.
    } finally {
      setSaving(false);
    }
  };

  const heroHeading = liveCopy(config.heroHeading as string);
  const heroDescription = liveCopy(config.heroDescription as string);
  const heroBadge = liveCopy(config.heroBadge as string);
  const featuredTitle = (config.featuredTitle as string) ?? FRIENDLY_TITLES.featured;
  const showSearch = (config.showSearch as boolean) ?? true;
  const pinChrome = (config.pinChrome as boolean) ?? false;
  const heroButtonLabel = (config.heroButtonLabel as string) ?? "Book Now";
  const bookingButtonLabel = (config.bookingButtonLabel as string) ?? "Book a time";
  const displayName = getBusinessDisplayName(tenant);
  const gaps = brandingGaps(tenant);

  React.useEffect(() => {
    if (selected !== "hero") return;
    setFocusKey((key) => key + 1);
  }, [
    selected,
    draft.brandName,
    draft.tagline,
    draft.description,
    draft.logoUrl,
    draft.coverBannerUrl,
    draft.brandColor,
    draft.backgroundColor,
    servicesLoading,
  ]);

  const businessInfo = React.useMemo(() => ({
    id: tenant?.id ?? "preview",
    name: tenant?.name ?? "Your business",
    brandName: tenant?.brandName ?? null,
    slug: link?.slug ?? "preview",
    logoUrl: tenant?.logoUrl ?? null,
    coverBannerUrl: tenant?.coverBannerUrl ?? null,
    address: tenant?.address ?? null,
    phone: tenant?.phone ?? null,
    email: tenant?.email ?? null,
    brandColor: tenant?.brandColor ?? null,
    secondaryColor: tenant?.secondaryColor ?? null,
    backgroundColor: tenant?.backgroundColor ?? null,
    textColor: tenant?.textColor ?? null,
    fontFamily: tenant?.fontFamily ?? null,
    currency: tenant?.currency ?? "INR",
    timezone: tenant?.timezone ?? "Asia/Kolkata",
    tagline: tenant?.tagline ?? null,
    about: tenant?.description ?? null,
    googleReviewUrl:
      tenant?.googleReviewUrl
      || (tenant?.googlePlaceId
        ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(tenant.googlePlaceId)}`
        : tenant?.socialLinks?.googleBusiness)
      || null,
    businessHours: tenant?.businessHours as any,
    pageConfig: null,
    seo: null,
    services: [],
    staff: [],
    bookingLink: { id: link?.id ?? "preview", slug: link?.slug ?? "preview", name: link?.name ?? null } as any,
  } as any), [tenant, link]);

  const masterConfig: MasterConfig = React.useMemo(() => {
    const sectionTitles: Record<string, string> = {};
    for (const item of config.sections) if (item.title?.trim()) sectionTitles[item.id] = item.title;
    return {
      heroHeading,
      heroDescription,
      heroBadge,
      heroButtonLabel,
      bookingButtonLabel,
      showSearch,
      pinChrome,
      featuredTitle,
      sectionTitles,
      visibleSections: sections.map((s) => s.id),
      brandColor: tenant?.brandColor ?? undefined,
    };
  }, [config, heroHeading, heroDescription, heroBadge, heroButtonLabel, bookingButtonLabel, showSearch, pinChrome, featuredTitle, tenant?.brandColor, sections]);

  const slugUrl = link?.slug ? `${link.slug}.doloyal.com` : "your-business.doloyal.com";
  const displayUrl = link?.slug ? customerPageUrl(link.slug) : "/book/preview";

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col bg-[#f4f7f8] text-[#17322c] lg:-m-8">
      <header className="flex shrink-0 items-center justify-between border-b border-[#dbe6e2] bg-white px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => history.back()} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-lg text-[#5c756e] hover:bg-[#f1f5f3]"><ArrowLeft className="h-4 w-4" /></button>
          <span className="hidden h-5 w-px bg-[#dbe6e2] sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{displayName}</p>
            <p className="hidden items-center gap-1.5 text-[11px] text-[#7b8f88] sm:flex"><span className="truncate">{link?.status === "PUBLISHED" ? "Published" : hasUnsaved ? "Unsaved changes" : "Draft"} · {slugUrl}</span><button onClick={() => navigator.clipboard.writeText(displayUrl).then(() => toast.success("Link copied"))} className="rounded p-0.5 hover:bg-black/5"><Copy className="h-3 w-3" /></button></p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="hidden rounded-lg bg-[#f1f5f3] p-1 md:flex">
            {(["desktop", "tablet", "mobile"] as const).map((item) => {
              const Icon = DEVICE_ICONS[item];
              const active = screen === item;
              return (
                <button
                  key={item}
                  onClick={() => setScreen(item)}
                  aria-pressed={active}
                  title={`${PREVIEW_VIEWPORTS[item].label} preview — ${PREVIEW_VIEWPORTS[item].width} × ${PREVIEW_VIEWPORTS[item].height}`}
                  className={cn("grid h-7 w-8 place-items-center rounded-md transition", active ? "bg-white text-[#176b5c] shadow-sm" : "text-[#5c756e] hover:text-[#17322c]")}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.open(displayUrl, "_blank")} className="hidden sm:flex"><Eye className="h-4 w-4" /> Preview</Button>
          <Button variant="secondary" size="sm" loading={saving} onClick={() => persist(false)} className="hidden sm:flex"><Save className="h-4 w-4" /> Save</Button>
          <Button size="sm" loading={saving} onClick={() => persist(true)} className="bg-[#176b5c] hover:bg-[#115548]">Publish</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[#dbe6e2] bg-white p-4 lg:block">
          <Button onClick={() => setLibrary(true)} className="w-full bg-[#176b5c] hover:bg-[#115548]">Add section</Button>
          <p className="mt-6 px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[#788d86]">Your page</p>
          <div className="mt-2 space-y-1">
            {allSections.filter(s => s.enabled !== false).map((item) => {
              const Icon = SECTIONS_META[item.id]?.icon ?? LayoutTemplate;
              const hidden = !!item.hidden;
              return (
                <button
                  key={item.id}
                  draggable
                  onDragStart={() => setDragged(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => reorder(item.id)}
                  onClick={() => selectSection(item.id)}
                  className={cn("flex w-full items-center gap-2 rounded-xl px-2 py-2.5 text-left text-sm", selected === item.id ? "bg-[#e2f1ec] text-[#176b5c]" : "hover:bg-[#f4f7f6]", hidden && "opacity-50")}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-[#9badA7] cursor-grab" />
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{SECTIONS_META[item.id]?.label ?? item.id}</span>
                  {hidden && <span className="text-[10px] font-medium text-black/40">Hidden</span>}
                </button>
              );
            })}
          </div>
          <button onClick={() => setLibrary(true)} className="mt-3 flex items-center gap-2 px-2 text-sm text-[#52736a]">Add section</button>
          <div className="mt-6 border-t border-[#e8efec] pt-4 space-y-1">
            <button onClick={() => setBrandOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f4f7f6]"><Palette className="h-4 w-4 text-[#52716a]" /> Brand settings</button>
            <div className="px-2 py-2 text-xs leading-5 text-black/45"><p className="font-medium text-black/60">Your Client Page</p><p className="truncate">{slugUrl}</p><div className="mt-2 flex gap-1.5"><button onClick={() => navigator.clipboard.writeText(displayUrl).then(() => toast.success("Link copied"))} className="rounded-lg border border-black/10 px-2 py-1 text-xs font-medium hover:bg-black/[0.04]">Copy link</button><button onClick={() => window.open(displayUrl, "_blank")} className="rounded-lg bg-black px-2 py-1 text-xs font-medium text-white">Open page</button></div></div>
          </div>
        </aside>

        {/* CENTER: the real client page, rendered into a scaled device viewport */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#eef3f1]">
          {gaps.length > 0 && (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
              Add {gaps.map((g) => g.label).join(", ")} in Brand settings so the customer page uses your identity.
              <button type="button" onClick={() => setBrandOpen(true)} className="ml-2 font-semibold underline underline-offset-2">Open Brand settings</button>
            </div>
          )}
          <PreviewViewport device={screen} url={slugUrl}>
            <ClientPageRenderer
              business={businessInfo}
              services={servicesLoading ? [] : services}
              currency={businessInfo.currency}
              config={masterConfig}
              mode="preview"
              selectedId={selected}
              onSelect={selectSection}
              focusKey={focusKey}
              onBook={() => toast.message("Preview: customers will start the booking flow here.")}
              onNavigate={(id) => {
                const sid = PORTAL_TO_SECTION[id];
                if (sid) selectSection(sid);
              }}
            />
          </PreviewViewport>
          {sections.length === 0 && (
            <div className="shrink-0 border-t border-[#dbe6e2] bg-white px-4 py-2.5 text-center text-xs text-black/55">
              Every section is hidden — <button onClick={() => setLibrary(true)} className="font-semibold text-[#176b5c] underline-offset-2 hover:underline">add a section</button> to build your page.
            </div>
          )}
        </main>

        {/* RIGHT: Settings */}
        <aside className="hidden w-[320px] shrink-0 overflow-y-auto border-l border-[#dbe6e2] bg-white p-5 xl:block">
          <p className="text-xs text-[#72857e]">Editing section</p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold">{React.createElement(SECTIONS_META[selected]?.icon ?? LayoutTemplate, { className: "h-5 w-5 text-black/60" })} {SECTIONS_META[selected]?.label ?? selected}</h2>

          <div className="mt-6 space-y-5">
            {selected === "hero" && (
              <>
                <p className="text-xs leading-5 text-black/50">These update the live preview as you type. Brand fields also save to Brand Identity.</p>
                <ImageUploadField
                  label="Logo"
                  hint="Shown in the header. PNG or JPG, square works best."
                  value={draft.logoUrl}
                  onChange={(url) => patchBrand({ logoUrl: url })}
                />
                <ImageUploadField
                  label="Cover photo"
                  hint="Hero background. Leave empty for a white page."
                  value={draft.coverBannerUrl}
                  onChange={(url) => patchBrand({ coverBannerUrl: url })}
                  aspect="banner"
                />
                <Field label="Brand name" value={draft.brandName} onChange={(v) => patchBrand({ brandName: v })} placeholder="Your brand name" />
                <Field label="Tagline" value={draft.tagline} onChange={(v) => patchBrand({ tagline: v })} placeholder="Short line under your name" />
                <Field label="Description" value={draft.description} onChange={(v) => patchBrand({ description: v })} multiline placeholder="Tell customers who you are" />
                <Field label="Badge override (optional)" value={heroBadge} onChange={(v) => updateConfig({ heroBadge: v })} placeholder={tenant?.tagline || "Shown above the heading"} />
                <Field label="Heading override (optional)" value={heroHeading} onChange={(v) => updateConfig({ heroHeading: v })} placeholder={displayName} />
                <Field label="Description override (optional)" value={heroDescription} onChange={(v) => updateConfig({ heroDescription: v })} multiline placeholder="Leave empty to use your brand description" />
                <Field label="Button label" value={heroButtonLabel} onChange={(v) => updateConfig({ heroButtonLabel: v })} />
                <label className="flex items-center justify-between rounded-xl border border-black/10 bg-[#f8fafb] px-3 py-3 text-sm font-medium">Show search <Switch checked={showSearch} onCheckedChange={(c) => updateConfig({ showSearch: c })} /></label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#f8fafb] px-3 py-3 text-sm font-medium">
                  <span className="min-w-0">
                    Keep header and menu fixed
                    <span className="mt-0.5 block text-xs font-normal text-black/45">Stays on screen while customers scroll</span>
                  </span>
                  <Switch checked={pinChrome} onCheckedChange={(c) => updateConfig({ pinChrome: c })} />
                </label>
              </>
            )}
            {selected === "services" && (
              <>
                <Field label="Section heading" value={current.title ?? FRIENDLY_TITLES.services} onChange={(v) => updateSection("services", { title: v })} />
                <Field label="Treatments heading" value={featuredTitle} onChange={(v) => updateConfig({ featuredTitle: v })} />
                <p className="text-xs leading-5 text-black/50">Categories and treatment cards come from your Services. Add or edit them under Services to change what’s listed here.</p>
                {services.length === 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No services yet — add your first service to see cards here.</p>}
              </>
            )}
            {selected === "featured" && (
              <>
                <Field label="Section heading" value={featuredTitle} onChange={(v) => updateConfig({ featuredTitle: v })} />
                <p className="text-xs leading-5 text-black/50">This grid is your live service menu. Prices and duration update from Services automatically.</p>
              </>
            )}
            {selected === "booking" && (
              <>
                <Field label="Section heading" value={current.title ?? FRIENDLY_TITLES.booking} onChange={(v) => updateSection("booking", { title: v })} />
                <Field label="Button label" value={bookingButtonLabel} onChange={(v) => updateConfig({ bookingButtonLabel: v })} />
                <p className="text-xs leading-5 text-black/50">Guests see their upcoming visits here. The button starts the booking flow.</p>
              </>
            )}
            {selected !== "hero" && selected !== "featured" && selected !== "services" && selected !== "booking" && (
              <>
                <Field label="Section heading" value={current.title ?? FRIENDLY_TITLES[selected] ?? SECTIONS_META[selected]?.label ?? selected} onChange={(v) => updateSection(selected, { title: v })} />
                <p className="text-xs leading-5 text-black/50">
                  {selected === "about" && "Story text comes from your business profile description."}
                  {selected === "contact" && "Phone, email, and address come from your business profile."}
                  {selected === "loyalty" && "Points come from each signed-in guest’s wallet."}
                  {selected === "rewards" && "Rewards come from your rewards catalog."}
                  {selected === "membership" && "Membership comes from the guest’s current plan."}
                  {selected === "referrals" && "Each guest gets their own invite code to share."}
                  {selected === "reviews" && "Guests can leave a note or a video. You approve them in Reviews."}
                  {selected === "footer" && "Uses your business name and contact details."}
                  {!["about", "contact", "loyalty", "rewards", "membership", "referrals", "reviews", "footer"].includes(selected) && "This section stays connected to your Doloyal business data."}
                </p>
              </>
            )}

            <div className="border-t border-[#e7efec] pt-5">
              <label className="flex items-center justify-between text-sm font-medium">Show section <Switch checked={!current.hidden} onCheckedChange={(checked) => updateSection(selected, { hidden: !checked })} /></label>
              <p className="mt-1 text-xs text-black/40">Turn this off to hide the section from customers. It stays in your list so you can bring it back.</p>
            </div>

            <div className="border-t border-[#e7efec] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#788d86]">Branding</p>
              <ColorInput label="Primary color" value={draft.brandColor || PAGE_SURFACE_DEFAULTS.accent} setValue={(v) => patchBrand({ brandColor: v })} />
              <div className="mt-3">
                <ColorInput label="Page background" value={draft.backgroundColor || PAGE_SURFACE_DEFAULTS.background} setValue={(v) => patchBrand({ backgroundColor: v })} />
              </div>
              <button onClick={() => setBrandOpen(true)} className="mt-3 flex w-full items-center justify-between rounded-xl border border-black/10 px-3 py-3 text-sm hover:bg-black/[0.03]"><span className="flex items-center gap-2"><Palette className="h-4 w-4" /> More brand settings</span><span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: draft.brandColor || PAGE_SURFACE_DEFAULTS.background }} /></button>
              <p className="mt-2 text-xs text-black/45">Colors and text apply to the preview instantly.</p>
            </div>

            <div className="flex gap-2 border-t border-[#e7efec] pt-5">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => setLibrary(true)}>
                <Plus className="h-4 w-4" /> Add section
              </Button>
              <Button variant="secondary" size="sm" onClick={() => { updateSection(selected, { hidden: true }); toast.message("Section hidden from the customer page."); }}><Trash2 className="h-4 w-4" /> Hide</Button>
            </div>
            <p className="text-xs leading-5 text-black/40">Edits update the live preview instantly. Save as draft or Publish to make them live at <span className="font-medium">{slugUrl}</span>.</p>
            <p className={cn("text-xs font-medium", hasUnsaved ? "text-amber-600" : "text-black/40")}>{hasUnsaved ? "Unsaved changes" : link?.status === "PUBLISHED" ? "Published" : "Draft"}</p>
          </div>
        </aside>
      </div>

      <Dialog open={library} onOpenChange={setLibrary}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Add a section</DialogTitle><DialogDescription>Add a real section to your live customer page. Content stays connected to Doloyal.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {LIBRARY.map(([id, label, Icon, desc]) => {
              const added = allSections.some((s) => s.id === id && s.enabled);
              return (
                <button key={id} onClick={() => add(id)} className="flex items-start gap-3 rounded-xl border border-[#dbe6e2] p-4 text-left hover:border-[#82b9a9] hover:bg-[#f7fbf9]">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e5f2ed] text-[#176b5c]"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-[#6f827c]">{desc}</span></span>
                  {added ? <Check className="h-4 w-4 text-[#176b5c]" /> : <Plus className="h-4 w-4 text-[#58756c]" />}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <BrandSettings open={brandOpen} setOpen={setBrandOpen} tenant={tenant} onPatch={patchBrand} onFlush={flush} />
      <PublishShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        businessName={displayName}
        logoUrl={tenant?.logoUrl}
        slug={link?.slug ?? ""}
      />
    </div>
  );
}

function Field({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 min-h-20 w-full rounded-xl border border-[#dbe6e2] bg-white p-3 text-sm outline-none focus:border-[#176b5c]" />
      ) : (
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5" />
      )}
    </div>
  );
}

function BrandSettings({
  open,
  setOpen,
  tenant,
  onPatch,
  onFlush,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  tenant: Tenant | null;
  onPatch: (patch: Record<string, unknown>) => void;
  onFlush: () => void | Promise<void>;
}) {
  const primary = tenant?.brandColor || PAGE_SURFACE_DEFAULTS.accent;
  const secondary = tenant?.secondaryColor || PAGE_SURFACE_DEFAULTS.background;
  const background = tenant?.backgroundColor || PAGE_SURFACE_DEFAULTS.background;
  const reset = () => {
    if (!confirm("Reset page colors to white? Your logo, name, and description stay as they are.")) return;
    onPatch({
      brandColor: PAGE_SURFACE_DEFAULTS.accent,
      secondaryColor: PAGE_SURFACE_DEFAULTS.background,
      backgroundColor: PAGE_SURFACE_DEFAULTS.background,
      textColor: PAGE_SURFACE_DEFAULTS.text,
    });
    toast.success("Reset to default white branding.");
  };
  const gaps = brandingGaps(tenant);
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onFlush(); setOpen(next); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Brand settings</DialogTitle>
          <DialogDescription>Changes show on the preview as you edit. They save to Brand Identity automatically.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          {gaps.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950">
              Add {gaps.map((g) => g.label).join(", ")} so customers see your brand, not placeholders.
            </div>
          )}
          <ImageUploadField label="Logo" value={tenant?.logoUrl ?? null} onChange={(url) => onPatch({ logoUrl: url })} />
          <Field label="Brand name" value={tenant?.brandName ?? ""} onChange={(v) => onPatch({ brandName: v })} placeholder={tenant?.name || "Your brand name"} />
          <Field label="Tagline" value={tenant?.tagline ?? ""} onChange={(v) => onPatch({ tagline: v })} />
          <Field label="Description" value={tenant?.description ?? ""} onChange={(v) => onPatch({ description: v })} multiline />
          <ColorInput label="Primary brand color (buttons and highlights)" value={primary} setValue={(v) => onPatch({ brandColor: v })} />
          <ColorInput label="Page background (defaults to white)" value={background} setValue={(v) => onPatch({ backgroundColor: v })} />
          <ColorInput label="Secondary color" value={secondary} setValue={(v) => onPatch({ secondaryColor: v })} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset to white</Button>
          <Button onClick={() => { onFlush(); setOpen(false); toast.success("Brand updates are live on the preview."); }} className="bg-[#176b5c] hover:bg-[#115548]">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function ColorInput({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5 flex gap-2">
        <input aria-label={label} type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#111111"} onChange={(event) => setValue(event.target.value)} className="h-10 w-11 rounded border border-[#dbe6e2] bg-white p-1" />
        <Input value={value} onChange={(event) => setValue(event.target.value)} />
      </div>
    </div>
  );
}
