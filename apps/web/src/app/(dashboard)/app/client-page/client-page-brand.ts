import type { PublicBusinessInfo, Tenant } from "@doloyal/shared";
import {
  getBrandInitials,
  getBusinessDescription,
  getBusinessDisplayName,
  getBusinessTagline,
  hasCustomLogo,
  PAGE_SURFACE_DEFAULTS,
  readableTextColor,
  resolvePageAccent,
  resolvePageBackground,
  resolvePageText,
} from "@/lib/branding";

/** Spa template copy that must not override live brand settings. */
const STOCK_HERO = {
  heading: "Find Your Glow Up.",
  description: "Browse our curated services and treatments, designed around the way you want to feel.",
  badge: "PREMIUM TREATMENTS",
};

export function liveCopy(value?: string | null, stock?: string): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  if (stock && trimmed === stock) return "";
  if (Object.values(STOCK_HERO).includes(trimmed)) return "";
  return trimmed;
}

export function heroHeadingFromBrand(business: PublicBusinessInfo, override?: string | null) {
  return liveCopy(override, STOCK_HERO.heading) || getBusinessDisplayName(business);
}

export function heroDescriptionFromBrand(business: PublicBusinessInfo, override?: string | null) {
  return liveCopy(override, STOCK_HERO.description) || getBusinessDescription(business);
}

export function heroBadgeFromBrand(business: PublicBusinessInfo, override?: string | null) {
  return liveCopy(override, STOCK_HERO.badge) || getBusinessTagline(business);
}

export function clientPageBrand(business: PublicBusinessInfo) {
  const displayName = getBusinessDisplayName(business);
  const accent = resolvePageAccent(business.brandColor);
  const background = resolvePageBackground(business.backgroundColor);
  const ink = resolvePageText(business.textColor);
  return {
    displayName,
    initials: getBrandInitials(displayName),
    logoUrl: hasCustomLogo(business) ? business.logoUrl!.trim() : null,
    tagline: getBusinessTagline(business),
    description: getBusinessDescription(business),
    coverUrl: business.coverBannerUrl?.trim() || null,
    accent,
    accentForeground: readableTextColor(accent),
    background,
    ink,
    fontFamily: business.fontFamily?.trim() || "Outfit, ui-sans-serif, system-ui, sans-serif",
  };
}

export function brandingGaps(tenant: Tenant | null) {
  const gaps: Array<{ key: "logo" | "name" | "description"; label: string }> = [];
  if (!tenant) {
    return [
      { key: "name" as const, label: "brand name" },
      { key: "logo" as const, label: "logo" },
      { key: "description" as const, label: "description" },
    ];
  }
  if (!hasCustomLogo(tenant)) gaps.push({ key: "logo", label: "logo" });
  if (!tenant.brandName?.trim()) gaps.push({ key: "name", label: "brand name" });
  if (!getBusinessDescription(tenant)) gaps.push({ key: "description", label: "description" });
  return gaps;
}

export { PAGE_SURFACE_DEFAULTS, STOCK_HERO };
