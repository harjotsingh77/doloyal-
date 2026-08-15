export interface Integration {
  name: string;
  category: string;
  mark: string;
  gradient: string;
}

export const INTEGRATIONS: Integration[] = [
  { name: "Google Calendar", category: "Calendar", mark: "G", gradient: "from-[#4285F4] to-[#34A853]" },
  { name: "WhatsApp", category: "Messaging", mark: "W", gradient: "from-[#25D366] to-[#128C7E]" },
  { name: "Stripe", category: "Payments", mark: "S", gradient: "from-[#635BFF] to-[#8B6BFF]" },
  { name: "Razorpay", category: "Payments", mark: "R", gradient: "from-[#3395FF] to-[#0B49D6]" },
  { name: "OpenAI", category: "AI", mark: "✦", gradient: "from-[#10A37F] to-[#0E7A63]" },
  { name: "Google Business", category: "Local", mark: "G", gradient: "from-[#EA4335] to-[#FBBC05]" },
  { name: "WordPress", category: "CMS", mark: "W", gradient: "from-[#21759B] to-[#0F4C6E]" },
  { name: "Shopify", category: "Commerce", mark: "S", gradient: "from-[#95BF47] to-[#5E8E3E]" },
  { name: "Instagram", category: "Social", mark: "◎", gradient: "from-[#E1306C] to-[#833AB4]" },
  { name: "Facebook", category: "Social", mark: "f", gradient: "from-[#1877F2] to-[#0B5CD6]" },
  { name: "Cloudinary", category: "Media", mark: "C", gradient: "from-[#3448C5] to-[#1F2A7A]" },
  { name: "Email", category: "Messaging", mark: "@", gradient: "from-[#0EA5E9] to-[#2563EB]" },
  { name: "Calendar", category: "Calendar", mark: "▤", gradient: "from-[#F59E0B] to-[#D97706]" },
];

export const INTEGRATION_GROUPS = [
  { title: "Messaging", description: "Meet customers where they already are — WhatsApp, email.", items: INTEGRATIONS.filter((i) => i.category === "Messaging") },
  { title: "Payments", description: "Collect online payments, deposits, and subscriptions.", items: INTEGRATIONS.filter((i) => i.category === "Payments") },
  { title: "Calendar", description: "Keep every calendar in perfect sync.", items: INTEGRATIONS.filter((i) => i.category === "Calendar") },
  { title: "Social & local", description: "Turn profiles and maps listings into bookings.", items: INTEGRATIONS.filter((i) => i.category === "Social" || i.category === "Local") },
  { title: "Commerce & web", description: "Connect the storefronts and sites you already run.", items: INTEGRATIONS.filter((i) => i.category === "Commerce" || i.category === "CMS") },
  { title: "Platforms", description: "AI and media infrastructure that power it all.", items: INTEGRATIONS.filter((i) => i.category === "AI" || i.category === "Media") },
];