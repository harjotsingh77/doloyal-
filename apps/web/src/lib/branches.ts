/**
 * Branch registry + deterministic per-branch data generation.
 *
 * The app stores the branch catalog in localStorage under `doloyal_branches`
 * (kept compatible with the Branches page). Every branch-scoped page derives
 * its data from a PRNG seeded by the branch id, so numbers are stable across
 * reloads and consistent between the workspace dashboard and its sub-pages.
 */

export interface BranchRecord {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: "Active" | "Paused";
  staffCount: number;
  todayAppointments: number;
  todayRevenue: number;
}

export interface BranchProfile extends BranchRecord {
  mapLocation: string;
  gst: string;
  openingHours: string;
  closingHours: string;
  breakTime: string;
  workingDays: string[];
  accent: string;
  serviceCategories: string[];
}

const STORAGE_KEY = "doloyal_branches";

export const BRANCH_SEED: BranchProfile[] = [
  {
    id: "b1",
    name: "Downtown Flagship",
    address: "42 MG Road, Ashok Nagar, Bangalore 560001",
    phone: "+91 98765 43210",
    email: "downtown@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Active",
    staffCount: 12,
    todayAppointments: 18,
    todayRevenue: 48500,
    mapLocation: "12.9756° N, 77.6067° E",
    gst: "29AABCT1234F1Z5",
    openingHours: "09:00",
    closingHours: "21:00",
    breakTime: "14:00 - 15:00",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    accent: "#8B5CF6",
    serviceCategories: ["Haircut", "Coloring", "Spa", "Nails", "Facial", "Shave"],
  },
  {
    id: "b2",
    name: "Whitefield Branch",
    address: "25 ITPL Main Road, Whitefield, Bangalore 560066",
    phone: "+91 98765 43211",
    email: "whitefield@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Active",
    staffCount: 8,
    todayAppointments: 11,
    todayRevenue: 32200,
    mapLocation: "12.9698° N, 77.7499° E",
    gst: "29AAECW5678G1Z8",
    openingHours: "10:00",
    closingHours: "20:00",
    breakTime: "14:30 - 15:30",
    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    accent: "#06B6D4",
    serviceCategories: ["Haircut", "Spa", "Facial", "Nails"],
  },
  {
    id: "b3",
    name: "Indiranagar Hub",
    address: "100 Feet Road, Indiranagar, Bangalore 560038",
    phone: "+91 98765 43212",
    email: "indiranagar@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Paused",
    staffCount: 5,
    todayAppointments: 0,
    todayRevenue: 0,
    mapLocation: "12.9719° N, 77.6412° E",
    gst: "29AAOCI9012K1Z2",
    openingHours: "09:30",
    closingHours: "20:30",
    breakTime: "14:00 - 15:00",
    workingDays: ["Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    accent: "#10B981",
    serviceCategories: ["Haircut", "Coloring", "Shave", "Spa"],
  },
];

export function getBranches(): BranchProfile[] {
  if (typeof window === "undefined") return BRANCH_SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return BRANCH_SEED;
    const parsed = JSON.parse(raw) as BranchProfile[];
    if (!Array.isArray(parsed) || parsed.length === 0) return BRANCH_SEED;
    return parsed.map((b) => {
      const seed = BRANCH_SEED.find((s) => s.id === b.id);
      return { ...(seed ?? BRANCH_SEED[0]!), ...b };
    });
  } catch {
    return BRANCH_SEED;
  }
}

export function saveBranches(branches: BranchProfile[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(branches));
  window.dispatchEvent(new Event("doloyal:branches-updated"));
}

export function getBranch(id: string): BranchProfile | null {
  return getBranches().find((b) => b.id === id) ?? null;
}

/* ── Deterministic PRNG ─────────────────────────────────────────────── */

