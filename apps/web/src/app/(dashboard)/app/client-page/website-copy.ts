export type BusinessType = "salon" | "gym" | "cafe" | "restaurant" | "spa" | "boutique" | "custom";

export const BUSINESS_TYPES: Array<{ id: BusinessType; label: string }> = [
  { id: "custom", label: "Custom" },
  { id: "salon", label: "Salon" },
  { id: "spa", label: "Spa" },
  { id: "gym", label: "Gym" },
  { id: "cafe", label: "Cafe" },
  { id: "restaurant", label: "Restaurant" },
  { id: "boutique", label: "Boutique" },
];

export function siteCopy(type: BusinessType = "custom") {
  const kind: BusinessType = BUSINESS_TYPES.some((item) => item.id === type) ? type : "custom";
  const book: Record<BusinessType, string> = {
    salon: "Book appointment",
    spa: "Book a session",
    gym: "Join now",
    cafe: "Reserve a table",
    restaurant: "Book a table",
    boutique: "Shop now",
    custom: "Get started",
  };
  const explore: Record<BusinessType, string> = {
    salon: "View services",
    spa: "Explore treatments",
    gym: "See programs",
    cafe: "See the menu",
    restaurant: "View the menu",
    boutique: "Browse collection",
    custom: "Explore",
  };
  const services: Record<BusinessType, string> = {
    salon: "Services",
    spa: "Treatments",
    gym: "Programs",
    cafe: "Menu",
    restaurant: "Menu",
    boutique: "Collection",
    custom: "What we offer",
  };
  const featured: Record<BusinessType, string> = {
    salon: "Popular this week",
    spa: "Signature treatments",
    gym: "Most booked",
    cafe: "House favorites",
    restaurant: "Chef's picks",
    boutique: "New in store",
    custom: "Highlights",
  };
  const intro: Record<BusinessType, string> = {
    salon: "A calmer way to book, visit, and come back.",
    spa: "Time that actually restores you.",
    gym: "Training that fits real schedules.",
    cafe: "A neighbourhood table, done properly.",
    restaurant: "An evening that feels looked after.",
    boutique: "Pieces chosen with care, not noise.",
    custom: "Designed around how people actually visit.",
  };
  const cta: Record<BusinessType, string> = {
    salon: "Ready for your next visit?",
    spa: "Save a quiet hour this week.",
    gym: "Start with a session that fits.",
    cafe: "Come in, or reserve a table.",
    restaurant: "Reserve your table.",
    boutique: "See what's in this week.",
    custom: "Ready when you are.",
  };
  return {
    book: book[kind],
    explore: explore[kind],
    services: services[kind],
    featured: featured[kind],
    intro: intro[kind],
    cta: cta[kind],
    nav: ["Home", "About", "Services", "Gallery", "Reviews", "Contact"] as const,
  };
}
