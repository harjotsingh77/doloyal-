"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Clock3, MapPin, Phone, Star } from "lucide-react";
import type { PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { clientPageBrand } from "../client-page-brand";
import {
  LoungeButton,
  SelectableBlock,
  SectionTitle,
  artFor,
  catalogImageSrc,
  formatPrice,
  sectionUi,
  type MasterConfig,
  type PortalChrome,
} from "../portal-shared";
import { siteCopy } from "../website-copy";

function socialHref(value?: string | null, kind?: "instagram" | "facebook" | "youtube" | "tiktok" | "whatsapp" | "web") {
  const raw = value?.trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (kind === "whatsapp") {
    const digits = raw.replace(/\D/g, "");
    return digits ? `https://wa.me/${digits}` : null;
  }
  if (kind === "instagram") return `https://instagram.com/${raw.replace(/^@/, "")}`;
  if (kind === "facebook") return `https://facebook.com/${raw.replace(/^@/, "")}`;
  if (kind === "youtube") return raw.includes(".") ? `https://${raw.replace(/^https?:\/\//i, "")}` : `https://youtube.com/${raw.startsWith("@") ? raw : `@${raw}`}`;
  if (kind === "tiktok") return `https://tiktok.com/${raw.startsWith("@") ? raw : `@${raw}`}`;
  return raw.startsWith("www.") ? `https://${raw}` : raw;
}

function Reveal({ children, on }: { children: React.ReactNode; on: boolean }) {
  const reduce = useReducedMotion();
  if (!on || reduce) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.24 }}
      transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </motion.div>
  );
}

function wrap(chrome: PortalChrome, sid: string, node: React.ReactNode) {
  return <SelectableBlock sid={sid} chrome={chrome}>{node}</SelectableBlock>;
}

