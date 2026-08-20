import type {
  DashboardOverview, Customer, CustomerProfile, CustomerQuery, Paginated,
  LoyaltyConfig, PointsLedgerEntry, Reward, RewardRedemption,
  MembershipTier, CustomerMembership, Appointment, Invoice,
  Tenant, AuthUser, AssistantResponse, BookingLink,
  BookingConfirmation, BookingAnalytics, NotificationRecord,
  NotificationTemplate, WidgetSettings, AvailabilitySettings,
  BlockedDateRecord, AppointmentDetail,
  ConnectedWebsite, ConnectedWebsiteCreateResult, WebsiteConnectionApiKey,
  WebsiteConnectionWebhook, ConnectionLogEntry, CreateConnectedWebsiteInput,
  WebsiteFramework,
} from "@doloyal/shared";
import { LOYALTY_FEATURE_CATALOG, isCoreLoyaltyFeature, getPlan } from "@doloyal/shared";
import { loadStore, saveStore } from "./persistent-store";
import type { WorkflowValidationResult, WorkflowNodeValidation } from "./workflows";

const NOW = new Date();
const D = (daysAgo: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};
const DD = (daysAgo: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

const DEFAULT_CUSTOMERS: Customer[] = [
  { id: "c1", tenantId: "t1", name: "Priya Sharma", phone: "+91 98765 43201", email: "priya@email.com", tags: ["VIP", "Regular"], pointsBalance: 2450, lifetimeValue: 45000, visitCount: 28, averageSpend: 1607, loyaltyBand: "VIP", churnRisk: "LOW", loyaltyScore: 92, createdAt: D(180), lastVisitAt: D(2) },
  { id: "c2", tenantId: "t1", name: "Rajesh Kumar", phone: "+91 98765 43202", email: "rajesh@email.com", tags: ["Regular"], pointsBalance: 1200, lifetimeValue: 28000, visitCount: 18, averageSpend: 1556, loyaltyBand: "LOYAL", churnRisk: "LOW", loyaltyScore: 85, createdAt: D(160), lastVisitAt: D(5) },
  { id: "c3", tenantId: "t1", name: "Ananya Patel", phone: "+91 98765 43203", email: "ananya@email.com", tags: ["New"], pointsBalance: 350, lifetimeValue: 5200, visitCount: 4, averageSpend: 1300, loyaltyBand: "NEW", churnRisk: "MEDIUM", loyaltyScore: 45, createdAt: D(30), lastVisitAt: D(7) },
  { id: "c4", tenantId: "t1", name: "Vikram Singh", phone: "+91 98765 43204", email: "vikram@email.com", tags: ["VIP"], pointsBalance: 3800, lifetimeValue: 62000, visitCount: 35, averageSpend: 1771, loyaltyBand: "VIP", churnRisk: "LOW", loyaltyScore: 95, createdAt: D(365), lastVisitAt: D(1) },
  { id: "c5", tenantId: "t1", name: "Neha Gupta", phone: "+91 98765 43205", email: "neha@email.com", tags: [], pointsBalance: 180, lifetimeValue: 3200, visitCount: 2, averageSpend: 1600, loyaltyBand: "NEW", churnRisk: "CRITICAL", loyaltyScore: 18, createdAt: D(20), lastVisitAt: null },
  { id: "c6", tenantId: "t1", name: "Arun Joshi", phone: "+91 98765 43206", email: "arun@email.com", tags: ["Regular"], pointsBalance: 890, lifetimeValue: 15000, visitCount: 10, averageSpend: 1500, loyaltyBand: "GROWING", churnRisk: "MEDIUM", loyaltyScore: 60, createdAt: D(90), lastVisitAt: D(25) },
  { id: "c7", tenantId: "t1", name: "Sneha Reddy", phone: "+91 98765 43207", email: "sneha@email.com", tags: ["Regular"], pointsBalance: 1100, lifetimeValue: 22000, visitCount: 14, averageSpend: 1571, loyaltyBand: "LOYAL", churnRisk: "LOW", loyaltyScore: 78, createdAt: D(140), lastVisitAt: D(10) },
  { id: "c8", tenantId: "t1", name: "Deepak Verma", phone: "+91 98765 43208", email: "deepak@email.com", tags: [], pointsBalance: 0, lifetimeValue: 1800, visitCount: 1, averageSpend: 1800, loyaltyBand: "NEW", churnRisk: "HIGH", loyaltyScore: 22, createdAt: D(15), lastVisitAt: D(14) },
];

function getCustomers(): Customer[] {
  return loadStore("customers", DEFAULT_CUSTOMERS);
}

function saveCustomers(customers: Customer[]) {
  saveStore("customers", customers);
}

function findCustomer(id: string): Customer | undefined {
  return getCustomers().find((c) => c.id === id);
}

function getBlockedDates(): BlockedDateRecord[] {
  return loadStore("blockedDates", [] as BlockedDateRecord[]);
}

function saveBlockedDates(dates: BlockedDateRecord[]) {
  saveStore("blockedDates", dates);
}

const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  { id: "nt1", tenantId: "t1", type: "BOOKING_CONFIRMATION", channel: "EMAIL", subject: "Appointment Confirmed at {{businessName}}", body: "Hi {{customerName}}, your appointment for {{serviceName}} on {{date}} at {{time}} has been confirmed.", isActive: true },
  { id: "nt2", tenantId: "t1", type: "REMINDER_24H", channel: "WHATSAPP", subject: null, body: "Reminder: You have an appointment at {{businessName}} tomorrow at {{time}}.", isActive: true },
];

function getNotificationTemplates(): NotificationTemplate[] {
  return loadStore("notificationTemplates", DEFAULT_NOTIFICATION_TEMPLATES);
}

function saveNotificationTemplates(templates: NotificationTemplate[]) {
  saveStore("notificationTemplates", templates);
}

const DEFAULT_REWARDS: Reward[] = [
  { id: "r1", tenantId: "t1", name: "Free Haircut", description: "Complimentary haircut at any branch", pointsCost: 500, rewardValue: 500, rewardType: "FREE_SERVICE", category: "STANDARD", branchIds: [], validityDays: 90, status: "ACTIVE", totalQuantity: null, redeemedCount: 42, createdAt: D(180) },
  { id: "r2", tenantId: "t1", name: "20% Off Spa", description: "20% discount on any spa service", pointsCost: 800, rewardValue: 20, rewardType: "COUPON", category: "STANDARD", branchIds: [], validityDays: 60, status: "ACTIVE", totalQuantity: null, redeemedCount: 28, createdAt: D(180) },
  { id: "r3", tenantId: "t1", name: "Free Facial", description: "Premium facial treatment", pointsCost: 1200, rewardValue: 1200, rewardType: "FREE_SERVICE", category: "STANDARD", branchIds: [], validityDays: 90, status: "ACTIVE", totalQuantity: 50, redeemedCount: 19, createdAt: D(160) },
  { id: "r4", tenantId: "t1", name: "Premium Hair Color", description: "Professional hair coloring service", pointsCost: 2000, rewardValue: 2000, rewardType: "CUSTOM", category: "STANDARD", branchIds: [], validityDays: 120, status: "ACTIVE", totalQuantity: 30, redeemedCount: 11, createdAt: D(150) },
  { id: "r5", tenantId: "t1", name: "Free Manicure", description: "Classic manicure service", pointsCost: 600, rewardValue: 600, rewardType: "FREE_SERVICE", category: "STANDARD", branchIds: [], validityDays: 60, status: "ARCHIVED", totalQuantity: null, redeemedCount: 35, createdAt: D(200) },
];

function getRewards(): Reward[] {
  return loadStore("rewards", DEFAULT_REWARDS);
}

function saveRewards(rewards: Reward[]) {
  saveStore("rewards", rewards);
}

const MOCK_SITE_PAGES = [
  { id: "page-1", websiteId: "ws-1", title: "Home", slug: "home", sortOrder: 0, isHome: true, seo: { metaTitle: "Elegance Salon — Premium Beauty", metaDescription: "Experience premium beauty services" }, status: "PUBLISHED", sections: [
    { id: "sec-1", pageId: "page-1", component: "HERO", sortOrder: 0, content: { type: "hero", data: { headline: "Welcome to Elegance Salon", subheadline: "Where beauty meets elegance", cta: { text: "Book Now", href: "#book" }, secondaryCta: { text: "Learn More", href: "#about" } } }, styles: null, isPublished: true },
    { id: "sec-2", pageId: "page-1", component: "SERVICES", sortOrder: 1, content: { type: "services", data: { headline: "Our Services", items: [{ name: "Haircut", description: "Premium haircut", price: 800, duration: 45 }, { name: "Hair Color", description: "Professional coloring", price: 2200, duration: 90 }, { name: "Facial", description: "Rejuvenating facial", price: 1200, duration: 60 }] } }, styles: null, isPublished: true },
    { id: "sec-3", pageId: "page-1", component: "TESTIMONIALS", sortOrder: 2, content: { type: "testimonials", data: { headline: "What Our Clients Say", items: [{ name: "Priya S.", text: "Best salon in town! Love the service.", rating: 5 }, { name: "Ananya P.", text: "Amazing haircut and styling.", rating: 5 }] } }, styles: null, isPublished: false },
    { id: "sec-4", pageId: "page-1", component: "CTA", sortOrder: 3, content: { type: "cta", data: { headline: "Ready to Transform Your Look?", subheadline: "Book your appointment today", buttonText: "Book Appointment" } }, styles: null, isPublished: true },
  ]},
  { id: "page-2", websiteId: "ws-1", title: "About", slug: "about", sortOrder: 1, isHome: false, seo: { metaTitle: "About Elegance Salon", metaDescription: "Learn about our story" }, status: "DRAFT", sections: [
    { id: "sec-5", pageId: "page-2", component: "ABOUT", sortOrder: 0, content: { type: "about", data: { headline: "Our Story", body: "Elegance Salon has been serving Mumbai since 2015. Our team of expert stylists is dedicated to making you look and feel your best." } }, styles: null, isPublished: false },
  ]},
  { id: "page-3", websiteId: "ws-1", title: "Services", slug: "services", sortOrder: 2, isHome: false, seo: { metaTitle: "Services — Elegance Salon", metaDescription: "Browse our services" }, status: "DRAFT", sections: [] },
  { id: "page-4", websiteId: "ws-1", title: "Gallery", slug: "gallery", sortOrder: 3, isHome: false, seo: { metaTitle: "Gallery — Elegance Salon", metaDescription: "View our work" }, status: "DRAFT", sections: [] },
  { id: "page-5", websiteId: "ws-1", title: "Contact", slug: "contact", sortOrder: 4, isHome: false, seo: { metaTitle: "Contact Elegance Salon", metaDescription: "Get in touch" }, status: "DRAFT", sections: [
    { id: "sec-6", pageId: "page-5", component: "CONTACT", sortOrder: 0, content: { type: "contact", data: { headline: "Get in Touch", phone: "+91 98765 43210", email: "hello@elegancesalon.com", address: "Shop 5, Linking Road, Bandra West, Mumbai" } }, styles: null, isPublished: false },
  ]},
];

const MOCK_DEPLOYMENTS = [
  { id: "dep-1", websiteId: "ws-1", version: 2, status: "LIVE", errorLog: null, buildTimeMs: 2800, previewUrl: "/api/websites/ws-1/preview", liveUrl: "https://elegance-salon.doloyal.ai", lighthouse: { performance: 92, accessibility: 88, seo: 95, bestPractices: 90 }, createdAt: D(1) },
  { id: "dep-2", websiteId: "ws-1", version: 1, status: "LIVE", errorLog: null, buildTimeMs: 3500, previewUrl: "/api/websites/ws-1/preview", liveUrl: "https://elegance-salon.doloyal.ai", lighthouse: { performance: 88, accessibility: 85, seo: 92, bestPractices: 87 }, createdAt: D(7) },
];

const WEBSITES: any[] = [
  {
    id: "ws-1", tenantId: "t1", name: "Elegance Salon Website", slug: "elegance-salon", description: "A premium beauty salon website",
    status: "PUBLISHED", industry: "BEAUTY_SALON",
    theme: { preset: "ELEGANT", primaryColor: "#8B5CF6", secondaryColor: "#60A5FA", headingFont: "Playfair Display", bodyFont: "Inter", borderRadius: "1.25rem" },
    publishedAt: D(1), draftVersion: 3, liveVersion: 2,
    totalPages: 5, assetCount: 12, domainCount: 0,
    lastDeployment: MOCK_DEPLOYMENTS[0],
    liveUrl: "https://elegance-salon.doloyal.ai",
    previewUrl: "/api/websites/ws-1/preview",
    createdAt: D(30), updatedAt: D(1),
  },
  {
    id: "ws-2", tenantId: "t1", name: "Meera's Portfolio", slug: "meera-portfolio", description: "Personal stylist portfolio",
    status: "DRAFT", industry: "BEAUTY_SALON",
    theme: { preset: "MODERN", primaryColor: "#2563EB", headingFont: "Inter", bodyFont: "Inter" },
    publishedAt: null, draftVersion: 1, liveVersion: 0,
    totalPages: 3, assetCount: 5, domainCount: 0,
    lastDeployment: null, liveUrl: null, previewUrl: null,
    createdAt: D(10), updatedAt: D(8),
  },
];

const INVOICES: Invoice[] = [
  { id: "inv1", number: "INV-001", customerId: "c1", customerName: "Priya Sharma", subtotal: 3000, discount: 300, tax: 270, total: 2970, status: "PAID", paymentMethod: "UPI", items: [{ id: "ii1", serviceName: "Haircut", quantity: 1, unitPrice: 800, total: 800 }, { id: "ii2", serviceName: "Hair Color", quantity: 1, unitPrice: 2200, total: 2200 }], createdAt: D(2) },
  { id: "inv2", number: "INV-002", customerId: "c4", customerName: "Vikram Singh", subtotal: 3200, discount: 0, tax: 320, total: 3520, status: "PAID", paymentMethod: "CARD", items: [{ id: "ii3", serviceName: "Premium Hair Color", quantity: 1, unitPrice: 2200, total: 2200 }, { id: "ii4", serviceName: "Styling", quantity: 1, unitPrice: 1000, total: 1000 }], createdAt: D(1) },
  { id: "inv3", number: "INV-003", customerId: "c7", customerName: "Sneha Reddy", subtotal: 1200, discount: 120, tax: 108, total: 1188, status: "PAID", paymentMethod: "CASH", items: [{ id: "ii5", serviceName: "Hair Spa", quantity: 1, unitPrice: 1200, total: 1200 }], createdAt: D(3) },
  { id: "inv4", number: "INV-004", customerId: "c3", customerName: "Ananya Patel", subtotal: 1500, discount: 0, tax: 150, total: 1650, status: "DRAFT", paymentMethod: "CASH", items: [{ id: "ii6", serviceName: "Manicure", quantity: 1, unitPrice: 800, total: 800 }, { id: "ii7", serviceName: "Pedicure", quantity: 1, unitPrice: 700, total: 700 }], createdAt: D(0) },
  { id: "inv5", number: "INV-005", customerId: "c6", customerName: "Arun Joshi", subtotal: 2500, discount: 250, tax: 225, total: 2475, status: "PENDING", paymentMethod: "UPI", items: [{ id: "ii8", serviceName: "Haircut", quantity: 1, unitPrice: 800, total: 800 }, { id: "ii9", serviceName: "Beard Trim", quantity: 1, unitPrice: 400, total: 400 }, { id: "ii10", serviceName: "Facial", quantity: 1, unitPrice: 1300, total: 1300 }], createdAt: D(4) },
];

function gen30Days<T>(fn: (daysAgo: number) => T): T[] {
  return Array.from({ length: 30 }, (_, i) => fn(29 - i));
}

const DEFAULT_TENANT: Tenant = {
  id: "t1",
  name: "Elegance Salon & Spa",
  category: "BEAUTY_SALON",
  phone: "+91 98765 43210",
  email: "hello@elegancesalon.com",
  website: "https://elegancesalon.com",
  address: "Shop 5, Linking Road, Bandra West, Mumbai - 400050",
  gst: "27AABCU9603R1ZM",
  registrationNumber: "U74999MH2020PTC123456",
  tagline: "Beauty that feels like you",
  description: "Premium salon and spa experiences in the heart of Bandra.",
  whatsapp: "+91 98765 43210",
  mapsUrl: "https://maps.google.com/?q=Bandra+West+Mumbai",
  currency: "INR",
  timezone: "Asia/Kolkata",
  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  brandColor: "#2563EB",
  secondaryColor: "#64748B",
  accentColor: "#F59E0B",
  fontFamily: "Inter",
  taxRate: 10,
  onboardingComplete: true,
  createdAt: D(30),
  logoUrl: null,
  coverBannerUrl: null,
  faviconUrl: null,
  businessHours: {
    openingTime: "10:00",
    closingTime: "20:00",
    weeklyOff: ["Sunday"],
    breakStart: "14:00",
    breakEnd: "14:30",
  },
  socialLinks: {
    instagram: "https://instagram.com/elegance",
    facebook: "",
    linkedin: "",
    youtube: "",
    googleBusiness: "",
    whatsapp: "+91 98765 43210",
  },
  legalPolicies: {
    privacyPolicy: "",
    termsAndConditions: "",
    refundPolicy: "",
    cancellationPolicy: "",
  },
  businessStatus: {
    activeBusiness: true,
    onlineBooking: true,
    walkIns: true,
    showOnWebsite: true,
  },
  notificationPrefs: {
    email: true,
    sms: true,
    whatsapp: true,
    marketingEmails: false,
  },
};

