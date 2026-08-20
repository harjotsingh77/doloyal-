/**
 * Doloyal — shared enumerations.
 *
 * These mirror the Prisma enums in `apps/api/prisma/schema.prisma`.
 * Keep them in sync. The Prisma client is the runtime source of truth;
 * these exist so the frontend and shared package don't need to import Prisma.
 */

export const BUSINESS_CATEGORIES = [
  "BEAUTY_SALON",
  "BARBER_SHOP",
  "GYM",
  "SPA",
  "NAIL_STUDIO",
  "DENTAL_CLINIC",
  "RESTAURANT",
  "CAFE",
  "PET_GROOMING",
  "CAR_WASH",
  "OTHER",
] as const;
export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export const BUSINESS_CATEGORY_LABELS: Record<BusinessCategory, string> = {
  BEAUTY_SALON: "Beauty Salon",
  BARBER_SHOP: "Barber Shop",
  GYM: "Gym / Fitness",
  SPA: "Spa & Wellness",
  NAIL_STUDIO: "Nail Studio",
  DENTAL_CLINIC: "Dental Clinic",
  RESTAURANT: "Restaurant",
  CAFE: "Café",
  PET_GROOMING: "Pet Grooming",
  CAR_WASH: "Car Wash",
  OTHER: "Other",
};

export const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "STAFF", "CUSTOMER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  RECEPTIONIST: "Receptionist",
  STAFF: "Staff",
  CUSTOMER: "Customer",
};