function Inner({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-10 ${className}`}>{children}</div>;
}

export function IntroSection({
  chrome,
  config,
  business,
  onBook,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  onBook: () => void;
}) {
  const brand = clientPageBrand(business);
  const copy = siteCopy(config?.businessType);
  const ui = sectionUi(config, "intro");
  const heading = config?.introHeading?.trim() || copy.intro;
  const body = config?.introBody?.trim() || brand.description || business.about || "";
  const imageFirst = ui.imagePosition !== "right";
  return wrap(
    chrome,
    "intro",
    <section id="portal-intro" className="py-20 sm:py-28">
      <Inner>
        <Reveal on={config?.animations !== false}>
          <div className={`grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 ${imageFirst ? "" : "lg:[&>*:first-child]:order-2"}`}>
            <div className="overflow-hidden rounded-[28px] bg-black/[0.04]">
              <img
                src={catalogImageSrc(brand.coverUrl, "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80")}
                alt=""
                className={`aspect-[4/5] w-full object-cover sm:aspect-[5/4] ${config?.hoverEffects === false ? "" : "transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03]"}`}
              />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[color:var(--site-accent)]">{ui.eyebrow?.trim() || `Welcome to ${brand.displayName}`}</p>
              <h2 className="mt-3 max-w-[16ch] text-4xl font-semibold tracking-[-0.045em] sm:text-5xl sm:leading-[1.08]">{heading}</h2>
              {body ? <p className="mt-5 max-w-[48ch] text-[15px] leading-7 text-[color:var(--site-ink)]/62">{body}</p> : null}
              <LoungeButton onClick={onBook} className="mt-8">
                {ui.cta?.trim() || config?.heroButtonLabel?.trim() || copy.book}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15"><ArrowUpRight className="h-3.5 w-3.5" /></span>
              </LoungeButton>
            </div>
          </div>
        </Reveal>
      </Inner>
    </section>,
  );
}

export function WebsiteServices({
  chrome,
  config,
  services,
  currency,
  title,
  onBook,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  services: PublicService[];
  currency: string;
  title: string;
  onBook: (service?: PublicService) => void;
}) {
  const copy = siteCopy(config?.businessType);
  const ui = sectionUi(config, "services");
  const cols = ui.columns || config?.serviceColumns || 3;
  const layout = ui.layout || "cards";
  const colClass = layout === "list" || cols === 1 ? "grid-cols-1" : cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2 xl:grid-cols-3";
  const categories = Array.from(new Set(services.map((s) => s.category || "General")));
  const [cat, setCat] = React.useState("All");
  const shown = services.filter((s) => s.isActive && (cat === "All" || s.category === cat));
  return wrap(
    chrome,
    "services",
    <section id="portal-catalog" className="py-8 sm:py-12">
      <Inner>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionTitle>{title || copy.services}</SectionTitle>
            {ui.body ? <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--site-ink)]/55">{ui.body}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", ...categories].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCat(name)}
                className={`h-9 rounded-full px-4 text-sm font-medium ${cat === name ? "bg-[color:var(--site-ink)] text-white" : "bg-black/[0.04] text-[color:var(--site-ink)]/70"}`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className={`mt-8 grid gap-5 ${colClass}`}>
          {shown.map((service, index) => (
            <article key={service.id} className={`group overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.06] ${layout === "horizontal" ? "sm:flex" : ""} ${config?.hoverEffects === false ? "" : "transition duration-700 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(17,17,17,.08)]"}`}>
              {ui.showImage !== false && layout !== "list" ? (
                <div className={`${layout === "horizontal" ? "sm:w-48 sm:shrink-0" : "aspect-[16/11]"} overflow-hidden`}>
                  <img src={catalogImageSrc(service.imageUrl, artFor(service.category || service.name, index))} alt="" className={`h-full w-full object-cover ${config?.hoverEffects === false ? "" : "transition duration-700 group-hover:scale-105"}`} onError={(event) => { event.currentTarget.src = artFor(service.category || service.name, index); }} />
                </div>
              ) : null}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-lg font-semibold tracking-[-0.03em]">{service.name}</h4>
                  {ui.showPrice !== false ? <span className="shrink-0 text-sm font-semibold">{formatPrice(service.price, currency)}</span> : null}
                </div>
                {service.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--site-ink)]/55">{service.description}</p> : null}
                <div className="mt-5 flex items-center justify-between">
                  {ui.showDuration !== false ? <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--site-ink)]/50"><Clock3 className="h-3.5 w-3.5" />{service.durationMinutes} min</span> : <span />}
                  {ui.showCta !== false ? <LoungeButton onClick={() => onBook(service)} className="px-4 py-2 text-xs">{ui.cta?.trim() || "Buy"}</LoungeButton> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
        {!shown.length ? (
          <p className="mt-8 rounded-[24px] bg-black/[0.03] px-5 py-10 text-center text-sm text-[color:var(--site-ink)]/55">Add products to show them here.</p>
        ) : null}
      </Inner>
    </section>,
  );
}

export function FeaturedGrid({
  chrome,
  config,
  services,
  currency,
  title,
  onBook,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  services: PublicService[];
  currency: string;
  title: string;
  onBook: (service?: PublicService) => void;
}) {
  const copy = siteCopy(config?.businessType);
  const ui = sectionUi(config, "featured");
  const items = services.filter((s) => s.isActive).slice(0, ui.featuredCount || 5);
  return wrap(
    chrome,
    "featured",
    <section id="portal-services" className="py-16 sm:py-24">
      <Inner>
        <SectionTitle>{title || copy.featured}</SectionTitle>
        {ui.body ? <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--site-ink)]/55">{ui.body}</p> : null}
        <div className="mt-8 grid gap-4 md:grid-cols-6">
          {items.map((service, index) => (
            <article key={service.id} className={`group overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.06] ${index === 0 ? "md:col-span-4 md:row-span-2" : "md:col-span-2"}`}>
              <div className={`${index === 0 ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-[420px]" : "aspect-[16/11]"} overflow-hidden`}>
                <img src={catalogImageSrc(service.imageUrl, artFor(service.category || service.name, index))} alt="" className={`h-full w-full object-cover ${config?.hoverEffects === false ? "" : "transition duration-700 group-hover:scale-105"}`} onError={(event) => { event.currentTarget.src = artFor(service.category || service.name, index); }} />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h4 className={`${index === 0 ? "text-2xl" : "text-lg"} font-semibold tracking-[-0.03em]`}>{service.name}</h4>
                  {ui.showPrice !== false ? <span className="text-sm font-semibold">{formatPrice(service.price, currency)}</span> : null}
                </div>
                <button type="button" onClick={() => onBook(service)} className="mt-4 text-sm font-semibold text-[color:var(--site-accent)]">{ui.cta?.trim() || "Buy"}</button>
              </div>
            </article>
          ))}
        </div>
      </Inner>
    </section>,
  );
}

