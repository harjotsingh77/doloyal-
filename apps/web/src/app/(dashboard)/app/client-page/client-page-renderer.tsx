"use client";

import * as React from "react";
import type { AuthUser, ClientPortal, PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { MasterClientTemplate, type MasterConfig } from "./master-template";
import { clientPageBrand, liveCopy } from "./client-page-brand";
import { readableTextColor } from "@/lib/branding";
import type { HeroSlide } from "./portal-shared";

type StoredSection = { id?: unknown; enabled?: unknown; hidden?: unknown; title?: unknown };

function asBool(value: unknown, fallback?: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asNum(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && liveCopy(value)) return value;
  }
  return undefined;
}

const STRIPPED_APP_IDS = ["booking", "orders", "loyalty", "rewards", "membership", "referrals"];

function restoreVisibleSectionIds(
  stored: StoredSection[],
  layout?: number,
): string[] {
  const ids = stored.filter((s) => s?.enabled !== false && !s?.hidden).map((s) => String(s.id));
  if (layout !== 3) return ids;
  const have = new Set(ids);
  const extras = STRIPPED_APP_IDS.filter((id) => !have.has(id));
  if (!extras.length) return ids;
  const at = Math.max(0, ids.indexOf("services")) + 1;
  return [...ids.slice(0, at || 1), ...extras, ...ids.slice(at || 1)];
}

export function masterConfigFromPageConfig(
  pageConfig: unknown,
  brandColor?: string | null,
): MasterConfig {
  const raw = (pageConfig ?? {}) as Record<string, unknown>;
  const stored = Array.isArray(raw.sections) ? (raw.sections as StoredSection[]) : [];

  const sectionTitles: Record<string, string> = {};
  for (const section of stored) {
    if (typeof section?.title === "string" && section.title.trim()) {
      sectionTitles[String(section.id)] = section.title;
    }
  }

  const gallery = Array.isArray(raw.gallery)
    ? (raw.gallery as Array<{ url?: string } | string>)
        .map((item) => (typeof item === "string" ? item : item?.url))
        .filter((url): url is string => !!url)
    : Array.isArray(raw.galleryUrls)
      ? (raw.galleryUrls as unknown[]).filter((url): url is string => typeof url === "string")
      : undefined;

  const faqs = Array.isArray(raw.faqs)
    ? (raw.faqs as Array<{ question?: string; answer?: string }>)
        .filter((item) => item?.question && item?.answer)
        .map((item) => ({ question: String(item.question), answer: String(item.answer) }))
    : undefined;

  const testimonials = Array.isArray(raw.testimonials)
    ? (raw.testimonials as Array<{ name?: string; text?: string; rating?: number }>)
        .filter((item) => item?.name && item?.text)
        .map((item) => ({ name: String(item.name), text: String(item.text), rating: item.rating }))
    : undefined;

  const slides = Array.isArray(raw.heroSlides)
    ? (raw.heroSlides as HeroSlide[]).filter((slide) => slide?.src)
    : undefined;

  const serviceColumns = asNum(raw.serviceColumns);
  const overlay = asNum(raw.heroOverlay);
  const slideMs = asNum(raw.slideMs);

  return {
    heroHeading: asText(raw.heroHeading, raw.heroTitle),
    heroDescription: asText(raw.heroDescription, raw.heroSubtitle),
    heroBadge: asText(raw.heroBadge),
    heroButtonLabel: asText(raw.heroButtonLabel, raw.heroCta),
    bookingButtonLabel: asText(raw.bookingButtonLabel),
    featuredTitle: asText(raw.featuredTitle),
    showSearch: asBool(raw.showSearch),
    pinChrome: asBool(raw.pinChrome, true),
    businessType: (["salon", "gym", "cafe", "restaurant", "spa", "boutique", "custom"] as const).includes(raw.businessType as never)
      ? (raw.businessType as MasterConfig["businessType"])
      : "custom",
    heroMode: raw.heroMode === "video" || raw.heroMode === "slider" || raw.heroMode === "image" ? raw.heroMode : undefined,
    heroSlides: slides,
    heroVideoSrc: asText(raw.heroVideoSrc),
    heroOverlay: overlay,
    heroAlign: raw.heroAlign === "center" || raw.heroAlign === "left" ? raw.heroAlign : undefined,
    heroHeight: raw.heroHeight === "compact" || raw.heroHeight === "tall" || raw.heroHeight === "default" ? raw.heroHeight : undefined,
    secondaryCta: asText(raw.secondaryCta),
    autoSlide: asBool(raw.autoSlide, true),
    slideMs,
    marqueeEnabled: asBool(raw.marqueeEnabled, false),
    marqueeText: asText(raw.marqueeText),
    animations: asBool(raw.animations, true),
    hoverEffects: asBool(raw.hoverEffects, true),
    navStyle: raw.navStyle === "solid" || raw.navStyle === "transparent" || raw.navStyle === "blur" ? raw.navStyle : "blur",
    socialAnimations: asBool(raw.socialAnimations, true),
    serviceColumns: serviceColumns === 2 || serviceColumns === 4 || serviceColumns === 3 ? serviceColumns : 3,
    introHeading: asText(raw.introHeading),
    introBody: asText(raw.introBody),
    ctaHeading: asText(raw.ctaHeading),
    ctaBody: asText(raw.ctaBody),
    videoUrl: asText(raw.videoUrl),
    galleryUrls: gallery,
    offerTitle: asText(raw.offerTitle),
    offerBody: asText(raw.offerBody),
    offerCta: asText(raw.offerCta),
    faqs,
    testimonials,
    websiteVersion: asNum(raw.websiteVersion),
    sectionUi: raw.sectionUi && typeof raw.sectionUi === "object" && !Array.isArray(raw.sectionUi)
      ? raw.sectionUi as MasterConfig["sectionUi"]
      : undefined,
    checkoutCashEnabled: (() => {
      const nested = raw.checkout && typeof raw.checkout === "object" && !Array.isArray(raw.checkout)
        ? (raw.checkout as { cashEnabled?: unknown }).cashEnabled
        : undefined;
      if (typeof nested === "boolean") return nested;
      if (typeof raw.checkoutCashEnabled === "boolean") return raw.checkoutCashEnabled;
      return true;
    })(),
    ...(stored.length
      ? { visibleSections: restoreVisibleSectionIds(stored, asNum(raw.websiteLayout)) }
      : {}),
    ...(Object.keys(sectionTitles).length ? { sectionTitles } : {}),
    brandColor: brandColor ?? undefined,
  };
}

