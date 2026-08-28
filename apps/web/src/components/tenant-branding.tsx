"use client";

import * as React from "react";
import { useTenant } from "@/lib/tenant-query";
import { BRAND_COLOR_DEFAULTS, hexToRgbTriplet, shadeHex } from "@/lib/branding";
import type { Tenant } from "@doloyal/shared";

/**
 * Tenant-aware branding runtime.
 *
 * Reads the active business from the tenant cache and publishes its brand
 * tokens as CSS custom properties on <html>. Every themed component consumes
 * the standard tokens (rgb(var(--color-primary)) etc.), so one write here
 * re-skins the whole workspace — no per-page changes, no hardcoded colors.
 *
 * Properties are removed on unmount so platform-level surfaces (/admin)
 * always render with pure Doloyal branding.
 */

const BRAND_TOKEN_PROPERTIES = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--brand-background",
  "--brand-text",
] as const;

/** Workspace chrome follows the primary brand color only. Secondary/accent/
 * background/text stay available as --brand-* tokens for customer-facing
 * surfaces (booking pages, portals) so an odd palette can never compromise
 * workspace readability or accessibility. */
function styleFor(tenant: Tenant | undefined): Record<string, string> {
  const triplet = (value: string | null | undefined, fallback: string) =>
    hexToRgbTriplet(value || "") || hexToRgbTriplet(fallback)!;

  const primary = tenant?.brandColor || BRAND_COLOR_DEFAULTS.primary;

  return {
    "--brand-primary": triplet(primary, BRAND_COLOR_DEFAULTS.primary),
    "--brand-secondary": triplet(tenant?.secondaryColor, BRAND_COLOR_DEFAULTS.secondary),
    "--brand-accent": triplet(tenant?.accentColor, BRAND_COLOR_DEFAULTS.accent),
    "--brand-background": triplet(tenant?.backgroundColor, "#FFFFFF"),
    "--brand-text": triplet(tenant?.textColor, "#111111"),
    // Drive the existing workspace theme tokens from the brand primary.
    "--color-primary": `var(--brand-primary)`,
    "--ring": `var(--brand-primary)`,
    // Derived hover/pressed state so buttons keep depth without the owner
    // having to pick extra colors.
    "--color-accent-strong": hexToRgbTriplet(shadeHex(primary, -0.18))!,
  };
}

export function TenantBrandingSync() {
  const { data: tenant } = useTenant();

  const styles = styleFor(tenant);
  // Canonical identity of the applied theme — stable across unrelated renders.
  const styleKey = Object.values(styles).join("|");

  React.useEffect(() => {
    const root = document.documentElement;
    for (const [property, value] of Object.entries(styles)) {
      root.style.setProperty(property, value);
    }
    return () => {
      for (const property of Object.keys(styles)) {
        root.style.removeProperty(property);
      }
      for (const property of BRAND_TOKEN_PROPERTIES) {
        root.style.removeProperty(property);
      }
    };
    // Re-apply only when the resolved brand values actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleKey]);

  return null;
}
