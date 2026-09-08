"use client";

import * as React from "react";
import type { ClientPortal, PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { MasterClientTemplate, type MasterConfig } from "./master-template";
import { scrollAnchorIntoView } from "./portal-shared";
import { clientPageBrand, liveCopy } from "./client-page-brand";
import { readableTextColor } from "@/lib/branding";
import { cn } from "@doloyal/ui";

type StoredSection = { id?: unknown; enabled?: unknown; hidden?: unknown; title?: unknown };

export function masterConfigFromPageConfig(
  pageConfig: unknown,
  brandColor?: string | null,
): MasterConfig {
  const raw = (pageConfig ?? {}) as Record<string, unknown>;
  const stored = Array.isArray(raw.sections) ? (raw.sections as StoredSection[]) : [];

  const text = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string" && liveCopy(value)) return value;
    }
    return undefined;
  };

  const sectionTitles: Record<string, string> = {};
  for (const section of stored) {
    if (typeof section?.title === "string" && section.title.trim()) {
      sectionTitles[String(section.id)] = section.title;
    }
  }

  return {
    heroHeading: text("heroHeading", "heroTitle"),
    heroDescription: text("heroDescription", "heroSubtitle"),
    heroBadge: text("heroBadge"),
    heroButtonLabel: text("heroButtonLabel"),
    bookingButtonLabel: text("bookingButtonLabel"),
    featuredTitle: text("featuredTitle"),
    showSearch: typeof raw.showSearch === "boolean" ? raw.showSearch : undefined,
    pinChrome: typeof raw.pinChrome === "boolean" ? raw.pinChrome : undefined,
    ...(stored.length
      ? { visibleSections: stored.filter((s) => s?.enabled !== false && !s?.hidden).map((s) => String(s.id)) }
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
  onLogout,
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
  onLogout?: () => void;
  focusKey?: number;
}) {
  const brand = clientPageBrand(business);
  const accent = config?.brandColor && /^#[0-9a-fA-F]{6}$/.test(config.brandColor) ? config.brandColor : brand.accent;
  const accentForeground = readableTextColor(accent);
  const bookLabel = config?.heroButtonLabel?.trim() || "Book a visit";
  const selectable = mode === "preview" ? onSelect : undefined;
  const builder = mode === "preview";
  const subtitle = brand.tagline || brand.description;
  const pinChrome = config?.pinChrome === true;

  React.useEffect(() => {
    const id = "client-lounge-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,520;9..144,600&family=Outfit:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);

  return (
    <div
      className="client-lounge min-h-screen [&_[id^='portal-']]:scroll-mt-28"
      data-client-page-mode={mode}
      style={{
        background: brand.background,
        color: brand.ink,
        fontFamily: brand.fontFamily,
        ["--lounge-accent" as string]: accent,
        ["--lounge-accent-fg" as string]: accentForeground,
        ["--lounge-ink" as string]: brand.ink,
        ["--lounge-bg" as string]: brand.background,
        ["--lounge-header-h" as string]: "5.25rem",
        ["--font-lounge-display" as string]: "Fraunces, Iowan Old Style, Palatino, Georgia, serif",
        ...(pinChrome ? { paddingTop: "var(--lounge-header-h)" } : {}),
      }}
    >
      <header className={cn(
        "z-40 px-3 pt-3 pb-2 sm:px-5",
        pinChrome ? "fixed inset-x-0 top-0 bg-[color:var(--lounge-bg)]/95 backdrop-blur-xl" : "relative",
      )}>
        <div className="mx-auto flex max-w-[1520px] items-center justify-between rounded-full bg-white/90 px-3 py-2 ring-1 ring-black/[0.08] sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={brand.displayName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold"
                style={{ backgroundColor: accent, color: accentForeground }}
                title={builder ? "Add a logo in Brand settings" : undefined}
              >
                {brand.initials}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold leading-tight">{brand.displayName}</h1>
              {subtitle ? (
                <p className="truncate text-[11px] text-[color:var(--lounge-ink)]/45">{subtitle}</p>
              ) : builder ? (
                <p className="truncate text-[11px] text-amber-800/80">Add a tagline or description in Brand settings</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                if (onNavigate) onNavigate("portal-reviews");
                else scrollAnchorIntoView("portal-reviews", event.currentTarget);
              }}
              className="hidden h-9 items-center rounded-full px-3.5 text-xs font-semibold text-[color:var(--lounge-ink)] ring-1 ring-black/10 sm:inline-flex"
            >
              Leave a note
            </button>
            <button
              type="button"
              onClick={() => onBook()}
              className="hidden h-9 items-center rounded-full px-4 text-xs font-semibold sm:inline-flex"
              style={{ backgroundColor: accent, color: accentForeground }}
            >
              {bookLabel}
            </button>
            {headerAccessory}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1520px] px-4 pb-6 pt-2 md:px-6 md:pb-8">
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
          onLogout={onLogout}
        />
      </main>
    </div>
  );
}
