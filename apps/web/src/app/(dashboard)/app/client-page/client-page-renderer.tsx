"use client";

import * as React from "react";
import type { PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { MasterClientTemplate, type MasterConfig } from "./master-template";

/**
 * The one and only renderer for a business's customer-facing client page.
 *
 * It is rendered in exactly four places, with identical markup every time:
 *   1. the published page at /book/<slug>      (mode="published")
 *   2. the builder's desktop preview           (mode="preview", 1440px viewport)
 *   3. the builder's tablet preview            (mode="preview",  768px viewport)
 *   4. the builder's mobile preview            (mode="preview",  390px viewport)
 *
 * The only difference between the four is the width of the viewport it is
 * rendered into — the builder previews use a real iframe (see PreviewViewport)
 * so the page's own responsive breakpoints decide the layout. Nothing here is
 * viewport-aware, which is what keeps the preview honest: if it looks a certain
 * way in the builder, it looks that way when published.
 */

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

type StoredSection = { id?: unknown; enabled?: unknown; hidden?: unknown; title?: unknown };

/**
 * Normalises a saved `pageConfig` (draft or published) into template props.
 * Shared by the published page and the builder so both read the same fields
 * the same way and can never drift apart.
 */
export function masterConfigFromPageConfig(
  pageConfig: unknown,
  brandColor?: string | null,
): MasterConfig {
  const raw = (pageConfig ?? {}) as Record<string, unknown>;
  const stored = Array.isArray(raw.sections) ? (raw.sections as StoredSection[]) : [];

  const text = (...keys: string[]) => {
    for (const key of keys) {
      const value = raw[key];
      if (typeof value === "string" && value.trim()) return value;
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
    // Supports both the legacy hero field names and the ones the builder writes.
    heroHeading: text("heroHeading", "heroTitle"),
    heroDescription: text("heroDescription", "heroSubtitle"),
    heroBadge: text("heroBadge"),
    heroButtonLabel: text("heroButtonLabel"),
    featuredTitle: text("featuredTitle"),
    showSearch: typeof raw.showSearch === "boolean" ? raw.showSearch : undefined,
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
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  currency: string;
  config?: MasterConfig;
  /** "published" is the live customer page; "preview" adds builder selection chrome. */
  mode?: "published" | "preview";
  onBook: () => void;
  /** Builder only: id of the section currently open in the settings panel. */
  selectedId?: string;
  onSelect?: (id: string) => void;
  onNavigate?: (id: string) => void;
  /** Published page only: extra header controls (e.g. the theme toggle). */
  headerAccessory?: React.ReactNode;
}) {
  const brandColor = config?.brandColor || business.brandColor || "rgb(var(--color-primary))";
  const bookLabel = config?.heroButtonLabel?.trim() || "Book Now";
  const selectable = mode === "preview" ? onSelect : undefined;

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))]" data-client-page-mode={mode}>
      <header className="sticky top-0 z-50 border-b border-black/[0.08] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="h-8 w-8 rounded-[var(--radius-sm)] object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-xs font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {getInitials(business.name)}
              </div>
            )}
            <div>
              <h1 className="text-sm font-bold leading-tight">{business.name}</h1>
              <p className="text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                {business.tagline || "Book an appointment"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBook}
              className="hidden h-8 items-center rounded-md px-3 text-xs font-medium text-white sm:inline-flex"
              style={{ backgroundColor: brandColor }}
            >
              {bookLabel}
            </button>
            {headerAccessory}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 md:py-10 lg:px-8">
        <MasterClientTemplate
          business={business}
          services={services}
          currency={currency}
          config={config}
          onBook={onBook}
          onNavigate={onNavigate}
          selectedId={selectedId}
          onSelect={selectable}
        />
      </main>
    </div>
  );
}
