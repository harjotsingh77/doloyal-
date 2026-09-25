"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, BadgeCheck, BookOpen, CalendarDays, Check, ChevronDown,
  CircleHelp, Contact, Copy, Eye, Gift, GripVertical, Image as ImageIcon, LayoutTemplate,
  Loader2, MapPin, Megaphone, Monitor, MoreHorizontal, Palette, Plus, Redo2,
  RotateCcw, Save, Settings2, Smartphone, Sparkles, Trash2, Undo2, Users, X,
} from "lucide-react";
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Skeleton, cn } from "@doloyal/ui";
import type { BookingLink, Tenant } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-query";
import { useResource } from "@/lib/use-resource";
import { ClientPageBuilder } from "./client-page-builder";

type SectionId = "hero" | "intro" | "services" | "featured" | "booking" | "loyalty" | "rewards" | "membership" | "referrals" | "reviews" | "about" | "contact" | "footer" | "gallery" | "offers" | "faq" | "testimonials" | "hours" | "video" | "social" | "map" | "cta" | "checkout";
type ClientSection = { id: SectionId; enabled: boolean; title?: string; hidden?: boolean };
type ClientConfig = { sections: ClientSection[]; heroHeading?: string; heroDescription?: string; heroBadge?: string; showSearch?: boolean; featuredTitle?: string; clientPageCreated?: boolean; clientPageVersion?: number; websiteLayout?: number; checkoutCashEnabled?: boolean; checkout?: { cashEnabled?: boolean } };

const SECTIONS: Record<string, { label: string; description: string; icon: React.ElementType; category: string }> = {
  hero: { label: "Hero", description: "Full-width image, video, or slider.", icon: LayoutTemplate, category: "Business" },
  intro: { label: "Welcome", description: "Photo and a short introduction.", icon: Sparkles, category: "Business" },
  services: { label: "Services / menu", description: "Live catalog from your products.", icon: Sparkles, category: "Business" },
  featured: { label: "Highlights", description: "Featured products or services.", icon: Sparkles, category: "Business" },
  booking: { label: "Your visits", description: "Let customers discover availability and book.", icon: CalendarDays, category: "Customer" },
  loyalty: { label: "Loyalty", description: "Let customers view points and benefits.", icon: BadgeCheck, category: "Loyalty" },
  rewards: { label: "Rewards", description: "Show rewards customers can unlock.", icon: Gift, category: "Loyalty" },
  membership: { label: "Membership", description: "Present member perks and plans.", icon: Users, category: "Loyalty" },
  referrals: { label: "Referrals", description: "Help customers share your business.", icon: Contact, category: "Engagement" },
  reviews: { label: "Reviews", description: "Let customers leave text or video reviews.", icon: BadgeCheck, category: "Engagement" },
  about: { label: "Our story", description: "Share your story and what makes you different.", icon: BookOpen, category: "Business" },
  contact: { label: "Contact", description: "Make it easy to call, message, or find you.", icon: MapPin, category: "Information" },
  footer: { label: "Footer", description: "Add useful links and your business details.", icon: MoreHorizontal, category: "Information" },
  gallery: { label: "Gallery", description: "Show your work, space, or products.", icon: ImageIcon, category: "Content" },
  offers: { label: "Offers", description: "Highlight timely campaigns and special offers.", icon: Megaphone, category: "Engagement" },
  faq: { label: "FAQ", description: "Answer the questions customers ask most.", icon: CircleHelp, category: "Content" },
  testimonials: { label: "Testimonials", description: "Build trust with customer feedback.", icon: BadgeCheck, category: "Content" },
  hours: { label: "Opening hours", description: "Show when your business is open.", icon: CalendarDays, category: "Information" },
  video: { label: "Video", description: "A featured video of the space or experience.", icon: ImageIcon, category: "Content" },
  social: { label: "Social", description: "Follow links and social proof.", icon: Contact, category: "Engagement" },
  map: { label: "Map", description: "Directions and an embedded map.", icon: MapPin, category: "Information" },
  cta: { label: "Final CTA", description: "Closing banner before the footer.", icon: Sparkles, category: "Business" },
  checkout: { label: "Checkout", description: "Payment options for Buy now and booking.", icon: Sparkles, category: "Business" },
};
const RECOMMENDED: SectionId[] = ["hero", "intro", "services", "featured", "about", "offers", "gallery", "testimonials", "faq", "contact", "map", "cta", "footer"];
const DEFAULT_CONFIG: ClientConfig = { sections: RECOMMENDED.map((id) => ({ id, enabled: true })) };