/** Permission sets per role. OWNER ⊃ MANAGER ⊃ RECEPTIONIST/STAFF. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [
    "tenant:manage",
    "billing:manage",
    "staff:manage",
    "customers:read",
    "customers:write",
    "loyalty:manage",
    "rewards:manage",
    "memberships:manage",
    "campaigns:manage",
    "analytics:read",
    "ai:use",
    "settings:manage",
  ],
  MANAGER: [
    "staff:manage",
    "customers:read",
    "customers:write",
    "loyalty:manage",
    "rewards:manage",
    "memberships:manage",
    "campaigns:manage",
    "analytics:read",
    "ai:use",
    "settings:manage",
  ],
  RECEPTIONIST: [
    "customers:read",
    "customers:write",
    "loyalty:read",
    "appointments:manage",
    "invoices:manage",
    "rewards:redeem",
  ],
  STAFF: ["customers:read", "appointments:read", "invoices:read"],
  CUSTOMER: ["self:read", "self:redeem"],
};

export const PERMISSIONS = [
  "tenant:manage",
  "billing:manage",
  "staff:manage",
  "customers:read",
  "customers:write",
  "loyalty:manage",
  "loyalty:read",
  "rewards:manage",
  "rewards:redeem",
  "memberships:manage",
  "appointments:manage",
  "appointments:read",
  "invoices:manage",
  "invoices:read",
  "campaigns:manage",
  "analytics:read",
  "ai:use",
  "settings:manage",
  "self:read",
  "self:redeem",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const STAFF_STATUSES = ["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export const STAFF_STATUS_LABELS: Record<StaffStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  SUSPENDED: "Suspended",
};

export const INVITATION_STATUSES = ["PENDING", "ACCEPTED", "EXPIRED", "CANCELLED"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

/** Module-based permission catalog for the Team Management module. */
export const STAFF_PERMISSION_MODULES: Array<{
  module: string;
  key: string;
  permissions: Array<{ key: string; label: string; description: string }>;
}> = [
  {
    module: "Dashboard",
    key: "dashboard",
    permissions: [
      { key: "dashboard:read", label: "View dashboard", description: "See KPIs and overview charts" },
    ],
  },
  {
    module: "Customers",
    key: "customers",
    permissions: [
      { key: "customers:read", label: "View customers", description: "Read customer list and profiles" },
      { key: "customers:write", label: "Edit customers", description: "Create and update customer records" },
      { key: "customers:delete", label: "Delete customers", description: "Remove customer records" },
    ],
  },
  {
    module: "Appointments",
    key: "appointments",
    permissions: [
      { key: "appointments:read", label: "View appointments", description: "See the appointment calendar" },
      { key: "appointments:manage", label: "Manage appointments", description: "Create, edit, reschedule and cancel bookings" },
    ],
  },
  {
    module: "Booking Links",
    key: "booking-links",
    permissions: [
      { key: "bookinglinks:read", label: "View booking links", description: "View public booking pages and analytics" },
      { key: "bookinglinks:manage", label: "Manage booking links", description: "Create and configure booking links" },
    ],
  },
  {
    module: "Loyalty",
    key: "loyalty",
    permissions: [
      { key: "loyalty:read", label: "View loyalty", description: "Read loyalty settings and points" },
      { key: "loyalty:manage", label: "Manage loyalty", description: "Edit earning rules and point adjustments" },
    ],
  },
  {
    module: "Rewards",
    key: "rewards",
    permissions: [
      { key: "rewards:read", label: "View rewards", description: "Browse the rewards catalog" },
      { key: "rewards:manage", label: "Manage rewards", description: "Create, edit and archive rewards" },
      { key: "rewards:redeem", label: "Redeem rewards", description: "Redeem rewards for customers" },
    ],
  },
  {
    module: "Memberships",
    key: "memberships",
    permissions: [
      { key: "memberships:manage", label: "Manage memberships", description: "Configure tiers and assign memberships" },
    ],
  },
  {
    module: "Referrals",
    key: "referrals",
    permissions: [
      { key: "referrals:read", label: "View referrals", description: "Read referral programs and activity" },
      { key: "referrals:manage", label: "Manage referrals", description: "Configure campaigns and approve conversions" },
    ],
  },
  {
    module: "Campaigns",
    key: "campaigns",
    permissions: [
      { key: "campaigns:read", label: "View campaigns", description: "Read campaign history and performance" },
      { key: "campaigns:create", label: "Create campaign", description: "Build and send marketing campaigns" },
      { key: "campaigns:manage", label: "Manage campaigns", description: "Edit, pause and delete campaigns" },
    ],
  },
  {
    module: "AI",
    key: "ai",
    permissions: [
      { key: "ai:use", label: "Use AI assistant", description: "Chat with the Doloyal AI assistant" },
    ],
  },
  {
    module: "Analytics",
    key: "analytics",
    permissions: [
      { key: "analytics:read", label: "View analytics", description: "Read analytics dashboards" },
      { key: "revenue:view", label: "View revenue", description: "See revenue figures and financials" },
    ],
  },
  {
    module: "Invoices",
    key: "invoices",
    permissions: [
      { key: "invoices:read", label: "View invoices", description: "Read invoices" },
      { key: "invoices:manage", label: "Manage invoices", description: "Create and manage invoices" },
    ],
  },
  {
    module: "Branches",
    key: "branches",
    permissions: [
      { key: "branches:read", label: "View branches", description: "Read branch list" },
      { key: "branches:manage", label: "Manage branches", description: "Create, edit and pause branches" },
    ],
  },
  {
    module: "Staff",
    key: "staff",
    permissions: [
      { key: "staff:manage", label: "Manage staff", description: "Invite, update and remove team members" },
      { key: "staff:roles", label: "Manage roles", description: "Assign and change member roles" },
      { key: "staff:permissions", label: "Manage permissions", description: "Grant and revoke member permissions" },
    ],
  },
  {
    module: "Reports",
    key: "reports",
    permissions: [
      { key: "reports:read", label: "View reports", description: "Read business reports" },
    ],
  },
  {
    module: "Settings",
    key: "settings",
    permissions: [
      { key: "settings:manage", label: "Manage settings", description: "Change business settings" },
    ],
  },
  {
    module: "Data",
    key: "data",
    permissions: [
      { key: "export:data", label: "Export data", description: "Export records to CSV/Excel" },
      { key: "delete:records", label: "Delete records", description: "Hard-delete business records" },
    ],
  },
];

