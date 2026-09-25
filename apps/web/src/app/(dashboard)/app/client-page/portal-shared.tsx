"use client";

import * as React from "react";
import type { ClientPortal } from "@doloyal/shared";
import { getApiBaseUrl } from "@/lib/api-base";

export type BusinessType = "salon" | "gym" | "cafe" | "restaurant" | "spa" | "boutique" | "custom";

export type HeroSlide = {
  id: string;
  kind: "image" | "video";
  src: string;
  poster?: string;
};

export type SectionUi = {
  eyebrow?: string;
  body?: string;
  cta?: string;
  secondaryCta?: string;
  emptyText?: string;
  layout?: "cards" | "grid" | "list" | "image" | "horizontal" | "masonry" | "slider";
  columns?: 1 | 2 | 3 | 4;
  showPrice?: boolean;
  showDuration?: boolean;
  showImage?: boolean;
  showCta?: boolean;
  showRating?: boolean;
  showAvatar?: boolean;
  showBalance?: boolean;
  showCounters?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWhatsapp?: boolean;
  showMap?: boolean;
  showSocial?: boolean;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  overlayText?: string;
  coupon?: string;
  validity?: string;
  discount?: string;
  imagePosition?: "left" | "right";
  featuredCount?: number;
  mapZoom?: number;
  mapHeight?: number;
  stat1Label?: string;
  stat1Value?: string;
  stat2Label?: string;
  stat2Value?: string;
  stat3Label?: string;
  stat3Value?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
  formTitle?: string;
};

export type MasterConfig = {
  heroHeading?: string;
  heroDescription?: string;
  heroBadge?: string;
  heroButtonLabel?: string;
  bookingButtonLabel?: string;
  showSearch?: boolean;
  pinChrome?: boolean;
  featuredTitle?: string;
  visibleSections?: string[];
  sectionTitles?: Record<string, string>;
  brandColor?: string;
  businessType?: BusinessType;
  heroMode?: "image" | "video" | "slider";
  heroSlides?: HeroSlide[];
  heroVideoSrc?: string;
  heroOverlay?: number;
  heroAlign?: "left" | "center";
  heroHeight?: "compact" | "default" | "tall";
  secondaryCta?: string;
  autoSlide?: boolean;
  slideMs?: number;
  marqueeEnabled?: boolean;
  marqueeText?: string;
  animations?: boolean;
  hoverEffects?: boolean;
  navStyle?: "solid" | "transparent" | "blur";
  socialAnimations?: boolean;
  serviceColumns?: 2 | 3 | 4;
  introHeading?: string;
  introBody?: string;
  ctaHeading?: string;
  ctaBody?: string;
  videoUrl?: string;
  galleryUrls?: string[];
  offerTitle?: string;
  offerBody?: string;
  offerCta?: string;
  websiteVersion?: number;
  websiteLayout?: number;
  faqs?: Array<{ question: string; answer: string }>;
  testimonials?: Array<{ name: string; text: string; rating?: number }>;
  sectionUi?: Record<string, SectionUi>;
  /** When true (default), walk-in purchases offer Cash alongside online/card. */
  checkoutCashEnabled?: boolean;
};

export function sectionUi(config?: MasterConfig, id?: string): SectionUi {
  if (!id) return {};
  return config?.sectionUi?.[id] ?? {};
}

export const SECTION_ANCHORS: Record<string, string> = {
  hero: "portal-hero",
  intro: "portal-intro",
  services: "portal-catalog",
  featured: "portal-services",
  booking: "portal-booking",
  loyalty: "portal-loyalty",
  rewards: "portal-rewards",
  membership: "portal-membership",
  referrals: "portal-referrals",
  reviews: "portal-reviews",
  about: "portal-about",
  contact: "portal-contact",
  hours: "portal-hours",
  gallery: "portal-gallery",
  offers: "portal-offers",
  faq: "portal-faq",
  testimonials: "portal-testimonials",
  video: "portal-video",
  social: "portal-social",
  map: "portal-map",
  cta: "portal-cta",
  checkout: "portal-checkout",
  footer: "portal-footer",
};

export const PORTAL_TO_SECTION: Record<string, string> = Object.fromEntries(
  Object.entries(SECTION_ANCHORS).map(([section, portal]) => [portal, section]),
);

