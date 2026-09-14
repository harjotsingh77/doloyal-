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
  { name: "Resend", category: "Messaging", mark: "@", gradient: "from-[#0EA5E9] to-[#2563EB]" },
  { name: "Google Business", category: "Local", mark: "G", gradient: "from-[#EA4335] to-[#FBBC05]" },
  { name: "OpenAI", category: "AI", mark: "✦", gradient: "from-[#10A37F] to-[#0E7A63]" },
];

export const INTEGRATION_GROUPS = [
  { title: "Messaging", description: "Meet customers where they already are — WhatsApp, email.", items: INTEGRATIONS.filter((i) => i.category === "Messaging") },
  { title: "Payments", description: "Collect online payments, deposits, and subscriptions.", items: INTEGRATIONS.filter((i) => i.category === "Payments") },
  { title: "Calendar", description: "Keep every calendar in perfect sync.", items: INTEGRATIONS.filter((i) => i.category === "Calendar") },
  { title: "Social & local", description: "Turn profiles and maps listings into bookings.", items: INTEGRATIONS.filter((i) => i.category === "Local") },
  { title: "Platforms", description: "AI infrastructure that powers the assistant.", items: INTEGRATIONS.filter((i) => i.category === "AI") },
];
