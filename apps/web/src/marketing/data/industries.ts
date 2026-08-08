import {
  Scissors,
  Flower2,
  Dumbbell,
  Stethoscope,
  UtensilsCrossed,
  Coffee,
  Palette,
  PencilRuler,
  PawPrint,
  type LucideIcon,
} from "lucide-react";

export interface Industry {
  slug: string;
  name: string;
  icon: LucideIcon;
  tagline: string;
  headline: string;
  intro: string;
  heroStat: { value: string; label: string };
  features: { title: string; description: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  faqs: { q: string; a: string }[];
  gradient: string;
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "salon",
    name: "Salons",
    icon: Scissors,
    tagline: "Fill chairs. Bring clients back.",
    headline: "The retention OS for salons & barbershops",
    intro:
      "Re-book clients before they drift. Stylist booking, visit-based loyalty, and AI win-backs that keep chairs full every week.",
    heroStat: { value: "+41%", label: "avg. rebooking rate lift" },
    features: [
      {
        title: "Stylist-based booking",
        description: "Clients book their favourite stylist in seconds — with reminders that cut no-shows by up to 34%.",
      },
      {
        title: "Visit-stamp loyalty",
        description: "Every 5th visit earns a free service. The AI nudges clients when they're one visit away.",
      },
      {
        title: "AI rebooking engine",
        description: "Dormant clients get personalised win-back offers on WhatsApp or SMS, automatically.",
      },
    ],
    testimonials: [
      {
        quote: "Chairs used to sit empty on Tuesdays. Now the AI fills them with win-back offers before I even look at the calendar.",
        name: "Meera Kulkarni",
        role: "Owner, Blush Salon, Pune",
      },
      {
        quote: "Re-bookings doubled in two months. Our stylists finally know exactly who's coming back and why.",
        name: "Arjun Nair",
        role: "Barbershop co-founder, Kochi",
      },
    ],
    faqs: [
      {
        q: "Can clients book a specific stylist online?",
        a: "Yes. Every service maps to staff, availability, and skill level. Clients pick their stylist and pay a deposit online.",
      },
      {
        q: "How does loyalty work in a salon?",
        a: "Award points or visit stamps per service, auto-enrol every customer via WhatsApp, and let them redeem on the spot.",
      },
    ],
    gradient: "from-[#EC4899] to-[#7C3AED]",
  },
  {
    slug: "spa",
    name: "Spas & Wellness",
    icon: Flower2,
    tagline: "Memberships that keep guests returning.",
    headline: "Serene retention for spas & wellness centres",
    intro:
      "Convert one-off pampering into monthly ritual. Package memberships, prepaid credits, and gentle AI follow-ups.",
    heroStat: { value: "2.3×", label: "lifetime value lift" },
    features: [
      {
        title: "Package & membership plans",
        description: "Monthly rituals, prepaid credits, and couple packages — billed automatically every month.",
      },
      {
        title: "Prepaid wallet",
        description: "Guests top up once and spend across treatments, products, and add-ons without friction.",
      },
      {
        title: "Gentle re-engagement",
        description: "AI schedules calm, spaced-out check-ins after every visit — no spam, no pressure.",
      },
    ],
    testimonials: [
      {
        quote: "Memberships went from zero to 60% of monthly revenue. The wallet credit system is pure genius.",
        name: "Divya Raghavan",
        role: "Director, Aura Wellness, Bengaluru",
      },
    ],
    faqs: [
      {
        q: "Can customers book multiple therapists in one visit?",
        a: "Yes — package multi-service bookings with different staff, and collect payment once at checkout.",
      },
    ],
    gradient: "from-[#06B6D4] to-[#7C3AED]",
  },
  {
    slug: "gym",
    name: "Gyms & Fitness",
    icon: Dumbbell,
    tagline: "Reduce churn. Grow memberships.",
    headline: "Membership growth & retention for gyms",
    intro:
      "Most gyms lose members within 90 days. Doloyal tracks attendance, predicts dropout risk, and re-engages before they quit.",
    heroStat: { value: "-27%", label: "member churn" },
    features: [
      {
        title: "Attendance-based retention",
        description: "AI flags members who stop coming and sends coach-crafted nudges at the right moment.",
      },
      {
        title: "Tiered memberships",
        description: "Silver, Gold, Platinum plans with auto-billing, upgrades, and family add-ons.",
      },
      {
        title: "Challenge & referral campaigns",
        description: "Referral rewards and attendance challenges that turn members into your sales team.",
      },
    ],
    testimonials: [
      {
        quote: "Churn dropped 27% in one quarter. We now see at-risk members a week before they ghost us.",
        name: "Rohit Verma",
        role: "Owner, IronHouse Fitness, Delhi",
      },
    ],
    faqs: [
      {
        q: "Can members pause or freeze plans?",
        a: "Yes. Freeze periods, add-ons, and plan switches are managed from one dashboard with automatic billing updates.",
      },
    ],
    gradient: "from-[#F59E0B] to-[#EF4444]",
  },
  {
    slug: "clinic",
    name: "Clinics & Wellness",
    icon: Stethoscope,
    tagline: "Care that follows up, automatically.",
    headline: "Patient retention for clinics & practitioners",
    intro:
      "Reduce missed follow-ups and recalls. Appointment reminders, health-package memberships, and aftercare that actually happens.",
    heroStat: { value: "-41%", label: "missed appointments" },
    features: [
      {
        title: "Smart reminders",
        description: "WhatsApp and SMS reminders with confirmations slash no-shows and idle doctor time.",
      },
      {
        title: "Follow-up automation",
        description: "AI schedules aftercare, review requests, and recall campaigns on the right cadence.",
      },
      {
        title: "Family packages",
        description: "Wellness memberships and family plans that turn one patient into five.",
      },
    ],
    testimonials: [
      {
        quote: "No-shows dropped 41%. Patients get reminders, and follow-ups happen without our front desk.",
        name: "Dr. Anjali Deshpande",
        role: "Founder, PureCare Clinics",
      },
    ],
    faqs: [
      {
        q: "Is Doloyal HIPAA / data-safe for clinics?",
        a: "We follow strict data practices including encrypted storage, access controls, and audit logs. Speak to sales for our security pack.",
      },
    ],
    gradient: "from-[#10B981] to-[#2563EB]",
  },
  {
    slug: "restaurant",
    name: "Restaurants & Cafés",
    icon: UtensilsCrossed,
    tagline: "Turn diners into regulars.",
    headline: "Guest retention for restaurants & cafés",
    intro:
      "One-time diners are expensive. Doloyal turns them into regulars with visit-based rewards, birthday treats, and re-order nudges.",
    heroStat: { value: "+29%", label: "repeat visits" },
    features: [
      {
        title: "Visit-based rewards",
        description: "Digital punch cards on WhatsApp — no app install, no friction at the counter.",
      },
      {
        title: "Table-side upsells",
        description: "Staff see each guest's tier and spend to offer the perfect upgrade or dessert.",
      },
      {
        title: "Dormant guest rescue",
        description: "AI re-engages guests who haven't visited in 60 days with a tailored offer.",
      },
    ],
    testimonials: [
      {
        quote: "Punch cards on WhatsApp changed everything. Regulars now bring friends to earn faster.",
        name: "Vikram Malhotra",
        role: "Owner, SpiceRoute, Gurgaon",
      },
    ],
    faqs: [
      {
        q: "Does it work for quick-service counters?",
        a: "Yes — a light flow with QR-based earn and redeem works great for fast, high-volume service.",
      },
    ],
    gradient: "from-[#EF4444] to-[#F59E0B]",
  },
  {
    slug: "cafe",
    name: "Cafés & Bakeries",
    icon: Coffee,
    tagline: "The 10th coffee is on us.",
    headline: "Loyalty for cafés & bakeries",
    intro:
      "High footfall, low retention. Digital loyalty cards, morning offers, and AI-timed nudges turn occasional visitors into daily regulars.",
    heroStat: { value: "3.1×", label: "visit frequency" },
    features: [
      {
        title: "Digital punch cards",
        description: "QR check-in earns stamps. Every 10th coffee free — tracked automatically.",
      },
      {
        title: "Time-based offers",
        description: "Slow-morning discounts and happy-hour pushes sent only to nearby regulars.",
      },
      {
        title: "Birthday treats",
        description: "Free pastry + surprise points on birthdays. Simple, memorable, effective.",
      },
    ],
    testimonials: [
      {
        quote: "We have regulars who scan 6 times a week. Morning lulls are gone.",
        name: "Nandita Bose",
        role: "Founder, HalfBaked Café, Kolkata",
      },
    ],
    faqs: [
      {
        q: "Can I cap rewards to busy hours?",
        a: "Yes — rewards, offers, and redemption windows are fully schedulable by day and time.",
      },
    ],
    gradient: "from-[#A16207] to-[#D97706]",
  },
  {
    slug: "beauty-studio",
    name: "Beauty Studios",
    icon: Palette,
    tagline: "Glam routines, on repeat.",
    headline: "Retention for beauty studios & aesthetics",
    intro:
      "Lashes, brows, and skin rituals are repeat businesses. Doloyal automates the rebooking cadence your clients love.",
    heroStat: { value: "+52%", label: "repeat bookings" },
    features: [
      {
        title: "Treatment-cycle reminders",
        description: "AI schedules the perfect next appointment — lashes at 3 weeks, brows at 4.",
      },
      {
        title: "Product + service rewards",
        description: "Points on services, retail, and packages — redeemed against anything you sell.",
      },
      {
        title: "Before/after galleries",
        description: "The built-in website builder showcases your work with one-tap booking.",
      },
    ],
    testimonials: [
      {
        quote: "Clients book their next appointment before they leave. The cycle reminders do the selling.",
        name: "Zara Sheikh",
        role: "Owner, ZeeGlow Studio, Mumbai",
      },
    ],
    faqs: [
      {
        q: "Can I reward retail product purchases too?",
        a: "Yes — points apply across services and products with separate rates per category.",
      },
    ],
    gradient: "from-[#D946EF] to-[#EC4899]",
  },
  {
    slug: "tattoo-studio",
    name: "Tattoo Studios",
    icon: PencilRuler,
    tagline: "Aftercare that becomes loyalty.",
    headline: "Artist booking & aftercare for tattoo studios",
    intro:
      "Artists book sessions, deposits protect your time, and aftercare follow-ups build a fanbase that keeps coming back.",
    heroStat: { value: "-58%", label: "no-shows with deposits" },
    features: [
      {
        title: "Artist portfolios & booking",
        description: "Each artist gets a portfolio page with live availability and deposit-backed bookings.",
      },
      {
        title: "Deposits & instalments",
        description: "Secure session deposits online, then collect the balance after the piece is done.",
      },
      {
        title: "Aftercare automation",
        description: "AI sends care instructions and healing check-ins — professional care, on repeat.",
      },
    ],
    testimonials: [
      {
        quote: "Deposit-backed bookings killed our no-shows. Aftercare follow-ups land us the next sleeve.",
        name: "Jake P.",
        role: "Studio lead, InkTheory, Goa",
      },
    ],
    faqs: [
      {
        q: "Can clients choose their artist online?",
        a: "Yes — each artist has their own booking page, style gallery, and availability calendar.",
      },
    ],
    gradient: "from-[#0F172A] to-[#7C3AED]",
  },
  {
    slug: "pet-grooming",
    name: "Pet Grooming",
    icon: PawPrint,
    tagline: "Happy pets. Happy owners. Regulars.",
    headline: "Loyalty for pet groomers & vet care",
    intro:
      "Pets need care on a schedule. Booking reminders, pet profiles, and visit rewards keep owners — and tails — coming back.",
    heroStat: { value: "+47%", label: "return visits" },
    features: [
      {
        title: "Pet profiles",
        description: "Track breed, size, allergies, and notes per pet — remembered forever.",
      },
      {
        title: "Grooming-schedule reminders",
        description: "AI books the next groom at the perfect interval, no matter how busy you get.",
      },
      {
        title: "Family loyalty",
        description: "Points from every pet in the family pool into one wallet for the owner.",
      },
    ],
    testimonials: [
      {
        quote: "Owners love that we remember their dog's name, size, and favourite groomer. Booking is effortless.",
        name: "Sana Iyer",
        role: "Owner, Tails&Co, Hyderabad",
      },
    ],
    faqs: [
      {
        q: "Can one family manage multiple pets?",
        a: "Yes — every pet has a profile under one owner account with pooled loyalty points.",
      },
    ],
    gradient: "from-[#0EA5E9] to-[#10B981]",
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((i) => i.slug === slug);
}

export const INDUSTRY_SLUGS = INDUSTRIES.map((i) => i.slug);