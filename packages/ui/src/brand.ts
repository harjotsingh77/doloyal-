/**
 * Brand tokens as JS constants (mirror of styles.css). Useful for inline
 * styles, chart colors, and anywhere Tailwind classes don't reach (e.g.
 * SVG fills inside recharts).
 */
export const BRAND_COLORS = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  accent: "#60A5FA",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  violet: "#8B5CF6",
  pink: "#EC4899",
  cyan: "#06B6D4",
  background: "#F8FAFC",
} as const;

/** Chart palette tuned to look good against both light & dark backgrounds. */
export const CHART_PALETTE = [
  BRAND_COLORS.primary,
  BRAND_COLORS.accent,
  BRAND_COLORS.success,
  BRAND_COLORS.violet,
  BRAND_COLORS.warning,
  BRAND_COLORS.cyan,
  BRAND_COLORS.pink,
] as const;

export const RADIANS_PER_DEG = Math.PI / 180;