export function permissionModuleFor(key: string): { module: string; label: string } | null {
  for (const m of STAFF_PERMISSION_MODULES) {
    const found = m.permissions.find((p) => p.key === key);
    if (found) return { module: m.module, label: found.label };
  }
  return null;
}

/** Default permission keys per staff role (subset of the module catalog). */
export const STAFF_ROLE_DEFAULT_PERMISSIONS: Record<
  "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF",
  string[]
> = {
  OWNER: STAFF_PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.key)),
  MANAGER: [
    "dashboard:read",
    "customers:read",
    "customers:write",
    "appointments:read",
    "appointments:manage",
    "bookinglinks:read",
    "bookinglinks:manage",
    "loyalty:read",
    "loyalty:manage",
    "rewards:read",
    "rewards:manage",
    "rewards:redeem",
    "memberships:manage",
    "referrals:read",
    "referrals:manage",
    "campaigns:read",
    "campaigns:create",
    "campaigns:manage",
    "ai:use",
    "analytics:read",
    "revenue:view",
    "invoices:read",
    "invoices:manage",
    "branches:read",
    "staff:manage",
    "reports:read",
    "export:data",
  ],
  RECEPTIONIST: [
    "customers:read",
    "customers:write",
    "appointments:read",
    "appointments:manage",
    "loyalty:read",
    "invoices:read",
    "invoices:manage",
    "rewards:redeem",
    "bookinglinks:read",
  ],
  STAFF: [
    "dashboard:read",
    "customers:read",
    "appointments:read",
    "invoices:read",
    "bookinglinks:read",
  ],
};

/**
 * Compact access summary for the invite modal: which modules a role can and
 * cannot reach, derived from the real role→permission defaults.
 */
export function roleAccessPreview(role: Role): { can: string[]; cannot: string[] } {
  const allModules = STAFF_PERMISSION_MODULES;
  if (role === "OWNER") {
    return { can: allModules.map((m) => m.module), cannot: [] };
  }
  const granted = new Set(STAFF_ROLE_DEFAULT_PERMISSIONS[role as "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF"] ?? []);
  const can: string[] = [];
  const cannot: string[] = [];
  for (const m of allModules) {
    const hasAny = m.permissions.some((p) => granted.has(p.key));
    if (hasAny) can.push(m.module);
    else cannot.push(m.module);
  }
  return { can, cannot };
}

export const LOYALTY_MODES = ["CURRENCY", "VISIT", "HYBRID", "SUBSCRIPTION"] as const;
export type LoyaltyMode = (typeof LOYALTY_MODES)[number];

export const LOYALTY_MODE_LABELS: Record<LoyaltyMode, string> = {
  CURRENCY: "Spend-based",
  VISIT: "Visit-based",
  HYBRID: "Hybrid (spend + visits)",
  SUBSCRIPTION: "Subscription-based",
};

export const POINTS_LEDGER_TYPE = ["EARN", "REDEEM", "ADJUST", "EXPIRE", "BONUS"] as const;
export type PointsLedgerType = (typeof POINTS_LEDGER_TYPE)[number];

