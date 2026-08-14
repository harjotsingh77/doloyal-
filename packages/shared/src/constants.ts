/**
 * doloyal AI — shared constants: brand palette, navigation, defaults.
 */

export const BRAND = {
  name: "doloyal AI",
  shortName: "doloyal AI",
  tagline: "The AI Customer Retention OS for local business",
  description:
    "Turn first-time visitors into lifelong regulars. doloyal AI unifies loyalty, rewards, memberships, marketing automation, and AI-driven retention in one platform.",
  primary: "#2563EB",
  accent: "#60A5FA",
  success: "#10B981",
  danger: "#EF4444",
  warning: "#F59E0B",
  background: "#F8FAFC",
} as const;

export const SUPPORT_EMAIL = "hello@doloyal.ai";

export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_CURRENCY_SYMBOL = "₹";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";

/** Currency symbol map for the few currencies we expect. */
export const CURRENCY_SYMBOL: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
};

export function currencySymbol(code: string): string {
  return CURRENCY_SYMBOL[code] ?? code;
}

/** Format a monetary amount using locale rules for the given currency. */
export function formatMoney(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

export function formatCompact(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${currencySymbol(currency)}${amount}`;
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number, digits = 1): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function relativeTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffDays) >= 1) return rtf.format(diffDays, "day");
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) >= 1) return rtf.format(diffHours, "hour");
  const diffMins = Math.round(diffMs / (1000 * 60));
  return rtf.format(diffMins, "minute");
}

/** Format a timestamp as a short time + date (e.g. "2:34 PM · Aug 5"). */
export function formatTime(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });
  const day = date.toLocaleDateString("en", { month: "short", day: "numeric" });
  return `${time} · ${day}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic pastel avatar background from a string seed. */
export function avatarColor(seed: string): string {
  const palette = [
    "#2563EB",
    "#60A5FA",
    "#10B981",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#06B6D4",
    "#EF4444",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length]!;
}

/** App sidebar navigation. Used by both the shell and the landing page. */
export interface NavItem {
  label: string;
  href: string;
  icon: string; // lucide icon name
  /** Permissions required to see this item; empty = visible to all staff. */
  requires?: string[];
  badge?: "new" | "soon";
}

export const APP_NAV: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: "LayoutDashboard" },
  { label: "Customers", href: "/app/customers", icon: "Users", requires: ["customers:read"] },
  { label: "Appointments", href: "/app/appointments", icon: "CalendarDays", requires: ["appointments:read"] },
  { label: "Booking Links", href: "/app/appointments/booking-links", icon: "Link", requires: ["appointments:manage"] },
  { label: "Loyalty", href: "/app/loyalty", icon: "Sparkles", requires: ["loyalty:read"] },
  { label: "Rewards", href: "/app/rewards", icon: "Gift", requires: ["loyalty:read"] },
  { label: "Memberships", href: "/app/memberships", icon: "Crown", requires: ["loyalty:read"] },
  { label: "Referrals", href: "/app/referrals", icon: "Share2" },
  { label: "Campaigns", href: "/app/campaigns", icon: "Megaphone", requires: ["campaigns:manage"] },
  { label: "Doloyal AI", href: "/app/assistant", icon: "Bot", requires: ["ai:use"], badge: "new" },
  { label: "Analytics", href: "/app/analytics", icon: "BarChart3", requires: ["analytics:read"] },
  { label: "Invoices", href: "/app/invoices", icon: "FileText", requires: ["invoices:read"] },
  { label: "Staff", href: "/app/staff", icon: "IdCard", requires: ["staff:read"] },
  { label: "Branches", href: "/app/branches", icon: "Store", requires: ["branches:read"] },
  { label: "Integrations", href: "/app/integrations", icon: "Puzzle" },
  { label: "Website Builder", href: "/app/websites", icon: "Globe", badge: "new" },
  { label: "Website Connections", href: "/app/website-connections", icon: "Link2", badge: "new" },
  { label: "Settings", href: "/app/settings", icon: "Settings", requires: ["settings:manage"] },
  { label: "Billing", href: "/app/billing", icon: "CreditCard" },
  { label: "Help", href: "/app/help", icon: "CircleHelp" },
];

/** Suggested prompts shown on the AI assistant empty state. */
export const ASSISTANT_SUGGESTIONS = [
  "Analyze today's sales",
  "Show revenue report",
  "Find inactive customers",
  "Generate campaign",
  "Predict next month's revenue",
  "Create WhatsApp campaign",
];