const DEFAULT_LOYALTY: LoyaltyConfig = {
  id: "lc1",
  tenantId: "t1",
  mode: "CURRENCY",
  pointsPerCurrency: 0.1,
  pointsPerVisit: 10,
  currencyPerPoint: 1,
  expiryDays: 365,
  welcomeBonus: 100,
  referralBonus: 50,
  settings: {
    birthdayBonus: 100,
    reviewBonus: 50,
    socialShareBonus: 25,
    googleReviewBonus: 75,
    instagramStoryBonus: 50,
    minRedemption: 100,
    maxRedemption: 10000,
    tierMultiplier: 1,
    autoExpiry: true,
    doublePoints: false,
    weekendBonus: false,
    holidayBonus: false,
  },
};

const DEFAULT_AVAILABILITY: AvailabilitySettings = {
  businessHours: {
    "1": { open: "09:00", close: "18:00" },
    "2": { open: "09:00", close: "18:00" },
    "3": { open: "09:00", close: "18:00" },
    "4": { open: "09:00", close: "18:00" },
    "5": { open: "09:00", close: "18:00" },
    "6": { open: "10:00", close: "16:00" },
    "0": null,
  },
  timezone: "Asia/Kolkata",
  maxDailyBookings: 50,
  minBookingNotice: 60,
  maxAdvanceBookingDays: 30,
  bufferTime: 15,
  holidays: [],
  blockedDates: [],
};

const DEFAULT_WIDGET: WidgetSettings = {
  tenantId: "t1",
  isActive: true,
  buttonStyle: "floating",
  buttonColor: "#2563EB",
  buttonText: "Book Appointment",
  position: "bottom-right",
  primaryColor: "#2563EB",
  fontFamily: "Inter",
  theme: "light",
  services: [],
  staff: [],
};

const DEFAULT_INTEGRATIONS: any[] = [
  { id: "int-stripe", tenantId: "t1", type: "STRIPE", status: "CONNECTED", label: "Stripe Account", metadata: { accountName: "Doloyal" }, connected: true, token: { tokenType: "Bearer" }, createdAt: D(30), updatedAt: D(1) },
  { id: "int-razorpay", tenantId: "t1", type: "RAZORPAY", status: "CONNECTED", label: "Razorpay Account", metadata: { accountName: "Doloyal" }, connected: true, token: { tokenType: "Bearer" }, createdAt: D(25), updatedAt: D(2) },
  { id: "int-resend", tenantId: "t1", type: "RESEND", status: "DISCONNECTED", label: null, metadata: null, connected: false, token: null, createdAt: D(20), updatedAt: D(20) },
  { id: "int-gcal", tenantId: "t1", type: "GOOGLE_CALENDAR", status: "DISCONNECTED", label: null, metadata: null, connected: false, token: null, createdAt: D(15), updatedAt: D(15) },
  { id: "int-ganalytics", tenantId: "t1", type: "GOOGLE_ANALYTICS", status: "DISCONNECTED", label: null, metadata: null, connected: false, token: null, createdAt: D(10), updatedAt: D(10) },
];

function getIntegrations(): any[] {
  return loadStore("integrations", DEFAULT_INTEGRATIONS);
}

function saveIntegrations(list: any[]) {
  return saveStore("integrations", list);
}

type MockConnectedWebsiteStore = {
  websites: ConnectedWebsite[];
  apiKeys: WebsiteConnectionApiKey[];
  webhooks: WebsiteConnectionWebhook[];
  logs: ConnectionLogEntry[];
  /** One-time plaintext credentials keyed by website id (demo only). */
  secrets: Record<string, { secretKey: string; webhookSecret: string }>;
};

const EMPTY_CONNECTION_STORE: MockConnectedWebsiteStore = {
  websites: [],
  apiKeys: [],
  webhooks: [],
  logs: [],
  secrets: {},
};

function getConnectionStore(): MockConnectedWebsiteStore {
  return loadStore("websiteConnections", EMPTY_CONNECTION_STORE);
}

function saveConnectionStore(store: MockConnectedWebsiteStore) {
  return saveStore("websiteConnections", store);
}

function mockRandHex(len: number) {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function enrichMockBookingLink(link: any): BookingLink {
  const visits = link.visitCount ?? 0;
  const bookings = link.bookingCount ?? 0;
  const revenue = link.revenueGenerated ?? 0;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const url = link.url?.includes(link.slug) ? link.url : `${origin}/book/${link.slug}`;
  return {
    ...link,
    url,
    subdomainUrl: link.subdomainUrl ?? `https://${link.slug}.doloyal.ai`,
    customDomainUrl: link.customDomainUrl ?? null,
    domain: link.domain ?? { subdomain: `${link.slug}.doloyal.ai`, customDomain: "", status: "PENDING" },
    status: link.status ?? "PUBLISHED",
    qrUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
    staffNames: link.staffNames ?? (link.staffName ? [link.staffName] : []),
    metrics: link.metrics ?? {
      totalVisits: visits,
      totalBookings: bookings,
      conversionRate: visits > 0 ? Math.round((bookings / visits) * 1000) / 10 : 0,
      revenueGenerated: revenue,
      totalCustomers: link.totalCustomers ?? Math.max(bookings - 2, 0),
      upcomingAppointments: link.upcomingAppointments ?? 2,
      averageBookingValue: bookings > 0 ? Math.round((revenue / bookings) * 100) / 100 : 0,
      lastBookingAt: link.lastBookingAt ?? null,
    },
  };
}

const DEFAULT_BOOKING_LINKS: BookingLink[] = [
  enrichMockBookingLink({
    id: "bl1", tenantId: "t1", slug: "demo-book", type: "COMPANY", name: "Main Booking Link",
    isActive: true, isPaused: false, assignmentMode: "AUTO", visitCount: 128, bookingCount: 34,
    revenueGenerated: 48200, lastBookingAt: D(1), url: "http://localhost:3000/book/demo-book",
    payment: { mode: "DEPOSIT", depositPercent: 20, methods: ["UPI", "STRIPE"] },
    createdAt: D(30), updatedAt: D(1),
  }),
  enrichMockBookingLink({
    id: "bl2", tenantId: "t1", staffId: "s1", staffName: "Meera", slug: "meera", type: "PERSONAL",
    name: "Meera's Link", isActive: true, assignmentMode: "SINGLE", staffIds: ["s1"],
    visitCount: 56, bookingCount: 18, revenueGenerated: 21600, lastBookingAt: D(3),
    url: "http://localhost:3000/book/meera", createdAt: D(15), updatedAt: D(3),
  }),
  enrichMockBookingLink({
    id: "bl3", tenantId: "t1", staffId: "s2", staffName: "Rohan", slug: "rohan", type: "PERSONAL",
    name: "Rohan's Link", isActive: true, visitCount: 12, bookingCount: 2, revenueGenerated: 1800,
    url: "http://localhost:3000/book/rohan", createdAt: D(10), updatedAt: D(10),
  }),
];

let currentMockPlan = "growth";

// ─── AI Workflows (mock) ────────────────────────────────────────────────────

interface MockWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: import("@doloyal/shared").WorkflowStatus;
  version: number;
  trigger: import("@doloyal/shared").WorkflowTriggerDef;
  definition: import("@doloyal/shared").WorkflowDefinition;
  warnings?: string[];
  activatedAt?: string;
  pausedAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  runs: number;
  completedRuns: number;
  failedRuns: number;
  customersReached?: number;
  messagesSent?: number;
  bookingsGenerated?: number;
  rewardsGenerated?: number;
  revenueGenerated?: number;
}

type MockWorkflowRun = import("@doloyal/shared").WorkflowRunInfo & {
  steps: import("@doloyal/shared").WorkflowRunStepInfo[];
};

interface MockWorkflowStore {
  workflows: MockWorkflow[];
  runs: MockWorkflowRun[];
  audit: Array<import("@doloyal/shared").WorkflowAuditEntry & { createdAt: string }>;
}

const MOCK_WORKFLOW_TEMPLATES = [
  { id: "tpl-winback", name: "Win-back inactive customers", category: "Retention", description: "Re-engage customers who haven't visited in a while with a personalized offer." },
  { id: "tpl-birthday", name: "Birthday celebration", category: "Loyalty", description: "Send a birthday wish and a free reward to customers celebrating today." },
  { id: "tpl-postvisit", name: "Post-visit thank you + review", category: "Engagement", description: "Thank customers after a visit and invite them to leave a review." },
  { id: "tpl-threshold", name: "Points milestone reward", category: "Loyalty", description: "Celebrate customers who cross a points threshold with a reward." },
  { id: "tpl-reminder", name: "Appointment reminder", category: "Appointments", description: "Remind customers about their upcoming appointment." },
  { id: "tpl-noshow", name: "No-show recovery", category: "Appointments", description: "Recover no-show customers with a friendly rebooking message." },
];

const DEFAULT_WORKFLOW_STORE: MockWorkflowStore = {
  workflows: [
    {
      id: "wf-demo-1",
      tenantId: "t1",
      name: "Win-back inactive customers",
      description: "Re-engage customers who haven't visited in 30+ days with a personalized offer.",
      status: "ACTIVE",
      version: 2,
      trigger: { type: "customer_inactive", config: { days: 30 } },
      definition: {
        name: "Win-back inactive customers",
        description: "Re-engage customers who haven't visited in 30+ days with a personalized offer.",
        trigger: { type: "customer_inactive", config: { days: 30 } },
        nodes: [
          { id: "n1", type: "trigger", label: "Customer inactive for 30+ days", config: { days: 30 } },
          { id: "n2", type: "condition", label: "Loyalty band is VIP?", data: { key: "loyalty_band", op: "is", value: "VIP" } },
          { id: "n3", type: "action", label: "Send WhatsApp win-back offer", config: { channel: "whatsapp", message: "We miss you! Book your next visit and get 20% off. {customer_first_name}" } },
          { id: "n4", type: "action", label: "Send SMS win-back offer", config: { channel: "sms", message: "Hey {customer_first_name}, here's a special offer to get you back in. Reply BOOK to claim." } },
          { id: "n5", type: "end", label: "Done" },
        ],
        edges: [
          { source: "n1", target: "n2" },
          { source: "n2", target: "n3", outcome: "true" },
          { source: "n2", target: "n4", outcome: "false" },
          { source: "n3", target: "n5" },
          { source: "n4", target: "n5" },
        ],
      },
      activatedAt: D(20),
      lastRunAt: D(0),
      createdAt: D(35),
      updatedAt: D(1),
      runs: 128,
      completedRuns: 121,
      failedRuns: 4,
      customersReached: 96,
      messagesSent: 128,
      bookingsGenerated: 18,
      rewardsGenerated: 0,
      revenueGenerated: 32400,
    },
    {
      id: "wf-demo-2",
      tenantId: "t1",
      name: "Birthday reward",
      description: "Send a birthday wish with a free reward to customers celebrating today.",
      status: "ACTIVE",
      version: 1,
      trigger: { type: "customer_birthday", config: {} },
      definition: {
        name: "Birthday reward",
        description: "Send a birthday wish with a free reward to customers celebrating today.",
        trigger: { type: "customer_birthday", config: {} },
        nodes: [
          { id: "n1", type: "trigger", label: "Customer birthday" },
          { id: "n2", type: "action", label: "Send birthday WhatsApp", config: { channel: "whatsapp", message: "Happy birthday {customer_first_name}! Enjoy a free facial on us this week." } },
          { id: "n3", type: "action", label: "Create birthday reward", data: { rewardType: "FREE_SERVICE", value: "Free Facial", message: "Happy Birthday!" } },
          { id: "n4", type: "end", label: "Done" },
        ],
        edges: [
          { source: "n1", target: "n2" },
          { source: "n2", target: "n3" },
          { source: "n3", target: "n4" },
        ],
      },
      activatedAt: D(15),
      lastRunAt: D(0),
      createdAt: D(30),
      updatedAt: D(15),
      runs: 74,
      completedRuns: 74,
      failedRuns: 0,
      customersReached: 12,
      messagesSent: 74,
      bookingsGenerated: 9,
      rewardsGenerated: 74,
      revenueGenerated: 16200,
    },
    {
      id: "wf-demo-3",
      tenantId: "t1",
      name: "Appointment reminder",
      description: "Remind customers 24h before their appointment and follow up for confirmation.",
      status: "PAUSED",
      version: 1,
      trigger: { type: "appointment_booked", config: {} },
      definition: {
        name: "Appointment reminder",
        description: "Remind customers 24h before their appointment and follow up for confirmation.",
        trigger: { type: "appointment_booked", config: {} },
        nodes: [
          { id: "n1", type: "trigger", label: "Appointment booked" },
          { id: "n2", type: "action", label: "Wait 24 hours", data: { duration: "24h" } },
          { id: "n3", type: "action", label: "Send reminder SMS", config: { channel: "sms", message: "Reminder: Your appointment at {business_name} is tomorrow at {appointment_time}. Reply CONFIRM." } },
          { id: "n4", type: "end", label: "Done" },
        ],
        edges: [
          { source: "n1", target: "n2" },
          { source: "n2", target: "n3" },
          { source: "n3", target: "n4" },
        ],
      },
      pausedAt: D(3),
      createdAt: D(25),
      updatedAt: D(3),
      runs: 40,
      completedRuns: 38,
      failedRuns: 2,
      customersReached: 34,
      messagesSent: 40,
      bookingsGenerated: 0,
      rewardsGenerated: 0,
      revenueGenerated: 0,
    },
  ],
  runs: [
    {
      id: "run-demo-1", workflowId: "wf-demo-1", customerId: "c4", customerName: "Vikram Singh",
      version: 2, status: "COMPLETED", trigger: "customer_inactive",
      startedAt: D(0), completedAt: D(0), createdAt: D(0),
      steps: [
        { id: "s1", nodeKey: "n1", type: "trigger", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0) },
        { id: "s2", nodeKey: "n2", type: "condition", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { passed: true } },
        { id: "s3", nodeKey: "n3", type: "action", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { channel: "whatsapp", simulated: true } },
        { id: "s4", nodeKey: "n5", type: "end", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0) },
      ],
    },
    {
      id: "run-demo-2", workflowId: "wf-demo-1", customerId: "c6", customerName: "Arun Joshi",
      version: 2, status: "COMPLETED", trigger: "customer_inactive",
      startedAt: D(0), completedAt: D(0), createdAt: D(0),
      steps: [
        { id: "s1", nodeKey: "n1", type: "trigger", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0) },
        { id: "s2", nodeKey: "n2", type: "condition", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { passed: false } },
        { id: "s3", nodeKey: "n4", type: "action", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { channel: "sms", simulated: true } },
        { id: "s4", nodeKey: "n5", type: "end", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0) },
      ],
    },
    {
      id: "run-demo-3", workflowId: "wf-demo-2", customerId: "c1", customerName: "Priya Sharma",
      version: 1, status: "COMPLETED", trigger: "customer_birthday",
      startedAt: D(0), completedAt: D(0), createdAt: D(0),
      steps: [
        { id: "s1", nodeKey: "n1", type: "trigger", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0) },
        { id: "s2", nodeKey: "n2", type: "action", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { channel: "whatsapp", simulated: true } },
        { id: "s3", nodeKey: "n3", type: "action", status: "COMPLETED", attempt: 1, startedAt: D(0), completedAt: D(0), output: { rewardId: "mock-rw-1" } },
      ],
    },
  ],
  audit: [
    { id: "aud-1", workflowId: "wf-demo-1", actorName: "Demo User", action: "activated", version: 2, details: {}, createdAt: D(20) },
    { id: "aud-2", workflowId: "wf-demo-1", actorName: "Demo User", action: "edited", version: 2, details: {}, createdAt: D(21) },
    { id: "aud-3", workflowId: "wf-demo-2", actorName: "Demo User", action: "activated", version: 1, details: {}, createdAt: D(15) },
  ],
};

function getWorkflowStore(): MockWorkflowStore {
  return loadStore("ai-workflows", DEFAULT_WORKFLOW_STORE);
}
function saveWorkflowStore(store: MockWorkflowStore) {
  saveStore("ai-workflows", store);
}

function wfToSummary(wf: MockWorkflow): import("@doloyal/shared").WorkflowSummary {
  return {
    id: wf.id,
    tenantId: wf.tenantId,
    name: wf.name,
    description: wf.description,
    trigger: wf.trigger,
    status: wf.status,
    version: wf.version,
    activatedAt: wf.activatedAt,
    pausedAt: wf.pausedAt,
    lastRunAt: wf.lastRunAt,
    createdAt: wf.createdAt,
    updatedAt: wf.updatedAt,
    runs: wf.runs,
    completedRuns: wf.completedRuns,
    failedRuns: wf.failedRuns,
    successRate: wf.runs ? Math.round((wf.completedRuns / wf.runs) * 100) : 100,
    customersReached: wf.customersReached,
    messagesSent: wf.messagesSent,
    bookingsGenerated: wf.bookingsGenerated,
    rewardsGenerated: wf.rewardsGenerated,
    revenueGenerated: wf.revenueGenerated,
  };
}

function wfToDetail(wf: MockWorkflow): import("@doloyal/shared").WorkflowDetail {
  return {
    ...wfToSummary(wf),
    definition: wf.definition,
    versions: [
      { id: `ver-${wf.id}-${wf.version}`, version: wf.version, status: wf.status === "ACTIVE" ? "ACTIVE" : "DRAFT", createdAt: wf.updatedAt, activatedAt: wf.activatedAt },
    ],
    recentRuns: getWorkflowStore().runs.filter((r) => r.workflowId === wf.id).slice(0, 5),
  };
}

