import type { BusinessType } from "./website-copy";

/**
 * Visual personality of the public client page, derived from the business
 * type chosen in the builder. The layout and sections are the same for every
 * business; typography, corner radii and surface tone change so a gym, a
 * salon and a cafe each feel like their own place. The owner's brand color
 * stays the single accent in every theme.
 */
export type SiteTheme = {
  id: "athletic" | "atelier" | "hearth" | "studio";
  /** Display face for headings (CSS font-family value). */
  display: string;
  /** Body face. */
  body: string;
  /** Google Fonts stylesheet with both faces. */
  fontHref: string;
  headingWeight: number;
  headingCase: "none" | "uppercase";
  headingTracking: string;
  radius: { lg: string; md: string; sm: string; button: string };
  /** How far the alternate section surface moves from the page background toward the ink. */
  surfaceMix: number;
};

const BODY = '"Outfit", ui-sans-serif, system-ui, sans-serif';
const OUTFIT = "family=Outfit:wght@400;500;600;700";

const THEMES: Record<SiteTheme["id"], SiteTheme> = {
  // Gyms and studios: condensed, confident, squared-off.
  athletic: {
    id: "athletic",
    display: '"Archivo", ui-sans-serif, system-ui, sans-serif',
    body: BODY,
    fontHref: `https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,600..800&${OUTFIT}&display=swap`,
    headingWeight: 800,
    headingCase: "uppercase",
    headingTracking: "-0.01em",
    radius: { lg: "18px", md: "14px", sm: "10px", button: "10px" },
    surfaceMix: 5,
  },
  // Salons, spas and boutiques: editorial serif, soft corners.
  atelier: {
    id: "atelier",
    display: '"Fraunces", ui-serif, Georgia, serif',
    body: BODY,
    fontHref: `https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..600&${OUTFIT}&display=swap`,
    headingWeight: 450,
    headingCase: "none",
    headingTracking: "-0.025em",
    radius: { lg: "32px", md: "24px", sm: "14px", button: "999px" },
    surfaceMix: 3.5,
  },
  // Cafes and restaurants: warm, friendly grotesk with a menu-board feel.
  hearth: {
    id: "hearth",
    display: '"Bricolage Grotesque", ui-sans-serif, system-ui, sans-serif',
    body: BODY,
    fontHref: `https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&${OUTFIT}&display=swap`,
    headingWeight: 700,
    headingCase: "none",
    headingTracking: "-0.035em",
    radius: { lg: "26px", md: "20px", sm: "12px", button: "999px" },
    surfaceMix: 4.5,
  },
  // Everything else: clean, neutral, professional.
  studio: {
    id: "studio",
    display: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
    body: BODY,
    fontHref: `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&${OUTFIT}&display=swap`,
    headingWeight: 700,
    headingCase: "none",
    headingTracking: "-0.035em",
    radius: { lg: "24px", md: "18px", sm: "12px", button: "999px" },
    surfaceMix: 3.5,
  },
};

export function siteTheme(type?: BusinessType | null): SiteTheme {
  switch (type) {
    case "gym":
      return THEMES.athletic;
    case "salon":
    case "spa":
    case "boutique":
      return THEMES.atelier;
    case "cafe":
    case "restaurant":
      return THEMES.hearth;
    default:
      return THEMES.studio;
  }
}

/** CSS custom properties consumed by the client page (see globals.css `.client-site`). */
export function siteThemeVars(theme: SiteTheme): Record<string, string> {
  return {
    "--site-display": theme.display,
    "--site-body": theme.body,
    "--site-heading-weight": String(theme.headingWeight),
    "--site-heading-case": theme.headingCase,
    "--site-heading-tracking": theme.headingTracking,
    "--site-r-lg": theme.radius.lg,
    "--site-r-md": theme.radius.md,
    "--site-r-sm": theme.radius.sm,
    "--site-r-btn": theme.radius.button,
    "--site-surface": `color-mix(in srgb, var(--site-bg) ${100 - theme.surfaceMix}%, var(--site-ink))`,
    "--site-card": "color-mix(in srgb, var(--site-bg) 55%, #ffffff)",
  };
}