const APP_SECTIONS: SectionId[] = ["booking", "loyalty", "rewards", "membership", "referrals"];

function restoreStrippedSections(sections: ClientSection[], layout?: number): ClientSection[] {
  if (layout !== 3) return sections;
  const ids = new Set(sections.map((section) => section.id));
  const extras = APP_SECTIONS.filter((id) => !ids.has(id)).map((id) => ({ id, enabled: true }));
  if (!extras.length) return sections;
  const at = Math.max(0, sections.findIndex((section) => section.id === "services")) + 1;
  return [...sections.slice(0, at || 1), ...extras, ...sections.slice(at || 1)];
}

function configFor(link?: BookingLink | null): ClientConfig {
  const saved = link?.pageConfig as (ClientConfig | null | undefined);
  if (!saved?.clientPageCreated) return { ...DEFAULT_CONFIG, sections: DEFAULT_CONFIG.sections.map((s) => ({ ...s })) };
  const existing = Array.isArray(saved.sections) ? saved.sections.filter((s): s is ClientSection => !!SECTIONS[s?.id as SectionId]) : [];
  const sections = restoreStrippedSections(existing.length ? existing : DEFAULT_CONFIG.sections, saved.websiteLayout);
  return { ...DEFAULT_CONFIG, ...saved, websiteLayout: undefined, sections };
}