const uid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7)}`;

function buildMockWorkflow(prompt: string, id: string): MockWorkflow {
  const p = prompt.toLowerCase();
  const nodes: import("@doloyal/shared").WorkflowNodeDef[] = [];
  const edges: import("@doloyal/shared").WorkflowEdgeDef[] = [];
  let trigger: import("@doloyal/shared").WorkflowTriggerDef = { type: "customer_inactive", config: { days: 30 } };
  const warnings: string[] = [];
  let name = prompt.length > 40 ? prompt.slice(0, 40).trim() + "…" : prompt.trim();

  const add = (n: import("@doloyal/shared").WorkflowNodeDef) => nodes.push(n);

  const n1 = uid("n");
  if (/birthday|birth day/.test(p)) {
    trigger = { type: "customer_birthday", config: {} };
    name = "Birthday celebration";
    add({ id: n1, type: "trigger", label: "Customer birthday" });
    add({ id: uid("n"), type: "action", label: "Send birthday message", config: { channel: /email/.test(p) ? "email" : "whatsapp", message: "Happy birthday {customer_first_name}! Enjoy 20% off any service this week." } });
    add({ id: uid("n"), type: "action", label: "Create birthday reward", data: { rewardType: "FREE_SERVICE", value: "Free Facial" } });
  } else if (/win.?back|inactive|haven.?t visited|re-?engage/.test(p)) {
    const days = /(\d+)\s*days/.exec(p);
    const d = days ? Math.max(1, Math.min(180, Number(days[1]))) : 30;
    trigger = { type: "customer_inactive", config: { days: d } };
    name = "Win-back inactive customers";
    add({ id: n1, type: "trigger", label: `Customer inactive for ${d}+ days`, config: { days: d } });
    const c1 = uid("n");
    add({ id: c1, type: "condition", label: "Loyalty band is VIP?", data: { key: "loyalty_band", op: "is", value: "VIP" } });
    const a1 = uid("n");
    add({ id: a1, type: "action", label: "Send win-back WhatsApp", config: { channel: "whatsapp", message: "We miss you! Book your next visit and get 20% off. {customer_first_name}" } });
    const a2 = uid("n");
    add({ id: a2, type: "action", label: "Send win-back SMS", config: { channel: "sms", message: "Hey {customer_first_name}, here's a special offer to bring you back in. Reply BOOK to claim." } });
    const end = uid("n");
    add({ id: end, type: "end", label: "Done" });
    edges.push({ source: n1, target: c1 }, { source: c1, target: a1, outcome: "true" }, { source: c1, target: a2, outcome: "false" }, { source: a1, target: end }, { source: a2, target: end });
  } else if (/review|thank|post.?visit|follow.?up after/.test(p)) {
    trigger = { type: "appointment_completed", config: {} };
    name = "Post-visit thank you + review";
    add({ id: n1, type: "trigger", label: "Appointment completed" });
    add({ id: uid("n"), type: "action", label: "Send thank-you message", config: { channel: "whatsapp", message: "Thanks for visiting, {customer_first_name}! We'd love a quick review." } });
    add({ id: uid("n"), type: "action", label: "Request review", config: { channel: "sms", message: "How was your visit? Rate us here and get 50 bonus points." } });
  } else if (/points|threshold|milestone/.test(p)) {
    const t = /(\d+)\s*points/.exec(p);
    const threshold = t ? Number(t[1]) : 500;
    trigger = { type: "points_threshold_reached", config: { threshold } };
    name = "Points milestone reward";
    add({ id: n1, type: "trigger", label: `Customer reaches ${threshold} points`, config: { threshold } });
    add({ id: uid("n"), type: "action", label: "Send milestone message", config: { channel: "whatsapp", message: `Congrats {customer_first_name}! You've reached ${threshold} points. Here's a little reward.` } });
    add({ id: uid("n"), type: "action", label: "Create reward", data: { rewardType: "COUPON", value: "10% off", message: "Milestone reward" } });
  } else if (/no.?show|missed|didn.?t.?show/.test(p)) {
    trigger = { type: "appointment_no_show", config: {} };
    name = "No-show recovery";
    add({ id: n1, type: "trigger", label: "Appointment no-show" });
    add({ id: uid("n"), type: "action", label: "Send rebooking message", config: { channel: "whatsapp", message: "Hi {customer_first_name}, we missed you! Let's get you rebooked at a time that works for you." } });
    add({ id: uid("n"), type: "action", label: "Notify staff", data: { message: "No-show: {customer_name} ({appointment_service})" } });
  } else if (/remind|appointment.*upcoming/.test(p)) {
    trigger = { type: "appointment_booked", config: {} };
    name = "Appointment reminder";
    add({ id: n1, type: "trigger", label: "Appointment booked" });
    add({ id: uid("n"), type: "action", label: "Wait 24 hours", data: { duration: "24h" } });
    add({ id: uid("n"), type: "action", label: "Send reminder SMS", config: { channel: "sms", message: "Reminder: Your appointment is tomorrow. Reply CONFIRM to confirm." } });
  } else if (/new customer|welcome/.test(p)) {
    trigger = { type: "customer_created", config: {} };
    name = "Welcome new customers";
    add({ id: n1, type: "trigger", label: "New customer added" });
    add({ id: uid("n"), type: "action", label: "Send welcome message", config: { channel: "whatsapp", message: "Welcome to {business_name}, {customer_first_name}! Here are 100 welcome points." } });
    add({ id: uid("n"), type: "action", label: "Add welcome points", data: { points: 100, reason: "Welcome bonus" } });
  } else if (/member.*expir|expiring/.test(p)) {
    trigger = { type: "membership_expiring", config: { days: 7 } };
    name = "Membership expiring reminder";
    add({ id: n1, type: "trigger", label: "Membership expiring in 7 days" });
    add({ id: uid("n"), type: "action", label: "Send renewal offer", config: { channel: "whatsapp", message: "Your membership at {business_name} expires soon. Renew today and keep your perks!" } });
  } else {
    trigger = { type: "customer_inactive", config: { days: 30 } };
    name = "Customer retention automation";
    add({ id: n1, type: "trigger", label: "Customer inactive for 30+ days", config: { days: 30 } });
    add({ id: uid("n"), type: "action", label: "Send follow-up message", config: { channel: "whatsapp", message: "Hi {customer_first_name}, we'd love to see you again at {business_name}." } });
  }

  if (!edges.length) {
    for (let i = 0; i < nodes.length - 1; i++) edges.push({ source: nodes[i]!.id, target: nodes[i + 1]!.id });
  }

  if (!/[?!.]+$/.test(prompt.trim()) && prompt.trim().length < 20) warnings.push("Tip: adding specifics like '30 days', 'WhatsApp', or 'VIP customers' makes the automation more accurate.");
  warnings.push("This is a draft. Nothing is sent until you save and activate it.");

  return {
    id,
    tenantId: "t1",
    name,
    description: prompt.trim(),
    status: "DRAFT",
    version: 1,
    trigger,
    definition: { name, description: prompt.trim(), trigger, nodes, edges },
    warnings,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    runs: 0,
    completedRuns: 0,
    failedRuns: 0,
  };
}

function applyMockEdit(wf: MockWorkflow, instruction: string): MockWorkflow {
  const i = instruction.toLowerCase();
  const nodes = [...wf.definition.nodes];
  const edges = [...wf.definition.edges];
  if (/channel|whatsapp|sms|email/.test(i)) {
    const channel = /whatsapp/.test(i) ? "whatsapp" : /email/.test(i) ? "email" : "sms";
    for (const n of nodes) {
      if (n.type === "action" && (n.config?.channel || n.data?.channel)) {
        n.config = { ...(n.config || {}), channel };
      }
    }
  }
  if (/message|text|copy|say|wording/.test(i) && i.includes("message")) {
    const m = /["“]([^"”]+)["”]/.exec(instruction);
    if (m) for (const n of nodes) if (n.type === "action") n.config = { ...(n.config || {}), message: m[1] };
  }
  if (/delay|wait|after\s+(\d+)\s*(day|hour|h)/.test(i)) {
    const m = /(\d+)\s*(day|hour|h)/.exec(i);
    if (m) {
      const dur = m[2]?.startsWith("d") ? `${m[1]}d` : `${m[1]}h`;
      nodes.unshift({ id: uid("n"), type: "delay", label: `Wait ${m[1]} ${m[2].startsWith("d") ? "days" : "hours"}`, data: { duration: dur } });
      edges.unshift({ source: nodes[0]!.id, target: nodes[1]!.id });
      for (const e of edges) {
        if (e.source === nodes[0]!.id && e.target === nodes[2]?.id) e.source = nodes[1]!.id;
      }
    }
  }
  const updated: MockWorkflow = { ...wf, definition: { ...wf.definition, nodes, edges }, version: wf.status === "ACTIVE" ? wf.version + 1 : wf.version, updatedAt: new Date().toISOString() };
  if (wf.status === "ACTIVE") updated.status = "DRAFT";
  return updated;
}

function buildFromTemplate(template: { id: string; name: string; category: string; description: string }, id: string): MockWorkflow {
  return buildMockWorkflow(template.name, id);
}


export const MOCK: Record<string, (...args: any[]) => any> = {
  getMe: (): AuthUser => ({
    id: "dev-user-id", externalId: "dev-user", email: "demo@doloyal.ai",
    firstName: "Demo", lastName: "User", memberships: [{ id: "m1", userId: "dev-user-id", tenantId: "t1", role: "OWNER", createdAt: D(30) }],
    activeTenantId: "t1", activeRole: "OWNER",
  }),

  getDashboardOverview: (params?: { days?: string | number; from?: string; to?: string }): DashboardOverview => {
    let numDays = 30;
    if (params?.days) numDays = parseInt(String(params.days), 10) || 30;
    else if (params?.from && params?.to) {
      const diff = Math.round((new Date(params.to).getTime() - new Date(params.from).getTime()) / 86400000);
      numDays = Math.max(1, diff);
    }
    const daysArr = Array.from({ length: numDays }, (_, i) => numDays - 1 - i);
    const revenueTrend = daysArr.map((daysAgo) => ({
      date: DD(daysAgo),
      revenue: Math.round(15000 + Math.sin(daysAgo * 0.5) * 6000 + (daysAgo % 7 === 0 ? 8000 : 0)),
      customers: Math.round(5 + Math.sin(daysAgo * 0.3) * 4 + (daysAgo % 7 === 0 ? 5 : 0)),
    }));
    const customerTrend = daysArr.map((daysAgo) => ({
      date: DD(daysAgo),
      revenue: Math.round(10000 + Math.sin(daysAgo * 0.4) * 4000),
      customers: Math.max(1, Math.round(3 + Math.sin(daysAgo * 0.5) * 3 + (daysAgo % 5 === 0 ? 3 : 0))),
    }));

    const totalRev = revenueTrend.reduce((acc, p) => acc + p.revenue, 0);
    const totalCust = customerTrend.reduce((acc, p) => acc + p.customers, 0);
    const repeatCust = Math.max(1, Math.round(totalCust * 0.65));

    return {
      generatedAt: NOW.toISOString(),
      period: { from: params?.from || DD(numDays), to: params?.to || DD(0) },
      kpis: {
        todayRevenue: totalRev,
        todayCustomers: totalCust,
        repeatCustomers: repeatCust,
        newCustomers: Math.max(1, totalCust - repeatCust),
        inactiveCustomers: Math.max(1, Math.round(23 * (numDays / 30))),
        activeRewards: 6,
        pointsRedeemed30d: Math.round(4500 * (numDays / 30)),
        membershipSales30d: Math.round(15000 * (numDays / 30)),
        appointmentsToday: Math.round(7 * (numDays / 30)),
        pendingReviews: 3,
        monthlyGrowthPct: 12.5,
      },
      revenueTrend,
      customerTrend,
      topServices: [
        { service: "Haircut & Styling", revenue: Math.round(184500 * (numDays / 30)), customers: Math.round(342 * (numDays / 30)), growth: 12.4 },
        { service: "Facial Treatment", revenue: Math.round(98200 * (numDays / 30)), customers: Math.round(156 * (numDays / 30)), growth: 8.7 },
        { service: "Manicure & Pedicure", revenue: Math.round(72300 * (numDays / 30)), customers: Math.round(198 * (numDays / 30)), growth: -2.1 },
        { service: "Massage Therapy", revenue: Math.round(65400 * (numDays / 30)), customers: Math.round(112 * (numDays / 30)), growth: 15.3 },
        { service: "Hair Coloring", revenue: Math.round(54100 * (numDays / 30)), customers: Math.round(89 * (numDays / 30)), growth: 5.6 },
      ],
      topCustomers: getCustomers().slice(0, 5).map((c) => ({
        id: c.id, name: c.name, phone: c.phone,
        lifetimeValue: c.lifetimeValue, visitCount: c.visitCount,
        loyaltyBand: c.loyaltyBand, churnRisk: c.churnRisk,
      })),
      topRewards: [
        { id: "r1", name: "Free Haircut", pointsCost: 500, redeemedCount: 42 },
        { id: "r2", name: "20% Off Spa", pointsCost: 800, redeemedCount: 28 },
        { id: "r3", name: "Free Facial", pointsCost: 1200, redeemedCount: 19 },
        { id: "r4", name: "Premium Hair Color", pointsCost: 2000, redeemedCount: 11 },
        { id: "r5", name: "Free Manicure", pointsCost: 600, redeemedCount: 35 },
      ],
      recentActivity: [
        { id: "a1", type: "INVOICE_PAID", message: "Vikram Singh paid ₹3,200 for Hair Color + Styling", customerId: "c4", customerName: "Vikram Singh", amount: 3200, createdAt: D(0) },
        { id: "a2", type: "POINTS_EARNED", message: "Priya Sharma earned 150 points on visit", customerId: "c1", customerName: "Priya Sharma", amount: null, createdAt: D(0) },
        { id: "a3", type: "CUSTOMER_ADDED", message: "New customer Deepak Verma added", customerId: "c8", customerName: "Deepak Verma", amount: null, createdAt: D(1) },
        { id: "a4", type: "REWARD_REDEEMED", message: "Rajesh Kumar redeemed Free Haircut", customerId: "c2", customerName: "Rajesh Kumar", amount: null, createdAt: D(1) },
        { id: "a5", type: "APPOINTMENT_BOOKED", message: "Sneha Reddy booked Hair Spa for tomorrow", customerId: "c7", customerName: "Sneha Reddy", amount: null, createdAt: D(1) },
        { id: "a6", type: "MEMBERSHIP_SOLD", message: "Ananya Patel purchased Gold Membership", customerId: "c3", customerName: "Ananya Patel", amount: 999, createdAt: D(2) },
        { id: "a7", type: "INVOICE_PAID", message: "Arun Joshi paid ₹1,500 for Haircut + Beard", customerId: "c6", customerName: "Arun Joshi", amount: 1500, createdAt: D(2) },
        { id: "a8", type: "CAMPAIGN_SENT", message: "Weekend Offer campaign sent to 45 customers", customerId: null, customerName: null, amount: null, createdAt: D(3) },
      ],
    };
  },

  listCustomers: (params?: CustomerQuery): Paginated<Customer> => {
    let items = [...getCustomers()];
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.email?.toLowerCase().includes(q)));
    }
    if (params?.band) items = items.filter(c => c.loyaltyBand === params.band);
    if (params?.churnRisk) items = items.filter(c => c.churnRisk === params.churnRisk);
    const limit = params?.limit ?? 50;
    return { items: items.slice(0, limit), total: items.length, nextCursor: null, hasMore: false };
  },

  getCustomer: (id: string): CustomerProfile => {
    const c = findCustomer(id) ?? getCustomers()[0]!;
    return {
      ...c, address: "123 Sample St, Mumbai", dateOfBirth: "1990-01-15", gender: "FEMALE",
      source: "walk-in", notes: "Prefers appointments in the morning",
      preferredServices: [
        { name: "Haircut", count: 12, lastAt: D(5) },
        { name: "Hair Color", count: 4, lastAt: D(30) },
        { name: "Facial", count: 3, lastAt: D(60) },
      ],
      membership: null,
      timeline: [
        { id: "t1", kind: "VISIT", title: "Visited for Haircut", amount: 800, date: D(2) },
        { id: "t2", kind: "INVOICE", title: "Haircut + Styling", amount: 1500, date: D(2) },
        { id: "t3", kind: "POINTS", title: "Earned 75 points", points: 75, date: D(2) },
        { id: "t4", kind: "REWARD", title: "Redeemed Free Haircut", date: D(30) },
      ],
      pointsLedger: [
        { id: "pl1", customerId: id, type: "EARN", points: 150, balanceAfter: 2450, reason: "Visit #28", createdAt: D(2) },
        { id: "pl2", customerId: id, type: "REDEEM", points: -500, balanceAfter: 2300, reason: "Redeemed Free Haircut", createdAt: D(30) },
        { id: "pl3", customerId: id, type: "EARN", points: 100, balanceAfter: 2800, reason: "Visit #27", createdAt: D(7) },
      ],
      predictedNextVisitDays: 5,
      upgradeRecommendation: { tier: "PLATINUM", reason: "Customer has high LTV and visit frequency. Upgrading to Platinum would increase retention by 40%." },
    };
  },

  createCustomer: (data: { name: string; phone: string; email?: string; tags?: string[] }): Customer => {
    const newCustomer: Customer = {
      id: `c${Date.now()}`, tenantId: "t1", name: data.name, phone: data.phone, email: data.email ?? null,
      tags: data.tags ?? [], pointsBalance: 0, lifetimeValue: 0, visitCount: 0, averageSpend: 0,
      loyaltyBand: "NEW", churnRisk: "LOW", loyaltyScore: 50, createdAt: NOW.toISOString(), lastVisitAt: null,
    };
    const customers = getCustomers();
    customers.unshift(newCustomer);
    saveCustomers(customers);
    return newCustomer;
  },

  importCustomers: async (file: File) => {
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]!];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const errors: Array<{ row: number; reason: string }> = [];
    const customers: Customer[] = [];
    const seenPhones = new Set(getCustomers().map((c) => c.phone.replace(/[\s-]/g, "")));
    const seenEmails = new Set(
      getCustomers().map((c) => c.email?.toLowerCase()).filter(Boolean) as string[],
    );

    rows.forEach((raw, index) => {
      const excelRow = index + 2;
      const pick = (...keys: string[]) => {
        for (const key of keys) {
          const entry = Object.entries(raw).find(
            ([k]) => k.trim().toLowerCase() === key,
          );
          if (entry && String(entry[1]).trim()) return String(entry[1]).trim();
        }
        return "";
      };
      const name = pick("name", "full name", "customer name");
      const phone = pick("phone", "phone number", "mobile").replace(/\s+/g, " ");
      const email = pick("email", "e-mail").toLowerCase() || undefined;
      const tagsRaw = pick("tags", "tag");
      if (!name && !phone) return;
      if (!name || !phone) {
        errors.push({ row: excelRow, reason: !name ? "Missing required field: Name" : "Missing required field: Phone" });
        return;
      }
      const phoneKey = phone.replace(/[\s-]/g, "");
      if (seenPhones.has(phoneKey)) {
        errors.push({ row: excelRow, reason: "A customer with this phone number already exists" });
        return;
      }
      if (email && seenEmails.has(email)) {
        errors.push({ row: excelRow, reason: "A customer with this email already exists" });
        return;
      }
      seenPhones.add(phoneKey);
      if (email) seenEmails.add(email);
      const created = MOCK.createCustomer({
        name,
        phone,
        email,
        tags: tagsRaw ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
      });
      customers.push(created);
    });

    return { imported: customers.length, skipped: errors.length, errors, customers };
  },

  exportCustomers: async () => {
    const XLSX = await import("xlsx");
    const rows = getCustomers().map((c) => ({
      Name: c.name,
      Phone: c.phone,
      Email: c.email ?? "",
      Tags: c.tags.join(", "),
      Status: "ACTIVE",
      Points: c.pointsBalance,
      Visits: c.visitCount,
      "Lifetime Value": c.lifetimeValue,
      "Loyalty Band": c.loyaltyBand,
      "Churn Risk": c.churnRisk,
      "Last Visit": c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : "",
      Notes: c.notes ?? "",
      "Created At": c.createdAt.slice(0, 10),
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    const array = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const blob = new Blob([array], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    return { blob, filename: `customers-${new Date().toISOString().slice(0, 10)}.xlsx` };
  },

  updateCustomer: (id: string, data: any): Customer => {
    const customers = getCustomers();
    const idx = customers.findIndex((c) => c.id === id);
    const existing = idx >= 0 ? customers[idx]! : customers[0]!;
    const updated = { ...existing, ...data };
    if (idx >= 0) customers[idx] = updated;
    saveCustomers(customers);
    return updated;
  },

  getLoyaltyConfig: (): LoyaltyConfig => loadStore("loyalty", DEFAULT_LOYALTY),

  getFeatureFlags: () => {
    const stored = loadStore<Record<string, { enabled: boolean; config?: any }>>("feature_flags", {});
    const features = LOYALTY_FEATURE_CATALOG.map((def) => {
      const row = stored[def.key];
      return {
        key: def.key,
        name: def.name,
        description: def.description,
        category: def.category,
        icon: def.icon,
        core: def.core,
        enabled: def.core ? true : row?.enabled ?? false,
        config: { ...(def.defaultConfig || {}), ...(row?.config || {}) },
        sectionId: def.sectionId,
        updatedAt: null as string | null,
      };
    });
    return { features, enabledKeys: features.filter((f) => f.enabled).map((f) => f.key) };
  },

  getEnabledFeatureKeys: () => ({ enabledKeys: MOCK.getFeatureFlags().enabledKeys }),

  toggleFeatureFlag: (featureKey: string, enabled: boolean) => {
    if (isCoreLoyaltyFeature(featureKey) && !enabled) {
      throw new Error("Core features cannot be disabled");
    }
    const stored = loadStore<Record<string, { enabled: boolean; config?: any }>>("feature_flags", {});
    stored[featureKey] = { ...stored[featureKey], enabled };
    saveStore("feature_flags", stored);
    return MOCK.getFeatureFlags();
  },

  updateFeatureConfig: (featureKey: string, config: Record<string, unknown>) => {
    const stored = loadStore<Record<string, { enabled: boolean; config?: any }>>("feature_flags", {});
    stored[featureKey] = {
      enabled: stored[featureKey]?.enabled ?? false,
      config: { ...(stored[featureKey]?.config || {}), ...config },
    };
    saveStore("feature_flags", stored);
    return MOCK.getFeatureFlags();
  },

  getLoyaltyModuleSnapshot: (featureKey: string) => {
    const catalog = MOCK.getFeatureFlags();
    const feature = catalog.features.find((f: { key: string }) => f.key === featureKey);
    const entities = loadStore<any[]>(`loyalty_entities_${featureKey}`, []);
    return { feature, entities, live: {} };
  },

  listLoyaltyModuleEntities: (featureKey: string) =>
    loadStore<any[]>(`loyalty_entities_${featureKey}`, []),

  createLoyaltyModuleEntity: (featureKey: string, data: any) => {
    const entities = loadStore<any[]>(`loyalty_entities_${featureKey}`, []);
    const row = {
      id: `le_${Date.now()}`,
      tenantId: "t1",
      featureKey,
      name: data.name || null,
      status: data.status || "ACTIVE",
      data: data.data || {},
      sortOrder: data.sortOrder || 0,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    entities.unshift(row);
    saveStore(`loyalty_entities_${featureKey}`, entities);
    return row;
  },

  updateLoyaltyModuleEntity: (featureKey: string, id: string, data: any) => {
    const entities = loadStore<any[]>(`loyalty_entities_${featureKey}`, []);
    const idx = entities.findIndex((e) => e.id === id);
    if (idx < 0) throw new Error("Entity not found");
    entities[idx] = {
      ...entities[idx],
      ...data,
      data: data.data ? { ...entities[idx].data, ...data.data } : entities[idx].data,
      updatedAt: NOW.toISOString(),
    };
    saveStore(`loyalty_entities_${featureKey}`, entities);
    return entities[idx];
  },

  deleteLoyaltyModuleEntity: (featureKey: string, id: string) => {
    const entities = loadStore<any[]>(`loyalty_entities_${featureKey}`, []);
    saveStore(
      `loyalty_entities_${featureKey}`,
      entities.filter((e) => e.id !== id),
    );
    return { ok: true };
  },

  getLoyaltyAuditLogs: () => ({
    items: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  }),

  updateLoyaltyConfig: (data: any): LoyaltyConfig =>
    saveStore("loyalty", {
      ...loadStore("loyalty", DEFAULT_LOYALTY),
      ...data,
      settings: { ...DEFAULT_LOYALTY.settings, ...(data.settings || {}) },
    }),

  getLoyaltyOverview: () => ({
    kpis: [
      { key: "members", label: "Total Loyalty Members", value: 1284, previousValue: 1180, changePercent: 8.8, format: "number", sparkline: [900, 940, 980, 1020, 1100, 1150, 1200, 1284] },
      { key: "active", label: "Active Members", value: 842, previousValue: 790, changePercent: 6.6, format: "number", sparkline: [700, 720, 740, 760, 780, 800, 820, 842] },
      { key: "issued", label: "Points Issued", value: 184200, previousValue: 162000, changePercent: 13.7, format: "points", sparkline: [120, 130, 140, 150, 160, 170, 180, 184] },
      { key: "redeemed", label: "Points Redeemed", value: 62400, previousValue: 58000, changePercent: 7.6, format: "points", sparkline: [40, 45, 48, 50, 55, 58, 60, 62] },
      { key: "revenue", label: "Revenue Generated", value: 486000, previousValue: 442000, changePercent: 10, format: "currency", sparkline: [300, 320, 350, 380, 400, 430, 460, 486] },
      { key: "repeat", label: "Repeat Customer Rate", value: 64.2, previousValue: 61, changePercent: 5.2, format: "percent", sparkline: [52, 54, 56, 58, 60, 61, 63, 64] },
      { key: "referral", label: "Referral Revenue", value: 38400, previousValue: 32000, changePercent: 20, format: "currency", sparkline: [20, 22, 25, 28, 30, 32, 35, 38] },
      { key: "clv", label: "Avg Customer LTV", value: 12450, previousValue: 11200, changePercent: 11.2, format: "currency", sparkline: [9, 9.5, 10, 10.5, 11, 11.5, 12, 12.4] },
    ],
    generatedAt: NOW.toISOString(),
  }),

  loyaltyCopilot: (data: any) => ({
    reply: `Based on your loyalty data: repeat rate is strong, but ${data?.message?.toLowerCase().includes("churn") ? "32 customers are at elevated churn risk" : "weekend visits dipped 12%"}. I recommend launching Double Points Weekend and boosting referral bonuses.`,
    insights: [
      { id: "1", type: "warning", text: "Repeat purchases dropped 12% week-over-week" },
      { id: "2", type: "warning", text: "Weekend visits decreased" },
      { id: "3", type: "opportunity", text: "Referral program underperforming" },
      { id: "4", type: "insight", text: "32 customers likely to churn — recommend Double Points Weekend" },
    ],
    recommendations: MOCK.getLoyaltyRecommendations(),
    conversationId: `conv_${Date.now()}`,
  }),

  getLoyaltyRecommendations: () => [
    { id: "rec-double", title: "Enable Double Points Weekend", description: "Boost weekend footfall with 2× points.", impact: "High engagement", estimatedRevenue: 18000, retentionLift: 8, action: "enable_weekend_bonus", actionLabel: "Apply Suggestion", priority: "high" },
    { id: "rec-referral", title: "Increase Referral Bonus", description: "Raise referral bonus by 100 points.", impact: "Acquisition", estimatedRevenue: 12000, retentionLift: 5, action: "boost_referral", actionLabel: "Apply Suggestion", priority: "high" },
    { id: "rec-churn", title: "Rescue At-Risk Customers", description: "Win-back offer for churn-risk segment.", impact: "Retention", estimatedRevenue: 24000, retentionLift: 12, action: "winback_campaign", actionLabel: "Create Campaign", priority: "high" },
    { id: "rec-vip", title: "Reward VIP Customers", description: "Auto-grant badges to top spenders.", impact: "LTV", estimatedRevenue: 9000, retentionLift: 6, action: "reward_vip", actionLabel: "Apply Suggestion", priority: "medium" },
  ],

  applyLoyaltyRecommendation: () => ({ applied: true }),

  getLoyaltyLeaderboard: () =>
    getCustomers()
      .slice()
      .sort((a, b) => b.pointsBalance - a.pointsBalance)
      .map((c, i) => ({
        rank: i + 1,
        customerId: c.id,
        name: c.name,
        avatarUrl: c.avatarUrl,
        points: c.pointsBalance,
        visits: c.visitCount,
        referrals: Math.floor(c.visitCount / 5),
        membership: c.loyaltyBand,
        growthPercent: 5 + (i % 7) * 2,
        badges: c.loyaltyBand === "VIP" ? ["VIP"] : [],
        totalSpent: c.lifetimeValue,
        rewardsRedeemed: Math.floor(c.visitCount / 4),
      })),

  rewardLoyaltyTop: () => ({ rewarded: 10, pointsEach: 200 }),

  getLoyaltyChallenges: () => [
    { id: "ch1", title: "Visit 5 times", description: "Come back 5 times this month", type: "VISITS", targetValue: 5, rewardPoints: 250, rewardLabel: "250 bonus points", startsAt: D(30), endsAt: D(-5), status: "ACTIVE", aiGenerated: true, participants: 86, completionRate: 34, avgProgress: 62, remainingDays: 12 },
    { id: "ch2", title: "Spend ₹5,000", description: "Hit spend milestone", type: "SPEND", targetValue: 5000, rewardPoints: 500, rewardLabel: "Premium unlock", startsAt: D(20), endsAt: D(-10), status: "ACTIVE", aiGenerated: true, participants: 54, completionRate: 22, avgProgress: 48, remainingDays: 18 },
    { id: "ch3", title: "Refer 3 friends", description: "Successful referrals", type: "REFERRALS", targetValue: 3, rewardPoints: 300, rewardLabel: "Referral Master", startsAt: D(15), endsAt: D(-15), status: "ACTIVE", aiGenerated: true, participants: 41, completionRate: 18, avgProgress: 40, remainingDays: 22 },
  ],

  generateLoyaltyChallenge: () => ({ id: `ch${Date.now()}`, title: "Leave a Google review", aiGenerated: true }),

  createLoyaltyChallenge: (data: any) => ({
    id: `ch${Date.now()}`,
    ...data,
    status: "ACTIVE",
    participantsCount: 0,
    createdAt: NOW.toISOString(),
  }),

  getLoyaltyBadges: () => [
    { id: "b1", name: "VIP", description: "Top-tier status", icon: "crown", color: "#7C3AED", unlockCount: 12, aiSuggested: true },
    { id: "b2", name: "Elite", description: "High engagement", icon: "gem", color: "#2563EB", unlockCount: 28, aiSuggested: true },
    { id: "b3", name: "Gold Member", description: "Gold tier", icon: "medal", color: "#F59E0B", unlockCount: 64, aiSuggested: false },
    { id: "b4", name: "Referral Master", description: "3+ referrals", icon: "share", color: "#10B981", unlockCount: 19, aiSuggested: true },
    { id: "b5", name: "Weekend Warrior", description: "5 weekend visits", icon: "flame", color: "#F97316", unlockCount: 33, aiSuggested: true },
    { id: "b6", name: "Super Loyal", description: "20+ visits", icon: "heart", color: "#EC4899", unlockCount: 47, aiSuggested: true },
  ],

  createLoyaltyBadge: (data: any) => ({ id: `b${Date.now()}`, ...data, unlockCount: 0 }),

  getLoyaltySegments: () => [
    { id: "vip", name: "VIP", description: "Highest value members", customerCount: 42, revenue: 820000, retention: 91, suggestedCampaign: "VIP Exclusive", color: "#7C3AED" },
    { id: "at_risk", name: "At Risk", description: "Declining engagement", customerCount: 67, revenue: 145000, retention: 28, suggestedCampaign: "Win-back offer", color: "#EF4444" },
    { id: "new", name: "New Customers", description: "Joined last 30 days", customerCount: 118, revenue: 96000, retention: 54, suggestedCampaign: "Welcome series", color: "#0EA5E9" },
    { id: "high_spenders", name: "High Spenders", description: "Above-average LTV", customerCount: 89, revenue: 610000, retention: 78, suggestedCampaign: "Membership upgrade", color: "#F59E0B" },
    { id: "inactive", name: "Inactive", description: "90+ days quiet", customerCount: 156, revenue: 72000, retention: 8, suggestedCampaign: "Reactivation SMS", color: "#64748B" },
    { id: "frequent", name: "Frequent Visitors", description: "10+ visits", customerCount: 203, revenue: 540000, retention: 84, suggestedCampaign: "Streak challenge", color: "#10B981" },
    { id: "referral", name: "Referral Champions", description: "Active referrers", customerCount: 37, revenue: 128000, retention: 88, suggestedCampaign: "Referral boost", color: "#2563EB" },
    { id: "one_time", name: "One-Time Buyers", description: "Single visit", customerCount: 241, revenue: 110000, retention: 12, suggestedCampaign: "Second-visit incentive", color: "#F97316" },
  ],

  getLoyaltyChurn: () =>
    getCustomers()
      .filter((c) => c.churnRisk === "HIGH" || c.churnRisk === "CRITICAL" || c.churnRisk === "MEDIUM")
      .map((c) => ({
        customerId: c.id,
        name: c.name,
        probability: c.churnRisk === "CRITICAL" ? 0.9 : c.churnRisk === "HIGH" ? 0.72 : 0.48,
        reason: c.lastVisitAt ? "Engagement declining" : "No recent visit",
        lastVisitAt: c.lastVisitAt,
        riskScore: c.churnRisk === "CRITICAL" ? 90 : c.churnRisk === "HIGH" ? 72 : 48,
        recommendation: "Offer double points + WhatsApp",
        pointsBalance: c.pointsBalance,
      })),

  getLoyaltyAnalytics: () => ({
    labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    repeatRate: [48, 52, 55, 58, 61, 64],
    retentionRate: [68, 70, 72, 74, 76, 78],
    customerGrowth: [40, 55, 62, 70, 88, 96],
    pointsIssued: [12000, 14000, 15500, 17000, 18200, 19000],
    pointsRedeemed: [4000, 4500, 4800, 5200, 5800, 6200],
    revenueGenerated: [62000, 68000, 74000, 81000, 88000, 96000],
    referralRevenue: [4200, 4800, 5100, 5600, 6100, 6800],
    rewardUsage: [220, 240, 260, 280, 300, 320],
    tierDistribution: [
      { name: "Bronze", value: 40, color: "#CD7F32" },
      { name: "Silver", value: 28, color: "#C0C0C0" },
      { name: "Gold", value: 18, color: "#FFD700" },
      { name: "Platinum", value: 10, color: "#E5E4E2" },
      { name: "Diamond", value: 4, color: "#B9F2FF" },
    ],
    roi: 4.2,
  }),

  getLoyaltyReferrals: () => ({
    tree: [
      {
        id: "c1",
        name: "Priya Sharma",
        status: "ROOT",
        rewardPoints: 300,
        children: [
          { id: "r1", name: "Ananya Patel", status: "COMPLETED", rewardPoints: 100, children: [] },
          { id: "r2", name: "Pending (DL-AB12)", status: "PENDING", rewardPoints: 0, children: [] },
        ],
      },
    ],
    stats: { total: 48, pending: 12, successful: 36, earnings: 3600 },
  }),

  getLoyaltyCard: (customerId: string) => {
    const c = getCustomers().find((x) => x.id === customerId) || getCustomers()[0]!;
    return {
      customerId: c.id,
      customerName: c.name,
      tier: c.loyaltyBand,
      points: c.pointsBalance,
      qrPayload: `doloyal://card/t1/${c.id}`,
      barcode: c.id.replace(/\W/g, "").toUpperCase().slice(0, 12),
      referralCode: `DL-${c.id.toUpperCase()}`,
    };
  },

  getLoyaltyJourney: (customerId: string) => [
    { id: "1", label: "Joined loyalty", date: D(180), type: "JOIN", points: 100 },
    { id: "2", label: "First purchase", date: D(175), type: "EARN", points: 120 },
    { id: "3", label: "Referral completed", date: D(120), type: "REFERRAL", points: 100 },
    { id: "4", label: "Reached Silver", date: D(90), type: "TIER", reward: "Silver" },
    { id: "5", label: "Redeemed Free Haircut", date: D(40), type: "REWARD", reward: "Free Haircut", points: -500 },
    { id: "6", label: "Reached Gold", date: D(10), type: "TIER", reward: "Gold" },
  ],

  getLoyaltyStreaks: () => ({
    milestones: [
      { days: 3, label: "3-day streak", rewardPoints: 30, customersReached: 210 },
      { days: 7, label: "7-day streak", rewardPoints: 70, customersReached: 98 },
      { days: 15, label: "15-day streak", rewardPoints: 150, customersReached: 41 },
      { days: 30, label: "30-day streak", rewardPoints: 300, customersReached: 18 },
      { days: 100, label: "100-day streak", rewardPoints: 1000, customersReached: 3 },
    ],
    topStreak: 42,
    activeStreaks: 126,
  }),

  getSurpriseRewards: () => [
    { id: "s1", name: "Random Points Drop", type: "RANDOM_POINTS", enabled: true, config: { min: 20, max: 100 } },
    { id: "s2", name: "Mystery Gift", type: "MYSTERY_GIFT", enabled: true, config: {} },
    { id: "s3", name: "Birthday Surprise", type: "BIRTHDAY", enabled: true, config: { points: 500 } },
    { id: "s4", name: "Festival Bonus", type: "FESTIVAL", enabled: false, config: { multiplier: 2 } },
    { id: "s5", name: "Weekend Surprise", type: "WEEKEND", enabled: true, config: { points: 75 } },
  ],

  upsertSurpriseReward: (data: any) => ({ id: data.id || `s${Date.now()}`, ...data }),

  getLoyaltyAutomations: () => [
    { id: "a1", name: "Birthday → 500 points", trigger: "BIRTHDAY", conditions: null, actions: { type: "GRANT_POINTS", points: 500 }, status: "ACTIVE", createdAt: D(60) },
    { id: "a2", name: "5 visits → Upgrade tier", trigger: "VISIT_COUNT", conditions: { visits: 5 }, actions: { type: "UPGRADE_TIER" }, status: "ACTIVE", createdAt: D(45) },
    { id: "a3", name: "Referral → Reward both", trigger: "REFERRAL_COMPLETED", conditions: null, actions: { type: "REWARD_BOTH", points: 100 }, status: "ACTIVE", createdAt: D(30) },
    { id: "a4", name: "Spend ₹5,000 → Unlock Gold", trigger: "SPEND_THRESHOLD", conditions: { amount: 5000 }, actions: { type: "ASSIGN_TIER", tier: "Gold" }, status: "PAUSED", createdAt: D(20) },
  ],

  createLoyaltyAutomation: (data: any) => ({ id: `a${Date.now()}`, ...data, createdAt: NOW.toISOString(), status: data.status || "ACTIVE" }),
  toggleLoyaltyAutomation: (id: string, status: string) => ({ id, status }),

  getLoyaltyActivity: () => [
    { id: "act1", message: "Harjot earned 250 points", type: "POINTS_EARNED", customerName: "Harjot", createdAt: D(0) },
    { id: "act2", message: "Rahul reached Gold", type: "TIER_UPGRADE", customerName: "Rahul", createdAt: D(0) },
    { id: "act3", message: "Simran redeemed Coupon", type: "POINTS_REDEEMED", customerName: "Simran", createdAt: D(1) },
    { id: "act4", message: "Aman referred a friend", type: "REFERRAL", customerName: "Aman", createdAt: D(1) },
  ],

  generateLoyaltyCampaign: (data: any) => ({
    id: `camp${Date.now()}`,
    name: data.campaignType,
    subject: `${data.campaignType} is live`,
    status: "DRAFT",
  }),

  getLoyaltyTiers: () => [
    { id: "t1", tenantId: "t1", name: "Bronze", price: 0, validityDays: 365, discountPercent: 0, bonusPointsPercent: 0, pointsMultiplier: 1, minPoints: 0, rank: 1, priorityBooking: false, benefits: ["Standard earning", "Birthday bonus"], exclusiveRewards: [], color: "#CD7F32", badgeLabel: "Bronze" },
    { id: "t2", tenantId: "t1", name: "Silver", price: 0, validityDays: 365, discountPercent: 5, bonusPointsPercent: 10, pointsMultiplier: 1.1, minPoints: 500, rank: 2, priorityBooking: false, benefits: ["1.1× points", "Priority support"], exclusiveRewards: [], color: "#C0C0C0", badgeLabel: "Silver" },
    { id: "t3", tenantId: "t1", name: "Gold", price: 0, validityDays: 365, discountPercent: 10, bonusPointsPercent: 25, pointsMultiplier: 1.25, minPoints: 1500, rank: 3, priorityBooking: true, benefits: ["1.25× points", "Exclusive rewards"], exclusiveRewards: ["Gold spa add-on"], color: "#FFD700", badgeLabel: "Gold" },
    { id: "t4", tenantId: "t1", name: "Platinum", price: 0, validityDays: 365, discountPercent: 15, bonusPointsPercent: 50, pointsMultiplier: 1.5, minPoints: 4000, rank: 4, priorityBooking: true, benefits: ["1.5× points", "Priority booking"], exclusiveRewards: ["Platinum lounge"], color: "#E5E4E2", badgeLabel: "Platinum" },
    { id: "t5", tenantId: "t1", name: "Diamond", price: 0, validityDays: 365, discountPercent: 20, bonusPointsPercent: 100, pointsMultiplier: 2, minPoints: 10000, rank: 5, priorityBooking: true, benefits: ["2× points", "Concierge"], exclusiveRewards: ["Diamond experiences"], color: "#B9F2FF", badgeLabel: "Diamond" },
  ],

  getLoyaltyConfigVersions: () => [],
  restoreLoyaltyConfigVersion: () => loadStore("loyalty", DEFAULT_LOYALTY),
  searchLoyaltyCustomers: (q: string) => getCustomers().filter((c) => c.name.toLowerCase().includes(String(q || "").toLowerCase())),
  getLoyaltyLedger: (params?: any) => ({
    items: MOCK.getLedger(params?.customerId || "c1"),
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  }),

  earnPoints: (): PointsLedgerEntry => ({
    id: `pl${Date.now()}`, customerId: "c1", type: "EARN", points: 100, balanceAfter: 2550,
    reason: "Points earned", createdAt: NOW.toISOString(),
  }),

  redeemReward: (): any => ({ id: `rr${Date.now()}`, code: "RWD-001", reward: "Free Haircut", pointsCost: 500, status: "REDEEMED", newBalance: 1950 }),

  adjustPoints: (): PointsLedgerEntry => ({
    id: `pl${Date.now()}`, customerId: "c1", type: "ADJUST", points: 50, balanceAfter: 2500,
    reason: "Manual adjustment", createdAt: NOW.toISOString(),
  }),

  getLedger: (customerId: string): PointsLedgerEntry[] => [
    { id: "pl1", customerId, type: "EARN", points: 150, balanceAfter: 2450, reason: "Visit", createdAt: D(2) },
    { id: "pl2", customerId, type: "REDEEM", points: -500, balanceAfter: 2300, reason: "Reward redeemed", createdAt: D(30) },
  ],

  listRewards: (): Reward[] => getRewards(),

  createReward: (data: any): Reward => {
    const reward: Reward = {
      id: `r${Date.now()}`,
      tenantId: "t1",
      redeemedCount: 0,
      createdAt: NOW.toISOString(),
      ...data,
    };
    const rewards = getRewards();
    rewards.unshift(reward);
    saveRewards(rewards);
    return reward;
  },

  updateReward: (id: string, data: any): Reward => {
    const rewards = getRewards();
    const idx = rewards.findIndex((r) => r.id === id);
    const existing = idx >= 0 ? rewards[idx]! : rewards[0]!;
    const updated = { ...existing, ...data, id } as Reward;
    if (idx >= 0) rewards[idx] = updated;
    saveRewards(rewards);
    return updated;
  },

  deleteReward: (id: string): void => {
    saveRewards(getRewards().filter((r) => r.id !== id));
  },

  getRedemptions: (): any => [
    { id: "rd1", rewardId: "r1", customerId: "c2", customerName: "Rajesh Kumar", rewardName: "Free Haircut", pointsCost: 500, status: "FULFILLED", fulfilledAt: D(1), createdAt: D(2) },
    { id: "rd2", rewardId: "r2", customerId: "c1", customerName: "Priya Sharma", rewardName: "20% Off Spa", pointsCost: 800, status: "FULFILLED", fulfilledAt: D(5), createdAt: D(7) },
    { id: "rd3", rewardId: "r3", customerId: "c4", customerName: "Vikram Singh", rewardName: "Free Facial", pointsCost: 1200, status: "PENDING", fulfilledAt: null, createdAt: D(3) },
  ],

  getTiers: (): MembershipTier[] => [
    { id: "mt1", tenantId: "t1", name: "SILVER", price: 0, validityDays: 365, discountPercent: 0, bonusPointsPercent: 0, priorityBooking: false, benefits: ["Basic rewards access", "Birthday bonus points"], color: "#A0AEC0" },
    { id: "mt2", tenantId: "t1", name: "GOLD", price: 999, validityDays: 365, discountPercent: 10, bonusPointsPercent: 20, priorityBooking: false, benefits: ["10% off all services", "20% bonus points", "Priority scheduling", "Exclusive offers"], color: "#ECC94B" },
    { id: "mt3", tenantId: "t1", name: "PLATINUM", price: 2499, validityDays: 365, discountPercent: 20, bonusPointsPercent: 50, priorityBooking: true, benefits: ["20% off all services", "50% bonus points", "VIP priority booking", "Free monthly upgrade", "Dedicated stylist", "Take-home hair care kit"], color: "#805AD5" },
  ],

  createTier: (data: any): MembershipTier => ({ id: `mt${Date.now()}`, tenantId: "t1", ...data }),

  assignMembership: (customerId: string, tierId: string): CustomerMembership => ({
    id: `cm${Date.now()}`, customerId, tierId, tierName: "GOLD",
    startDate: NOW.toISOString(), endDate: D(-365), active: true,
  }),

  getSubscription: (): any => {
    const plan = getPlan(currentMockPlan) ?? getPlan("growth");
    const planId = plan?.id ?? "growth";
    return {
      id: "sub-mock-1",
      tenantId: "t1",
      plan: planId,
      status: "ACTIVE",
      rawStatus: "ACTIVE",
      trialEndsAt: null,
      currentPeriodStart: D(30),
      currentPeriodEnd: new Date(NOW.getTime() + 30 * 24 * 3600 * 1000).toISOString(),
      nextBillingDate: new Date(NOW.getTime() + 30 * 24 * 3600 * 1000).toISOString(),
      autoRenew: true,
      canceledAt: null,
      billingCycle: "monthly",
      paymentMethod: { brand: "Visa", last4: "4242", expMonth: "12", expYear: "28", isDefault: true, addedAt: D(60) },
      provider: "doloyal",
      hasPaymentFailed: false,
      createdAt: D(30),
      updatedAt: D(1),
      planDetails: plan,
      usage: {
        customers: { used: 320, limit: plan?.limits.customers ?? 5000 },
        branches: { used: 1, limit: plan?.limits.branches ?? 2 },
        staff: { used: 3, limit: plan?.limits.staff ?? 20 },
        aiQueries: { used: 180, limit: plan?.limits.aiQueries ?? 5000 },
        campaigns: { used: 12, limit: null },
      },
    };
  },

  getBillingHistory: (): any[] => [
    { id: "be-1", type: "PAYMENT_SUCCEEDED", description: "Growth plan — monthly", plan: "growth", amount: 3499, currency: "INR", status: "PAID", createdAt: D(30) },
    { id: "be-2", type: "PLAN_CHANGED", description: "Plan changed to Growth", plan: "growth", amount: null, currency: "INR", status: "PAID", createdAt: D(32) },
    { id: "be-3", type: "PAYMENT_SUCCEEDED", description: "Starter plan — monthly", plan: "starter", amount: 1499, currency: "INR", status: "PAID", createdAt: D(62) },
    { id: "be-4", type: "PAYMENT_METHOD_UPDATED", description: "Payment method updated (Visa •••• 4242)", plan: null, amount: null, currency: "INR", status: null, createdAt: D(60) },
    { id: "be-5", type: "TRIAL_STARTED", description: "1 Month Free Trial started", plan: "free", amount: null, currency: "INR", status: null, createdAt: D(90) },
  ],

  changePlan: (plan: string): any => {
    currentMockPlan = (plan || "growth").toLowerCase();
    return { plan: currentMockPlan, message: `Switched to ${currentMockPlan} plan` };
  },

  cancelSubscription: (): any => ({ message: "Subscription scheduled to cancel", status: "CANCELING" }),

  restartSubscription: (): any => ({ message: "Subscription restarted", status: "ACTIVE" }),

  updatePaymentMethod: (data: any): any => ({ brand: data.brand ?? "Card", last4: data.last4 ?? "4242", expMonth: data.expMonth ?? "12", expYear: data.expYear ?? "28", isDefault: true, addedAt: NOW.toISOString() }),

  listAppointments: (): Appointment[] => [
    { id: "ap1", customerId: "c1", customerName: "Priya Sharma", serviceName: "Haircut + Blow Dry", staffName: "Meera", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 9, 30).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 10, 30).toISOString(), status: "CONFIRMED", source: "BOOKING_LINK" } as any,
    { id: "ap2", customerId: "c4", customerName: "Vikram Singh", serviceName: "Premium Hair Color", staffName: "Rohan", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 10, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0).toISOString(), status: "CONFIRMED", source: "DASHBOARD" } as any,
    { id: "ap3", customerId: "c7", customerName: "Sneha Reddy", serviceName: "Hair Spa", staffName: "Meera", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 11, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0).toISOString(), status: "BOOKED", source: "WHATSAPP" } as any,
    { id: "ap4", customerId: "c2", customerName: "Rajesh Kumar", serviceName: "Beard Trim + Haircut", staffName: "Rohan", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 14, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 14, 45).toISOString(), status: "BOOKED", source: "PHONE_CALL" } as any,
    { id: "ap5", customerId: "c6", customerName: "Arun Joshi", serviceName: "Facial + Clean Up", staffName: "Priya", branchName: "Branch 2", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 15, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 16, 0).toISOString(), status: "BOOKED", source: "WEBSITE_WIDGET" } as any,
    { id: "ap6", customerId: "c3", customerName: "Ananya Patel", serviceName: "Manicure + Pedicure", staffName: "Priya", branchName: "Branch 2", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, 16, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, 17, 0).toISOString(), status: "COMPLETED", source: "BOOKING_LINK" } as any,
    { id: "ap7", customerId: "c5", customerName: "Neha Gupta", serviceName: "Haircut", staffName: "Rohan", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, 10, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1, 10, 30).toISOString(), status: "NO_SHOW", source: "PHONE_CALL" } as any,
  ],

  createAppointment: (data: any): Appointment => ({
    id: `ap${Date.now()}`, customerId: data.customerId, customerName: "Customer", serviceName: data.serviceName,
    staffName: data.staffName ?? "", branchName: data.branchName ?? "Main Branch",
    startsAt: data.startsAt, endsAt: new Date(new Date(data.startsAt).getTime() + 60 * 60 * 1000).toISOString(),
    status: "BOOKED", notes: data.notes ?? null,
  }),

  updateAppointmentStatus: (id: string, status: string): Appointment => ({
    id, customerId: "c1", customerName: "Customer", serviceName: "Service",
    startsAt: NOW.toISOString(), endsAt: new Date(NOW.getTime() + 3600000).toISOString(),
    status: (status === "PENDING" ? "BOOKED" : status) as Appointment["status"],
  }),

  getTodaysAppointments: (): Appointment[] => [
    { id: "ap1", customerId: "c1", customerName: "Priya Sharma", serviceName: "Haircut + Blow Dry", staffName: "Meera", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 9, 30).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 10, 30).toISOString(), status: "CONFIRMED" },
    { id: "ap2", customerId: "c4", customerName: "Vikram Singh", serviceName: "Premium Hair Color", staffName: "Rohan", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 10, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0).toISOString(), status: "CONFIRMED" },
    { id: "ap3", customerId: "c7", customerName: "Sneha Reddy", serviceName: "Hair Spa", staffName: "Meera", branchName: "Main Branch", startsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 11, 0).toISOString(), endsAt: new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate(), 12, 0).toISOString(), status: "BOOKED" },
  ],

  getInvoice: (id: string): Invoice => {
    const found = INVOICES.find(inv => inv.id === id);
    if (found) return found;
    return INVOICES[0] ?? {
      id: "inv1", number: "INV-001", customerId: "c1", customerName: "Priya Sharma", subtotal: 3000, discount: 300, tax: 270, total: 2970, status: "PAID", paymentMethod: "UPI", items: [
        { id: "ii1", serviceName: "Haircut", quantity: 1, unitPrice: 800, total: 800 },
        { id: "ii2", serviceName: "Hair Color", quantity: 1, unitPrice: 2200, total: 2200 },
      ], createdAt: D(2),
    };
  },

  listInvoices: (params?: { customerId?: string; status?: string }): Invoice[] => {
    let items = [...INVOICES];
    if (params?.customerId) items = items.filter(inv => inv.customerId === params.customerId);
    if (params?.status) items = items.filter(inv => inv.status === params.status);
    return items;
  },

  createInvoice: (data: any): Invoice => {
    const customer = findCustomer(data.customerId);
    const customerName = customer?.name ?? "Customer";
    const subtotal = data.items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0);
    const discount = data.discount ?? 0;
    const taxRate = data.taxRate ?? 0;
    const taxable = subtotal - discount;
    const tax = Math.round(taxable * taxRate) / 100;
    const total = Math.round((taxable + tax) * 100) / 100;
    const newInvoice: Invoice = {
      id: `inv${Date.now()}`, number: `INV-${String(INVOICES.length + 1).padStart(3, "0")}`,
      customerId: data.customerId, customerName,
      subtotal, discount, tax, total,
      status: "PAID", paymentMethod: data.paymentMethod ?? "CASH",
      items: data.items.map((i: any, idx: number) => ({ id: `ii${Date.now()}_${idx}`, serviceName: i.serviceName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.quantity * i.unitPrice })),
      createdAt: new Date().toISOString(),
    };
    INVOICES.unshift(newInvoice);
    return newInvoice;
  },

  getTenant: (): Tenant => loadStore("tenant", DEFAULT_TENANT),

  updateTenantSettings: (data: any): Tenant => {
    const current = loadStore("tenant", DEFAULT_TENANT);
    const updated: Tenant = {
      ...current,
      ...data,
      businessHours: data.businessHours
        ? { ...current.businessHours, ...data.businessHours }
        : current.businessHours,
      socialLinks: data.socialLinks
        ? { ...current.socialLinks, ...data.socialLinks }
        : current.socialLinks,
      legalPolicies: data.legalPolicies
        ? { ...current.legalPolicies, ...data.legalPolicies }
        : current.legalPolicies,
      businessStatus: data.businessStatus
        ? { ...current.businessStatus, ...data.businessStatus }
        : current.businessStatus,
      notificationPrefs: data.notificationPrefs
        ? { ...current.notificationPrefs, ...data.notificationPrefs }
        : current.notificationPrefs,
    };
    return saveStore("tenant", updated);
  },

  uploadTenantImage: async (file: File, kind: string) => {
    const url = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
    const field =
      kind === "cover" ? "coverBannerUrl" : kind === "favicon" ? "faviconUrl" : "logoUrl";
    const tenant = MOCK.updateTenantSettings({ [field]: url });
    return { url, field, tenant };
  },

  changePassword: () => ({ message: "Password updated successfully" }),
  setTwoFactor: (enabled: boolean) => ({ twoFactorEnabled: enabled }),
  listSessions: () => [
    { id: "current", device: "This device · Chrome", ip: "127.0.0.1", lastActiveAt: new Date().toISOString(), current: true },
  ],
  logoutAllDevices: () => ({ message: "Logged out from all devices" }),

  getMembers: (): AuthUser[] => [
    { id: "u1", externalId: "dev-user", email: "demo@doloyal.ai", firstName: "Demo", lastName: "User", memberships: [{ id: "m1", userId: "u1", tenantId: "t1", role: "OWNER", createdAt: D(30) }], activeTenantId: "t1", activeRole: "OWNER" },
    { id: "u2", externalId: "ext-2", email: "meera@elegancesalon.com", firstName: "Meera", lastName: "Shah", memberships: [{ id: "m2", userId: "u2", tenantId: "t1", role: "MANAGER", createdAt: D(25) }], activeTenantId: "t1", activeRole: "MANAGER" },
    { id: "u3", externalId: "ext-3", email: "rohan@elegancesalon.com", firstName: "Rohan", lastName: "Joshi", memberships: [{ id: "m3", userId: "u3", tenantId: "t1", role: "STAFF", createdAt: D(20) }], activeTenantId: "t1", activeRole: "STAFF" },
    { id: "u4", externalId: "ext-4", email: "priya@elegancesalon.com", firstName: "Priya", lastName: "Patel", memberships: [{ id: "m4", userId: "u4", tenantId: "t1", role: "STAFF", createdAt: D(15) }], activeTenantId: "t1", activeRole: "STAFF" },
  ],

  updateMemberRole: (id: string, role: string): AuthUser => ({
    id, externalId: "ext", email: "staff@elegancesalon.com", firstName: "Staff", memberships: [{ id: "m1", userId: id, tenantId: "t1", role: role as any, createdAt: D(10) }], activeTenantId: "t1", activeRole: role as any,
  }),

  deleteCustomer: (id: string): void => {
    saveCustomers(getCustomers().filter((c) => c.id !== id));
  },
  removeMember: (id: string): void => {},

  chatWithAssistant: (data: { message: string; conversationId?: string }): AssistantResponse => {
    const msg = data.message.toLowerCase();
    let response = "";
    let toolCalls: any[] = [];
    if (msg.includes("kpi") || msg.includes("dashboard") || msg.includes("how are things")) {
      response = `Here's your business snapshot for today:\n\n• Revenue today: ₹28,500 (12.5% vs last period)\n• Customers today: 12 (8 returning, 4 new)\n• Appointments today: 7\n• Active rewards: 6\n• Membership revenue (30d): ₹15,000\n• Inactive customers: 23\n\nYour repeat rate is looking strong at 67%. The VIP segment is your highest value — consider a targeted win-back for the 23 inactive customers.`;
      toolCalls = [{ name: "getKpis", args: {}, result: JSON.stringify({ todayRevenue: 28500, todayCustomers: 12, monthlyGrowthPct: 12.5 }) }];
    } else if (msg.includes("vip") || msg.includes("top") && msg.includes("customer")) {
      response = `Your top customers by lifetime value:\n1. Vikram Singh — ₹62,000 (VIP, 35 visits)\n2. Priya Sharma — ₹45,000 (VIP, 28 visits)\n3. Rajesh Kumar — ₹28,000 (LOYAL, 18 visits)\n4. Sneha Reddy — ₹22,000 (LOYAL, 14 visits)\n5. Arun Joshi — ₹15,000 (GROWING, 10 visits)`;
      toolCalls = [{ name: "getTopCustomers", args: { limit: 5 }, result: JSON.stringify([{ name: "Vikram Singh", lifetimeValue: 62000 }]) }];
    } else if (msg.includes("churn") || msg.includes("risk") || msg.includes("at risk")) {
      response = `Customers at high churn risk:\n• Neha Gupta (CRITICAL) — hasn't visited since signup 20 days ago. Estimated value at risk: ₹4,800\n• Deepak Verma (HIGH) — only 1 visit in 15 days. Estimated value at risk: ₹3,200\n\nRecommended actions:\n• Send Neha a welcome-back offer with 200 bonus points\n• Offer Deepak a discounted second visit package`;
      toolCalls = [{ name: "getChurnRisks", args: {}, result: JSON.stringify([{ customerName: "Neha Gupta", risk: "CRITICAL" }]) }];
    } else if (msg.includes("inactive") || msg.includes("not visited") || msg.includes("win-back")) {
      response = `You have 23 customers who haven't visited in 60+ days. Total estimated revenue at risk: ₹1,85,000.\n\nSuggested win-back campaign: Send a "We miss you" offer with 500 bonus points on next visit. Target these customers via WhatsApp for best open rates.`;
      toolCalls = [{ name: "listInactiveCustomers", args: { days: 60 }, result: JSON.stringify({ count: 23 }) }];
    } else if (msg.includes("revenue") || msg.includes("sales") || msg.includes("trend")) {
      response = `Revenue trend (last 30 days):\n• Total: ₹6,42,000\n• Daily average: ₹21,400\n• Best day: ₹42,000 (3 days ago)\n• Growth vs previous month: +12.5%\n\nCustomer acquisition trend:\n• New customers (30d): 96\n• Daily average: 3.2\n• Repeat rate: 67%`;
      toolCalls = [{ name: "getRevenueTrend", args: { days: 30 }, result: JSON.stringify({ total: 642000 }) }];
    } else if (msg.includes("search") || msg.includes("find") || msg.includes("customer")) {
      response = `I found the following matching customers: Priya Sharma, Rajesh Kumar, Ananya Patel. Try a more specific search to narrow down results.`;
      toolCalls = [{ name: "searchCustomers", args: { query: msg }, result: "Found 3 matches" }];
    } else {
      response = `I can help you with:\n• 📊 Business KPIs and dashboard summaries\n• 🏆 Top customers by value\n• ⚠️ Churn risk analysis\n• 🔄 Win-back campaigns for inactive customers\n• 📈 Revenue and sales trends\n• 🔍 Customer search\n\nTry asking "How are things?" or "Who's at risk?" to get started.`;
    }
    return { conversationId: data.conversationId ?? `conv_${Date.now()}_dev-user`, message: response, toolCalls, mode: "FALLBACK" };
  },

  // Booking Links ---------------------------------------------------------
  listBookingLinks: (): BookingLink[] => {
    let links = loadStore("bookingLinks", DEFAULT_BOOKING_LINKS);
    // Migrate legacy broken mock slugs to working public routes
    const remap: Record<string, string> = {
      "elegance-salon": "demo-book",
      "meera-elegance": "meera",
      "rohan-elegance": "rohan",
    };
    let changed = false;
    links = links.map((l) => {
      const nextSlug = remap[l.slug];
      if (!nextSlug) return l;
      changed = true;
      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
      return { ...l, slug: nextSlug, url: `${origin}/book/${nextSlug}` };
    });
    if (changed) saveStore("bookingLinks", links);
    return links.map(enrichMockBookingLink);
  },

  getBookingLink: (id: string): BookingLink => {
    const links = loadStore("bookingLinks", DEFAULT_BOOKING_LINKS);
    const link = links.find((l) => l.id === id);
    if (!link) throw new Error("Booking link not found");
    return enrichMockBookingLink(link);
  },

  createBookingLink: (data: any): BookingLink => {
    const slug = data.slug || `link-${Date.now().toString(36)}`;
    const link: BookingLink = enrichMockBookingLink({
      id: `bl${Date.now()}`,
      tenantId: "t1",
      slug,
      type: data.type ?? "PERSONAL",
      name: data.name ?? "New Booking Link",
      description: data.description ?? null,
      staffId: data.staffId ?? null,
      staffName: data.staffId ? "Staff" : null,
      staffIds: data.staffIds ?? (data.staffId ? [data.staffId] : []),
      serviceIds: data.serviceIds ?? [],
      assignmentMode: data.assignmentMode ?? "SINGLE",
      isActive: data.isActive ?? true,
      isPaused: false,
      customerFields: data.customerFields,
      rules: data.rules,
      payment: data.payment ?? { mode: "NONE" },
      loyalty: data.loyalty,
      membershipAccess: data.membershipAccess ?? { access: "EVERYONE" },
      authMode: data.authMode ?? { mode: "GUEST" },
      branding: data.branding,
      automations: data.automations,
      confirmationMessage: data.confirmationMessage,
      redirectUrl: data.redirectUrl,
      webhookUrl: data.webhookUrl,
      visitCount: 0,
      bookingCount: 0,
      revenueGenerated: 0,
      url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/book/${slug}`,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    const links = loadStore("bookingLinks", DEFAULT_BOOKING_LINKS);
    links.unshift(link);
    saveStore("bookingLinks", links);
    return link;
  },

  updateBookingLink: (id: string, data: any): BookingLink => {
    const links = loadStore("bookingLinks", DEFAULT_BOOKING_LINKS);
    const idx = links.findIndex((l) => l.id === id);
    if (idx < 0) throw new Error("Booking link not found");
    const updated = enrichMockBookingLink({
      ...links[idx],
      ...data,
      updatedAt: NOW.toISOString(),
    });
    links[idx] = updated;
    saveStore("bookingLinks", links);
    return updated;
  },

  getBookingLinkSettings: (id: string): BookingLink => MOCK.getBookingLink(id),

  updateBookingLinkSettings: (id: string, data: any): BookingLink => MOCK.updateBookingLink(id, data),

  getBookingPage: (id: string): BookingLink => MOCK.getBookingLink(id),

  updateBookingPage: (id: string, data: any): BookingLink => MOCK.updateBookingLink(id, { ...data, status: data.status ?? "DRAFT" }),

  publishBookingLink: (id: string): BookingLink =>
    MOCK.updateBookingLink(id, { status: "PUBLISHED", publishedAt: NOW.toISOString(), isActive: true }),

  getBookingLinkAnalytics: (id: string): any => {
    const link = MOCK.getBookingLink(id);
    return {
      linkId: id,
      visits: link.visitCount ?? 42,
      uniqueVisitors: 28,
      bookings: link.bookingCount ?? 12,
      conversionRate: link.metrics?.conversionRate ?? 28.5,
      revenue: link.revenueGenerated ?? 18400,
      averageBookingValue: link.metrics?.averageBookingValue ?? 1533,
      topServices: [
        { name: "Haircut", count: 5, revenue: 2500 },
        { name: "Hair Spa", count: 4, revenue: 4800 },
      ],
      topStaff: [{ id: "s1", name: "Meera", count: 8, revenue: 9600 }],
      repeatCustomers: 3,
      newCustomers: 9,
      cancelledBookings: 1,
      rescheduledBookings: 0,
      trafficSources: [
        { source: "instagram", count: 18 },
        { source: "qr", count: 10 },
        { source: "direct", count: 14 },
      ],
      insights: [
        { title: "Evening demand is high", body: "Most bookings happen after 6 PM. Consider adding more staff.", severity: "info" },
        { title: "Combo offer opportunity", body: "Customers frequently book Hair Spa after Haircut.", severity: "success" },
      ],
      period: { from: D(30), to: NOW.toISOString() },
    };
  },

  duplicateBookingLink: (id: string): BookingLink => {
    const original = MOCK.getBookingLink(id);
    return MOCK.createBookingLink({
      ...original,
      name: `${original.name || "Booking Link"} (Copy)`,
      slug: undefined,
    });
  },

  deleteBookingLink: (id: string): void => {
    saveStore(
      "bookingLinks",
      loadStore("bookingLinks", DEFAULT_BOOKING_LINKS).filter((l) => l.id !== id),
    );
  },

  regenerateBookingLink: (id: string): BookingLink => {
    const slug = `new-${Date.now().toString(36)}`;
    return MOCK.updateBookingLink(id, {
      slug,
      url: `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/book/${slug}`,
    });
  },

  // Notifications ---------------------------------------------------------
  listNotifications: (): NotificationRecord[] => [
    { id: "n1", appointmentId: "ap1", customerId: "c1", customerName: "Priya Sharma", type: "BOOKING_CONFIRMATION", channel: "EMAIL", recipient: "priya@email.com", subject: "Appointment Confirmed", body: "Your appointment has been confirmed.", status: "SENT", sentAt: D(0), createdAt: D(0) },
    { id: "n2", appointmentId: "ap2", customerId: "c4", customerName: "Vikram Singh", type: "REMINDER_24H", channel: "WHATSAPP", recipient: "+91 98765 43204", subject: null, body: "Reminder: You have an appointment tomorrow.", status: "SENT", sentAt: D(0), createdAt: D(0) },
    { id: "n3", appointmentId: "ap3", customerId: "c7", customerName: "Sneha Reddy", type: "BOOKING_CONFIRMATION", channel: "EMAIL", recipient: "sneha@email.com", subject: "Appointment Confirmed", body: "Your appointment has been confirmed.", status: "PENDING", sentAt: null, createdAt: D(0) },
  ],

  sendNotification: (data: any): void => {},

  listNotificationTemplates: (): NotificationTemplate[] => getNotificationTemplates(),

  saveNotificationTemplate: (data: any): NotificationTemplate => {
    const templates = getNotificationTemplates();
    const existingIdx = templates.findIndex(
      (t) => t.type === data.type && t.channel === (data.channel ?? "EMAIL"),
    );
    const saved: NotificationTemplate = {
      id: existingIdx >= 0 ? templates[existingIdx]!.id : `nt${Date.now()}`,
      tenantId: "t1",
      type: data.type,
      channel: data.channel ?? "EMAIL",
      subject: data.subject ?? null,
      body: data.body,
      isActive: data.isActive ?? true,
    };
    if (existingIdx >= 0) templates[existingIdx] = saved;
    else templates.push(saved);
    saveNotificationTemplates(templates);
    return saved;
  },

  deleteNotificationTemplate: (id: string): void => {
    saveNotificationTemplates(getNotificationTemplates().filter((t) => t.id !== id));
  },

  // Availability ----------------------------------------------------------
  getAvailability: (): AvailabilitySettings => loadStore("availability", DEFAULT_AVAILABILITY),

  updateAvailability: (data: any): AvailabilitySettings =>
    saveStore("availability", {
      ...loadStore("availability", DEFAULT_AVAILABILITY),
      ...data,
      businessHours: data.businessHours ?? loadStore("availability", DEFAULT_AVAILABILITY).businessHours,
    }),

  listBlockedDates: (): BlockedDateRecord[] => getBlockedDates(),

  addBlockedDate: (data: any): BlockedDateRecord => {
    const record: BlockedDateRecord = { id: `bd${Date.now()}`, tenantId: "t1", ...data };
    const dates = getBlockedDates();
    dates.push(record);
    saveBlockedDates(dates);
    return record;
  },

  removeBlockedDate: (id: string): void => {
    saveBlockedDates(getBlockedDates().filter((b) => b.id !== id));
  },

  // Analytics -------------------------------------------------------------
  getBookingAnalytics: (): BookingAnalytics => ({
    totalBookings: 245,
    completed: 180,
    cancelled: 25,
    rescheduled: 15,
    noShow: 25,
    revenue: 285000,
    topServices: [
      { name: "Haircut", count: 85, revenue: 68000 },
      { name: "Hair Color", count: 45, revenue: 99000 },
      { name: "Facial", count: 38, revenue: 49400 },
      { name: "Hair Spa", count: 28, revenue: 33600 },
      { name: "Manicure", count: 22, revenue: 17600 },
    ],
    topStaff: [
      { id: "s1", name: "Meera", count: 98, revenue: 127400 },
      { id: "s2", name: "Rohan", count: 82, revenue: 106600 },
      { id: "s3", name: "Priya", count: 65, revenue: 51000 },
    ],
    peakHours: [
      { hour: 9, count: 15 }, { hour: 10, count: 35 }, { hour: 11, count: 42 },
      { hour: 12, count: 28 }, { hour: 14, count: 30 }, { hour: 15, count: 38 },
      { hour: 16, count: 32 }, { hour: 17, count: 20 },
    ],
    customerRetention: 68.5,
    bookingConversionRate: 72.3,
    monthlyGrowth: 15.2,
    sourceBreakdown: [
      { source: "BOOKING_LINK", count: 98 },
      { source: "DASHBOARD", count: 75 },
      { source: "WHATSAPP", count: 35 },
      { source: "WEBSITE_WIDGET", count: 22 },
      { source: "PHONE_CALL", count: 15 },
    ],
  }),

  // Widget ----------------------------------------------------------------
  getWidgetSettings: (): WidgetSettings => loadStore("widget", DEFAULT_WIDGET),

  updateWidgetSettings: (data: any): WidgetSettings =>
    saveStore("widget", { ...loadStore("widget", DEFAULT_WIDGET), ...data }),

  // Appointment Detail ----------------------------------------------------
  getAppointmentDetail: (id: string): AppointmentDetail => {
    const appointments = MOCK.listAppointments() as Appointment[];
    const base = appointments.find((a: Appointment) => a.id === id) ?? appointments[0];
    return {
      ...base,
      source: "BOOKING_LINK",
      paymentStatus: "PENDING",
      paymentAmount: null,
      bookingLinkId: "bl1",
      cancelledAt: null,
      rescheduledFrom: null,
      serviceId: null,
      activityTimeline: [
        { id: "act1", type: "APPOINTMENT_BOOKED", message: "Appointment booked via booking link", customerId: base.customerId, customerName: base.customerName, amount: null, createdAt: D(0) },
        { id: "act2", type: "NOTE", message: "Confirmation sent to customer", customerId: base.customerId, customerName: base.customerName, amount: null, createdAt: D(0) },
      ],
      createdAt: D(0),
      updatedAt: NOW.toISOString(),
    };
  },

  updateAppointment: (id: string, data: any): Appointment => ({
    id, customerId: "c1", customerName: "Customer", serviceName: "Updated Service",
    staffName: data.staffName ?? null, branchName: data.branchName ?? null,
    notes: data.notes ?? null,
    startsAt: data.startsAt ?? NOW.toISOString(), endsAt: new Date(NOW.getTime() + 3600000).toISOString(),
    status: "BOOKED",
  }),

  deleteAppointment: (id: string): void => {},

  onBoardTenant: (data: any): Tenant => {
    const tenant: Tenant = {
      ...DEFAULT_TENANT,
      id: "t1",
      name: data.name,
      category: data.category,
      phone: data.phone ?? DEFAULT_TENANT.phone,
      email: data.email ?? DEFAULT_TENANT.email,
      address: data.address ?? null,
      currency: data.currency ?? "INR",
      timezone: data.timezone ?? "Asia/Kolkata",
      brandColor: data.brandColor ?? "#2563EB",
      taxRate: DEFAULT_TENANT.taxRate,
      onboardingComplete: true,
      createdAt: NOW.toISOString(),
    };
    return saveStore("tenant", tenant);
  },

  // ─── Website Builder ────────────────────────────────────────────────────
  listWebsites: (): any[] => WEBSITES,

  createWebsite: (data: any): any => {
    const site = {
      id: `ws-${Date.now()}`,
      tenantId: "t1",
      name: data.name,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      description: null,
      status: "DRAFT",
      industry: data.industry ?? "BEAUTY_SALON",
      theme: { preset: "MODERN", primaryColor: "#2563EB", headingFont: "Inter", bodyFont: "Inter" },
      publishedAt: null,
      draftVersion: 0,
      liveVersion: 0,
      totalPages: 0,
      assetCount: 0,
      domainCount: 0,
      lastDeployment: null,
      liveUrl: null,
      previewUrl: null,
      pages: [],
      domains: [],
      assets: [],
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    WEBSITES.unshift(site);
    return site;
  },

  getWebsite: (id: string): any => {
    let site = WEBSITES.find((w: any) => w.id === id);
    if (!site) site = WEBSITES[0];
    return {
      ...site,
      pages: MOCK_SITE_PAGES,
      assets: [],
      domains: [],
      deployments: MOCK_DEPLOYMENTS,
    };
  },

  deleteWebsite: (id: string): void => {
    const idx = WEBSITES.findIndex((w: any) => w.id === id);
    if (idx >= 0) WEBSITES.splice(idx, 1);
  },

  duplicateWebsite: (id: string): any => {
    const original = WEBSITES.find((w: any) => w.id === id);
    if (!original) return WEBSITES[0];
    const copy = { ...original, id: `ws-${Date.now()}`, name: `${original.name} (Copy)`, slug: `${original.slug}-copy`, status: "DRAFT", publishedAt: null, liveUrl: null };
    WEBSITES.unshift(copy);
    return copy;
  },

  generateWebsite: (id: string, data: any): any => ({
    generationId: `gen-${Date.now()}`,
    theme: { preset: "MODERN", primaryColor: "#2563EB", headingFont: "Inter", bodyFont: "Inter", borderRadius: "0.75rem" },
    pages: [
      { title: "Home", slug: "home", isHome: true, seo: { metaTitle: "Test", metaDescription: "Test" }, sections: [
        { component: "HERO", sortOrder: 0, content: { type: "hero", data: { headline: `Welcome to Elegance Salon`, subheadline: "Premium beauty services", cta: { text: "Book Now" } } } },
        { component: "SERVICES", sortOrder: 1, content: { type: "services", data: { headline: "Our Services", items: [{ name: "Haircut", price: 800, duration: 45 }] } } },
        { component: "CTA", sortOrder: 2, content: { type: "cta", data: { headline: "Book Your Appointment", buttonText: "Book Now" } } },
      ]},
      { title: "About", slug: "about", isHome: false, seo: { metaTitle: "About", metaDescription: "About us" }, sections: [
        { component: "ABOUT", sortOrder: 0, content: { type: "about", data: { headline: "About Us", body: "We are a premium salon." } } },
      ]},
      { title: "Services", slug: "services", isHome: false, seo: { metaTitle: "Services", metaDescription: "Our services" }, sections: [
        { component: "SERVICES", sortOrder: 0, content: { type: "services", data: { headline: "Our Services", items: [{ name: "Haircut", price: 800, duration: 45 }, { name: "Facial", price: 1200, duration: 60 }] } } },
      ]},
      { title: "Contact", slug: "contact", isHome: false, seo: { metaTitle: "Contact", metaDescription: "Contact us" }, sections: [
        { component: "CONTACT", sortOrder: 0, content: { type: "contact", data: { headline: "Get in Touch", phone: "+91 98765 43210", email: "hello@salon.com" } } },
      ]},
    ],
  }),

  regenerateSection: (id: string, data: any): any => ({
    id: data.sectionId, component: "HERO", content: { type: "hero", data: { headline: "Updated Premium Hero", subheadline: "AI-enhanced section" } },
  }),

  listPages: (id: string): any[] => MOCK_SITE_PAGES,

  createPage: (id: string, data: any): any => ({
    id: `page-${Date.now()}`, websiteId: id, title: data.title, slug: data.slug, sortOrder: 99, isHome: false, seo: null, sections: [], status: "DRAFT",
  }),

  updatePage: (id: string, pageId: string, data: any): any => ({ id: pageId, ...data }),

  deletePage: (id: string, pageId: string): void => {},

  updateSection: (id: string, sectionId: string, data: any): any => ({ id: sectionId, ...data }),

  addSection: (id: string, pageId: string, data: any): any => ({
    id: `sec-${Date.now()}`, pageId, component: data.component, sortOrder: data.sortOrder ?? 0, content: data.content, styles: data.styles ?? null, isPublished: false,
  }),

  deleteSection: (id: string, sectionId: string): void => {},

  reorderSections: (id: string, pageId: string, sectionIds: string[]): any => ({ success: true }),

  publishWebsite: (id: string): any => ({
    id: `deploy-${Date.now()}`, version: 1, status: "LIVE", liveUrl: "https://elegance-salon.doloyal.ai", previewUrl: `/api/websites/${id}/preview`, buildTimeMs: 3200,
    lighthouse: { performance: 92, accessibility: 88, seo: 95, bestPractices: 90 },
  }),

  getPreview: (id: string): any => ({ id, pages: MOCK_SITE_PAGES }),

  getDeployments: (id: string): any[] => MOCK_DEPLOYMENTS,

  addDomain: (id: string, domain: string): any => ({
    id: `dom-${Date.now()}`, websiteId: id, domain, verified: false, sslStatus: "PENDING",
    dnsRecords: [
      { type: "CNAME", name: "www", value: "elegance-salon.doloyal.ai", status: "pending" },
      { type: "TXT", name: "@", value: "doloyal-verify=123", status: "pending" },
    ],
  }),

  listDomains: (id: string): any[] => [],

  verifyDomain: (id: string, domainId: string): any => ({
    id: domainId, verified: true, sslStatus: "ACTIVE", verifiedAt: NOW.toISOString(),
  }),

  removeDomain: (id: string, domainId: string): void => {},

  // ─── Integrations ────────────────────────────────────────────────────────

  listIntegrationProviders: (): any[] => [
    { type: "GOOGLE_CALENDAR", name: "Google Calendar", description: "Sync appointments, events, and staff schedules.", category: "Calendar", icon: "Calendar", hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: false, supportsSync: true },
    { type: "STRIPE", name: "Stripe", description: "Accept payments and manage customer subscriptions.", category: "Payments", icon: "CreditCard", hasApiKey: true, hasApiSecret: false, hasOAuth: false, hasWebhook: true, supportsSync: true },
    { type: "RAZORPAY", name: "Razorpay", description: "Accept UPI, cards, net banking, and online payments.", category: "Payments", icon: "CreditCard", hasApiKey: true, hasApiSecret: true, hasOAuth: false, hasWebhook: true, supportsSync: true },
    { type: "RESEND", name: "Resend", description: "Send transactional and automated emails.", category: "Email", icon: "Mail", hasApiKey: false, hasApiSecret: false, hasOAuth: true, hasWebhook: true, supportsSync: false },
    { type: "WHATSAPP", name: "WhatsApp Business", description: "Send automated WhatsApp messages to customers.", category: "Messaging", icon: "MessageCircle", hasApiKey: true, hasApiSecret: false, hasOAuth: false, hasWebhook: false, supportsSync: false },
  ],

  listIntegrations: (): any[] => getIntegrations(),

  getIntegration: (type: string): any =>
    getIntegrations().find((i: any) => i.type === type.toUpperCase()) ?? null,

  connectIntegration: (data: any): any => {
    const list = getIntegrations();
    const type = data.type.toUpperCase();
    const existing = list.find((i: any) => i.type === type);
    if (existing) {
      existing.status = "CONNECTED";
      existing.connected = true;
      existing.label = data.label || data.type;
      existing.metadata = { ...existing.metadata, ...data.metadata };
      existing.updatedAt = NOW.toISOString();
      saveIntegrations(list);
      return existing;
    }
    const newInt = {
      id: `int-${Date.now()}`,
      tenantId: "t1",
      type,
      status: "CONNECTED",
      label: data.label || data.type,
      metadata: data.metadata || null,
      connected: true,
      token: { tokenType: "Bearer" },
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    };
    saveIntegrations([...list, newInt]);
    return newInt;
  },

  disconnectIntegration: (type: string): any => {
    const list = getIntegrations();
    const existing = list.find((i: any) => i.type === type.toUpperCase());
    if (existing) {
      existing.status = "DISCONNECTED";
      existing.connected = false;
      existing.updatedAt = NOW.toISOString();
      saveIntegrations(list);
    }
    return { success: true };
  },

  updateIntegrationConfig: (type: string, config: any): any => {
    const list = getIntegrations();
    const existing = list.find((i: any) => i.type === type.toUpperCase());
    if (existing) {
      existing.metadata = { ...existing.metadata, ...config };
      existing.updatedAt = NOW.toISOString();
      saveIntegrations(list);
    }
    return existing;
  },

  // ─── Website Connections ─────────────────────────────────────────────────

  listConnectedWebsites: (): ConnectedWebsite[] => getConnectionStore().websites,

  getConnectedWebsite: (id: string): ConnectedWebsite => {
    const store = getConnectionStore();
    const site = store.websites.find((w) => w.id === id);
    if (!site) throw new Error("Connected website not found");
    return {
      ...site,
      apiKeys: store.apiKeys.filter((k) => k.website?.id === id || (k as any).connectedWebsiteId === id),
      webhooks: store.webhooks.filter((w) => w.website?.id === id),
    };
  },

  createConnectedWebsite: (data: CreateConnectedWebsiteInput): ConnectedWebsiteCreateResult => {
    const store = getConnectionStore();
    const id = `cw-${Date.now()}`;
    const businessId = "biz_demo001";
    const publicKey = `lf_pk_${mockRandHex(24)}`;
    const secretKey = `lf_sk_${mockRandHex(24)}`;
    const webhookSecret = `lf_whsec_${mockRandHex(24)}`;
    const connectionToken = `conn_${mockRandHex(24)}`;
    const url = /^https?:\/\//i.test(data.websiteUrl) ? data.websiteUrl : `https://${data.websiteUrl}`;
    const domain = (() => {
      try { return new URL(url).hostname; } catch { return data.websiteUrl; }
    })();

    const website: ConnectedWebsite = {
      id,
      tenantId: "t1",
      businessId,
      businessName: data.businessName || "Elegance Salon & Spa",
      name: data.name,
      websiteUrl: url,
      framework: data.framework as WebsiteFramework,
      status: "PENDING",
      connectionToken,
      lastSyncAt: null,
      stats: { customers: 0, appointments: 0, memberships: 0, rewards: 0, forms: 0 },
      domain,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
      publicKey,
      secretKeyPrefix: `${secretKey.slice(0, 12)}…`,
      logCount: 1,
      webhookCount: 1,
      sdkInstallCount: 0,
      settings: { businessName: data.businessName, syncEnabled: true },
    };

    const apiKey: WebsiteConnectionApiKey = {
      id: `wak-${Date.now()}`,
      businessId,
      publicKey,
      secretKeyPrefix: `${secretKey.slice(0, 12)}…`,
      webhookSecretPrefix: `${webhookSecret.slice(0, 14)}…`,
      label: "Primary",
      isActive: true,
      lastUsedAt: null,
      createdAt: NOW.toISOString(),
      website: { id, name: website.name, websiteUrl: url, status: "PENDING" },
    };

    const webhook: WebsiteConnectionWebhook = {
      id: `wwh-${Date.now()}`,
      businessId,
      url: `${url.replace(/\/$/, "")}/doloyal/webhooks`,
      secretPrefix: `${webhookSecret.slice(0, 14)}…`,
      events: [
        "customer.created",
        "customer.updated",
        "appointment.created",
        "membership.created",
        "reward.redeemed",
        "payment.completed",
        "lead.created",
      ],
      isActive: true,
      failureCount: 0,
      lastDeliveryAt: null,
      createdAt: NOW.toISOString(),
      website: { id, name: website.name, websiteUrl: url },
    };

    const log: ConnectionLogEntry = {
      id: `clog-${Date.now()}`,
      businessId,
      connectedWebsiteId: id,
      websiteName: website.name,
      level: "INFO",
      event: "connection.created",
      message: `Connection generated for ${website.name}`,
      metadata: { framework: data.framework, websiteUrl: url },
      createdAt: NOW.toISOString(),
    };

    store.websites.unshift(website);
    store.apiKeys.unshift(apiKey);
    store.webhooks.unshift(webhook);
    store.logs.unshift(log);
    store.secrets[id] = { secretKey, webhookSecret };
    saveConnectionStore(store);

    return {
      ...website,
      credentials: { businessId, publicKey, secretKey, webhookSecret, connectionToken },
    };
  },

  disconnectConnectedWebsite: (id: string): ConnectedWebsite => {
    const store = getConnectionStore();
    const idx = store.websites.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Connected website not found");
    const current = store.websites[idx]!;
    const lastConnectedAt = current.lastSyncAt ?? current.updatedAt;
    store.websites[idx] = {
      ...current,
      status: "DISCONNECTED",
      lastConnectedAt,
      settings: { ...(current.settings ?? {}), lastConnectedAt },
      updatedAt: new Date().toISOString(),
    };
    store.logs.unshift({
      id: `clog-${Date.now()}`,
      businessId: store.websites[idx]!.businessId,
      connectedWebsiteId: id,
      websiteName: store.websites[idx]!.name,
      level: "INFO",
      event: "connection.disconnected",
      message: "Website disconnected",
      createdAt: new Date().toISOString(),
    });
    saveConnectionStore(store);
    return store.websites[idx]!;
  },

  reconnectConnectedWebsite: (id: string): ConnectedWebsite => {
    const store = getConnectionStore();
    const idx = store.websites.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Connected website not found");
    store.websites[idx] = {
      ...store.websites[idx]!,
      status: "CONNECTED",
      lastSyncAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.logs.unshift({
      id: `clog-${Date.now()}`,
      businessId: store.websites[idx]!.businessId,
      connectedWebsiteId: id,
      websiteName: store.websites[idx]!.name,
      level: "INFO",
      event: "connection.reconnected",
      message: "Website reconnected",
      createdAt: new Date().toISOString(),
    });
    saveConnectionStore(store);
    return store.websites[idx]!;
  },

  deleteConnectedWebsite: (id: string) => {
    const store = getConnectionStore();
    store.websites = store.websites.filter((w) => w.id !== id);
    store.apiKeys = store.apiKeys.filter((k) => k.website?.id !== id);
    store.webhooks = store.webhooks.filter((w) => w.website?.id !== id);
    store.logs = store.logs.filter((l) => l.connectedWebsiteId !== id);
    delete store.secrets[id];
    saveConnectionStore(store);
    return { success: true, message: "Website connection deleted successfully" };
  },

  listWebsiteConnectionApiKeys: (): WebsiteConnectionApiKey[] => getConnectionStore().apiKeys,

  listWebsiteConnectionWebhooks: (): WebsiteConnectionWebhook[] => getConnectionStore().webhooks,

  listWebsiteConnectionLogs: (params?: { websiteId?: string; limit?: number }): ConnectionLogEntry[] => {
    const store = getConnectionStore();
    let logs = [...store.logs];
    if (params?.websiteId) logs = logs.filter((l) => l.connectedWebsiteId === params.websiteId);
    return logs.slice(0, params?.limit ?? 50);
  },

  updateConnectedWebsiteSettings: (id: string, data: any): ConnectedWebsite => {
    const store = getConnectionStore();
    const idx = store.websites.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Connected website not found");
    const current = store.websites[idx]!;
    store.websites[idx] = {
      ...current,
      name: data.name ?? current.name,
      websiteUrl: data.websiteUrl ?? current.websiteUrl,
      settings: { ...(current.settings ?? {}), ...(data.settings ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    saveConnectionStore(store);
    return store.websites[idx]!;
  },

  // ─── AI Workflows (mock) ──────────────────────────────────────────────────

  listWorkflows: (params?: { search?: string; status?: string; sort?: string }): import("@doloyal/shared").WorkflowSummary[] => {
    let items = getWorkflowStore().workflows.map(wfToSummary);
    if (params?.search) {
      const q = params.search.toLowerCase();
      items = items.filter((w) => w.name.toLowerCase().includes(q) || (w.description?.toLowerCase().includes(q)));
    }
    if (params?.status) items = items.filter((w) => w.status === params.status);
    return items;
  },

  getWorkflow: (id: string): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    return wfToDetail(wf);
  },

  generateWorkflow: (prompt: string): import("@doloyal/shared").WorkflowGenerateResult => {
    const store = getWorkflowStore();
    const draft = buildMockWorkflow(prompt, "wf-mock-" + Math.random().toString(36).slice(2, 8));
    store.workflows.unshift(draft);
    saveWorkflowStore(store);
    return {
      workflow: wfToDetail(draft),
      message: `I've drafted an automation from your request. Review the steps below, then save & activate it.`,
      warnings: draft.warnings || [],
    };
  },

  editWorkflow: (
    id: string,
    instruction: string,
    opts?: { definition?: import("@doloyal/shared").WorkflowDefinition; context?: string },
  ): import("@doloyal/shared").WorkflowGenerateResult => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    const current = store.workflows[idx]!;
    const base = opts?.definition || current.definition;
    const edited = applyMockEdit({ ...current, definition: base }, instruction);
    if (!opts?.definition) {
      store.workflows[idx] = edited;
      saveWorkflowStore(store);
    }
    return {
      workflow: { ...wfToDetail(edited), definition: edited.definition },
      message: "I've updated the workflow based on your instruction.",
    };
  },

  validateWorkflow: (
    id: string,
    definition?: import("@doloyal/shared").WorkflowDefinition,
  ): import("./workflows").WorkflowValidationResult => {
    const store = getWorkflowStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    const def = definition || wf.definition;
    return mockValidateDefinition(def);
  },

  explainWorkflow: (id: string): { summary: string } => {
    const store = getWorkflowStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    const nodeNames = wf.definition.nodes.map((n) => `${n.label} (${n.type})`).join(" → ");
    return {
      summary:
        `This workflow is called "${wf.name}". It triggers on ${wf.definition.trigger.type} and flows through: ${nodeNames}. ` +
        `Each customer who matches the trigger goes through these steps in order, and the workflow only activates after you confirm.`,
    };
  },

  saveWorkflow: (id: string, definition: import("@doloyal/shared").WorkflowDefinition): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    store.workflows[idx] = {
      ...store.workflows[idx]!,
      name: definition.name || store.workflows[idx]!.name,
      description: definition.description ?? store.workflows[idx]!.description,
      definition,
      version: store.workflows[idx]!.version,
      updatedAt: new Date().toISOString(),
    };
    saveWorkflowStore(store);
    return wfToDetail(store.workflows[idx]!);
  },

  useWorkflowTemplate: (templateId: string): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const template = MOCK_WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    const draft = template
      ? buildFromTemplate(template, "wf-mock-" + Math.random().toString(36).slice(2, 8))
      : buildMockWorkflow("Follow up with customers", "wf-mock-" + Math.random().toString(36).slice(2, 8));
    store.workflows.unshift(draft);
    saveWorkflowStore(store);
    return wfToDetail(draft);
  },

  activateWorkflow: (id: string, audience?: number): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    const wf = store.workflows[idx]!;
    store.workflows[idx] = {
      ...wf,
      status: "ACTIVE",
      version: wf.status === "ACTIVE" ? wf.version : wf.version,
      activatedAt: new Date().toISOString(),
      pausedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    saveWorkflowStore(store);
    return wfToDetail(store.workflows[idx]!);
  },

  pauseWorkflow: (id: string): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    store.workflows[idx] = { ...store.workflows[idx]!, status: "PAUSED", pausedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveWorkflowStore(store);
    return wfToDetail(store.workflows[idx]!);
  },

  resumeWorkflow: (id: string): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    store.workflows[idx] = { ...store.workflows[idx]!, status: "ACTIVE", pausedAt: undefined, activatedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    saveWorkflowStore(store);
    return wfToDetail(store.workflows[idx]!);
  },

  duplicateWorkflow: (id: string): import("@doloyal/shared").WorkflowDetail => {
    const store = getWorkflowStore();
    const src = store.workflows.find((w) => w.id === id);
    if (!src) throw new Error("Workflow not found");
    const copy: MockWorkflow = {
      ...JSON.parse(JSON.stringify(src)),
      id: "wf-mock-" + Math.random().toString(36).slice(2, 8),
      name: `${src.name} (copy)`,
      status: "DRAFT",
      version: 1,
      activatedAt: undefined,
      pausedAt: undefined,
      lastRunAt: undefined,
      runs: 0,
      completedRuns: 0,
      failedRuns: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.workflows.unshift(copy);
    saveWorkflowStore(store);
    return wfToDetail(copy);
  },

  archiveWorkflow: (id: string): { ok: boolean } => {
    const store = getWorkflowStore();
    const idx = store.workflows.findIndex((w) => w.id === id);
    if (idx < 0) throw new Error("Workflow not found");
    store.workflows[idx] = { ...store.workflows[idx]!, status: "ARCHIVED", updatedAt: new Date().toISOString() };
    saveWorkflowStore(store);
    return { ok: true };
  },

  testWorkflow: (id: string, mode: "preview" | "sample" | "real" = "sample") => {
    const store = getWorkflowStore();
    const wf = store.workflows.find((w) => w.id === id);
    if (!wf) throw new Error("Workflow not found");
    const steps = wf.definition.nodes.map((n) => ({
      nodeKey: n.id,
      status: n.type === "condition" || n.type === "trigger" || n.type === "end" ? "COMPLETED" : "COMPLETED",
      output: n.type === "action" ? { channel: n.config?.channel || "SMS", simulated: true } : undefined,
    }));
    return { mode, ok: true, message: `Test ${mode} completed. ${steps.length} steps executed against the sample customer.`, steps };
  },

  listWorkflowRuns: (id: string, status?: string): import("@doloyal/shared").WorkflowRunInfo[] => {
    const store = getWorkflowStore();
    let runs = store.runs.filter((r) => r.workflowId === id);
    if (status) runs = runs.filter((r) => r.status === status);
    return runs.map((r) => ({ ...r, steps: r.steps ?? [] }));
  },

  getWorkflowRun: (runId: string): import("@doloyal/shared").WorkflowRunInfo => {
    const store = getWorkflowStore();
    const run = store.runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found");
    return { ...run, steps: run.steps ?? [] };
  },

  retryWorkflowRun: (runId: string): import("@doloyal/shared").WorkflowRunInfo => {
    const store = getWorkflowStore();
    const idx = store.runs.findIndex((r) => r.id === runId);
    if (idx < 0) throw new Error("Run not found");
    store.runs[idx] = {
      ...store.runs[idx]!,
      status: "QUEUED",
      error: undefined,
      completedAt: undefined,
      startedAt: undefined,
      steps: store.runs[idx]!.steps.map((s) => ({ ...s, status: "PENDING", error: undefined })),
    };
    saveWorkflowStore(store);
    return { ...store.runs[idx]!, steps: store.runs[idx]!.steps ?? [] };
  },

  getWorkflowAnalytics: (id: string): import("@doloyal/shared").WorkflowMetrics => {
    const store = getWorkflowStore();
    const wf = store.workflows.find((w) => w.id === id);
    const runs = store.runs.filter((r) => r.workflowId === id);
    const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;
    const failedRuns = runs.filter((r) => r.status === "FAILED").length;
    const runningRuns = runs.filter((r) => r.status === "QUEUED" || r.status === "RUNNING").length;
    const totalRuns = runs.length;
    return {
      totalRuns,
      completedRuns,
      failedRuns,
      runningRuns,
      customersReached: wf?.customersReached ?? 0,
      messagesSent: wf?.messagesSent ?? 0,
      bookingsGenerated: wf?.bookingsGenerated ?? 0,
      rewardsGenerated: wf?.rewardsGenerated ?? 0,
      revenueGenerated: wf?.revenueGenerated ?? 0,
      successRate: totalRuns ? Math.round((completedRuns / totalRuns) * 100) : 100,
    };
  },

  getWorkflowAudit: (id: string): import("@doloyal/shared").WorkflowAuditEntry[] => {
    const store = getWorkflowStore();
    return store.audit.filter((a) => a.workflowId === id).sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  },

  listWorkflowTemplates: (): import("@doloyal/shared").WorkflowTemplateInfo[] =>
    MOCK_WORKFLOW_TEMPLATES.map(({ id, name, category, description }) => ({ id, name, category, description })),

  getWorkflowCatalog: (): import("@doloyal/shared").WorkflowCapabilityCatalog => ({
    triggers: [
      { type: "appointment_booked", label: "Appointment booked", category: "Appointments", description: "Fires when a customer books an appointment" },
      { type: "appointment_completed", label: "Appointment completed", category: "Appointments", description: "Fires when an appointment is marked completed" },
      { type: "appointment_canceled", label: "Appointment canceled", category: "Appointments", description: "Fires when an appointment is canceled" },
      { type: "appointment_no_show", label: "Appointment no-show", category: "Appointments", description: "Fires when a customer misses an appointment" },
      { type: "customer_created", label: "New customer added", category: "Customers", description: "Fires when a new customer is added" },
      { type: "points_earned", label: "Points earned", category: "Loyalty", description: "Fires when a customer earns points" },
      { type: "points_threshold_reached", label: "Points threshold reached", category: "Loyalty", description: "Fires when a customer crosses a points milestone" },
      { type: "customer_birthday", label: "Customer birthday", category: "Scheduled", description: "Runs daily for customers celebrating today" },
      { type: "customer_inactive", label: "Customer inactive", category: "Scheduled", description: "Runs daily for customers who haven't visited recently" },
      { type: "membership_expiring", label: "Membership expiring", category: "Memberships", description: "Runs daily for memberships ending soon" },
    ],
    conditions: [
      { key: "loyalty_band", label: "Loyalty band", category: "Customer", operators: ["is", "is not", "at least", "at most"] },
      { key: "churn_risk", label: "Churn risk", category: "Customer", operators: ["is", "is not"] },
      { key: "points_balance", label: "Points balance", category: "Loyalty", operators: ["is", "at least", "at most", "less than"] },
      { key: "visit_count", label: "Visit count", category: "Customer", operators: ["is", "at least", "at most"] },
      { key: "last_visit_days", label: "Days since last visit", category: "Customer", operators: ["at least", "at most"] },
      { key: "total_spend", label: "Total spend", category: "Customer", operators: ["is", "at least", "at most"] },
    ],
    actions: [
      { type: "send_message", label: "Send message", category: "Messaging", description: "Send a personalized message", channels: ["whatsapp", "sms", "email"] },
      { type: "add_points", label: "Add points", category: "Loyalty", description: "Add points to a customer's balance" },
      { type: "remove_points", label: "Remove points", category: "Loyalty", description: "Deduct points from a customer's balance" },
      { type: "create_reward", label: "Create reward", category: "Loyalty", description: "Generate a reward for the customer" },
      { type: "add_tags", label: "Add tags", category: "Customer", description: "Attach tags to the customer profile" },
      { type: "notify_staff", label: "Notify staff", category: "Team", description: "Create an internal task / notification for staff" },
      { type: "wait", label: "Wait / delay", category: "Flow", description: "Pause the workflow for a period" },
      { type: "end", label: "End", category: "Flow", description: "Finish the workflow" },
    ],
  }),
};

const MOCK_DELAY_PATTERN = /^(\d+)\s*(s|m|h|d)$/i;

function mockValidateDefinition(def: any): WorkflowValidationResult {
  const nodes: WorkflowNodeValidation[] = [];
  const nodeIdSet = new Set<string>();
  const ids = (Array.isArray(def?.nodes) ? def.nodes : []).map((n: any) => n.id);
  for (const id of ids) nodeIdSet.add(id);

  for (const node of Array.isArray(def?.nodes) ? def.nodes : []) {
    const config = node.config || node.data || {};
    const checks: any[] = [];
    const fail = (label: string, message: string) => checks.push({ label, status: "ERROR", message });
    const warn = (label: string, message: string) => checks.push({ label, status: "WARNING", message });
    const ok = (label: string, message?: string) => checks.push({ label, status: "OK", message });

    if (node.type === "trigger") {
      ok("Trigger type", String(config.type || node.label || "trigger"));
    } else if (node.type === "action") {
      const type = String(config.type || config.action || "");
      ok("Action type", type || node.label);
      if (type === "send_whatsapp" || type === "send_sms" || type === "send_email") {
        if (config.message) ok("Message", String(config.message));
        else if (type === "send_email" && config.body) ok("Email body", String(config.body));
        else fail("Missing config", "Message is missing for this action.");
      }
      if (type === "add_points" || type === "remove_points") {
        if (Number(config.points) > 0) ok("Points", String(config.points));
        else fail("Invalid config", "Points must be greater than zero.");
      }
      if (type === "create_reward") {
        if (config.name && config.value) ok("Reward", `${config.name} (${config.value})`);
        else fail("Missing config", "Reward name and value are required.");
      }
      if (type === "add_tag" || type === "remove_tag") {
        if (config.tag) ok("Tag", String(config.tag));
        else fail("Missing config", "Tag is missing for this action.");
      }
    } else if (node.type === "delay") {
      const duration = String(config.duration || config.wait || "");
      if (MOCK_DELAY_PATTERN.test(duration)) ok("Duration", `Wait ${duration}`);
      else fail("Duration", 'Wait needs a duration like "7d" or "2h".');
    } else if (node.type === "condition") {
      const key = String(config.condition || config.key || "");
      if (key) {
        ok("Condition", key);
        const value = config.value;
        if (value === undefined || value === null || value === "") fail("Condition value", "A comparison value is required for this condition.");
        else ok("Condition value", String(value));
      } else {
        fail("Condition", "Condition is missing.");
      }
    } else if (node.type === "end") {
      ok("End", "Stops the workflow here.");
    } else {
      fail("Unknown step", `Step type "${node.type}" is not recognised.`);
    }

    const hasError = checks.some((c) => c.status === "ERROR");
    const hasWarning = checks.some((c) => c.status === "WARNING");
    nodes.push({
      nodeKey: node.id,
      type: node.type,
      label: node.label || node.type,
      status: hasError ? "ERROR" : hasWarning ? "WARNING" : "OK",
      summary: hasError
        ? (checks.find((c) => c.status === "ERROR")?.message || "Needs attention.")
        : hasWarning
          ? (checks.find((c) => c.status === "WARNING")?.message || "OK with notes.")
          : "Ready.",
      checks,
      canContinue: !hasError,
      action: hasError ? { kind: "fix_node" as const } : undefined,
    });
  }

  const errors = nodes.filter((n) => n.status === "ERROR").length;
  const warnings = nodes.filter((n) => n.status === "WARNING").length;
  return {
    ok: errors === 0,
    simulated: true,
    testedAt: new Date().toISOString(),
    plan: "growth",
    nodes,
    errors,
    warnings,
    message: errors === 0 ? "All steps passed. The test is simulated — no real messages were sent." : `${errors} step${errors === 1 ? "" : "s"} need${errors === 1 ? "s" : ""} attention before this workflow can run.`,
  };
}
