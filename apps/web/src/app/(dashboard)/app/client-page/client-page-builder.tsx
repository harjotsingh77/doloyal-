"use client";

import * as React from "react";
import { ArrowLeft, CalendarDays, Copy, Eye, Gift, GripVertical, Image as ImageIcon, LayoutTemplate, MapPin, Monitor, Palette, Plus, Save, Smartphone, Sparkles, Trash2, Users, Check, RotateCcw } from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, Input, Label, Switch, cn } from "@doloyal/ui";
import type { BookingLink, Tenant, PublicService } from "@doloyal/shared";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import { type MasterConfig } from "./master-template";
import { ClientPageRenderer } from "./client-page-renderer";
import { PreviewViewport, PREVIEW_VIEWPORTS, type PreviewDevice } from "./preview-viewport";

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
  ["about", "About business", ImageIcon, "Your story and highlights."],
  ["contact", "Contact", MapPin, "Make it easy to reach you."],
  ["footer", "Footer", LayoutTemplate, "Links and business details."],
  ["gallery", "Gallery", ImageIcon, "Photos of your work or space."],
  ["offers", "Featured offers", Gift, "Campaigns and special offers."],
  ["faq", "FAQ", LayoutTemplate, "Answer common questions."],
];

const SECTIONS_META: Record<string, { label: string; icon: React.ElementType }> = Object.fromEntries(LIBRARY.map(([id, label, icon]) => [id, { label, icon }]));
const DEFAULT_SECTIONS: SectionId[] = ["hero", "services", "featured", "booking", "rewards", "membership", "referrals"];

const DEVICE_ICONS: Record<PreviewDevice, React.ElementType> = { desktop: Monitor, tablet: LayoutTemplate, mobile: Smartphone };