export function AboutStory({
  chrome,
  config,
  business,
  title,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  title: string;
}) {
  const brand = clientPageBrand(business);
  const ui = sectionUi(config, "about");
  const story = ui.body?.trim() || business.about?.trim() || brand.description || (chrome.isBuilder ? "Add a description in Brand settings so this story is yours." : "");
  const stats = [
    { label: ui.stat1Label?.trim() || "Guest rating", value: ui.stat1Value?.trim() || (business.rating ? `${business.rating}` : "4.9") },
    { label: ui.stat2Label?.trim() || "Years open", value: ui.stat2Value?.trim() || "8+" },
    { label: ui.stat3Label?.trim() || "Visits booked", value: ui.stat3Value?.trim() || "5k+" },
  ];
  return wrap(
    chrome,
    "about",
    <section id="portal-about" className="bg-white py-20 sm:py-28">
      <Inner>
        <div className="max-w-[38rem]">
          <h2 className="text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h2>
          {story ? <p className="mt-5 text-[15px] leading-7 text-[color:var(--site-ink)]/62">{story}</p> : null}
        </div>
        {ui.showCounters !== false ? (
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[24px] bg-[color:var(--site-bg)] px-6 py-7 ring-1 ring-black/[0.04]">
              <p className="text-4xl font-semibold tracking-[-0.05em]">{stat.value}</p>
              <p className="mt-2 text-sm text-[color:var(--site-ink)]/55">{stat.label}</p>
            </div>
          ))}
        </div>
        ) : null}
      </Inner>
    </section>,
  );
}

export function OffersSection({ chrome, config, title }: { chrome: PortalChrome; config?: MasterConfig; title: string }) {
  const copy = siteCopy(config?.businessType);
  const ui = sectionUi(config, "offers");
  return wrap(
    chrome,
    "offers",
    <section id="portal-offers" className="py-16 sm:py-24">
      <Inner>
        <div className="overflow-hidden rounded-[28px] bg-[color:var(--site-ink)] px-8 py-12 text-white sm:px-12">
          <p className="text-sm font-medium text-white/55">{title}</p>
          {ui.discount ? <p className="mt-4 text-5xl font-semibold tracking-[-0.05em]">{ui.discount}</p> : null}
          <h3 className="mt-3 max-w-[14ch] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{config?.offerTitle?.trim() || "This week's offer"}</h3>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-7 text-white/70">{config?.offerBody?.trim() || "A simple reason to visit now. Edit this card from the Offers section."}</p>
          {ui.coupon ? <p className="mt-4 text-sm font-semibold tracking-[0.12em] text-white/70">CODE {ui.coupon}</p> : null}
          {ui.validity ? <p className="mt-1 text-sm text-white/50">{ui.validity}</p> : null}
          <LoungeButton className="mt-8">{config?.offerCta?.trim() || copy.book}</LoungeButton>
        </div>
      </Inner>
    </section>,
  );
}

export function GallerySection({ chrome, config, business, title }: { chrome: PortalChrome; config?: MasterConfig; business: PublicBusinessInfo; title: string }) {
  const brand = clientPageBrand(business);
  const ui = sectionUi(config, "gallery");
  const urls = (config?.galleryUrls?.length ? config.galleryUrls : [
    brand.coverUrl,
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1200&q=80",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=80",
  ].filter(Boolean) as string[]);
  const [open, setOpen] = React.useState<string | null>(null);
  const layout = ui.layout || "masonry";
  return wrap(
    chrome,
    "gallery",
    <section id="portal-gallery" className="py-16 sm:py-24">
      <Inner>
        <SectionTitle>{title}</SectionTitle>
        <div className={`mt-8 ${layout === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : layout === "slider" ? "flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]" : "columns-1 gap-3 sm:columns-2 lg:columns-3"}`}>
          {urls.map((url, i) => (
            <button key={`${url}-${i}`} type="button" onClick={() => setOpen(url)} className={`overflow-hidden rounded-[22px] ${layout === "slider" ? "min-w-[16rem] snap-start" : layout === "grid" ? "" : "mb-3 block w-full"}`}>
              <img src={catalogImageSrc(url, url)} alt="" className="w-full object-cover" />
            </button>
          ))}
        </div>
      </Inner>
      {open ? (
        <button type="button" className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-6" onClick={() => setOpen(null)}>
          <img src={catalogImageSrc(open, open)} alt="" className="max-h-[86dvh] max-w-full rounded-2xl object-contain" />
        </button>
      ) : null}
    </section>,
  );
}