export default function ClientPage() {
  const router = useRouter();
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const linksQuery = useResource<BookingLink[]>({
    queryKey: ["client-page-booking-links"],
    queryFn: () => api.listBookingLinks(),
    scopes: ["appointments", "dashboard"],
  });
  const preferred = React.useMemo(() => {
    const links = linksQuery.data ?? [];
    return links.find((item) => item.type === "COMPANY") ?? links[0] ?? null;
  }, [linksQuery.data]);
  const [link, setLink] = React.useState<BookingLink | null>(null);
  const [config, setConfig] = React.useState<ClientConfig>(DEFAULT_CONFIG);
  const [stage, setStage] = React.useState<"welcome" | "collecting" | "sections" | "building" | "ready" | "builder">("welcome");
  const [selected, setSelected] = React.useState<SectionId>("hero");
  const [view, setView] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [brandOpen, setBrandOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [dragged, setDragged] = React.useState<SectionId | null>(null);
  const [history, setHistory] = React.useState<ClientConfig[]>([]);
  const [future, setFuture] = React.useState<ClientConfig[]>([]);
  const hydratedRef = React.useRef(false);

  React.useEffect(() => {
    if (!preferred || hydratedRef.current) return;
    hydratedRef.current = true;
    setLink(preferred);
    const next = configFor(preferred);
    setConfig(next);
    setStage(next.clientPageCreated ? "builder" : "welcome");
  }, [preferred]);

  React.useEffect(() => {
    if (linksQuery.error) toast.error("We couldn't load your business information.");
  }, [linksQuery.error]);

  const loading = (linksQuery.isLoading && !linksQuery.data) || (tenantLoading && !tenant);

  const load = React.useCallback(async () => {
    hydratedRef.current = false;
    await linksQuery.refetch();
  }, [linksQuery]);

  const change = (next: ClientConfig) => { setHistory((items) => [...items.slice(-19), config]); setFuture([]); setConfig(next); };
  const save = async (next = config, publish = false) => {
    if (!link) throw new Error("Your customer page isn’t ready yet. Refresh and try again.");
    setSaving(true);
    try {
      let updated = await api.updateBookingPage(link.id, {
        pageConfig: { ...next, clientPageCreated: true, draft: !publish },
        ...(publish ? { status: "PUBLISHED", isActive: true, isPaused: false } : {}),
      });
      if (publish && updated.status !== "PUBLISHED") {
        updated = await api.publishBookingLink(link.id);
      }
      setLink(updated);
      setConfig(configFor(updated));
      toast.success(publish ? "Your customer page is published." : "Changes saved.");
      return updated;
    } catch (error: any) {
      toast.error(error?.message ?? "We couldn't save your changes.");
      throw error;
    } finally {
      setSaving(false);
    }
  };
  const start = async () => {
    setStage("collecting");
    if (!link) {
      try {
        const created = await api.createBookingLink({ type: "COMPANY", name: `${tenant?.name ?? "My business"} client page`, description: tenant?.description ?? undefined, status: "DRAFT" });
        setLink(created);
      } catch (error: any) { toast.error(error?.message ?? "We couldn't prepare your customer page."); setStage("welcome"); return; }
    }
    setStage("sections");
  };
  const create = async () => {
    if (!link) return;
    setStage("building");
    const next = { ...config, clientPageCreated: true, clientPageVersion: 1 };
    try { await save(next); setConfig(next); setStage("ready"); } catch { setStage("sections"); }
  };
  const active = config.sections.filter((s) => s.enabled && !s.hidden);
  const toggle = (id: SectionId) => change({ ...config, sections: config.sections.some((s) => s.id === id) ? config.sections.map((s) => s.id === id ? { ...s, enabled: !s.enabled } : s) : [...config.sections, { id, enabled: true }] });
  const reorder = (target: SectionId) => { if (!dragged || dragged === target) return; const items = [...config.sections]; const from = items.findIndex((s) => s.id === dragged); const to = items.findIndex((s) => s.id === target); items.splice(to, 0, items.splice(from, 1)[0]); change({ ...config, sections: items }); setDragged(null); };

  const currentTenant = tenant ?? null;

  // Only block the first paint when we have nothing to show yet. Background
  // tenant refetches must not replace a ready page with a blank spinner.
  if (loading) return <LoadingScreen />;
  if (stage === "welcome") return <Welcome business={currentTenant} onStart={start} onManual={() => setStage("sections")} />;
  if (stage === "collecting" || stage === "building") return <Preparation building={stage === "building"} />;
  if (stage === "sections") return <SectionSetup config={config} onToggle={toggle} onReorder={reorder} onDrag={setDragged} onAdd={() => setLibraryOpen(true)} onBack={() => setStage("welcome")} onCreate={create} />;
  if (stage === "ready") return <Ready business={currentTenant} link={link} onCustomize={() => setStage("builder")} onPreview={() => window.open(`/book/${link?.slug}`, "_blank")} />;
  if (stage === "builder") return (
    <ClientPageBuilder tenant={currentTenant} link={link} initialConfig={config} onSave={async (next, publish) => { await save(next as ClientConfig, publish); }} />
  );

  return <div className="-m-4 flex h-[calc(100vh-3.5rem)] min-h-[680px] flex-col bg-[#f4f7f8] text-[#18312e] sm:-m-6">
    <BuilderTop tenant={currentTenant} link={link} view={view} setView={setView} saving={saving} canUndo={history.length > 0} canRedo={future.length > 0} onUndo={() => { const previous = history.at(-1); if (!previous) return; setFuture((items) => [config, ...items]); setHistory((items) => items.slice(0, -1)); setConfig(previous); }} onRedo={() => { const next = future[0]; if (!next) return; setHistory((items) => [...items, config]); setFuture((items) => items.slice(1)); setConfig(next); }} onSave={() => save()} onPublish={() => save(config, true)} />
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-64 shrink-0 border-r border-[#dbe6e2] bg-white p-4 lg:block"><button onClick={() => setLibraryOpen(true)} className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(27,98,86,.16)] transition hover:bg-[#1d4ed8]">Add section</button><p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[.12em] text-[#70827d]">Your page</p><div className="space-y-1">{active.map((section) => { const ItemIcon = SECTIONS[section.id].icon; return <button key={section.id} onClick={() => setSelected(section.id)} draggable onDragStart={() => setDragged(section.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => reorder(section.id)} className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition", selected === section.id ? "bg-[#e4f2ee] text-[#155448]" : "hover:bg-[#f4f7f6]")}><GripVertical className="h-3.5 w-3.5 text-[#a1b1ac]" /><ItemIcon className="h-4 w-4" /><span className="flex-1">{SECTIONS[section.id].label}</span></button>; })}</div><button onClick={() => setLibraryOpen(true)} className="mt-3 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[#52716a] hover:bg-[#f4f7f6]">Add section</button><div className="mt-6 border-t border-[#e8efec] pt-4"><button onClick={() => setBrandOpen(true)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f4f7f6]"><Palette className="h-4 w-4 text-[#52716a]" /> Brand settings</button></div></aside>
      <main className="min-w-0 flex-1 overflow-auto p-5 md:p-8"><div className={cn("mx-auto overflow-hidden rounded-[20px] border border-[#dbe6e2] bg-white shadow-[0_18px_40px_rgba(28,61,54,.10)] transition-all", view === "desktop" ? "max-w-5xl" : view === "tablet" ? "max-w-2xl" : "max-w-[390px]")}><ClientPreview tenant={currentTenant} sections={active} selected={selected} onSelect={setSelected} /></div></main>
      <SettingsPanel section={selected} config={config} tenant={currentTenant} onChange={change} onDelete={() => change({ ...config, sections: config.sections.map((s) => s.id === selected ? { ...s, hidden: true } : s) })} onDuplicate={() => toast.message("This section uses live business data. Add another layout from the section library.")} />
    </div>
    <SectionLibrary open={libraryOpen} setOpen={setLibraryOpen} config={config} onAdd={(id) => { toggle(id); setSelected(id); setLibraryOpen(false); }} />
    <BrandSettings open={brandOpen} setOpen={setBrandOpen} tenant={currentTenant} onSaved={() => undefined} />
  </div>;
}

function Welcome({ business, onStart, onManual }: { business: Tenant | null; onStart: () => void; onManual: () => void }) { return <div className="-m-4 grid min-h-[calc(100vh-3.5rem)] place-items-center overflow-hidden bg-[#f4f7f8] p-6 sm:-m-6"><div className="relative max-w-xl text-center"><div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-[22px] bg-[#dcefe9] text-[#2563EB]"><Sparkles className="h-8 w-8" /></div><p className="mb-3 text-sm font-medium text-[#52716a]">Client Page {business?.name ? `for ${business.name}` : ""}</p><h1 className="text-balance text-4xl font-semibold tracking-[-.045em] text-[#18312e] sm:text-5xl">Let’s build your customer page</h1><p className="mx-auto mt-5 max-w-md text-pretty text-base leading-7 text-[#60746e]">We’ll use your existing business information to create a professional customer-facing page in just a few steps.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button onClick={onStart} className="h-11 bg-[#2563EB] px-6 hover:bg-[#1d4ed8]"><Sparkles className="h-4 w-4" /> Start building</Button><Button onClick={onManual} variant="ghost" className="h-11 px-5 text-[#52716a]">Build manually</Button></div><p className="mt-5 text-xs text-[#8a9a95]">You can change every section later.</p></div></div>; }
function Preparation({ building }: { building: boolean }) { const items = building ? ["Applying your logo and business name", "Connecting booking and customer tools", "Creating your selected sections", "Applying your brand colors"] : ["Business profile", "Brand identity", "Services and booking settings", "Loyalty and memberships", "Customer information"]; return <div className="-m-4 grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#f4f7f8] p-6 sm:-m-6"><div className="w-full max-w-md rounded-[24px] border border-[#dbe6e2] bg-white p-8 shadow-[0_18px_40px_rgba(28,61,54,.08)]"><Loader2 className="mb-6 h-7 w-7 animate-spin text-[#2563EB]" /><h1 className="text-2xl font-semibold tracking-[-.03em]">{building ? "Building your customer page…" : "Preparing your business information…"}</h1><p className="mt-2 text-sm leading-6 text-[#62756f]">{building ? "Your existing data stays connected and will update automatically." : "We’re finding the details you’ve already set up in Doloyal."}</p><div className="mt-7 space-y-4">{items.map((item, index) => <div key={item} className="flex items-center gap-3 text-sm"><span className={cn("grid h-5 w-5 place-items-center rounded-full", index < 3 ? "bg-[#dcefe9] text-[#2563EB]" : "bg-[#eef3f1] text-[#a0aca8]")}>{index < 3 ? <Check className="h-3.5 w-3.5" /> : <Loader2 className="h-3 w-3 animate-spin" />}</span>{item}</div>)}</div></div></div>; }

function SectionSetup({ config, onToggle, onReorder, onDrag, onAdd, onBack, onCreate }: { config: ClientConfig; onToggle: (id: SectionId) => void; onReorder: (id: SectionId) => void; onDrag: (id: SectionId) => void; onAdd: () => void; onBack: () => void; onCreate: () => void }) { return <div className="-m-4 min-h-[calc(100vh-3.5rem)] bg-[#f4f7f8] px-5 py-8 sm:-m-6 sm:px-8"><div className="mx-auto max-w-3xl"><button onClick={onBack} className="mb-8 flex items-center gap-2 text-sm text-[#5c756e] hover:text-[#18312e]"><ArrowLeft className="h-4 w-4" /> Back</button><p className="text-sm font-medium text-[#2563EB]">Step 2 of 2</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.04em]">What should your customers see?</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#60746e]">Choose the sections to include on your customer page. We’ll set them up using your existing business data.</p><div className="mt-8 rounded-2xl border border-[#dbe6e2] bg-white"><div className="border-b border-[#e6eeeb] px-5 py-4 text-sm text-[#62756f]">Drag sections to arrange the page in the order your customers will see them.</div><div className="divide-y divide-[#edf2f0]">{config.sections.map((section) => { const meta = SECTIONS[section.id]; if (!meta) return null; const Icon = meta.icon; return <div key={section.id} draggable onDragStart={() => onDrag(section.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onReorder(section.id)} className="flex items-center gap-3 px-4 py-4"><GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[#a8b6b1]" /><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf5f2] text-[#2563EB]"><Icon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{meta.label}</p><p className="mt-0.5 text-xs text-[#71837e]">{meta.description}</p></div><Switch checked={section.enabled} onCheckedChange={() => onToggle(section.id)} /></div>; })}</div><button onClick={onAdd} className="flex w-full items-center justify-center gap-2 border-t border-dashed border-[#c9dad4] px-4 py-4 text-sm font-semibold text-[#2563EB] hover:bg-[#f7fbf9]">Add section</button></div><div className="mt-6 flex justify-end"><Button onClick={onCreate} className="h-11 bg-[#2563EB] px-6 hover:bg-[#1d4ed8]">Create my page <ArrowRight className="h-4 w-4" /></Button></div></div></div>; }
function Ready({ business, link, onCustomize, onPreview }: { business: Tenant | null; link: BookingLink | null; onCustomize: () => void; onPreview: () => void }) { return <div className="-m-4 grid min-h-[calc(100vh-3.5rem)] place-items-center bg-[#f4f7f8] p-6 sm:-m-6"><div className="max-w-md text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#dcefe9] text-[#2563EB]"><Check className="h-8 w-8" /></div><h1 className="mt-6 text-3xl font-semibold tracking-[-.04em]">Your page is ready</h1><p className="mt-3 text-sm leading-6 text-[#62756f]">{business?.name ?? "Your business"} now has a customer page with your connected services, booking, and loyalty tools.</p><div className="mt-7 flex justify-center gap-3"><Button onClick={onCustomize} className="bg-[#2563EB] hover:bg-[#1d4ed8]"><Settings2 className="h-4 w-4" /> Customize page</Button><Button variant="secondary" onClick={onPreview}><Eye className="h-4 w-4" /> Preview</Button></div>{link && <p className="mt-5 text-xs text-[#83928d]">Your page URL: /book/{link.slug}</p>}</div></div>; }
function BuilderTop({ tenant, link, view, setView, saving, canUndo, canRedo, onUndo, onRedo, onSave, onPublish }: any) { return <header className="flex shrink-0 items-center justify-between border-b border-[#dbe6e2] bg-white px-3 py-2.5 sm:px-5"><div className="flex min-w-0 items-center gap-2"><button onClick={() => history.back()} className="grid h-8 w-8 place-items-center rounded-lg text-[#5c756e] hover:bg-[#f1f5f3]"><ArrowLeft className="h-4 w-4" /></button><span className="hidden h-5 w-px bg-[#dbe6e2] sm:block" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{tenant?.name ?? "Client page"}</p><p className="hidden text-[11px] text-[#7b8f88] sm:block">Customer page</p></div></div><div className="flex items-center gap-1"><div className="hidden rounded-lg bg-[#f1f5f3] p-1 md:flex">{(["desktop", "tablet", "mobile"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={cn("grid h-7 w-8 place-items-center rounded-md", view === item && "bg-white text-[#2563EB] shadow-sm")}>{item === "desktop" ? <Monitor className="h-4 w-4" /> : item === "tablet" ? <LayoutTemplate className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</button>)}</div><button disabled={!canUndo} onClick={onUndo} className="hidden p-2 text-[#69817a] disabled:opacity-30 sm:block"><Undo2 className="h-4 w-4" /></button><button disabled={!canRedo} onClick={onRedo} className="hidden p-2 text-[#69817a] disabled:opacity-30 sm:block"><Redo2 className="h-4 w-4" /></button><Button variant="ghost" size="sm" onClick={() => window.open(`/book/${link?.slug}`, "_blank")} className="hidden sm:flex"><Eye className="h-4 w-4" /> Preview</Button><Button variant="secondary" size="sm" onClick={onSave} loading={saving} className="hidden sm:flex"><Save className="h-4 w-4" /> Save</Button><Button size="sm" onClick={onPublish} loading={saving} className="bg-[#2563EB] hover:bg-[#1d4ed8]">Publish</Button></div></header>; }
function ClientPreview({ tenant, sections, selected, onSelect }: { tenant: Tenant | null; sections: ClientSection[]; selected: SectionId; onSelect: (id: SectionId) => void }) { const name = tenant?.name ?? "Your business"; const primary = tenant?.brandColor || "#2563EB"; return <div style={{ fontFamily: tenant?.fontFamily || "system-ui" }}><div className="flex items-center justify-between px-6 py-4 text-sm"><div className="flex items-center gap-2 font-semibold">{tenant?.logoUrl ? <img src={tenant.logoUrl} alt={`${name} logo`} className="h-7 w-7 rounded-lg object-cover" /> : <span className="grid h-7 w-7 place-items-center rounded-lg text-xs text-white" style={{ backgroundColor: primary }}>{name.slice(0, 1)}</span>}{name}</div><span className="text-xs text-[#64756f]">Menu</span></div>{sections.map((section) => <PreviewSection key={section.id} id={section.id} selected={selected === section.id} onClick={() => onSelect(section.id)} name={name} primary={primary} tenant={tenant} />)}</div>; }
function PreviewSection({ id, selected, onClick, name, primary, tenant }: any) { const wrap = (content: React.ReactNode) => <section onClick={onClick} className={cn("relative cursor-pointer transition outline-offset-[-3px]", selected && "z-10 outline outline-2 outline-[#2563EB]")}>{selected && <span className="absolute left-3 top-3 z-10 rounded bg-[#2563EB] px-2 py-1 text-[10px] font-semibold text-white">{SECTIONS[id]?.label ?? id}</span>}{content}</section>; if (id === "hero") return wrap(<div className="px-7 py-16 text-center sm:px-14 sm:py-24" style={{ background: `linear-gradient(135deg, ${primary}18, #f8fbfa 62%)` }}><p className="text-xs font-semibold uppercase tracking-[.16em]" style={{ color: primary }}>Welcome to {name}</p><h1 className="mx-auto mt-3 max-w-xl text-balance text-4xl font-semibold tracking-[-.05em] text-[#19322d] sm:text-5xl">Feel good about every visit.</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#5e716b]">{tenant?.tagline || "Book your next appointment online, whenever it suits you."}</p><button className="mt-7 rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: primary }}>Book now</button></div>); if (id === "services") return wrap(<div className="px-7 py-12 sm:px-12"><h2 className="text-2xl font-semibold tracking-[-.03em]">Our services</h2><p className="mt-2 text-sm text-[#687b75]">Everything you need, thoughtfully delivered.</p><div className="mt-7 grid gap-3 sm:grid-cols-3">{["Signature service", "Personal consultation", "Care package"].map((item, i) => <div key={item} className="rounded-xl bg-[#f3f7f5] p-4"><div className="mb-5 h-9 w-9 rounded-lg" style={{ backgroundColor: `${primary}${i === 1 ? "a0" : "75"}` }} /><p className="text-sm font-semibold">{item}</p><p className="mt-1 text-xs text-[#6e817a]">From ₹{800 + i * 350}</p></div>)}</div></div>); if (id === "booking") return wrap(<div className="flex flex-col items-start justify-between gap-5 px-7 py-10 sm:flex-row sm:items-center sm:px-12" style={{ backgroundColor: primary }}><div><p className="text-xl font-semibold text-white">Book your next visit</p><p className="mt-1 text-sm text-white/75">Choose a service and time that works for you.</p></div><button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold" style={{ color: primary }}>View availability</button></div>); if (["loyalty", "rewards", "membership", "referrals"].includes(id)) return wrap(<div className="px-7 py-11 text-center sm:px-12"><p className="text-2xl font-semibold tracking-[-.03em]">{SECTIONS[id]?.label ?? id} that feels rewarding</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667a73]">Your customers can see their benefits, progress, and available offers here.</p><button className="mt-5 text-sm font-semibold" style={{ color: primary }}>Explore benefits →</button></div>); if (id === "about") return wrap(<div className="bg-[#f4f7f5] px-7 py-12 sm:px-12"><p className="text-xs font-semibold uppercase tracking-[.15em]" style={{ color: primary }}>About us</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.03em]">Made for the moments that matter.</h2><p className="mt-4 max-w-2xl text-sm leading-6 text-[#60746e]">{tenant?.description || "We’re here to make every visit simple, personal, and worth coming back for."}</p></div>); if (id === "contact" || id === "hours") return wrap(<div className="px-7 py-10 sm:px-12"><h2 className="text-xl font-semibold">{id === "hours" ? "Opening hours" : "Find us"}</h2><p className="mt-3 text-sm leading-6 text-[#63766f]">{id === "hours" ? "Monday – Saturday · 9:00 AM – 7:00 PM" : tenant?.address || tenant?.phone || "Contact details will appear here."}</p></div>); return wrap(<div className="px-7 py-10 text-center sm:px-12"><h2 className="text-xl font-semibold">{SECTIONS[id]?.label ?? id}</h2><p className="mt-2 text-sm text-[#667a73]">This section is connected to your Doloyal business data.</p></div>); }

function SettingsPanel({ section, config, tenant, onChange, onDelete, onDuplicate }: any) { const item = config.sections.find((s: ClientSection) => s.id === section); const label = SECTIONS[section]?.label ?? section; const updateTitle = (title: string) => onChange({ ...config, sections: config.sections.map((s: ClientSection) => s.id === section ? { ...s, title } : s) }); return <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-[#dbe6e2] bg-white p-4 xl:block"><div className="flex items-center justify-between"><div><p className="text-xs font-medium text-[#74867f]">Editing section</p><h2 className="mt-0.5 text-base font-semibold">{label}</h2></div><button className="rounded-md p-1.5 hover:bg-[#f2f6f4]"><MoreHorizontal className="h-4 w-4" /></button></div><div className="mt-6 space-y-5"><div><Label className="text-xs">Section heading</Label><Input value={item?.title ?? (section === "hero" ? `Welcome to ${tenant?.name ?? "your business"}` : label)} onChange={(event) => updateTitle(event.target.value)} className="mt-1.5" /></div>{["hero", "booking", "services"].includes(section) && <div><Label className="text-xs">Button label</Label><Input defaultValue={section === "booking" ? "View availability" : "Book now"} className="mt-1.5" /></div>}<div className="border-t border-[#e8efec] pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#74867f]">Layout</p><label className="flex items-center justify-between text-sm">Show section <Switch checked={!item?.hidden} onCheckedChange={() => onChange({ ...config, sections: config.sections.map((s: ClientSection) => s.id === section ? { ...s, hidden: !s.hidden } : s) })} /></label></div><div className="border-t border-[#e8efec] pt-5"><p className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-[#74867f]">Style</p><div className="grid grid-cols-3 gap-2"><button className="h-9 rounded-lg border-2 border-[#2563EB] bg-[#f4f7f5]" /><button className="h-9 rounded-lg border border-[#dbe6e2] bg-[#e6f1ee]" /><button className="h-9 rounded-lg border border-[#dbe6e2] bg-[#2563EB]" /></div><div className="mt-4"><Label className="text-xs">Corner radius</Label><input type="range" min="0" max="24" defaultValue="10" className="mt-2 w-full accent-[#2563EB]" /></div></div><div className="flex gap-2 border-t border-[#e8efec] pt-5"><Button variant="secondary" size="sm" onClick={onDuplicate} className="flex-1"><Copy className="h-3.5 w-3.5" /> Duplicate</Button><Button variant="ghost" size="sm" onClick={onDelete} className="text-red-600 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button></div></div></aside>; }
function SectionLibrary({ open, setOpen, config, onAdd }: { open: boolean; setOpen: (open: boolean) => void; config: ClientConfig; onAdd: (id: SectionId) => void }) { const [category, setCategory] = React.useState("All"); const categories = ["All", ...Array.from(new Set(Object.values(SECTIONS).map((item) => item.category)))]; return <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>Add a section</DialogTitle><DialogDescription>Choose a section. It will stay connected to your business data.</DialogDescription></DialogHeader><div className="flex flex-wrap gap-2 py-3">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={cn("rounded-lg px-3 py-1.5 text-xs font-medium", category === item ? "bg-[#2563EB] text-white" : "bg-[#f0f5f3] text-[#567068]")}>{item}</button>)}</div><div className="grid max-h-[50vh] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">{(Object.entries(SECTIONS) as [SectionId, typeof SECTIONS[SectionId]][]).filter(([, item]) => category === "All" || item.category === category).map(([id, item]) => { const Icon = item.icon; const added = config.sections.some((section) => section.id === id && section.enabled); return <button key={id} onClick={() => onAdd(id)} className="flex items-start gap-3 rounded-xl border border-[#dce7e3] p-4 text-left transition hover:border-[#8cb8aa] hover:bg-[#f7fbf9]"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e9f3ef] text-[#2563EB]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-1 block text-xs leading-5 text-[#6f827c]">{item.description}</span></span>{added ? <Check className="h-4 w-4 text-[#2563EB]" /> : <Plus className="h-4 w-4 text-[#789089]" />}</button>; })}</div></DialogContent></Dialog>; }
function BrandSettings({ open, setOpen, tenant, onSaved }: { open: boolean; setOpen: (open: boolean) => void; tenant: Tenant | null; onSaved: (tenant: Tenant) => void }) { const [primary, setPrimary] = React.useState(tenant?.brandColor || "#2563EB"); const [secondary, setSecondary] = React.useState(tenant?.secondaryColor || "#dcefe9"); const [radius, setRadius] = React.useState("10"); React.useEffect(() => { setPrimary(tenant?.brandColor || "#2563EB"); setSecondary(tenant?.secondaryColor || "#dcefe9"); }, [tenant, open]); const persist = async () => { try { const updated = await api.updateTenantSettings({ brandColor: primary, secondaryColor: secondary, borderRadius: `${radius}px` }); onSaved(updated); toast.success("Brand settings saved."); setOpen(false); } catch (error: any) { toast.error(error?.message ?? "We couldn't save your brand settings."); } }; return <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Brand settings</DialogTitle><DialogDescription>Your customer page inherits these settings from your Business Profile.</DialogDescription></DialogHeader><div className="space-y-4 py-3"><ColorInput label="Primary color" value={primary} setValue={setPrimary} /><ColorInput label="Secondary color" value={secondary} setValue={setSecondary} /><div><Label className="text-xs">Button radius</Label><div className="mt-2 flex items-center gap-3"><input type="range" min="0" max="24" value={radius} onChange={(event) => setRadius(event.target.value)} className="flex-1 accent-[#2563EB]" /><span className="w-10 text-xs text-[#63766f]">{radius}px</span></div></div></div><DialogFooter><Button variant="ghost" onClick={() => { setPrimary("#2563EB"); setSecondary("#dcefe9"); setRadius("10"); }}><RotateCcw className="h-4 w-4" /> Reset to default</Button><Button onClick={persist} className="bg-[#2563EB] hover:bg-[#1d4ed8]">Save changes</Button></DialogFooter></DialogContent></Dialog>; }
function ColorInput({ label, value, setValue }: { label: string; value: string; setValue: (value: string) => void }) { return <div><Label className="text-xs">{label}</Label><div className="mt-1.5 flex gap-2"><input aria-label={label} type="color" value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-11 rounded border border-[#dbe6e2] bg-white p-1" /><Input value={value} onChange={(event) => setValue(event.target.value)} /></div></div>; }
function LoadingScreen() {
  return (
    <div className="-m-4 space-y-6 bg-[#f4f7f8] p-6 sm:-m-6 sm:p-8" aria-busy="true" aria-label="Loading client page">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[240px_1fr_280px]">
        <div className="hidden space-y-3 rounded-2xl border border-[#dbe6e2] bg-white p-4 lg:block">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
        <div className="min-h-[420px] rounded-2xl border border-[#dbe6e2] bg-white p-6">
          <Skeleton className="mx-auto h-8 w-56" />
          <Skeleton className="mx-auto mt-4 h-4 w-72" />
          <Skeleton className="mx-auto mt-8 h-40 w-full max-w-xl rounded-xl" />
        </div>
        <div className="hidden space-y-4 rounded-2xl border border-[#dbe6e2] bg-white p-4 xl:block">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