export function ClientPageBuilder({ tenant, link, initialConfig, onSave }: { tenant: Tenant | null; link: BookingLink | null; initialConfig: Config; onSave: (config: Config, publish?: boolean) => Promise<void> }) {
  const [config, setConfig] = React.useState<Config>(initialConfig);
  const [selected, setSelected] = React.useState<string>(initialConfig.sections[0]?.id ?? "hero");
  const [screen, setScreen] = React.useState<PreviewDevice>("desktop");
  const [library, setLibrary] = React.useState(false);
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [dragged, setDragged] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [hasUnsaved, setHasUnsaved] = React.useState(false);
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

  const mutate = (update: (items: Section[]) => Section[]) => setConfig((old) => ({ ...old, sections: update(old.sections) }));
  const updateSection = (id: string, patch: Partial<Section>) => mutate((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const updateConfig = (patch: Partial<Config>) => setConfig((old) => ({ ...old, ...patch }));

  const add = (id: SectionId) => {
    const exists = config.sections.find((item) => item.id === id);
    if (exists) mutate((items) => items.map((item) => item.id === id ? { ...item, enabled: true, hidden: false } : item));
    else mutate((items) => [...items, { id, enabled: true }]);
    setSelected(id);
    setLibrary(false);
  };
  const reorder = (target: string) => {
    if (!dragged || dragged === target) return;
    mutate((items) => { const a = [...items]; const from = a.findIndex((i) => i.id === dragged); const to = a.findIndex((i) => i.id === target); if (from === -1 || to === -1) return a; a.splice(to, 0, a.splice(from, 1)[0]); return a; });
    setDragged(null);
  };

  const persist = async (publish = false) => {
    setSaving(true);
    try { await onSave({ ...config, draft: !publish }, publish); setHasUnsaved(false); }
    catch (e: any) { toast.error(e?.message ?? "We couldn't save your changes."); }
    finally { setSaving(false); }
  };

  const heroHeading = (config.heroHeading as string) ?? "Find Your Glow Up.";
  const heroDescription = (config.heroDescription as string) ?? "Browse our curated services and treatments, designed around the way you want to feel.";
  const heroBadge = (config.heroBadge as string) ?? "PREMIUM TREATMENTS";
  const featuredTitle = (config.featuredTitle as string) ?? "Featured treatments";
  const showSearch = (config.showSearch as boolean) ?? true;

  // Map tenant → PublicBusinessInfo for template
  const businessInfo = React.useMemo(() => ({
    id: tenant?.id ?? "preview",
    name: tenant?.name ?? "Your business",
    slug: link?.slug ?? "preview",
    logoUrl: tenant?.logoUrl ?? null,
    coverBannerUrl: tenant?.coverBannerUrl ?? null,
    address: tenant?.address ?? null,
    phone: tenant?.phone ?? null,
    email: tenant?.email ?? null,
    brandColor: tenant?.brandColor ?? "#2563EB",
    currency: tenant?.currency ?? "INR",
    timezone: tenant?.timezone ?? "Asia/Kolkata",
    tagline: tenant?.tagline ?? tenant?.description ?? "Discover our services, earn rewards, and stay connected.",
    about: tenant?.description ?? null,
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
      heroButtonLabel: (config.heroButtonLabel as string) ?? "Book Now",
      showSearch,
      featuredTitle,
      sectionTitles,
      visibleSections: sections.map((s) => s.id),
      brandColor: tenant?.brandColor ?? undefined,
    };
    // `sections` is derived from config.sections, so config is the real dependency.
  }, [config, heroHeading, heroDescription, heroBadge, showSearch, featuredTitle, tenant?.brandColor, sections]);

  const slugUrl = link?.slug ? `${link.slug}.doloyal.com` : "your-business.doloyal.com";
  const displayUrl = typeof window !== "undefined" ? `${window.location.origin}/book/${link?.slug ?? "preview"}` : `/book/${link?.slug ?? "preview"}`;

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col bg-[#f4f7f8] text-[#17322c] lg:-m-8">
      <header className="flex shrink-0 items-center justify-between border-b border-[#dbe6e2] bg-white px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <button onClick={() => history.back()} aria-label="Back" className="grid h-8 w-8 place-items-center rounded-lg text-[#5c756e] hover:bg-[#f1f5f3]"><ArrowLeft className="h-4 w-4" /></button>
          <span className="hidden h-5 w-px bg-[#dbe6e2] sm:block" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{tenant?.name ?? "Client page"}</p>
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
          <Button variant="ghost" size="sm" onClick={() => window.open(`/book/${link?.slug}`, "_blank")} className="hidden sm:flex"><Eye className="h-4 w-4" /> Preview</Button>
          <Button variant="secondary" size="sm" loading={saving} onClick={() => persist(false)} className="hidden sm:flex"><Save className="h-4 w-4" /> Save</Button>
          <Button size="sm" loading={saving} onClick={() => persist(true)} className="bg-[#176b5c] hover:bg-[#115548]">Publish</Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* LEFT */}
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r border-[#dbe6e2] bg-white p-4 lg:block">
          <Button onClick={() => setLibrary(true)} className="w-full bg-[#176b5c] hover:bg-[#115548]"><Plus className="h-4 w-4" /> Add section</Button>
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
                  onClick={() => setSelected(item.id)}
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
          <button onClick={() => setLibrary(true)} className="mt-3 flex items-center gap-2 px-2 text-sm text-[#52736a]"><Plus className="h-4 w-4" /> Add section</button>
          <div className="mt-6 border-t border-[#e8efec] pt-4 space-y-1">
            <button onClick={() => setBrandOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f4f7f6]"><Palette className="h-4 w-4 text-[#52716a]" /> Brand settings</button>
            <div className="px-2 py-2 text-xs leading-5 text-black/45"><p className="font-medium text-black/60">Your Client Page</p><p className="truncate">{slugUrl}</p><div className="mt-2 flex gap-1.5"><button onClick={() => navigator.clipboard.writeText(displayUrl).then(() => toast.success("Link copied"))} className="rounded-lg border border-black/10 px-2 py-1 text-xs font-medium hover:bg-black/[0.04]">Copy link</button><button onClick={() => window.open(`/book/${link?.slug}`, "_blank")} className="rounded-lg bg-black px-2 py-1 text-xs font-medium text-white">Open page</button></div></div>
          </div>
        </aside>

        {/* CENTER: the real client page, rendered into a scaled device viewport */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#eef3f1]">
          <PreviewViewport device={screen} url={slugUrl}>
            <ClientPageRenderer
              business={businessInfo}
              services={servicesLoading ? [] : services}
              currency={businessInfo.currency}
              config={masterConfig}
              mode="preview"
              selectedId={selected}
              onSelect={setSelected}
              onBook={() => toast.message("Preview: customers will start the booking flow here.")}
              onNavigate={(id) => {
                const map: Record<string, string> = { "portal-hero": "hero", "portal-services": "featured", "portal-membership": "membership", "portal-rewards": "rewards", "portal-referrals": "referrals", "portal-booking": "booking", "portal-loyalty": "loyalty" };
                const sid = map[id];
                if (sid) setSelected(sid);
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
                <Field label="Badge" value={heroBadge} onChange={(v) => updateConfig({ heroBadge: v })} placeholder="PREMIUM TREATMENTS" />
                <Field label="Heading" value={heroHeading} onChange={(v) => updateConfig({ heroHeading: v })} />
                <Field label="Description" value={heroDescription} onChange={(v) => updateConfig({ heroDescription: v })} multiline />
                <Field label="Button label" value={(config.heroButtonLabel as string) ?? "Book Now"} onChange={(v) => updateConfig({ heroButtonLabel: v })} />
                <label className="flex items-center justify-between rounded-xl border border-black/10 bg-[#f8fafb] px-3 py-3 text-sm font-medium">Show search <Switch checked={showSearch} onCheckedChange={(c) => updateConfig({ showSearch: c })} /></label>
              </>
            )}
            {(selected === "featured" || selected === "services") && (
              <>
                <Field label="Section title" value={featuredTitle} onChange={(v) => updateConfig({ featuredTitle: v })} />
                <p className="text-xs leading-5 text-black/50">Services and categories are pulled live from your Doloyal Services. Manage them in Services to update this page automatically.</p>
                {services.length === 0 && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No services yet — add your first service to see cards here.</p>}
              </>
            )}
            {selected !== "hero" && selected !== "featured" && selected !== "services" && (
              <>
                <Field label="Section heading" value={current.title ?? SECTIONS_META[selected]?.label ?? selected} onChange={(v) => updateSection(selected, { title: v })} />
                <p className="text-xs leading-5 text-black/50">This section stays connected to your Doloyal business data and will update automatically.</p>
              </>
            )}

            <div className="border-t border-[#e7efec] pt-5">
              <label className="flex items-center justify-between text-sm font-medium">Show section <Switch checked={!current.hidden} onCheckedChange={(checked) => updateSection(selected, { hidden: !checked })} /></label>
              <p className="mt-1 text-xs text-black/40">Hidden sections are not shown to customers but stay in your page configuration.</p>
            </div>

            <div className="border-t border-[#e7efec] pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#788d86]">Branding</p>
              <button onClick={() => setBrandOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-black/10 px-3 py-3 text-sm hover:bg-black/[0.03]"><span className="flex items-center gap-2"><Palette className="h-4 w-4" /> Brand settings</span><span className="h-6 w-6 rounded-full border border-black/10" style={{ backgroundColor: tenant?.brandColor || "#2563EB" }} /></button>
            </div>

            <div className="flex gap-2 border-t border-[#e7efec] pt-5">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { const dup = { ...current, id: `${current.id}-${Date.now()}` as SectionId }; mutate((items) => { const idx = items.findIndex((i) => i.id === selected); const a = [...items]; a.splice(idx + 1, 0, dup as Section); return a; }); }}>
                <Copy className="h-4 w-4" /> Duplicate
              </Button>
              <Button variant="secondary" size="sm" onClick={() => updateSection(selected, { hidden: true })}><Trash2 className="h-4 w-4" /> Hide</Button>
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

      <BrandSettings open={brandOpen} setOpen={setBrandOpen} tenant={tenant} onSaved={() => window.location.reload()} />
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

function BrandSettings({ open, setOpen, tenant, onSaved }: { open: boolean; setOpen: (open: boolean) => void; tenant: Tenant | null; onSaved: () => void }) {
  const [primary, setPrimary] = React.useState(tenant?.brandColor || "#2563EB");
  const [secondary, setSecondary] = React.useState(tenant?.secondaryColor || "#eef3f1");
  React.useEffect(() => { setPrimary(tenant?.brandColor || "#2563EB"); setSecondary(tenant?.secondaryColor || "#eef3f1"); }, [tenant, open]);
  const persist = async () => {
    try { await api.updateTenantSettings({ brandColor: primary, secondaryColor: secondary }); toast.success("Brand settings saved."); setOpen(false); onSaved(); }
    catch (error: any) { toast.error(error?.message ?? "We couldn't save your brand settings."); }
  };
  const reset = async () => {
    if (!confirm("Reset your Client Page to the default Doloyal design? This restores colors and styling but keeps your services and business data.")) return;
    try { await api.updateTenantSettings({ brandColor: "#2563EB", secondaryColor: "#eef2f6", backgroundColor: null as any, textColor: null as any, accentColor: null as any, fontFamily: null as any }); toast.success("Reset to default branding."); setOpen(false); onSaved(); }
    catch (e: any) { toast.error(e?.message ?? "Reset failed."); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Brand settings</DialogTitle><DialogDescription>Your customer page uses these colors. Applied everywhere: buttons, active navigation, highlights.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-3">
          <ColorInput label="Primary brand color (CTAs, active nav, highlights)" value={primary} setValue={setPrimary} />
          <ColorInput label="Secondary color" value={secondary} setValue={setSecondary} />
          <div className="rounded-xl bg-[#f8fafb] p-3 text-xs leading-5 text-black/60"><p className="font-semibold text-black/80">Applied to:</p> CTA buttons · active navigation · icons · badges · progress indicators · links</div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={reset}><RotateCcw className="h-4 w-4" /> Reset to default</Button>
          <Button onClick={persist} className="bg-[#176b5c] hover:bg-[#115548]">Save changes</Button>
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
        <input aria-label={label} type="color" value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-11 rounded border border-[#dbe6e2] bg-white p-1" />
        <Input value={value} onChange={(event) => setValue(event.target.value)} />
      </div>
    </div>
  );
}
