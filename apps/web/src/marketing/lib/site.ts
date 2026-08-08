export const site = {
  name: "Doloyal",
  legalName: "Doloyal AI",
  domain: "doloyal.ai",
  url: "https://doloyal.ai",
  tagline: "The AI Customer Retention OS for Local Businesses",
  description:
    "Doloyal unifies loyalty, rewards, memberships, online booking, website building, and AI-driven retention for salons, spas, gyms, clinics, and local businesses — in one platform.",
  ogImage: "https://doloyal.ai/og.png",
  logo: "/logo-full.png",
  logoMark: "/logo-symbol.png",
  email: "hello@doloyal.ai",
  social: {
    twitter: "https://x.com/doloyal",
    linkedin: "https://www.linkedin.com/company/doloyal",
    instagram: "https://www.instagram.com/doloyal",
    youtube: "https://www.youtube.com/@doloyal",
  },
} as const;

export const nav = [
  { label: "Features", href: "/features" },
  { label: "Solutions", href: "/solutions" },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources" },
  { label: "FAQ", href: "/pricing#faq" },
] as const;

export const trustBadges = [
  "No credit card required",
  "14-day free trial",
  "Setup in 5 minutes",
] as const;

export const heroStats = [
  { value: "1,000+", label: "local businesses" },
  { value: "2.4M+", label: "customers tracked" },
  { value: "38%", label: "avg. retention lift" },
] as const;