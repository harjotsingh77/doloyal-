/** Centralized tenant branding helpers.
 *
 * Every consumer (sidebar, previews, customer-facing pages) must derive
 * logos / names / colors through these helpers so the fallback chain is
 * enforced in exactly one place and never renders "undefined" or empty labels.
 *
 * Fallback chain:
 *   logo      → tenant.logoUrl → default Doloyal logo
 *   name      → tenant.brandName → tenant.name → "Doloyal"
 *   shortName → tenant.brandShortName → first word of display name → "Doloyal"
 */

/** Default workspace logo shipped with the platform. */
export const DEFAULT_BRAND_LOGO = "/8bg.png";

export const BRAND_COLOR_DEFAULTS = {
  primary: "#2563EB",
  secondary: "#64748B",
  accent: "#F59E0B",
} as const;

const FALLBACK_NAME = "Doloyal";

/* ── Color math ──────────────────────────────────────────────────────────── */

export function isHexColor(value: string | null | undefined): value is string {
  return !!value && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** "#2563EB" → "37 99 235" (space-separated triplet for rgb(var(--x)) tokens). */
export function hexToRgbTriplet(hex: string): string | null {
  if (!isHexColor(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

function channelShade(channel: number, amount: number): number {
  if (amount >= 0) {
    // Lighten toward white.
    return Math.round(channel + (255 - channel) * amount);
  }
  // Darken toward black.
  return Math.round(channel * (1 + amount));
}

/** Negative amount darkens, positive lightens. Returns a 6-digit hex. */
export function shadeHex(hex: string, amount: number): string {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return hex;
  const [r, g, b] = triplet.split(" ").map(Number);
  const toHex = (v: number) => channelShade(v, amount).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function srgbChannelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a hex color. */
export function relativeLuminance(hex: string): number {
  const triplet = hexToRgbTriplet(hex);
  if (!triplet) return 0;
  const [r, g, b] = triplet.split(" ").map(Number);
  return (
    0.2126 * srgbChannelLuminance(r) +
    0.7152 * srgbChannelLuminance(g) +
    0.0722 * srgbChannelLuminance(b)
  );
}

/** WCAG contrast ratio between two hex colors (1–21). */
export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when white text on this color fails WCAG AA for normal text (<4.5). */
export function failsContrastWithWhite(bg: string): boolean {
  if (!isHexColor(bg)) return false;
  return contrastRatio("#FFFFFF", bg) < 4.5;
}

/** Picks black or white text depending on which reads better on `bg`. */
export function readableTextColor(bg: string): string {
  if (!isHexColor(bg)) return "#FFFFFF";
  return contrastRatio("#FFFFFF", bg) >= 4.5 ? "#FFFFFF" : "#111111";
}

/* ── Brand resolution ────────────────────────────────────────────────────── */

/** Structural subset so callers may pass a full Tenant or a partial draft. */
type BrandSource = {
  name?: string | null;
  brandName?: string | null;
  brandShortName?: string | null;
  logoUrl?: string | null;
} | null | undefined;

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) return trimmed;
  }
  return "";
}

export function getBusinessDisplayName(tenant: BrandSource): string {
  return firstNonEmpty(tenant?.brandName, tenant?.name) || FALLBACK_NAME;
}

export function getBrandShortName(tenant: BrandSource): string {
  const explicit = firstNonEmpty(tenant?.brandShortName);
  if (explicit) return explicit;
  const displayName = getBusinessDisplayName(tenant);
  return displayName.split(/\s+/)[0] || FALLBACK_NAME;
}

export function getBrandLogo(tenant: BrandSource): string {
  return firstNonEmpty(tenant?.logoUrl) || DEFAULT_BRAND_LOGO;
}

/** True when the workspace shows its own logo rather than the platform default. */
export function hasCustomLogo(tenant: BrandSource): boolean {
  return Boolean(firstNonEmpty(tenant?.logoUrl));
}

export function getBrandInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return "D";
  const words = clean.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase() || "D";
}
