"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Input, Label, Switch } from "@doloyal/ui";
import { BUSINESS_TYPES, siteCopy } from "./website-copy";
import { FRIENDLY_TITLES, type MasterConfig, type SectionUi } from "./portal-shared";
import { ImageUploadField } from "../settings/settings-ui";

type Section = { id: string; enabled: boolean; hidden?: boolean; title?: string };
type Config = { sections: Section[]; [key: string]: unknown };

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-t border-[#e7efec] pt-5">
      <p className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#788d86]">{title}</p>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, multiline, placeholder }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; placeholder?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 min-h-20 w-full rounded-xl border border-[#dbe6e2] bg-white p-3 text-sm outline-none focus:border-[color:var(--cp-brand,#2563EB)]" />
      ) : (
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5" />
      )}
    </div>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-[#f8fafb] px-3 py-3 text-sm font-medium">
      <span className="min-w-0">
        {label}
        {hint ? <span className="mt-0.5 block text-xs font-normal text-black/45">{hint}</span> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[#dbe6e2] bg-white px-3 text-sm">
        {options.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </div>
  );
}

export function SectionInspector({
  selected,
  config,
  current,
  copy,
  displayName,
  draft,
  heroHeading,
  heroDescription,
  heroButtonLabel,
  bookingButtonLabel,
  featuredTitle,
  pinChrome,
  servicesCount,
  updateConfig,
  updateSection,
  patchBrand,
}: {
  selected: string;
  config: Config;
  current: Section;
  copy: ReturnType<typeof siteCopy>;
  displayName: string;
  draft: { logoUrl?: string | null; coverBannerUrl?: string | null; brandName?: string | null; tagline?: string | null; description?: string | null };
  heroHeading: string;
  heroDescription: string;
  heroButtonLabel: string;
  bookingButtonLabel: string;
  featuredTitle: string;
  pinChrome: boolean;
  servicesCount: number;
  updateConfig: (patch: Partial<Config>) => void;
  updateSection: (id: string, patch: Partial<Section>) => void;
  patchBrand: (patch: Record<string, unknown>) => void;
}) {
  const ui = ((config.sectionUi as MasterConfig["sectionUi"]) ?? {})[selected] ?? {};
  const patchUi = (patch: Partial<SectionUi>) => {
    const all = { ...((config.sectionUi as MasterConfig["sectionUi"]) ?? {}) };
    all[selected] = { ...all[selected], ...patch };
    updateConfig({ sectionUi: all });
  };
  const heading = current.title ?? FRIENDLY_TITLES[selected] ?? selected;
  const setHeading = (value: string) => updateSection(selected, { title: value });

  if (selected === "hero") {
    return (
      <>
        <p className="text-xs leading-5 text-black/50">These update the live website instantly.</p>
        <Select label="Business type" value={(config.businessType as string) || "custom"} onChange={(v) => updateConfig({ businessType: v })} options={BUSINESS_TYPES} />
        <Select label="Hero mode" value={(config.heroMode as string) || "image"} onChange={(v) => updateConfig({ heroMode: v })} options={[{ id: "image", label: "Fixed image" }, { id: "video", label: "Fixed video" }, { id: "slider", label: "Slider" }]} />
        <ImageUploadField label="Logo" hint="Shown in the header." value={draft.logoUrl ?? null} onChange={(url) => patchBrand({ logoUrl: url })} />
        <ImageUploadField label="Hero image" hint="JPG, PNG, or WEBP." value={draft.coverBannerUrl ?? null} onChange={(url) => patchBrand({ coverBannerUrl: url })} aspect="banner" />
        {((config.heroMode as string) === "video" || (config.heroMode as string) === "slider") && (
          <Field label="Video URL (MP4, MOV, or YouTube)" value={(config.heroVideoSrc as string) ?? ""} onChange={(v) => updateConfig({ heroVideoSrc: v })} placeholder="https://..." />
        )}
        {(config.heroMode as string) === "slider" && (
          <>
            <Field label="Slide 2 image or video URL" value={(config.heroSlide2 as string) ?? ""} onChange={(v) => updateConfig({
              heroSlide2: v,
              heroSlides: [
                { id: "cover", kind: "image", src: draft.coverBannerUrl || "" },
                ...(v.trim() ? [{ id: "two", kind: /\.(mp4|webm|mov)/i.test(v) ? "video" as const : "image" as const, src: v.trim() }] : []),
              ],
            })} placeholder="https://..." />
            <Toggle label="Auto-slide" checked={(config.autoSlide as boolean) ?? true} onChange={(c) => updateConfig({ autoSlide: c })} />
            <Field label="Slide duration (ms)" value={String(config.slideMs ?? 5500)} onChange={(v) => updateConfig({ slideMs: Number(v) || 5500 })} />
          </>
        )}
        <Group title="Content">
          <Field label="Brand name" value={draft.brandName ?? ""} onChange={(v) => patchBrand({ brandName: v })} placeholder="Your brand name" />
          <Field label="Tagline" value={draft.tagline ?? ""} onChange={(v) => patchBrand({ tagline: v })} />
          <Field label="Description" value={draft.description ?? ""} onChange={(v) => patchBrand({ description: v })} multiline />
          <Field label="Heading override" value={heroHeading} onChange={(v) => updateConfig({ heroHeading: v })} placeholder={displayName} />
          <Field label="Subheading override" value={heroDescription} onChange={(v) => updateConfig({ heroDescription: v })} multiline />
          <Field label="Primary button" value={heroButtonLabel} onChange={(v) => updateConfig({ heroButtonLabel: v })} />
          <Field label="Secondary button" value={(config.secondaryCta as string) ?? ""} onChange={(v) => updateConfig({ secondaryCta: v })} placeholder={copy.explore} />
        </Group>
        <Group title="Layout">
          <Select label="Text alignment" value={(config.heroAlign as string) || "left"} onChange={(v) => updateConfig({ heroAlign: v })} options={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }]} />
          <Select label="Hero height" value={(config.heroHeight as string) || "default"} onChange={(v) => updateConfig({ heroHeight: v })} options={[{ id: "compact", label: "Compact" }, { id: "default", label: "Default" }, { id: "tall", label: "Full screen" }]} />
          <div>
            <Label className="text-xs">Overlay strength</Label>
            <input type="range" min="20" max="80" value={Number(config.heroOverlay ?? 46)} onChange={(event) => updateConfig({ heroOverlay: Number(event.target.value) })} className="mt-2 w-full accent-[var(--cp-brand,#2563EB)]" />
          </div>
        </Group>
        <Group title="Header">
          <Select label="Navbar" value={(config.navStyle as string) || "blur"} onChange={(v) => updateConfig({ navStyle: v })} options={[{ id: "blur", label: "Glass / blur" }, { id: "transparent", label: "Transparent" }, { id: "solid", label: "Solid" }]} />
          <Toggle label="Sticky navbar" checked={pinChrome} onChange={(c) => updateConfig({ pinChrome: c })} />
          <Toggle label="Marquee" checked={(config.marqueeEnabled as boolean) ?? false} onChange={(c) => updateConfig({ marqueeEnabled: c })} />
          {(config.marqueeEnabled as boolean) && (
            <Field label="Marquee text" value={(config.marqueeText as string) ?? ""} onChange={(v) => updateConfig({ marqueeText: v })} placeholder="20% off this week · Book today" />
          )}
          <Toggle label="Animations" checked={(config.animations as boolean) ?? true} onChange={(c) => updateConfig({ animations: c })} />
          <Toggle label="Hover effects" checked={(config.hoverEffects as boolean) ?? true} onChange={(c) => updateConfig({ hoverEffects: c })} />
        </Group>
      </>
    );
  }

  if (selected === "intro") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder={`Welcome to ${displayName}`} />
        <Field label="Heading" value={(config.introHeading as string) ?? ""} onChange={(v) => updateConfig({ introHeading: v })} placeholder={copy.intro} />
        <Field label="Description" value={(config.introBody as string) ?? ""} onChange={(v) => updateConfig({ introBody: v })} multiline placeholder="Leave empty to use your brand description" />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder={copy.book} />
        <Group title="Layout">
          <Select label="Image position" value={ui.imagePosition || "left"} onChange={(v) => patchUi({ imagePosition: v as "left" | "right" })} options={[{ id: "left", label: "Image left" }, { id: "right", label: "Image right" }]} />
        </Group>
      </>
    );
  }

  if (selected === "services") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} placeholder={copy.services} />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="A short line under the heading" />
        <Field label="Button label" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder={copy.book} />
        <Group title="Layout">
          <Select label="Display" value={ui.layout || "cards"} onChange={(v) => patchUi({ layout: v as SectionUi["layout"] })} options={[{ id: "cards", label: "Cards" }, { id: "grid", label: "Grid" }, { id: "image", label: "Image cards" }, { id: "horizontal", label: "Horizontal cards" }, { id: "list", label: "Minimal list" }]} />
          <Select label="Columns" value={String(config.serviceColumns ?? ui.columns ?? 3)} onChange={(v) => { const n = Number(v) as 2 | 3 | 4; updateConfig({ serviceColumns: n }); patchUi({ columns: n }); }} options={[{ id: "1", label: "1" }, { id: "2", label: "2" }, { id: "3", label: "3" }, { id: "4", label: "4" }]} />
        </Group>
        <Group title="Show">
          <Toggle label="Price" checked={ui.showPrice !== false} onChange={(c) => patchUi({ showPrice: c })} />
          <Toggle label="Duration" checked={ui.showDuration !== false} onChange={(c) => patchUi({ showDuration: c })} />
          <Toggle label="Image" checked={ui.showImage !== false} onChange={(c) => patchUi({ showImage: c })} />
          <Toggle label="Book button" checked={ui.showCta !== false} onChange={(c) => patchUi({ showCta: c })} />
        </Group>
        <p className="text-xs leading-5 text-black/50">Cards come from your Product catalog.{servicesCount === 0 ? " Add a product to see cards here." : ` Showing ${servicesCount} live item${servicesCount === 1 ? "" : "s"}.`}</p>
      </>
    );
  }

  if (selected === "featured") {
    return (
      <>
        <Field label="Section heading" value={featuredTitle} onChange={(v) => updateConfig({ featuredTitle: v })} placeholder={copy.featured} />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline />
        <Field label="Button label" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder={copy.book} />
        <Select label="Items to show" value={String(ui.featuredCount ?? 5)} onChange={(v) => patchUi({ featuredCount: Number(v) || 5 })} options={[{ id: "3", label: "3" }, { id: "4", label: "4" }, { id: "5", label: "5" }, { id: "6", label: "6" }]} />
        <Toggle label="Show price" checked={ui.showPrice !== false} onChange={(c) => patchUi({ showPrice: c })} />
      </>
    );
  }

  if (selected === "booking") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="Your visits" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Choose what you need, pick a time, and we'll take it from there." />
        <Field label="Empty state" value={ui.emptyText ?? ""} onChange={(v) => patchUi({ emptyText: v })} placeholder="No visits on the calendar yet." />
        <Field label="Button" value={bookingButtonLabel} onChange={(v) => updateConfig({ bookingButtonLabel: v })} />
      </>
    );
  }

  if (selected === "loyalty") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="Your wallet" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Description" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Collect points every time you visit." />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="View rewards" />
        <p className="text-xs leading-5 text-black/50">The live points balance always shows in the website header.</p>
      </>
    );
  }

  if (selected === "rewards") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="Treat yourself" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Description" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Earn points on visits, then tap a reward." />
        <Field label="Empty state" value={ui.emptyText ?? ""} onChange={(v) => patchUi({ emptyText: v })} placeholder="Rewards will show here when they are ready." />
        <p className="text-xs leading-5 text-black/50">Reward cards come from your Rewards catalog.</p>
      </>
    );
  }

  if (selected === "membership") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="Members club" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Description" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Members get first pick of times." />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="Join now" />
      </>
    );
  }

  if (selected === "referrals") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="Bring a friend" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Description" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Share your code. When they book, you both get something back." />
        <Field label="Copy button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="Copy" />
        <Field label="Share button" value={ui.secondaryCta ?? ""} onChange={(v) => patchUi({ secondaryCta: v })} placeholder="Share invite" />
      </>
    );
  }

  if (selected === "about") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Story" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Leave empty to use your brand description" />
        <Toggle label="Show counters" checked={ui.showCounters !== false} onChange={(c) => patchUi({ showCounters: c })} />
        {ui.showCounters !== false && (
          <Group title="Stats">
            <Field label="Stat 1 value" value={ui.stat1Value ?? ""} onChange={(v) => patchUi({ stat1Value: v })} placeholder="4.9" />
            <Field label="Stat 1 label" value={ui.stat1Label ?? ""} onChange={(v) => patchUi({ stat1Label: v })} placeholder="Guest rating" />
            <Field label="Stat 2 value" value={ui.stat2Value ?? ""} onChange={(v) => patchUi({ stat2Value: v })} placeholder="8+" />
            <Field label="Stat 2 label" value={ui.stat2Label ?? ""} onChange={(v) => patchUi({ stat2Label: v })} placeholder="Years open" />
            <Field label="Stat 3 value" value={ui.stat3Value ?? ""} onChange={(v) => patchUi({ stat3Value: v })} placeholder="5k+" />
            <Field label="Stat 3 label" value={ui.stat3Label ?? ""} onChange={(v) => patchUi({ stat3Label: v })} placeholder="Visits booked" />
          </Group>
        )}
      </>
    );
  }

  if (selected === "offers") {
    return (
      <>
        <Field label="Section label" value={heading} onChange={setHeading} />
        <Field label="Offer title" value={(config.offerTitle as string) ?? ""} onChange={(v) => updateConfig({ offerTitle: v })} placeholder="This week's offer" />
        <Field label="Offer details" value={(config.offerBody as string) ?? ""} onChange={(v) => updateConfig({ offerBody: v })} multiline />
        <Field label="Discount" value={ui.discount ?? ""} onChange={(v) => patchUi({ discount: v })} placeholder="20% OFF" />
        <Field label="Coupon code" value={ui.coupon ?? ""} onChange={(v) => patchUi({ coupon: v })} placeholder="SUMMER20" />
        <Field label="Valid until" value={ui.validity ?? ""} onChange={(v) => patchUi({ validity: v })} placeholder="This week only" />
        <Field label="Button" value={(config.offerCta as string) ?? ""} onChange={(v) => updateConfig({ offerCta: v })} placeholder={copy.book} />
      </>
    );
  }

  if (selected === "gallery") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Select label="Layout" value={ui.layout || "masonry"} onChange={(v) => patchUi({ layout: v as SectionUi["layout"] })} options={[{ id: "masonry", label: "Masonry" }, { id: "grid", label: "Grid" }, { id: "slider", label: "Slider" }]} />
        <Field
          label="Image URLs (one per line)"
          value={Array.isArray(config.galleryUrls) ? (config.galleryUrls as string[]).join("\n") : (config.galleryUrls as string) ?? ""}
          onChange={(v) => updateConfig({ galleryUrls: v })}
          multiline
          placeholder="https://..."
        />
      </>
    );
  }

  if (selected === "video") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Video URL" value={(config.videoUrl as string) ?? ""} onChange={(v) => updateConfig({ videoUrl: v })} placeholder="YouTube, Vimeo, or MP4" />
        <Field label="Overlay text" value={ui.overlayText ?? ""} onChange={(v) => patchUi({ overlayText: v })} placeholder="See the experience" />
        <Toggle label="Autoplay" checked={ui.autoplay === true} onChange={(c) => patchUi({ autoplay: c })} />
        <Toggle label="Muted" checked={ui.muted !== false} onChange={(c) => patchUi({ muted: c })} />
        <Toggle label="Loop" checked={ui.loop === true} onChange={(c) => patchUi({ loop: c })} />
      </>
    );
  }

  if (selected === "testimonials") {
    const items = Array.isArray(config.testimonials) ? config.testimonials as Array<{ name: string; text: string; rating?: number }> : [];
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Toggle label="Show rating" checked={ui.showRating !== false} onChange={(c) => patchUi({ showRating: c })} />
        <Toggle label="Show name" checked={ui.showAvatar !== false} onChange={(c) => patchUi({ showAvatar: c })} />
        <Group title="Reviews">
          {(items.length ? items : [{ name: "", text: "", rating: 5 }]).map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-black/10 p-3">
              <Field label="Name" value={item.name} onChange={(v) => {
                const next = [...(items.length ? items : [{ name: "", text: "", rating: 5 }])];
                next[index] = { ...next[index], name: v };
                updateConfig({ testimonials: next });
              }} />
              <Field label="Quote" value={item.text} onChange={(v) => {
                const next = [...(items.length ? items : [{ name: "", text: "", rating: 5 }])];
                next[index] = { ...next[index], text: v };
                updateConfig({ testimonials: next });
              }} multiline />
              <button type="button" className="text-xs font-medium text-red-600" onClick={() => updateConfig({ testimonials: items.filter((_, i) => i !== index) })}>Remove</button>
            </div>
          ))}
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--cp-brand,#2563EB)]" onClick={() => updateConfig({ testimonials: [...items, { name: "", text: "", rating: 5 }] })}>
            <Plus className="h-4 w-4" /> Add review
          </button>
        </Group>
      </>
    );
  }

  if (selected === "social") {
    return (
      <>
        <Field label="Heading" value={ui.eyebrow ?? heading} onChange={(v) => { setHeading(v); patchUi({ eyebrow: v }); }} placeholder="Follow us" />
        <Field label="Instagram" value={ui.instagram ?? ""} onChange={(v) => patchUi({ instagram: v })} placeholder="instagram.com/business" />
        <Field label="Facebook" value={ui.facebook ?? ""} onChange={(v) => patchUi({ facebook: v })} placeholder="facebook.com/business" />
        <Field label="YouTube" value={ui.youtube ?? ""} onChange={(v) => patchUi({ youtube: v })} placeholder="youtube.com/@" />
        <Field label="TikTok" value={ui.tiktok ?? ""} onChange={(v) => patchUi({ tiktok: v })} placeholder="tiktok.com/@" />
        <Field label="WhatsApp" value={ui.whatsapp ?? ""} onChange={(v) => patchUi({ whatsapp: v })} placeholder="9198..." />
        <Toggle label="Icon animation" checked={(config.socialAnimations as boolean) ?? true} onChange={(c) => updateConfig({ socialAnimations: c })} />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="Follow us" />
      </>
    );
  }

  if (selected === "faq") {
    const faqs = Array.isArray(config.faqs) ? config.faqs as Array<{ question: string; answer: string }> : [];
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Group title="Questions">
          {(faqs.length ? faqs : [{ question: "", answer: "" }]).map((item, index) => (
            <div key={index} className="space-y-2 rounded-xl border border-black/10 p-3">
              <Field label="Question" value={item.question} onChange={(v) => {
                const next = [...(faqs.length ? faqs : [{ question: "", answer: "" }])];
                next[index] = { ...next[index], question: v };
                updateConfig({ faqs: next });
              }} />
              <Field label="Answer" value={item.answer} onChange={(v) => {
                const next = [...(faqs.length ? faqs : [{ question: "", answer: "" }])];
                next[index] = { ...next[index], answer: v };
                updateConfig({ faqs: next });
              }} multiline />
              <button type="button" className="text-xs font-medium text-red-600" onClick={() => updateConfig({ faqs: faqs.filter((_, i) => i !== index) })}>Remove</button>
            </div>
          ))}
          <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--cp-brand,#2563EB)]" onClick={() => updateConfig({ faqs: [...faqs, { question: "", answer: "" }] })}>
            <Plus className="h-4 w-4" /> Add question
          </button>
        </Group>
      </>
    );
  }

  if (selected === "contact") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Address and a short note." />
        <Field label="Form title" value={ui.formTitle ?? ""} onChange={(v) => patchUi({ formTitle: v })} placeholder="Send a note, or book a time" />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder={copy.book} />
        <Group title="Show">
          <Toggle label="Phone" checked={ui.showPhone !== false} onChange={(c) => patchUi({ showPhone: c })} />
          <Toggle label="Email" checked={ui.showEmail !== false} onChange={(c) => patchUi({ showEmail: c })} />
          <Toggle label="WhatsApp" checked={ui.showWhatsapp !== false} onChange={(c) => patchUi({ showWhatsapp: c })} />
          <Toggle label="Directions" checked={ui.showMap !== false} onChange={(c) => patchUi({ showMap: c })} />
        </Group>
      </>
    );
  }

  if (selected === "map") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="Get directions" />
        <Select label="Zoom" value={String(ui.mapZoom ?? 14)} onChange={(v) => patchUi({ mapZoom: Number(v) })} options={[{ id: "12", label: "City" }, { id: "14", label: "Neighbourhood" }, { id: "16", label: "Street" }]} />
        <Select label="Map height" value={String(ui.mapHeight ?? 360)} onChange={(v) => patchUi({ mapHeight: Number(v) })} options={[{ id: "260", label: "Compact" }, { id: "360", label: "Default" }, { id: "480", label: "Tall" }]} />
      </>
    );
  }

  if (selected === "cta") {
    return (
      <>
        <Field label="Heading" value={(config.ctaHeading as string) ?? ""} onChange={(v) => updateConfig({ ctaHeading: v })} placeholder={copy.cta} />
        <Field label="Supporting text" value={(config.ctaBody as string) ?? ""} onChange={(v) => updateConfig({ ctaBody: v })} multiline />
        <Field label="Primary button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder={copy.book} />
        <Field label="Secondary button" value={ui.secondaryCta ?? ""} onChange={(v) => patchUi({ secondaryCta: v })} placeholder={copy.explore} />
      </>
    );
  }

  if (selected === "checkout") {
    const cashEnabled = config.checkoutCashEnabled !== false;
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} placeholder="Checkout" />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="How customers pay when they buy or book." />
        <Group title="At-store purchases">
          <Toggle
            label="Cash"
            hint="When on, walk-in customers can pay cash. Booking always uses online payment only."
            checked={cashEnabled}
            onChange={(c) => updateConfig({ checkoutCashEnabled: c, checkout: { cashEnabled: c } })}
          />
        </Group>
        <p className="text-xs leading-5 text-black/50">
          Product Buy opens a choice: take now (at store) or book. Booking never shows cash.
        </p>
      </>
    );
  }

  if (selected === "reviews") {
    return (
      <>
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="A short note or a video helps the next guest." />
        <Field label="Write button" value={ui.cta ?? ""} onChange={(v) => patchUi({ cta: v })} placeholder="Write a note" />
        <Field label="Video button" value={ui.secondaryCta ?? ""} onChange={(v) => patchUi({ secondaryCta: v })} placeholder="Send a video" />
        <Toggle label="Show rating" checked={ui.showRating !== false} onChange={(c) => patchUi({ showRating: c })} />
      </>
    );
  }

  if (selected === "hours") {
    return (
      <>
        <Field label="Eyebrow" value={ui.eyebrow ?? ""} onChange={(v) => patchUi({ eyebrow: v })} placeholder="The week" />
        <Field label="Section heading" value={heading} onChange={setHeading} />
        <Field label="Note" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Hours come from your business profile." />
      </>
    );
  }

  if (selected === "footer") {
    return (
      <>
        <Field label="About line" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline placeholder="Uses your tagline if empty" />
        <Toggle label="Show social links" checked={ui.showSocial !== false} onChange={(c) => patchUi({ showSocial: c })} />
        <Toggle label="Show contact" checked={ui.showPhone !== false} onChange={(c) => patchUi({ showPhone: c })} />
        <Field label="Copyright extra" value={ui.overlayText ?? ""} onChange={(v) => patchUi({ overlayText: v })} placeholder="Privacy · Terms" />
      </>
    );
  }

  return (
    <>
      <Field label="Section heading" value={heading} onChange={setHeading} />
      <Field label="Supporting text" value={ui.body ?? ""} onChange={(v) => patchUi({ body: v })} multiline />
    </>
  );
}

export { Field as InspectorField };
