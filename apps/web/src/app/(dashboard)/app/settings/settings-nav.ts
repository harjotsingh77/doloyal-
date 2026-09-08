"use client";

import {
  User,
  Building2,
  CalendarCheck,
  Bell,
  Share2,
  Scale,
  Shield,
  Users,
  CreditCard,
  Puzzle,
  SunMoon,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";

export interface SettingsNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  /** Extra search keywords matched against the query. */
  keywords?: string[];
}

export interface SettingsNavGroup {
  section: string;
  items: SettingsNavItem[];
}

/**
 * Single source of truth for the settings IA, navigation and search index.
 */
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    section: "Account",
    items: [
      {
        id: "profile",
        label: "Profile",
        href: "/app/settings/profile",
        icon: User,
        description: "Your personal account details",
        keywords: ["name", "email", "phone", "avatar", "photo", "account", "user"],
      },
    ],
  },
  {
    section: "Workspace",
    items: [
      {
        id: "business-profile",
        label: "Business Profile",
        href: "/app/settings/business-profile",
        icon: Building2,
        description: "Business info, logo, brand colors and hours",
        keywords: [
          "logo", "name", "brand", "tagline", "gst", "registration", "phone", "whatsapp",
          "email", "website", "address", "maps", "category", "description",
          "color", "primary", "secondary", "accent", "font", "favicon", "preview", "theme color",
          "currency", "language", "timezone", "date format", "time format", "region", "locale",
          "opening", "closing", "break", "weekly off", "schedule", "timing", "open hours",
          "city", "state", "zip", "country", "google", "review", "place id", "gbp",
        ],
      },
    ],
  },
  {
    section: "Customer Experience",
    items: [
      {
        id: "booking",
        label: "Booking",
        href: "/app/settings/booking",
        icon: CalendarCheck,
        description: "Online booking and walk-in availability",
        keywords: ["online booking", "walk-ins", "appointments", "scheduling", "booking link"],
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/app/settings/notifications",
        icon: Bell,
        description: "Transactional channels and marketing emails",
        keywords: ["email", "sms", "whatsapp", "marketing", "alerts", "reminders"],
      },
    ],
  },
  {
    section: "Business Presence",
    items: [
      {
        id: "social",
        label: "Social Links",
        href: "/app/settings/social",
        icon: Share2,
        description: "Instagram, Facebook, Google Business and more",
        keywords: ["instagram", "facebook", "linkedin", "youtube", "google business", "social media"],
      },
      {
        id: "legal",
        label: "Legal",
        href: "/app/settings/legal",
        icon: Scale,
        description: "Privacy, terms, refund and cancellation policies",
        keywords: ["privacy policy", "terms", "refund", "cancellation", "policies"],
      },
    ],
  },
  {
    section: "Security & Access",
    items: [
      {
        id: "security",
        label: "Security",
        href: "/app/settings/security",
        icon: Shield,
        description: "Password, two-factor authentication and sessions",
        keywords: ["password", "2fa", "two-factor", "sessions", "logout", "login", "security"],
      },
      {
        id: "team",
        label: "Team & Access",
        href: "/app/settings/team",
        icon: Users,
        description: "Team members, roles and invitations",
        keywords: ["staff", "team", "roles", "permissions", "invitations", "members"],
      },
    ],
  },
  {
    section: "Plan & Add-ons",
    items: [
      {
        id: "billing",
        label: "Billing & Plan",
        href: "/app/settings/billing",
        icon: CreditCard,
        description: "Current plan, usage and invoices",
        keywords: ["plan", "subscription", "invoice", "payment", "billing cycle", "price"],
      },
      {
        id: "integrations",
        label: "Integrations",
        href: "/app/settings/integrations",
        icon: Puzzle,
        description: "Connected apps like Razorpay and WhatsApp",
        keywords: ["razorpay", "whatsapp", "google", "stripe", "connected apps", "api"],
      },
      {
        id: "appearance",
        label: "Appearance",
        href: "/app/settings/appearance",
        icon: SunMoon,
        description: "Light, dark or system theme",
        keywords: ["theme", "dark mode", "light mode", "system", "appearance"],
      },
    ],
  },
  {
    section: "Danger Zone",
    items: [
      {
        id: "danger",
        label: "Danger Zone",
        href: "/app/settings/danger",
        icon: AlertTriangle,
        description: "Deactivate your business",
        keywords: ["deactivate", "delete", "close business", "danger", "remove"],
      },
    ],
  },
];

export const SETTINGS_FLAT_NAV = SETTINGS_NAV.flatMap((g) => g.items);

export interface SettingsSearchResult extends SettingsNavItem {
  group: string;
}

/** Simple client-side search across names, descriptions and keywords. */
export function searchSettings(query: string): SettingsSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);

  const scored: { item: SettingsSearchResult; score: number }[] = [];
  for (const group of SETTINGS_NAV) {
    for (const item of group.items) {
      const haystackLabel = item.label.toLowerCase();
      const haystackDesc = item.description.toLowerCase();
      const haystackKeywords = (item.keywords ?? []).join(" ").toLowerCase();
      let score = 0;

      for (const term of terms) {
        if (haystackLabel === term) score += 6;
        else if (haystackLabel.startsWith(term)) score += 4;
        else if (haystackLabel.includes(term)) score += 3;
        else if (haystackKeywords.includes(term)) score += 2;
        else if (haystackDesc.includes(term)) score += 1;
      }

      if (score > 0) {
        scored.push({ item: { ...item, group: group.section }, score });
      }
    }
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
}