export const APPOINTMENT_STATUS = [
  "BOOKED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export const INVOICE_STATUS = ["DRAFT", "PENDING", "PAID", "REFUNDED", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[number];

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "WALLET", "OTHER"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const REWARD_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED", "SCHEDULED"] as const;
export type RewardStatus = (typeof REWARD_STATUS)[number];

export const REWARD_CATEGORIES = [
  "STANDARD",
  "BIRTHDAY",
  "ANNIVERSARY",
  "REVIEW",
  "SOCIAL",
  "WHATSAPP",
  "CASHBACK",
] as const;
export type RewardCategory = (typeof REWARD_CATEGORIES)[number];

export const REWARD_CATEGORY_LABELS: Record<RewardCategory, string> = {
  STANDARD: "Standard Rewards",
  BIRTHDAY: "Birthday Rewards",
  ANNIVERSARY: "Anniversary Rewards",
  REVIEW: "Review Rewards",
  SOCIAL: "Social Rewards",
  WHATSAPP: "WhatsApp Rewards",
  CASHBACK: "Cashback Rewards",
};

export const REWARD_TYPES = [
  "POINTS",
  "COUPON",
  "FREE_SERVICE",
  "GIFT",
  "GIFT_CARD",
  "CASHBACK",
  "CUSTOM",
  "VIP",
] as const;
export type RewardType = (typeof REWARD_TYPES)[number];

export const REWARD_PROGRAM_TYPES = [
  "BIRTHDAY",
  "ANNIVERSARY",
  "REVIEW",
  "SOCIAL",
  "WHATSAPP",
  "CASHBACK",
] as const;
export type RewardProgramType = (typeof REWARD_PROGRAM_TYPES)[number];

export const REDEMPTION_STATUS = ["PENDING", "FULFILLED", "CANCELLED"] as const;
export type RedemptionStatus = (typeof REDEMPTION_STATUS)[number];

export const MEMBERSHIP_TIER_NAMES = ["SILVER", "GOLD", "PLATINUM"] as const;
export type MembershipTierName = (typeof MEMBERSHIP_TIER_NAMES)[number];

export const CAMPAIGN_CHANNELS = ["WHATSAPP", "SMS", "EMAIL", "PUSH"] as const;
export type CampaignChannel = (typeof CAMPAIGN_CHANNELS)[number];

export const CAMPAIGN_STATUS = ["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "PAUSED"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUS)[number];

/** AI-derived customer health bands. */
export const CHURN_RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type ChurnRiskLevel = (typeof CHURN_RISK_LEVELS)[number];

export const LOYALTY_BANDS = ["NEW", "GROWING", "LOYAL", "VIP", "CHURNED"] as const;
export type LoyaltyBand = (typeof LOYALTY_BANDS)[number];

// ─── Integrations ─────────────────────────────────────────────────────────

export const INTEGRATION_TYPES = [
  'GOOGLE_CALENDAR', 'STRIPE', 'RAZORPAY', 'RESEND',
] as const;
export type IntegrationType = (typeof INTEGRATION_TYPES)[number];

export const INTEGRATION_TYPE_LABELS: Record<string, string> = {
  GOOGLE_CALENDAR: 'Google Calendar',
  STRIPE: 'Stripe',
  RAZORPAY: 'Razorpay',
  RESEND: 'Resend',
};

export const INTEGRATION_CATEGORIES: Record<string, string> = {
  GOOGLE_CALENDAR: 'Calendar',
  STRIPE: 'Payments',
  RAZORPAY: 'Payments',
  RESEND: 'Email',
};

export const INTEGRATION_CATEGORY_LIST = ['Calendar', 'Payments', 'Email'] as const;

export const INTEGRATION_STATUS = [
  "CONNECTED",
  "DISCONNECTED",
  "ERROR",
  "EXPIRED",
] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUS)[number];

export function churnRiskColor(level: ChurnRiskLevel): string {
  switch (level) {
    case "LOW":
      return "#10B981"; // success
    case "MEDIUM":
      return "#F59E0B"; // amber
    case "HIGH":
      return "#F97316"; // orange
    case "CRITICAL":
      return "#EF4444"; // danger
  }
}

export function loyaltyBandColor(band: LoyaltyBand): string {
  switch (band) {
    case "NEW":
      return "#60A5FA"; // accent
    case "GROWING":
      return "#3B82F6";
    case "LOYAL":
      return "#10B981"; // success
    case "VIP":
      return "#8B5CF6"; // violet
    case "CHURNED":
      return "#EF4444"; // danger
  }
}

/** True if `role` is a staff-side role (not an end customer). */
export function isStaffRole(role: Role): boolean {
  return role !== "CUSTOMER";
}

export const BOOKING_SOURCES = ["DASHBOARD", "BOOKING_LINK", "WEBSITE_WIDGET", "WHATSAPP", "INSTAGRAM", "FACEBOOK", "MANUAL_ENTRY", "PHONE_CALL"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const PAYMENT_STATUS = ["PENDING", "PAID", "REFUNDED", "DEPOSIT"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const NOTIFICATION_TYPES = ["BOOKING_CONFIRMATION", "REMINDER_24H", "REMINDER_2H", "RESCHEDULED", "CANCELLED", "THANK_YOU", "ADMIN_NEW_BOOKING", "ADMIN_CANCELLED", "ADMIN_RESCHEDULED", "ADMIN_NO_SHOW"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["EMAIL", "WHATSAPP", "SMS", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUS = ["PENDING", "SENT", "FAILED"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[number];

export const BOOKING_LINK_TYPES = ["PERSONAL", "COMPANY"] as const;
export type BookingLinkType = (typeof BOOKING_LINK_TYPES)[number];

export const BOOKING_ASSIGNMENT_MODES = ["SINGLE", "MULTI", "AUTO", "ROUND_ROBIN"] as const;
export type BookingAssignmentMode = (typeof BOOKING_ASSIGNMENT_MODES)[number];

export const BOOKING_PAYMENT_MODES = ["NONE", "DEPOSIT", "FULL", "PARTIAL", "PAY_AT_STORE"] as const;
export type BookingPaymentMode = (typeof BOOKING_PAYMENT_MODES)[number];

export const BOOKING_PAYMENT_METHODS = ["STRIPE", "RAZORPAY", "CASH", "UPI"] as const;
export type BookingPaymentMethod = (typeof BOOKING_PAYMENT_METHODS)[number];

export const BOOKING_APPROVAL_MODES = ["AUTOMATIC", "MANUAL"] as const;
export type BookingApprovalMode = (typeof BOOKING_APPROVAL_MODES)[number];

export const BOOKING_MEMBERSHIP_ACCESS = ["EVERYONE", "MEMBERS_ONLY", "GOLD", "SILVER", "VIP", "STAFF_ONLY"] as const;
export type BookingMembershipAccess = (typeof BOOKING_MEMBERSHIP_ACCESS)[number];

export const BOOKING_AUTH_MODES = ["GUEST", "REQUIRE_LOGIN", "SIGNUP_BEFORE"] as const;
export type BookingAuthMode = (typeof BOOKING_AUTH_MODES)[number];

export const BOOKING_TRAFFIC_SOURCES = ["instagram", "facebook", "google", "website", "whatsapp", "qr", "direct"] as const;
export type BookingTrafficSource = (typeof BOOKING_TRAFFIC_SOURCES)[number];

export const BOOKING_CUSTOMER_FIELD_KEYS = [
  "name", "phone", "email", "birthday", "gender", "address", "notes", "referralSource",
] as const;
export type BookingCustomerFieldKey = (typeof BOOKING_CUSTOMER_FIELD_KEYS)[number];

// ─── Website Builder ────────────────────────────────────────────────────────

export const WEBSITE_STATUS = ["DRAFT", "GENERATING", "PUBLISHED", "ARCHIVED"] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUS)[number];

export const WEBSITE_PAGE_STATUS = ["DRAFT", "PUBLISHED"] as const;
export type WebsitePageStatus = (typeof WEBSITE_PAGE_STATUS)[number];

export const WEBSITE_COMPONENT_TYPES = [
  "HERO", "FEATURES", "SERVICES", "GALLERY", "TEAM", "PRICING",
  "TESTIMONIALS", "FAQ", "ABOUT", "CONTACT", "FOOTER", "HEADER",
  "CTA", "BLOG", "NEWSLETTER", "STATS", "VIDEO", "MAP", "TIMELINE", "CUSTOM",
] as const;
export type WebsiteComponentType = (typeof WEBSITE_COMPONENT_TYPES)[number];

export const WEBSITE_DEPLOYMENT_STATUS = ["BUILDING", "DEPLOYING", "LIVE", "FAILED"] as const;
export type WebsiteDeploymentStatus = (typeof WEBSITE_DEPLOYMENT_STATUS)[number];

export const WEBSITE_INDUSTRIES = [
  "BEAUTY_SALON", "BARBER_SHOP", "GYM", "SPA", "NAIL_STUDIO",
  "DENTAL_CLINIC", "RESTAURANT", "CAFE", "PET_GROOMING", "CAR_WASH",
  "TATTOO_STUDIO", "CLINIC", "PHOTOGRAPHY", "EVENT_PLANNING", "OTHER",
] as const;
export type WebsiteIndustry = (typeof WEBSITE_INDUSTRIES)[number];

export const WEBSITE_THEME_PRESETS = [
  "PREMIUM", "MODERN", "MINIMAL", "BOLD", "ELEGANT", "WARM", "DARK", "LIGHT",
] as const;
export type WebsiteThemePreset = (typeof WEBSITE_THEME_PRESETS)[number];

export const APPOINTMENT_STATUS_EXTENDED = [
  "BOOKED", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", 
  "COMPLETED", "CANCELLED", "RESCHEDULED", "NO_SHOW"
] as const;
export type AppointmentStatusExtended = (typeof APPOINTMENT_STATUS_EXTENDED)[number];

export const WEBSITE_CONNECTION_STATUSES = [
  "CONNECTED",
  "DISCONNECTED",
  "PENDING",
] as const;
export type WebsiteConnectionStatus = (typeof WEBSITE_CONNECTION_STATUSES)[number];

export const WEBSITE_FRAMEWORKS = [
  "HTML",
  "PHP",
  "REACT",
  "NEXTJS",
  "VUE",
  "LARAVEL",
  "WORDPRESS",
  "SHOPIFY",
  "ANGULAR",
  "NODE",
  "EXPRESS",
  "CUSTOM",
] as const;
export type WebsiteFramework = (typeof WEBSITE_FRAMEWORKS)[number];

export const WEBSITE_FRAMEWORK_LABELS: Record<WebsiteFramework, string> = {
  HTML: "HTML",
  PHP: "PHP",
  REACT: "React",
  NEXTJS: "Next.js",
  VUE: "Vue",
  LARAVEL: "Laravel",
  WORDPRESS: "WordPress",
  SHOPIFY: "Shopify",
  ANGULAR: "Angular",
  NODE: "Node",
  EXPRESS: "Express",
  CUSTOM: "Custom",
};

export const CONNECTION_LOG_LEVELS = ["INFO", "WARN", "ERROR", "DEBUG"] as const;
export type ConnectionLogLevel = (typeof CONNECTION_LOG_LEVELS)[number];

// ─── Website Services (requests + chat) ─────────────────────────────────────

export const WEBSITE_PROJECT_STATUSES = [
  "REQUESTED",
  "REVIEWING",
  "IN_DISCUSSION",
  "IN_PROGRESS",
  "DESIGN_REVIEW",
  "DEVELOPMENT",
  "READY_FOR_REVIEW",
  "PUBLISHED",
  "COMPLETED",
] as const;
export type WebsiteProjectStatus = (typeof WEBSITE_PROJECT_STATUSES)[number];

export const WEBSITE_PROJECT_STATUS_LABELS: Record<WebsiteProjectStatus, string> = {
  REQUESTED: "Requested",
  REVIEWING: "Reviewing",
  IN_DISCUSSION: "In Discussion",
  IN_PROGRESS: "In Progress",
  DESIGN_REVIEW: "Design Review",
  DEVELOPMENT: "Development",
  READY_FOR_REVIEW: "Ready for Review",
  PUBLISHED: "Published",
  COMPLETED: "Completed",
};

export const WEBSITE_CONVERSATION_STATUSES = ["OPEN", "CLOSED"] as const;
export type WebsiteConversationStatus = (typeof WEBSITE_CONVERSATION_STATUSES)[number];

/** Website types offered by the Website Services flow. */
export const WEBSITE_TYPES = [
  "BUSINESS",
  "BOOKING",
  "E_COMMERCE",
  "PORTFOLIO",
  "LANDING_PAGE",
  "BLOG",
] as const;
export type WebsiteType = (typeof WEBSITE_TYPES)[number];

export const WEBSITE_TYPE_LABELS: Record<WebsiteType, string> = {
  BUSINESS: "Business Website",
  BOOKING: "Booking & Appointment",
  E_COMMERCE: "E-commerce / Store",
  PORTFOLIO: "Portfolio",
  LANDING_PAGE: "Landing Page",
  BLOG: "Blog / Content",
};

/** Design style directions customers can pick. */
export const DESIGN_STYLES = [
  "MINIMAL",
  "MODERN",
  "PREMIUM",
  "BOLD",
  "ELEGANT",
  "FRIENDLY",
  "TECH",
  "LUXURY",
] as const;
export type DesignStyle = (typeof DESIGN_STYLES)[number];

export const DESIGN_STYLE_LABELS: Record<DesignStyle, string> = {
  MINIMAL: "Minimal & Clean",
  MODERN: "Modern & Sleek",
  PREMIUM: "Premium & Polished",
  BOLD: "Bold & Edgy",
  ELEGANT: "Elegant & Refined",
  FRIENDLY: "Warm & Friendly",
  TECH: "Tech & Futuristic",
  LUXURY: "Luxury & Exclusive",
};

/** Feature add-ons a customer can request for their website. */
export const WEBSITE_FEATURES = [
  "CONTACT_FORM",
  "ONLINE_BOOKING",
  "WHATSAPP_BUTTON",
  "GOOGLE_MAPS",
  "INSTAGRAM_FEED",
  "MULTI_LANGUAGE",
  "BLOG",
  "TESTIMONIALS",
  "GALLERY",
  "SEO",
  "PAYMENTS",
  "REVIEWS",
] as const;
export type WebsiteFeature = (typeof WEBSITE_FEATURES)[number];

export const WEBSITE_FEATURE_LABELS: Record<WebsiteFeature, string> = {
  CONTACT_FORM: "Contact form",
  ONLINE_BOOKING: "Online booking",
  WHATSAPP_BUTTON: "WhatsApp button",
  GOOGLE_MAPS: "Google Maps",
  INSTAGRAM_FEED: "Instagram feed",
  MULTI_LANGUAGE: "Multi-language",
  BLOG: "Blog",
  TESTIMONIALS: "Testimonials",
  GALLERY: "Photo gallery",
  SEO: "SEO basics",
  PAYMENTS: "Online payments",
  REVIEWS: "Google reviews",
};

export const PAGE_COUNT_OPTIONS = ["1-3", "4-6", "7-10", "10+"] as const;

export const PROJECT_FILE_CATEGORIES = [
  "REFERENCE",
  "LOGO",
  "BRAND_ASSET",
  "CHAT_ATTACHMENT",
] as const;
export type ProjectFileCategory = (typeof PROJECT_FILE_CATEGORIES)[number];

// ─── Help & Support ─────────────────────────────────────────────────────────

export const SUPPORT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_CUSTOMER: "Waiting for Customer",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const SUPPORT_PRIORITY_LABELS: Record<SupportPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const SUPPORT_CATEGORIES = [
  "Account & Login",
  "Billing & Payments",
  "Customers",
  "Appointments & Booking",
  "Loyalty & Rewards",
  "Memberships",
  "Campaigns",
  "Analytics",
  "Website Builder",
  "Website Connection",
  "Integrations",
  "AI Assistant",
  "Technical Issue",
  "Other",
] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/** Compact help-center category navigation shown on the Help page. */
export const HELP_CATEGORIES = [
  "Getting Started",
  "Account & Billing",
  "Core Features",
  "Website & Integrations",
  "Troubleshooting",
] as const;
export type HelpCategory = (typeof HELP_CATEGORIES)[number];