export function seedFromString(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return function mulberry32() {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRandom(branchId: string, salt = 0) {
  return seedFromString(`${branchId}:${salt}`);
}

export function pickWeighted<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

/* ── Shared data pools ──────────────────────────────────────────────── */

const CUSTOMER_NAMES = [
  "Aarav Sharma", "Ishaan Verma", "Riya Kapoor", "Ananya Iyer", "Vikram Mehta",
  "Sneha Patel", "Arjun Nair", "Kavya Reddy", "Rohan Gupta", "Priya Menon",
  "Aditya Singh", "Divya Krishnan", "Karan Malhotra", "Nisha Agarwal", "Rahul Joshi",
  "Meera Pillai", "Sanjay Rao", "Pooja Desai", "Nikhil Chawla", "Anjali Bhat",
  "Farhan Ali", "Sanya Bhatia", "Devansh Kulkarni", "Ira Shah", "Manav Kaur",
  "Tara Mishra", "Kabir Sethi", "Zara Khan", "Yash Thakur", "Aisha Banerjee",
];

const STAFF_NAMES = [
  "Ramesh Kumar", "Sunita Devi", "Amit Chaudhary", "Neha Saxena", "Rajesh Tiwari",
  "Kavita Rani", "Vijay Anand", "Deepa Menon", "Suresh Pillai", "Maya Iyer",
  "Prakash Reddy", "Lakshmi Nair",
];

const STAFF_ROLES = ["Stylist", "Barber", "Therapist", "Nail Artist", "Makeup Artist", "Dermatologist", "Senior Stylist", "Spa Therapist"];

export const SERVICES = [
  "Signature Haircut", "Hair Coloring", "Deep Tissue Massage", "Gel Manicure",
  "Gold Facial", "Classic Shave", "Keratin Treatment", "Head Spa",
  "Pedicure", "Beard Grooming", "Bridal Makeup", "Threading",
];

const APPOINTMENT_STATUS = ["Completed", "Completed", "Completed", "In Progress", "Upcoming", "Upcoming", "No-show", "Cancelled"] as const;

const INVOICE_STATUS = ["Paid", "Paid", "Paid", "Partial", "Unpaid", "Overdue"] as const;

const CAMPAIGNS = [
  { name: "Monsoon Membership Offer", channel: "WhatsApp" },
  { name: "Weekend Glow Sale", channel: "SMS" },
  { name: "Loyalty Points Boost", channel: "Email" },
  { name: "New Customer Welcome", channel: "Instagram" },
  { name: "Referral Bonus Week", channel: "WhatsApp" },
  { name: "Festival Family Pack", channel: "SMS" },
];

const BOOKING_LINK_NAMES = [
  "Homepage Booking", "Instagram Profile", "Google Business", "WhatsApp Quick Book",
  "Event Microsite", "Email Signature",
];

/* ── Per-branch generators ──────────────────────────────────────────── */

export interface BranchCustomer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  visits: number;
  membership: string | null;
  loyaltyPoints: number;
  lifetimeValue: number;
  status: "Active" | "At Risk" | "Inactive";
  churnRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface BranchStaff {
  id: string;
  name: string;
  role: string;
  attendance: number;
  revenue: number;
  appointments: number;
  rating: number;
  performance: number;
  commission: number;
  leaves: number;
  workingHours: number;
  present: boolean;
}

export interface BranchAppointment {
  id: string;
  customer: string;
  service: string;
  staff: string;
  date: string;
  time: string;
  status: string;
  payment: string;
  amount: number;
}

export interface BranchInvoice {
  id: string;
  customer: string;
  amount: number;
  status: string;
  date: string;
  items: number;
  method: string;
}

export interface BranchMembership {
  id: string;
  customer: string;
  plan: string;
  status: "Active" | "Expired" | "Expiring Soon";
  price: number;
  startedAt: string;
  expiresAt: string;
  renewals: number;
}

export interface BranchReferral {
  id: string;
  referrer: string;
  friend: string;
  channel: string;
  date: string;
  status: string;
  reward: number;
}

export interface BranchCampaign {
  id: string;
  name: string;
  channel: string;
  clicks: number;
  leads: number;
  bookings: number;
  revenue: number;
  spend: number;
  sentAt: string;
}

export interface BranchReward {
  id: string;
  name: string;
  pointsCost: number;
  redeemed: number;
  stock: number;
}

export interface BranchLink {
  id: string;
  name: string;
  url: string;
  bookings: number;
  clicks: number;
  conversion: number;
}

export interface TrendPoint {
  date: string;
  revenue?: number;
  appointments?: number;
  customers?: number;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function generateCustomers(branchId: string, count = 24): BranchCustomer[] {
  const rng = createSeededRandom(branchId, 1);
  const phoneBase = (hashStr(branchId) % 9000000000) + 1000000000;
  return Array.from({ length: count }, (_, i) => {
    const name = pickWeighted(rng, CUSTOMER_NAMES);
    const visits = 1 + Math.floor(rng() * 26);
    const points = Math.floor(rng() * 2400);
    const ltv = Math.round((1200 + rng() * 26000) / 10) * 10;
    const lastDays = Math.floor(rng() * 60);
    const riskRoll = rng();
    const status: BranchCustomer["status"] =
      visits <= 2 ? "Inactive" : lastDays > 40 ? "At Risk" : "Active";
    const churnRisk: BranchCustomer["churnRisk"] =
      riskRoll > 0.82 ? "CRITICAL" : riskRoll > 0.6 ? "HIGH" : riskRoll > 0.32 ? "MEDIUM" : "LOW";
    return {
      id: `${branchId}-c${i + 1}`,
      name,
      phone: `+91 ${phoneBase + i}`.slice(0, 14),
      email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@gmail.com`,
      lastVisit: daysAgo(lastDays),
      visits,
      membership: rng() > 0.55 ? (rng() > 0.5 ? "Gold" : "Silver") : null,
      loyaltyPoints: points,
      lifetimeValue: ltv,
      status,
      churnRisk,
    };
  }).sort((a, b) => b.lifetimeValue - a.lifetimeValue);
}

export function generateStaff(branchId: string): BranchStaff[] {
  const rng = createSeededRandom(branchId, 2);
  const count = 6 + Math.floor(rng() * 6);
  return Array.from({ length: count }, (_, i) => {
    const revenue = Math.round((40000 + rng() * 140000) / 100) * 100;
    const appointments = 40 + Math.floor(rng() * 160);
    const rating = Math.round((4 + rng()) * 10) / 10;
    const attendance = Math.round((88 + rng() * 11) * 10) / 10;
    const present = rng() > 0.18;
    return {
      id: `${branchId}-s${i + 1}`,
      name: pickWeighted(rng, STAFF_NAMES),
      role: pickWeighted(rng, STAFF_ROLES),
      attendance,
      revenue,
      appointments,
      rating,
      performance: Math.round(rng() * 100),
      commission: Math.round(revenue * (0.08 + rng() * 0.06)),
      leaves: Math.floor(rng() * 6),
      workingHours: Math.round((150 + rng() * 60) * 10) / 10,
      present,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

export function generateAppointments(branchId: string): BranchAppointment[] {
  const rng = createSeededRandom(branchId, 3);
  const customers = generateCustomers(branchId, 18).map((c) => c.name);
  const staff = generateStaff(branchId).map((s) => s.name);
  const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
  return Array.from({ length: 16 }, (_, i) => {
    const status = pickWeighted(rng, APPOINTMENT_STATUS as unknown as string[]);
    const isUpcoming = status === "Upcoming" || status === "In Progress";
    const amount = Math.round((700 + rng() * 4200) / 10) * 10;
    return {
      id: `${branchId}-a${i + 1}`,
      customer: pickWeighted(rng, customers),
      service: pickWeighted(rng, SERVICES),
      staff: pickWeighted(rng, staff),
      date: isUpcoming ? daysAhead(Math.floor(rng() * 5)) : daysAgo(Math.floor(rng() * 14)),
      time: pickWeighted(rng, hours),
      status,
      payment: status === "Completed" ? (rng() > 0.15 ? "Paid" : "Pending") : status === "Cancelled" ? "Refunded" : "—",
      amount,
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
}

export function generateInvoices(branchId: string): BranchInvoice[] {
  const rng = createSeededRandom(branchId, 4);
  const customers = generateCustomers(branchId, 18).map((c) => c.name);
  return Array.from({ length: 12 }, (_, i) => {
    const status = pickWeighted(rng, INVOICE_STATUS as unknown as string[]);
    return {
      id: `INV-${(hashStr(branchId) % 900) + 100}-${(i + 1) * 7}`,
      customer: pickWeighted(rng, customers),
      amount: Math.round((800 + rng() * 5200) / 10) * 10,
      status,
      date: daysAgo(Math.floor(rng() * 30)),
      items: 1 + Math.floor(rng() * 4),
      method: pickWeighted(rng, ["UPI", "Card", "Cash", "Razorpay"]),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function generateMemberships(branchId: string): BranchMembership[] {
  const rng = createSeededRandom(branchId, 5);
  const customers = generateCustomers(branchId, 18).map((c) => c.name);
  const plans = ["Silver", "Gold", "Platinum", "Annual Gold", "Quarterly Silver"];
  return Array.from({ length: 10 }, (_, i) => {
    const plan = pickWeighted(rng, plans);
    const price = plan === "Platinum" ? 29999 : plan === "Gold" || plan === "Annual Gold" ? 14999 : 6999;
    const status: BranchMembership["status"] = pickWeighted(rng, ["Active", "Active", "Active", "Expiring Soon", "Expired"]);
    const started = daysAgo(20 + Math.floor(rng() * 320));
    const expires = status === "Expired" ? daysAgo(Math.floor(rng() * 30)) : daysAhead(1 + Math.floor(rng() * 120));
    return {
      id: `${branchId}-m${i + 1}`,
      customer: pickWeighted(rng, customers),
      plan,
      status,
      price,
      startedAt: started,
      expiresAt: expires,
      renewals: Math.floor(rng() * 4),
    };
  });
}

export function generateReferrals(branchId: string): BranchReferral[] {
  const rng = createSeededRandom(branchId, 6);
  const customers = generateCustomers(branchId, 20).map((c) => c.name);
  return Array.from({ length: 9 }, (_, i) => {
    const referred = rng() > 0.5;
    return {
      id: `${branchId}-r${i + 1}`,
      referrer: pickWeighted(rng, customers),
      friend: pickWeighted(rng, customers),
      channel: pickWeighted(rng, ["WhatsApp", "Referral Card", "Instagram", "Word of Mouth"]),
      date: daysAgo(Math.floor(rng() * 45)),
      status: referred ? "Converted" : "Pending",
      reward: 250,
    };
  });
}

export function generateCampaigns(branchId: string): BranchCampaign[] {
  const rng = createSeededRandom(branchId, 7);
  return CAMPAIGNS.map((c, i) => {
    const clicks = Math.floor(300 + rng() * 2600);
    const leads = Math.floor(clicks * (0.06 + rng() * 0.12));
    const bookings = Math.floor(leads * (0.35 + rng() * 0.4));
    const revenue = bookings * Math.round((1100 + rng() * 1500) / 10) * 10;
    const spend = Math.round((1500 + rng() * 3500) / 100) * 100;
    return {
      id: `${branchId}-cmp${i + 1}`,
      name: c.name,
      channel: c.channel,
      clicks,
      leads,
      bookings,
      revenue,
      spend,
      sentAt: daysAgo(Math.floor(rng() * 28)),
    };
  });
}

export function generateRewards(branchId: string): BranchReward[] {
  const rng = createSeededRandom(branchId, 8);
  const pool = [
    ["₹500 Off on Services", 5000],
    ["Free Signature Haircut", 8000],
    ["Complimentary Facial", 12000],
    ["10% Off Membership", 15000],
    ["Free Head Spa", 6000],
    ["Bridal Makeup Discount", 25000],
  ] as const;
  return pool.map(([name, cost], i) => ({
    id: `${branchId}-rw${i + 1}`,
    name,
    pointsCost: cost,
    redeemed: Math.floor(rng() * 40),
    stock: Math.floor(rng() * 12),
  }));
}

export function generateLinks(branchId: string): BranchLink[] {
  const rng = createSeededRandom(branchId, 9);
  return BOOKING_LINK_NAMES.map((name, i) => {
    const clicks = Math.floor(120 + rng() * 1200);
    const bookings = Math.floor(clicks * (0.25 + rng() * 0.3));
    return {
      id: `${branchId}-l${i + 1}`,
      name,
      url: `doloyal.ai/book/${branchId}-${i + 1}`,
      clicks,
      bookings,
      conversion: Math.round((bookings / Math.max(1, clicks)) * 100 * 10) / 10,
    };
  });
}

export function generateTrend(branchId: string, days = 30): TrendPoint[] {
  const rng = createSeededRandom(branchId, 10);
  const base = 0.6 + rng() * 0.5;
  return Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    const wave = Math.sin(i / 3.4) * 0.18 + Math.sin(i / 9) * 0.12;
    const weekend = new Date(date).getDay() === 6 || new Date(date).getDay() === 0 ? 0.35 : 0;
    const revenue = Math.round((base + wave + weekend) * 14000);
    const appointments = Math.round((base + wave + weekend) * 12);
    return { date, revenue, appointments };
  });
}

export function generateCustomerGrowth(branchId: string, days = 30): TrendPoint[] {
  const rng = createSeededRandom(branchId, 11);
  const total = generateCustomers(branchId).length;
  let running = Math.round(total * 0.4);
  return Array.from({ length: days }, (_, i) => {
    const date = daysAgo(days - 1 - i);
    running += Math.floor(rng() * 2) + (rng() > 0.7 ? 1 : 0);
    return { date, customers: running };
  });
}

/* ── Aggregate KPIs ─────────────────────────────────────────────────── */

export function getBranchKpis(branchId: string) {
  const branch = getBranch(branchId) ?? BRANCH_SEED[0]!;
  const customers = generateCustomers(branchId);
  const staff = generateStaff(branchId);
  const appts = generateAppointments(branchId);
  const invoices = generateInvoices(branchId);
  const memberships = generateMemberships(branchId);
  const trend = generateTrend(branchId, 30);
  const today = daysAgo(0);

  const todaysAppts = appts.filter((a) => a.date === today);
  const revenueToday = todaysAppts
    .filter((a) => a.status === "Completed")
    .reduce((s, a) => s + a.amount, 0) || branch.todayRevenue;

  const newCustomers = customers.filter((c) => c.visits <= 2).length;
  const repeatCustomers = customers.length - newCustomers;
  const activeMemberships = memberships.filter((m) => m.status === "Active").length;
  const loyaltyMembers = customers.filter((c) => c.loyaltyPoints > 0).length;
  const presentStaff = staff.filter((s) => s.present).length;
  const pendingPayments = invoices.filter((i) => i.status === "Unpaid" || i.status === "Partial").reduce((s, i) => s + i.amount, 0);
  const cancelled = appts.filter((a) => a.status === "Cancelled" || a.status === "No-show").length;
  const avgTicket = appts.filter((a) => a.amount > 0).reduce((s, a) => s + a.amount, 0) / Math.max(1, appts.filter((a) => a.amount > 0).length);
  const conversionRate = Math.round((0.28 + (hashStr(branchId) % 18) / 100) * 100);
  const googleRating = Math.round((4 + (hashStr(branchId) % 5) / 10 + 0.1) * 10) / 10;
  const reviews = 120 + (hashStr(branchId) % 320);
  const last30 = trend.reduce((s, t) => s + (t.revenue ?? 0), 0);
  const prev30 = last30 * (0.78 + (hashStr(branchId) % 16) / 100);
  const growth = Math.round(((last30 - prev30) / prev30) * 100);
  const topService = SERVICES[(hashStr(branchId) + 2) % SERVICES.length]!;
  const topStaff = staff[0]?.name ?? "—";

  return {
    branch,
    revenueToday,
    appointmentsToday: todaysAppts.length || branch.todayAppointments,
    customers: customers.length,
    newCustomers,
    repeatCustomers,
    memberships: memberships.length,
    activeMemberships,
    loyaltyMembers,
    activeStaff: staff.length,
    presentStaff,
    pendingPayments,
    cancelled,
    avgTicket,
    conversionRate,
    googleRating,
    reviews,
    monthlyGrowth: growth,
    topService,
    topStaff,
    revenue30d: last30,
  };
}

export function getBranchInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