export function ClientPageRenderer({
  business,
  services,
  currency,
  config,
  mode = "published",
  onBook,
  selectedId,
  onSelect,
  onNavigate,
  headerAccessory,
  portal,
  user,
  onLogout,
  onLogin,
  focusKey,
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  currency: string;
  config?: MasterConfig;
  mode?: "published" | "preview";
  onBook: (service?: PublicService) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  onNavigate?: (id: string) => void;
  headerAccessory?: React.ReactNode;
  portal?: ClientPortal | null;
  user?: AuthUser | null;
  onLogout?: () => void;
  onLogin?: () => void;
  focusKey?: number;
}) {
  const brand = clientPageBrand(business);
  const accent = config?.brandColor && /^#[0-9a-fA-F]{6}$/.test(config.brandColor) ? config.brandColor : brand.accent;
  const accentForeground = readableTextColor(accent);
  const selectable = mode === "preview" ? onSelect : undefined;

  React.useEffect(() => {
    const id = "client-site-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="client-site min-h-[100dvh] overflow-x-hidden [&_[id^='portal-']]:scroll-mt-24"
      data-client-page-mode={mode}
      style={{
        background: brand.background,
        color: brand.ink,
        fontFamily: "Outfit, ui-sans-serif, system-ui, sans-serif",
        ["--site-accent" as string]: accent,
        ["--site-accent-fg" as string]: accentForeground,
        ["--site-ink" as string]: brand.ink,
        ["--site-bg" as string]: brand.background,
        ["--lounge-accent" as string]: accent,
        ["--lounge-accent-fg" as string]: accentForeground,
        ["--lounge-ink" as string]: brand.ink,
        ["--lounge-bg" as string]: brand.background,
      }}
    >
      <MasterClientTemplate
        business={business}
        services={services}
        currency={currency}
        config={config}
        onBook={onBook}
        onNavigate={onNavigate}
        selectedId={selectedId}
        onSelect={selectable}
        focusKey={focusKey}
        portal={portal}
        user={user}
        onLogout={onLogout}
        onLogin={onLogin}
        headerAccessory={headerAccessory}
      />
    </div>
  );
}