export function VideoSection({ chrome, config, title }: { chrome: PortalChrome; config?: MasterConfig; title: string }) {
  const url = config?.videoUrl?.trim() || config?.heroVideoSrc?.trim() || "";
  const yt = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/)?.[1];
  const ui = sectionUi(config, "video");
  return wrap(
    chrome,
    "video",
    <section id="portal-video" className="py-16 sm:py-24">
      <Inner>
        <SectionTitle>{title}</SectionTitle>
        <div className="relative mt-8 overflow-hidden rounded-[28px] bg-black">
          {yt ? (
            <iframe title={title} src={`https://www.youtube.com/embed/${yt}?autoplay=${ui.autoplay ? 1 : 0}&mute=1`} className="aspect-video w-full border-0" allow="autoplay; encrypted-media" />
          ) : url ? (
            <video className="aspect-video w-full object-cover" controls={!ui.autoplay} autoPlay={ui.autoplay} muted={ui.muted !== false} loop={ui.loop} playsInline>
              <source src={url} />
            </video>
          ) : (
            <div className="grid aspect-video place-items-center text-sm text-white/60">Paste a YouTube or MP4 URL in the Video section.</div>
          )}
          {ui.overlayText ? <p className="absolute bottom-6 left-6 text-lg font-semibold text-white">{ui.overlayText}</p> : null}
        </div>
      </Inner>
    </section>,
  );
}

