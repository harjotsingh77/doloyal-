import {
  Sparkles,
  Gift,
  BadgePercent,
  CalendarDays,
  Globe2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";

export interface AppFeature {
  slug: string;
  name: string;
  icon: LucideIcon;
  tagline: string;
  headline: string;
  intro: string;
  bullets: string[];
  stat: { value: string; label: string };
  gradient: string;
}

export const FEATURES: AppFeature[] = [
  {
    slug: "ai-retention",
    name: "AI Retention",
    icon: Sparkles,
    tagline: "Predict churn. Win customers back.",
    headline: "An AI that never lets a customer quietly leave",
    intro:
      "Doloyal's retention engine scores every customer, predicts who's about to churn, and takes action — automatically, in the channel they prefer.",
    bullets: [
      "Churn scoring on every customer, refreshed daily",
      "Automated win-back campaigns with personalised offers",
      "Delivery across WhatsApp, SMS & email",
      "Learn from every campaign to improve next time",
    ],
    stat: { value: "38%", label: "avg. retention lift" },
    gradient: "from-[#2563EB] to-[#7C3AED]",
  },
  {
    slug: "loyalty",
    name: "Loyalty",
    icon: Gift,
    tagline: "Points, tiers, and perks they love.",
    headline: "A loyalty program customers actually use",
    intro:
      "Design earning rules, tiers, and rewards that fit your business — then let every customer join in one tap on WhatsApp.",
    bullets: [
      "Points, visits, and spend-based earning rules",
      "Silver, Gold & Platinum tiers auto-advance",
      "Customers join via WhatsApp, SMS or QR",
      "Real-time balance & rewards on any device",
    ],
    stat: { value: "2.4M+", label: "loyalty points issued monthly" },
    gradient: "from-[#EC4899] to-[#D946EF]",
  },
  {
    slug: "rewards",
    name: "Rewards",
    icon: BadgePercent,
    tagline: "Rewards that drive repeat visits.",
    headline: "Freebies, discounts, and perks on autopilot",
    intro:
      "From birthday treats to spend thresholds, tailor rewards that pull customers back — automatically redeemed, no manual work.",
    bullets: [
      "Free-service, discount & points rewards",
      "Birthday and anniversary surprises",
      "Referral rewards that grow your base",
      "Redemption analytics in real time",
    ],
    stat: { value: "₹412", label: "avg. spend lift per redemption" },
    gradient: "from-[#F59E0B] to-[#EF4444]",
  },
  {
    slug: "booking",
    name: "Booking System",
    icon: CalendarDays,
    tagline: "Bookings without the phone tag.",
    headline: "Online booking that fills your calendar",
    intro:
      "Let customers book 24/7 from your website, Instagram, or WhatsApp. Automatic reminders, deposits, and staff sync built in.",
    bullets: [
      "Your own booking page in under a minute",
      "WhatsApp confirmations & smart reminders",
      "Deposits & prepayment to cut no-shows",
      "Syncs with Google Calendar seamlessly",
    ],
    stat: { value: "-34%", label: "no-shows after automation" },
    gradient: "from-[#06B6D4] to-[#2563EB]",
  },
  {
    slug: "website-builder",
    name: "Website Builder",
    icon: Globe2,
    tagline: "A website that books for you.",
    headline: "Beautiful websites with booking built-in",
    intro:
      "Launch a stunning, mobile-first website in minutes. No code, no designer, no waiting — and every page converts to bookings.",
    bullets: [
      "Drag-and-drop blocks, pro-designed templates",
      "Booking & loyalty embedded on every page",
      "SEO-ready, fast, and mobile-first",
      "Live on your own domain or doloyal.site",
    ],
    stat: { value: "5 min", label: "from blank to live website" },
    gradient: "from-[#10B981] to-[#06B6D4]",
  },
  {
    slug: "marketing-automation",
    name: "Marketing Automation",
    icon: Megaphone,
    tagline: "Campaigns that run themselves.",
    headline: "The right message, at the right moment",
    intro:
      "Set it once and let automation run campaigns on birthdays, anniversaries, lapses, and reorder cycles — across every channel.",
    bullets: [
      "Campaigns on WhatsApp, SMS & email",
      "Triggers: birthday, lapse, reorder, milestone",
      "AI-generated copy in your brand voice",
      "Open, click & ROI reporting built in",
    ],
    stat: { value: "6×", label: "faster than manual follow-ups" },
    gradient: "from-[#7C3AED] to-[#D946EF]",
  },
];

export function getFeature(slug: string): AppFeature | undefined {
  return FEATURES.find((f) => f.slug === slug);
}