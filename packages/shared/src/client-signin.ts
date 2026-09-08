import type { ClientSignInBranding, ClientSignInLayout, ClientSignInPublicConfig } from "./types";

export const CLIENT_SIGNIN_FONTS = [
  "Outfit",
  "Inter",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Poppins",
  "Playfair Display",
] as const;

export const CLIENT_SIGNIN_DEFAULTS = {
  primaryColor: "#2563EB",
  backgroundColor: "#F8FAFC",
  textColor: "#0F172A",
  accentColor: "#60A5FA",
  cardColor: "#FFFFFF",
  fontFamily: "Outfit",
  layout: "centered" as ClientSignInLayout,
  cornerRadius: 16,
  buttonLabel: "Sign in",
  showGoogle: true,
  showForgotPassword: true,
  showLogo: true,
  heroImageUrl: null as string | null,
};

function pickString(raw: Record<string, unknown>, key: string): string | null {
  const value = raw[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickBool(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = raw[key];
  return typeof value === "boolean" ? value : fallback;
}

function pickNumber(raw: Record<string, unknown>, key: string, fallback: number): number {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value) : fallback;
}

export function resolveClientSignInPublicConfig(input: {
  slug: string;
  tenantId: string;
  businessName: string;
  logoUrl?: string | null;
  branding?: ClientSignInBranding | Record<string, unknown> | null;
}): ClientSignInPublicConfig {
  const raw = (input.branding || {}) as Record<string, unknown>;
  const customized = raw.customized === true;
  const defaults = CLIENT_SIGNIN_DEFAULTS;
  const layoutRaw = pickString(raw, "layout");
  const layout: ClientSignInLayout = layoutRaw === "split" ? "split" : "centered";

  if (!customized) {
    return {
      slug: input.slug,
      tenantId: input.tenantId,
      businessName: input.businessName,
      customized: false,
      logoUrl: null,
      welcomeMessage: pickString(raw, "welcomeMessage") || `Welcome to ${input.businessName}`,
      tagline: null,
      ...defaults,
    };
  }

  return {
    slug: input.slug,
    tenantId: input.tenantId,
    businessName: input.businessName,
    customized: true,
    logoUrl: pickString(raw, "logoUrl") || input.logoUrl || null,
    welcomeMessage: pickString(raw, "welcomeMessage") || `Welcome to ${input.businessName}`,
    tagline: pickString(raw, "tagline"),
    primaryColor: pickString(raw, "primaryColor") || defaults.primaryColor,
    backgroundColor: pickString(raw, "backgroundColor") || defaults.backgroundColor,
    textColor: pickString(raw, "textColor") || defaults.textColor,
    accentColor: pickString(raw, "accentColor") || defaults.accentColor,
    cardColor: pickString(raw, "cardColor") || defaults.cardColor,
    fontFamily: pickString(raw, "fontFamily") || defaults.fontFamily,
    layout,
    cornerRadius: Math.min(32, Math.max(0, pickNumber(raw, "cornerRadius", defaults.cornerRadius))),
    buttonLabel: pickString(raw, "buttonLabel") || defaults.buttonLabel,
    showGoogle: pickBool(raw, "showGoogle", defaults.showGoogle),
    showForgotPassword: pickBool(raw, "showForgotPassword", defaults.showForgotPassword),
    showLogo: pickBool(raw, "showLogo", defaults.showLogo),
    heroImageUrl: pickString(raw, "heroImageUrl"),
  };
}