export function TestimonialsSection({
  chrome,
  config,
  title,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  title: string;
}) {
  const ui = sectionUi(config, "testimonials");
  const items = (config?.testimonials?.length ? config.testimonials : [
    { name: "Meera Patel", text: "Easy to book, and the visit felt looked after from the door.", rating: 5 },
    { name: "Arun Iyer", text: "Clear times, kind staff, and no fuss. We came back the same month.", rating: 5 },
    { name: "Sofia Rahman", text: "The page made it simple to pick something and just show up.", rating: 5 },
  ]);
  return wrap(
    chrome,
    "testimonials",
    <section id="portal-testimonials" className="py-16 sm:py-24">
      <Inner>
        <SectionTitle>{title}</SectionTitle>
        <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none]">
          {items.map((item, index) => (
            <figure key={`${item.name}-${index}`} className="min-w-[18rem] max-w-sm snap-start rounded-[24px] bg-white p-6 ring-1 ring-black/[0.06] sm:min-w-[22rem]">
              {ui.showRating !== false ? (
                <div className="flex gap-0.5 text-[color:var(--site-accent)]">
                  {Array.from({ length: item.rating || 5 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
                </div>
              ) : null}
              <blockquote className={`${ui.showRating !== false ? "mt-4" : ""} text-[15px] leading-7 text-[color:var(--site-ink)]/75`}>“{item.text}”</blockquote>
              {ui.showAvatar !== false && item.name ? <figcaption className="mt-5 text-sm font-semibold">{item.name}</figcaption> : null}
            </figure>
          ))}
        </div>
      </Inner>
    </section>,
  );
}

export function SocialProof({ chrome, config, business }: { chrome: PortalChrome; config?: MasterConfig; business: PublicBusinessInfo }) {
  const ui = sectionUi(config, "social");
  const animate = config?.socialAnimations !== false && (config?.hoverEffects ?? true);
  const items = [
    { href: socialHref(ui.instagram, "instagram") || socialHref(business.instagram, "instagram"), label: "Instagram" },
    { href: socialHref(ui.facebook, "facebook") || socialHref(business.facebook, "facebook"), label: "Facebook" },
    { href: socialHref(ui.youtube, "youtube"), label: "YouTube" },
    { href: socialHref(ui.tiktok, "tiktok"), label: "TikTok" },
    { href: socialHref(ui.whatsapp, "whatsapp") || socialHref(business.whatsapp, "whatsapp"), label: "WhatsApp" },
    { href: socialHref(business.website, "web"), label: "Website" },
  ].filter((item): item is { href: string; label: string } => Boolean(item.href));
  const proof = [
    business.rating ? `${business.rating} rating` : null,
    "Booked online",
    items.find((item) => item.label === "Instagram") ? "On Instagram" : null,
  ].filter(Boolean) as string[];
  return wrap(
    chrome,
    "social",
    <section id="portal-social" className="border-y border-black/[0.06] py-12">
      <Inner className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold">{ui.eyebrow?.trim() || "Follow us"}</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-[color:var(--site-ink)]/55">
            {proof.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex h-11 items-center rounded-full bg-[color:var(--site-ink)] px-4 text-sm font-semibold text-white ${animate ? "transition duration-500 hover:scale-105" : ""}`}
            >
              {item.label}
            </a>
          ))}
          {ui.cta?.trim() && items.length ? (
            <a href={items[0].href} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-full bg-black/[0.06] px-4 text-sm font-semibold">
              {ui.cta.trim()}
            </a>
          ) : null}
          {!items.length ? <p className="text-sm text-[color:var(--site-ink)]/50">Add social links in this section or Brand settings.</p> : null}
        </div>
      </Inner>
    </section>,
  );
}

export function FaqSection({ chrome, config, title }: { chrome: PortalChrome; config?: MasterConfig; title: string }) {
  const faqs = config?.faqs?.length ? config.faqs : [
      { question: "How do I book?", answer: "Pick a service, choose a time, and confirm your details." },
      { question: "Can I reschedule?", answer: "Yes. Contact us or use your confirmation link before the cutoff." },
      { question: "What should I bring?", answer: "Just yourself. We'll send any extras in the confirmation." },
    ];
  const [open, setOpen] = React.useState(0);
  return wrap(
    chrome,
    "faq",
    <section id="portal-faq" className="py-16 sm:py-24">
      <Inner className="max-w-3xl">
        <SectionTitle>{title}</SectionTitle>
        <div className="mt-8 divide-y divide-black/[0.08] border-y border-black/[0.08]">
          {faqs.map((faq, i) => (
            <div key={faq.question}>
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-[15px] font-semibold">
                {faq.question}
                <span className="text-lg font-normal text-[color:var(--site-ink)]/35">{open === i ? "–" : "+"}</span>
              </button>
              {open === i ? <p className="pb-5 text-sm leading-7 text-[color:var(--site-ink)]/60">{faq.answer}</p> : null}
            </div>
          ))}
        </div>
      </Inner>
    </section>,
  );
}

export function ContactBooking({
  chrome,
  config,
  business,
  title,
  onBook,
  bookLabel,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  title: string;
  onBook: () => void;
  bookLabel: string;
}) {
  const ui = sectionUi(config, "contact");
  const phone = business.phone?.replace(/\s/g, "") || "";
  const maps = business.mapsUrl || (business.address ? `https://maps.google.com/?q=${encodeURIComponent(business.address)}` : null);
  const wa = ui.whatsapp || business.whatsapp || phone;
  return wrap(
    chrome,
    "contact",
    <section id="portal-contact" className="py-16 sm:py-24">
      <Inner className="grid gap-10 lg:grid-cols-2">
        <div>
          <SectionTitle>{title}</SectionTitle>
          {ui.body?.trim() ? <p className="mt-4 max-w-md text-[15px] leading-7 text-[color:var(--site-ink)]/62">{ui.body.trim()}</p> : null}
          {business.address ? <p className={`${ui.body?.trim() ? "mt-2" : "mt-4"} max-w-md text-[15px] leading-7 text-[color:var(--site-ink)]/62`}>{business.address}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {ui.showPhone !== false && phone ? <a href={`tel:${phone}`} className="inline-flex h-11 items-center gap-2 rounded-full bg-black/[0.04] px-4 text-sm font-semibold"><Phone className="h-4 w-4" /> Call</a> : null}
            {ui.showEmail !== false && business.email ? <a href={`mailto:${business.email}`} className="inline-flex h-11 items-center rounded-full bg-black/[0.04] px-4 text-sm font-semibold">Email</a> : null}
            {ui.showWhatsapp !== false && wa ? <a href={`https://wa.me/${String(wa).replace(/\D/g, "")}`} className="inline-flex h-11 items-center rounded-full bg-black/[0.04] px-4 text-sm font-semibold">WhatsApp</a> : null}
            {ui.showMap !== false && maps ? <a href={maps} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[color:var(--site-ink)] px-4 text-sm font-semibold text-white"><MapPin className="h-4 w-4" /> Directions</a> : null}
          </div>
        </div>
        <div className="rounded-[28px] bg-white p-6 ring-1 ring-black/[0.06] sm:p-8">
          <p className="text-lg font-semibold tracking-[-0.03em]">{ui.formTitle?.trim() || "Send a note, or book a time"}</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--site-ink)]/55">Name, phone, and a preferred time. We&apos;ll take it from there.</p>
          <LoungeButton onClick={onBook} className="mt-6">{ui.cta?.trim() || bookLabel}</LoungeButton>
        </div>
      </Inner>
    </section>,
  );
}

export function MapSection({ chrome, config, business, title }: { chrome: PortalChrome; config?: MasterConfig; business: PublicBusinessInfo; title: string }) {
  const ui = sectionUi(config, "map");
  const q = business.address || business.name;
  const zoom = ui.mapZoom || 14;
  const height = ui.mapHeight || 360;
  const embed = `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`;
  const maps = business.mapsUrl || `https://maps.google.com/?q=${encodeURIComponent(q)}`;
  return wrap(
    chrome,
    "map",
    <section id="portal-map" className="pb-8">
      <Inner>
        <div className="mb-4 flex items-end justify-between gap-3">
          <h3 className="text-2xl font-semibold tracking-[-0.03em]">{title}</h3>
          <a href={maps} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[color:var(--site-accent)]">{ui.cta?.trim() || "Get directions"}</a>
        </div>
        <div className="overflow-hidden rounded-[28px] ring-1 ring-black/[0.06]">
          <iframe title="Map" src={embed} className="w-full border-0" style={{ height }} loading="lazy" />
        </div>
      </Inner>
    </section>,
  );
}

export function FinalCta({
  chrome,
  config,
  business,
  onBook,
  onExplore,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  onBook: () => void;
  onExplore?: () => void;
}) {
  const copy = siteCopy(config?.businessType);
  const brand = clientPageBrand(business);
  const ui = sectionUi(config, "cta");
  return wrap(
    chrome,
    "cta",
    <section id="portal-cta" className="px-5 pb-16 sm:px-8 lg:px-10">
      <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[28px]">
        <img src={catalogImageSrc(brand.coverUrl, "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80")} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[color:var(--site-ink)]/72" />
        <div className="relative px-8 py-16 text-white sm:px-14 sm:py-20">
          <h2 className="max-w-[14ch] text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{config?.ctaHeading?.trim() || copy.cta}</h2>
          <p className="mt-4 max-w-[42ch] text-[15px] leading-7 text-white/75">{config?.ctaBody?.trim() || "Pick a time that works. We'll have things ready."}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LoungeButton onClick={onBook}>{ui.cta?.trim() || config?.heroButtonLabel?.trim() || copy.book}</LoungeButton>
            {ui.secondaryCta?.trim() ? (
              <button type="button" onClick={onExplore} className="inline-flex h-11 items-center rounded-full bg-white/12 px-5 text-sm font-semibold text-white">
                {ui.secondaryCta.trim()}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>,
  );
}

export function CheckoutSection({
  chrome,
  config,
  title,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  title: string;
}) {
  const ui = sectionUi(config, "checkout");
  const cashEnabled = config?.checkoutCashEnabled !== false;
  return wrap(
    chrome,
    "checkout",
    <section id="portal-checkout" className="py-10 sm:py-14">
      <Inner>
        <SectionTitle>{title || "Checkout"}</SectionTitle>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--site-ink)]/55">
          {ui.body?.trim() || "Pay online when you book. At the store, choose card/UPI or cash if the business allows it."}
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/[0.06]">
            <p className="text-sm font-semibold tracking-[-0.02em]">Booking</p>
            <p className="mt-1.5 text-sm leading-6 text-[color:var(--site-ink)]/55">Online payment only — card or UPI.</p>
          </div>
          <div className="rounded-[20px] bg-white p-5 ring-1 ring-black/[0.06]">
            <p className="text-sm font-semibold tracking-[-0.02em]">At the store</p>
            <p className="mt-1.5 text-sm leading-6 text-[color:var(--site-ink)]/55">
              {cashEnabled ? "Online/card and cash are both available." : "Online/card only — cash is turned off."}
            </p>
          </div>
        </div>
      </Inner>
    </section>,
  );
}