export const FRIENDLY_TITLES: Record<string, string> = {
  intro: "Welcome in",
  services: "What we offer",
  featured: "Highlights",
  booking: "Book a time",
  loyalty: "Your points",
  rewards: "Rewards",
  membership: "Membership",
  referrals: "Invite a friend",
  reviews: "What people say",
  about: "Our story",
  contact: "Visit us",
  hours: "Hours",
  gallery: "Inside",
  offers: "This week",
  faq: "Questions",
  testimonials: "From guests",
  video: "See the space",
  social: "Follow along",
  map: "Find us",
  cta: "Ready when you are",
  checkout: "Checkout",
  footer: "Find us",
};

export type CatalogTab = "browse" | "members" | "treatments";

export type PortalNavKey =
  | "overview"
  | "services"
  | "membership"
  | "booking"
  | "rewards"
  | "referrals"
  | "reviews"
  | "profile";

export type PortalChrome = {
  isBuilder: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
  titleFor: (id: string, fallback: string) => string;
};

export function formatPrice(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

export function firstName(full?: string | null) {
  const part = full?.trim().split(/\s+/)[0];
  return part || "there";
}

export function formatVisit(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Soon";
  return date.toLocaleString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function nextAppointment(portal?: ClientPortal | null) {
  const now = Date.now();
  return (portal?.appointments ?? [])
    .filter((apt) => {
      const start = new Date(apt.startTime).getTime();
      if (Number.isNaN(start) || start < now) return false;
      const status = (apt.status || "").toUpperCase();
      return !["CANCELLED", "CANCELED", "NO_SHOW", "COMPLETED"].includes(status);
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
}

export const CATEGORY_ART = [
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1519415387722-a1c3bbef716e?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=1400&q=80",
];

const CATEGORY_PHOTOS: Record<string, string> = {
  skin: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=900&q=80",
  nails: "https://images.unsplash.com/photo-1519014816548-c5aa952acff6?auto=format&fit=crop&w=900&q=80",
  hair: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=900&q=80",
  wellness: "https://images.unsplash.com/photo-1544161515-4af6b4e9ddaf?auto=format&fit=crop&w=900&q=80",
  makeup: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=900&q=80",
  spa: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?auto=format&fit=crop&w=900&q=80",
  massage: "https://images.unsplash.com/photo-1544161515-4af6b4e9ddaf?auto=format&fit=crop&w=900&q=80",
};

export function catalogImageSrc(url: string | null | undefined, fallback: string) {
  if (!url) return fallback;
  if (url.startsWith("data:") || url.startsWith("blob:") || /^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  return `${String(base).replace(/\/+$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}

export function artFor(seed: string, index = 0) {
  const key = seed.toLowerCase();
  for (const [name, url] of Object.entries(CATEGORY_PHOTOS)) {
    if (key.includes(name)) return url;
  }
  return CATEGORY_ART[index % CATEGORY_ART.length];
}

export function screenPx(value: number) {
  return `calc(${value}px / var(--preview-scale, 1))`;
}

/** Preview is portaled into an iframe — always query that document, not the dashboard. */
export function previewDocument(from?: HTMLElement | null) {
  return from?.ownerDocument ?? document;
}

const ANCHOR_OFFSET = 88;

function jumpScroller(scroller: HTMLElement, top: number) {
  scroller.scrollTop = Math.max(0, top);
}

export function scrollAnchorIntoView(anchor: string, from?: HTMLElement | null) {
  const doc = previewDocument(from);
  const node = (doc.getElementById(anchor) ?? doc.querySelector(`[data-section-id="${anchor.replace(/^portal-/, "")}"]`)) as HTMLElement | null;
  if (!node) return;

  const win = doc.defaultView;
  let scroller: HTMLElement | null = node.parentElement;
  while (scroller && scroller !== doc.body && scroller !== doc.documentElement) {
    const overflowY = win?.getComputedStyle(scroller).overflowY ?? "";
    if (/(auto|scroll|overlay)/.test(overflowY) && scroller.scrollHeight > scroller.clientHeight + 8) {
      const top = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - ANCHOR_OFFSET;
      jumpScroller(scroller, top);
      return;
    }
    scroller = scroller.parentElement;
  }

  // Chromium iframes with overflow-y:auto on <html> ignore scrollIntoView({behavior:"auto"|"smooth"})
  // and window.scrollTo. Assigning scrollTop (or behavior:"instant") is what actually moves the page.
  const scrollingEl = (doc.scrollingElement ?? doc.documentElement) as HTMLElement;
  jumpScroller(scrollingEl, node.getBoundingClientRect().top + scrollingEl.scrollTop - ANCHOR_OFFSET);
  if (win && Math.abs((node.getBoundingClientRect().top ?? 0) - ANCHOR_OFFSET) > 8) {
    try {
      node.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start", inline: "nearest" });
    } catch {
      node.scrollIntoView(true);
    }
  }
}

export function scrollToSection(id: string, onNavigate?: (id: string) => void, from?: HTMLElement | null) {
  if (onNavigate) onNavigate(id);
  scrollAnchorIntoView(id, from);
}

export function SelectableBlock({
  sid,
  chrome,
  children,
}: {
  sid: string;
  chrome: PortalChrome;
  children: React.ReactNode;
}) {
  const isSelected = chrome.isBuilder && chrome.selectedId === sid;
  if (!chrome.isBuilder) return <>{children}</>;
  return (
    <div
      data-section-id={sid}
      onClick={(e) => {
        e.stopPropagation();
        chrome.onSelect?.(sid);
      }}
      className={`relative cursor-pointer transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${sid === "hero" || sid === "footer" ? "" : "rounded-[28px]"} ${isSelected ? "outline outline-[color:var(--site-accent,#2563EB)]" : "outline outline-[color:transparent] hover:outline-[color:rgba(23,23,23,.18)]"}`}
      style={{ outlineWidth: screenPx(isSelected ? 2 : 1), outlineOffset: screenPx(3) }}
    >
      {isSelected && (
        <span
          className="absolute z-10 whitespace-nowrap bg-[color:var(--site-ink,#171717)] font-semibold leading-none text-white"
          style={{
            left: screenPx(14),
            top: screenPx(14),
            fontSize: screenPx(10),
            padding: `${screenPx(5)} ${screenPx(8)}`,
            borderRadius: screenPx(999),
          }}
        >
          {sid === "hero" ? "Home" : chrome.titleFor(sid, sid)}
        </span>
      )}
      {children}
    </div>
  );
}

export function LoungeButton({
  children,
  onClick,
  tone = "solid",
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "solid" | "ghost" | "light";
  className?: string;
}) {
  const palette =
    tone === "ghost"
      ? "bg-transparent text-[color:var(--site-ink,#171717)] ring-1 ring-black/10 hover:bg-black/[0.04]"
      : tone === "light"
        ? "bg-white text-[color:var(--site-ink,#171717)] hover:bg-black/[0.04]"
        : "bg-[color:var(--site-accent,#111)] text-white hover:brightness-110";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${palette} ${className}`}
    >
      {children}
    </button>
  );
}

export function PortalNavButton({
  icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={`flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-left text-[13px] font-medium transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        active
          ? "bg-[#1c1410] text-[#f6efe4] shadow-[0_10px_24px_rgba(28,20,16,.16)]"
          : danger
            ? "text-[#b42318] hover:bg-[#fff1ee]"
            : "text-[#1c1410]/55 hover:bg-white/70 hover:text-[#1c1410]"
      }`}
    >
      <span className="[&>svg]:h-[17px] [&>svg]:w-[17px] [&>svg]:stroke-[1.5]">{icon}</span>
      {label}
    </button>
  );
}

export function MobileNavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${active ? "text-[#f6efe4]" : "text-[#f6efe4]/45 hover:text-[#f6efe4]"}`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-full [&>svg]:h-[16px] [&>svg]:w-[16px] [&>svg]:stroke-[1.5] ${active ? "bg-[#f6efe4] text-[#1c1410]" : "bg-transparent"}`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] font-medium text-[color:var(--site-accent,#2563EB)]">{children}</p>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-2 max-w-[18ch] text-3xl font-semibold tracking-[-0.045em] text-[color:var(--site-ink,#171717)] sm:text-[2.35rem] sm:leading-[1.1]">
      {children}
    </h3>
  );
}
