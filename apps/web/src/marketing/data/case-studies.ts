export interface CaseStudy {
  slug: string;
  business: string;
  industry: string;
  summary: string;
  quote: string;
  person: string;
  role: string;
  metrics: { value: string; label: string; delta: string }[];
  gradient: string;
}

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "blush-salon",
    business: "Blush Salon & Spa",
    industry: "Salon · Bengaluru",
    summary:
      "A 12-chair salon replacing three tools with one platform. Loyalty, stylist booking, and AI win-backs in a single dashboard.",
    quote:
      "We replaced our loyalty app, booking tool, and spreadsheets with Doloyal. Retention is up 38% and no one chases customers manually anymore.",
    person: "Meera Kulkarni",
    role: "Founder",
    metrics: [
      { value: "+38%", label: "customer retention", delta: "in 2 quarters" },
      { value: "+41%", label: "rebooking rate", delta: "via AI nudges" },
      { value: "3→1", label: "tools replaced", delta: "one dashboard" },
    ],
    gradient: "from-[#EC4899] to-[#7C3AED]",
  },
  {
    slug: "ironhouse-fitness",
    business: "IronHouse Fitness",
    industry: "Gym · Delhi",
    summary:
      "A 1,200-member gym fighting seasonal churn. Attendance AI flags at-risk members a week before they quit.",
    quote:
      "The AI flagged 40 members about to quit. We won back 27 in two weeks — twice the membership fee recovered.",
    person: "Rohit Verma",
    role: "Owner",
    metrics: [
      { value: "-27%", label: "member churn", delta: "in one quarter" },
      { value: "67%", label: "at-risk win-back", delta: "from AI nudges" },
      { value: "₹8L+", label: "annual revenue saved", delta: "estimated" },
    ],
    gradient: "from-[#F59E0B] to-[#EF4444]",
  },
  {
    slug: "purecare-clinics",
    business: "PureCare Clinics",
    industry: "Clinic · Pune",
    summary:
      "A three-location clinic fixing no-shows and missed follow-ups with reminders and automated recalls.",
    quote:
      "No-shows dropped 41%. Patients get reminders, and follow-ups happen without our front desk lifting a finger.",
    person: "Dr. Anjali Deshpande",
    role: "Founder",
    metrics: [
      { value: "-41%", label: "missed appointments", delta: "with reminders" },
      { value: "+28%", label: "follow-up completion", delta: "automated recalls" },
      { value: "9 hrs", label: "saved per week", delta: "front-desk time" },
    ],
    gradient: "from-[#10B981] to-[#2563EB]",
  },
  {
    slug: "halfbaked-cafe",
    business: "HalfBaked Café",
    industry: "Café · Kolkata",
    summary:
      "A specialty café with heavy footfall and no repeat data. Digital punch cards on WhatsApp changed everything.",
    quote:
      "We have regulars who scan six times a week. Morning lulls are gone and our 10th-coffee-free card is pure magic.",
    person: "Nandita Bose",
    role: "Founder",
    metrics: [
      { value: "3.1×", label: "visit frequency", delta: "among active members" },
      { value: "+29%", label: "repeat visits", delta: "in one quarter" },
      { value: "1,400+", label: "members joined", delta: "via WhatsApp" },
    ],
    gradient: "from-[#D946EF] to-[#EC4899]",
  },
];

export function getCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}