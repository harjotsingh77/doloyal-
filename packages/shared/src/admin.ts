/**
 * Doloyal — internal Admin Control Center domain model.
 *
 * Shared enums, roles, permissions and API response types used by both the
 * NestJS backend (`apps/api`) and the admin frontend (`apps/web`).
 */

// ─── Admin roles & permissions ──────────────────────────────────────────────

export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "SUPPORT_AGENT",
  "FINANCE",
  "SALES",
  "DEVELOPER",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  SUPPORT_AGENT: "Support Agent",
  FINANCE: "Finance",
  SALES: "Sales",
  DEVELOPER: "Developer",
};

export const ADMIN_PERMISSIONS = [
  "dashboard:view",
  "businesses:view",
  "businesses:manage",
  "users:view",
  "users:manage",
  "subscriptions:view",
  "subscriptions:manage",
  "billing:view",
  "billing:manage",
  "refunds:manage",
  "customers:view",
  "bookings:view",
  "engagement:view",
  "ai:view",
  "ai:manage",
  "websites:view",
  "websites:manage",
  "support:view",
  "support:manage",
  "integrations:view",
  "analytics:view",
  "content:view",
  "content:manage",
  "ops:view",
  "security:view",
  "security:manage",
  "audit:view",
  "team:manage",
  "settings:view",
  "settings:manage",
  "impersonate",
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = [
  ...ADMIN_PERMISSIONS,
];

export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: ALL_ADMIN_PERMISSIONS,
  ADMIN: [
    "dashboard:view",
    "businesses:view",
    "businesses:manage",
    "users:view",
    "users:manage",
    "subscriptions:view",
    "subscriptions:manage",
    "billing:view",
    "billing:manage",
    "refunds:manage",
    "customers:view",
    "bookings:view",
    "engagement:view",
    "ai:view",
    "ai:manage",
    "websites:view",
    "websites:manage",
    "support:view",
    "support:manage",
    "integrations:view",
    "analytics:view",
    "content:view",
    "content:manage",
    "ops:view",
    "security:view",
    "audit:view",
    "team:manage",
    "settings:view",
    "settings:manage",
  ],
  SUPPORT_AGENT: [
    "dashboard:view",
    "businesses:view",
    "users:view",
    "customers:view",
    "bookings:view",
    "engagement:view",
    "ai:view",
    "websites:view",
    "support:view",
    "support:manage",
    "content:view",
  ],
  FINANCE: [
    "dashboard:view",
    "businesses:view",
    "users:view",
    "subscriptions:view",
    "subscriptions:manage",
    "billing:view",
    "billing:manage",
    "refunds:manage",
    "customers:view",
    "bookings:view",
    "engagement:view",
    "analytics:view",
    "audit:view",
  ],
  SALES: [
    "dashboard:view",
    "businesses:view",
    "businesses:manage",
    "users:view",
    "customers:view",
    "subscriptions:view",
    "subscriptions:manage",
    "bookings:view",
    "engagement:view",
    "ai:view",
    "websites:view",
    "websites:manage",
    "analytics:view",
    "content:view",
    "content:manage",
  ],
  DEVELOPER: [
    "dashboard:view",
    "businesses:view",
    "users:view",
    "customers:view",
    "bookings:view",
    "engagement:view",
    "ai:view",
    "ai:manage",
    "websites:view",
    "integrations:view",
    "ops:view",
    "security:view",
    "audit:view",
    "settings:view",
  ],
};

export function permissionsForRole(role?: AdminRole | null): AdminPermission[] {
  if (!role) return [];
  return ADMIN_ROLE_PERMISSIONS[role] ?? [];
}

// ─── Admin domain enums ─────────────────────────────────────────────────────

export const BUSINESS_STATUSES = [
  "ACTIVE",
  "TRIAL",
  "PAUSED",
  "SUSPENDED",
  "CANCELED",
] as const;
export type AdminBusinessStatus = (typeof BUSINESS_STATUSES)[number];
export const BUSINESS_STATUS_LABELS: Record<AdminBusinessStatus, string> = {
  ACTIVE: "Active",
  TRIAL: "Trial",
  PAUSED: "Paused",
  SUSPENDED: "Suspended",
  CANCELED: "Canceled",
};

export const SUBSCRIPTION_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELING",
  "CANCELED",
  "PAYMENT_FAILED",
] as const;
export type AdminSubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const SUBSCRIPTION_STATUS_LABELS: Record<AdminSubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past Due",
  CANCELING: "Canceling",
  CANCELED: "Canceled",
  PAYMENT_FAILED: "Payment Failed",
};

export const ANNOUNCEMENT_TYPES = [
  "FEATURE",
  "MAINTENANCE",
  "IMPORTANT",
  "UPDATE",
] as const;
export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];
export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  FEATURE: "Feature",
  MAINTENANCE: "Maintenance",
  IMPORTANT: "Important",
  UPDATE: "Update",
};

export const ANNOUNCEMENT_AUDIENCES = [
  "ALL",
  "TRIAL",
  "STARTER",
  "GROWTH",
  "PROFESSIONAL",
  "ENTERPRISE",
  "SELECTED_BUSINESSES",
] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];
export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  ALL: "Everyone",
  TRIAL: "Free Trial",
  STARTER: "Starter",
  GROWTH: "Growth",
  PROFESSIONAL: "Professional",
  ENTERPRISE: "Enterprise",
  SELECTED_BUSINESSES: "Selected Businesses",
};

export const FEEDBACK_TYPES = ["FEATURE_REQUEST", "FEEDBACK", "BUG_REPORT"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];
export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  FEATURE_REQUEST: "Feature Request",
  FEEDBACK: "Feedback",
  BUG_REPORT: "Bug Report",
};

export const FEEDBACK_STATUSES = [
  "NEW",
  "REVIEWING",
  "PLANNED",
  "IN_PROGRESS",
  "RELEASED",
  "REJECTED",
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  REVIEWING: "Reviewing",
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  RELEASED: "Released",
  REJECTED: "Rejected",
};

export const SYSTEM_SERVICES = [
  "DATABASE",
  "AUTH",
  "API",
  "REALTIME",
  "PAYMENTS",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "AI",
  "STORAGE",
  "BACKGROUND_JOBS",
  "CRON",
  "WEBHOOKS",
  "INTEGRATIONS",
] as const;
export type SystemService = (typeof SYSTEM_SERVICES)[number];
export const SYSTEM_SERVICE_LABELS: Record<SystemService, string> = {
  DATABASE: "Database",
  AUTH: "Authentication",
  API: "API",
  REALTIME: "Realtime",
  PAYMENTS: "Payments",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  AI: "AI",
  STORAGE: "Storage",
  BACKGROUND_JOBS: "Background Jobs",
  CRON: "Cron Jobs",
  WEBHOOKS: "Webhooks",
  INTEGRATIONS: "Integrations",
};

export const SYSTEM_LOG_SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"] as const;
export type SystemLogSeverity = (typeof SYSTEM_LOG_SEVERITIES)[number];
export const SYSTEM_LOG_SEVERITY_LABELS: Record<SystemLogSeverity, string> = {
  INFO: "Info",
  WARNING: "Warning",
  ERROR: "Error",
  CRITICAL: "Critical",
};

export const ADMIN_NOTIFICATION_TYPES = [
  "NEW_SIGNUP",
  "NEW_PAID_CUSTOMER",
  "PAYMENT_FAILURE",
  "SUBSCRIPTION_CANCELLATION",
  "SUPPORT_TICKET",
  "NEW_WEBSITE_REQUEST",
  "AI_ERROR",
  "INTEGRATION_FAILURE",
  "SYSTEM_INCIDENT",
  "ENTERPRISE_LEAD",
] as const;
export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];
export const ADMIN_NOTIFICATION_TYPE_LABELS: Record<AdminNotificationType, string> = {
  NEW_SIGNUP: "New Signup",
  NEW_PAID_CUSTOMER: "New Paid Customer",
  PAYMENT_FAILURE: "Payment Failure",
  SUBSCRIPTION_CANCELLATION: "Subscription Cancellation",
  SUPPORT_TICKET: "Support Ticket",
  NEW_WEBSITE_REQUEST: "Website Request",
  AI_ERROR: "AI Error",
  INTEGRATION_FAILURE: "Integration Failure",
  SYSTEM_INCIDENT: "System Incident",
  ENTERPRISE_LEAD: "Enterprise Lead",
};

export const ADMIN_SECURITY_EVENT_TYPES = [
  "ADMIN_LOGIN",
  "FAILED_ADMIN_LOGIN",
  "ROLE_CHANGE",
  "PERMISSION_CHANGE",
  "SESSION_TERMINATED",
  "SUSPICIOUS_ACTIVITY",
  "IMPERSONATION_STARTED",
  "IMPERSONATION_STOPPED",
] as const;
export type AdminSecurityEventType = (typeof ADMIN_SECURITY_EVENT_TYPES)[number];
export const ADMIN_SECURITY_EVENT_LABELS: Record<AdminSecurityEventType, string> = {
  ADMIN_LOGIN: "Admin Login",
  FAILED_ADMIN_LOGIN: "Failed Admin Login",
  ROLE_CHANGE: "Role Change",
  PERMISSION_CHANGE: "Permission Change",
  SESSION_TERMINATED: "Session Terminated",
  SUSPICIOUS_ACTIVITY: "Suspicious Activity",
  IMPERSONATION_STARTED: "Impersonation Started",
  IMPERSONATION_STOPPED: "Impersonation Stopped",
};

export const ADMIN_AUDIT_CATEGORIES = [
  "DASHBOARD",
  "BUSINESS",
  "USER",
  "SUBSCRIPTION",
  "BILLING",
  "CUSTOMER",
  "BOOKING",
  "LOYALTY",
  "CAMPAIGN",
  "AI",
  "WEBSITE",
  "SUPPORT",
  "INTEGRATION",
  "ANALYTICS",
  "CONTENT",
  "OPS",
  "SECURITY",
  "TEAM",
  "SETTINGS",
] as const;
export type AdminAuditCategory = (typeof ADMIN_AUDIT_CATEGORIES)[number];

export const INTEGRATION_PROVIDER_LABELS: Record<string, string> = {
  GOOGLE_CALENDAR: "Google Calendar",
  STRIPE: "Stripe",
  RAZORPAY: "Razorpay",
  RESEND: "Resend (Email)",
  OPENAI: "OpenAI",
  CLOUDINARY: "Cloudinary",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
};

export const WEBSITE_CONNECTION_TYPE_LABELS: Record<string, string> = {
  WORDPRESS: "WordPress",
  SHOPIFY: "Shopify",
  HTML: "HTML",
  PHP: "PHP",
  REACT: "React",
  NEXTJS: "Next.js",
  VUE: "Vue",
  LARAVEL: "Laravel",
  ANGULAR: "Angular",
  NODE: "Node",
  EXPRESS: "Express",
  CUSTOM: "Custom Code",
};

// ─── Admin API types ────────────────────────────────────────────────────────

export interface AdminPaginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Lightweight admin actor attached to most responses. */
export interface AdminActor {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  adminRole?: AdminRole | null;
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface AdminKpiValue {
  value: number;
  delta: number | null;
  deltaLabel?: string;
  prefix?: string;
}

export interface AdminDashboardOverview {
  totals: {
    totalBusinesses: number;
    activeBusinesses: number;
    newSignups30d: number;
    paidBusinesses: number;
    mrr: number;
    arr: number;
    trialUsers: number;
    paidUsers: number;
    trialToPaidRate: number;
    churnRate30d: number;
    openSupportTickets: number;
    websiteRequests: number;
  };
  kpis: Record<string, AdminKpiValue>;
  revenueTrend: AdminRevenuePoint[];
  revenueSeries: AdminRevenueSeries;
  growth: AdminGrowthPoint[];
  activationRate: number;
  trial: AdminTrialAnalytics;
  churn: AdminChurnAnalytics;
  insights: AdminAiInsight[];
  recentActivity: AdminRecentActivityItem[];
  recentSignups: AdminRecentSignup[];
  recentPayments: AdminRecentPayment[];
  recentTickets: AdminRecentTicket[];
  recentWebsiteRequests: AdminRecentWebsiteRequest[];
  alerts: AdminSystemAlert[];
  featureAdoption: AdminFeatureAdoption[];
}

export interface AdminRevenuePoint {
  date: string; // ISO
  label: string;
  revenue: number;
  mrr: number;
  arr: number;
  refunds: number;
  netRevenue: number;
  starter: number;
  growth: number;
  professional: number;
  enterprise: number;
}

export interface AdminRevenueSeries {
  range: string;
  totalRevenue: number;
  mrr: number;
  arr: number;
  refunds: number;
  netRevenue: number;
  byPlan: Record<string, number>;
}

export interface AdminGrowthPoint {
  date: string;
  label: string;
  newUsers: number;
  newBusinesses: number;
  activeUsers: number;
  activeBusinesses: number;
}

export interface AdminTrialAnalytics {
  trialUsers: number;
  trialsStarted30d: number;
  trialsExpiring7d: number;
  trialsConverted30d: number;
  conversionRate: number;
  averageTrialDurationDays: number;
  alerts: string[];
}

export interface AdminChurnAnalytics {
  churnRate: number;
  canceled30d: number;
  downgrades30d: number;
  paymentFailures30d: number;
  atRiskAccounts: number;
}

export interface AdminAiInsight {
  id: string;
  title: string;
  description: string;
  metric: string;
  direction: "up" | "down" | "flat";
  severity: "info" | "positive" | "warning";
  link?: string;
}

export interface AdminRecentActivityItem {
  id: string;
  type: string;
  message: string;
  target?: string;
  createdAt: string;
}

export interface AdminRecentSignup {
  id: string;
  name: string;
  email: string;
  plan: string;
  createdAt: string;
}

export interface AdminRecentPayment {
  id: string;
  businessName: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface AdminRecentTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  businessName?: string;
  status: string;
  priority: string;
  updatedAt: string;
}

export interface AdminRecentWebsiteRequest {
  id: string;
  name: string;
  businessName: string;
  status: string;
  updatedAt: string;
}

export interface AdminSystemAlert {
  id: string;
  severity: "info" | "warning" | "danger";
  title: string;
  message: string;
  link?: string;
}

export interface AdminFeatureAdoption {
  key: string;
  label: string;
  percentage: number;
  activeBusinesses: number;
  totalBusinesses: number;
}

// ─── Businesses ─────────────────────────────────────────────────────────────

export interface AdminBusinessSummary {
  id: string;
  name: string;
  slug: string;
  category: string;
  city?: string | null;
  country: string;
  currency: string;
  logoUrl?: string | null;
  plan: string;
  status: AdminBusinessStatus;
  ownerName?: string | null;
  ownerEmail?: string | null;
  customerCount: number;
  branchCount: number;
  createdAt: string;
  updatedAt: string;
  lastActive?: string | null;
  isImpersonating?: boolean;
}

export interface AdminBusinessDetail extends AdminBusinessSummary {
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  state?: string | null;
  zip?: string | null;
  timezone: string;
  onboardingComplete: boolean;
  subscription: {
    id: string;
    plan: string;
    status: string;
    trialEndsAt?: string | null;
    currentPeriodEnd?: string | null;
    autoRenew: boolean;
  } | null;
  owner: { id: string; name: string; email: string } | null;
  counts: Record<string, number>;
  recentActivity: AdminBusinessActivity[];
}

export interface AdminBusinessActivity {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface AdminUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  adminRole?: AdminRole | null;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  businessCount: number;
  primaryBusiness?: string | null;
  plan?: string | null;
  lastLogin?: string | null;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserItem {
  phone?: string | null;
  twoFactorEnabled: boolean;
  memberships: Array<{
    id: string;
    tenantId: string;
    tenantName?: string;
    role: string;
    createdAt: string;
  }>;
  loginHistory: Array<{
    id: string;
    successful: boolean;
    device?: string | null;
    browser?: string | null;
    ip?: string | null;
    location?: string | null;
    createdAt: string;
  }>;
}

// ─── Subscriptions & Billing ────────────────────────────────────────────────

export interface AdminSubscriptionItem {
  id: string;
  tenantId: string;
  businessName: string;
  ownerEmail?: string | null;
  plan: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  renewal: string | null;
  provider: string;
  autoRenew: boolean;
  trialEndsAt?: string | null;
  createdAt: string;
}

export interface AdminBillingOverview {
  grossRevenue: number;
  netRevenue: number;
  mrr: number;
  arr: number;
  refunds: number;
  failedPayments30d: number;
  outstandingAmount: number;
  currency: string;
  revenueByPlan: Record<string, number>;
  invoices: AdminInvoiceItem[];
  payments: AdminPaymentItem[];
  providers: Array<{ name: string; status: string; lastCheck: string | null }>;
}

export interface AdminInvoiceItem {
  id: string;
  invoiceNumber: string;
  businessName: string;
  customerName?: string | null;
  total: number;
  status: string;
  createdAt: string;
}

export interface AdminPaymentItem {
  id: string;
  type: string;
  businessName: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string | null;
  createdAt: string;
}

export interface AdminPlanInfo {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  tagline: string;
  highlighted?: boolean;
  limits: Record<string, unknown>;
  config?: Record<string, unknown> | null;
  overridden: boolean;
}

export interface AdminEnterpriseContract {
  id: string;
  tenantId: string;
  businessName: string;
  contractPrice: number;
  billingCycle: string;
  startDate: string;
  renewalDate?: string | null;
  customerLimit: number;
  branchLimit: number;
  seats: number;
  customFeatures?: unknown;
  sla?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
}

export interface AdminRefundResult {
  ok: boolean;
  amount: number;
  currency: string;
  message: string;
  simulated?: boolean;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export interface AdminCustomerItem {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone: string;
  businessName: string;
  businessId: string;
  totalVisits: number;
  totalSpent: number;
  pointsBalance: number;
  membershipTier?: string | null;
  lastVisitAt?: string | null;
  createdAt: string;
}

// ─── Bookings ───────────────────────────────────────────────────────────────

export interface AdminBookingItem {
  id: string;
  businessName: string;
  customerName?: string | null;
  serviceName: string;
  staffName?: string | null;
  startTime: string;
  status: string;
  source: string;
  paymentStatus: string;
}

// ─── Engagement (loyalty/rewards/memberships/campaigns) ─────────────────────

export interface AdminLoyaltyOverview {
  pointsIssued: number;
  pointsRedeemed: number;
  rewardsCreated: number;
  rewardsRedeemed: number;
  activePrograms: number;
  totalBusinesses: number;
}

export interface AdminRewardsOverview {
  mostUsed: Array<{ name: string; businessName: string; redeemedCount: number }>;
  redemptionRate: number;
  created30d: number;
  expired30d: number;
  totalRedemptions: number;
}

export interface AdminMembershipsOverview {
  activeMemberships: number;
  newMemberships30d: number;
  canceledMemberships30d: number;
  membershipRevenue: number;
  byBusiness: Array<{ businessName: string; count: number; revenue: number }>;
}

export interface AdminCampaignOverview {
  totalSent30d: number;
  emailSent: number;
  smsSent: number;
  whatsappSent: number;
  deliveryRate: number;
  failed30d: number;
  byBusiness: Array<{ businessName: string; sent: number; failed: number }>;
  providerFailures: Array<{ provider: string; lastError: string; at: string }>;
}

// ─── AI ─────────────────────────────────────────────────────────────────────

export interface AdminAiOverview {
  aiQueries30d: number;
  assistantUsage30d: number;
  retentionAiUsage30d: number;
  websiteGenerationUsage30d: number;
  aiErrors30d: number;
  aiRequestVolume: AdminGrowthPoint[];
  usageByPlan: Array<{ plan: string; queries: number; tokens: number }>;
  costEstimate: number;
  topBusinesses: Array<{ businessName: string; queries: number; tokens: number }>;
}

// ─── Websites ───────────────────────────────────────────────────────────────

export interface AdminWebsiteBuilderOverview {
  totalProjects: number;
  generated: number;
  draft: number;
  published: number;
  failed: number;
  history: Array<{
    id: string;
    name: string;
    businessName: string;
    status: string;
    model?: string;
    createdAt: string;
    completedAt?: string | null;
  }>;
}

export interface AdminWebsiteConnectionItem {
  id: string;
  businessName: string;
  websiteName: string;
  domain: string;
  framework: string;
  status: string;
  lastSyncAt?: string | null;
  events30d: number;
  errors30d: number;
  lastError?: string | null;
}

// ─── Integrations ───────────────────────────────────────────────────────────

export interface AdminIntegrationItem {
  type: string;
  label: string;
  status: string;
  connectedCount: number;
  errorCount: number;
  lastSyncAt?: string | null;
  lastError?: string | null;
  usage: number;
}

export interface AdminIntegrationsOverview {
  items: AdminIntegrationItem[];
  totalConnected: number;
  failures24h: number;
  paymentsStatus: string;
}

// ─── Analytics ──────────────────────────────────────────────────────────────

export interface AdminAnalyticsOverview {
  acquisition: AdminGrowthPoint[];
  newSignups: number;
  sources: Array<{ source: string; count: number }>;
  activationRate: number;
  onboardingCompleted: number;
  activatedBusinesses: number;
  retention: {
    activeBusinesses: number;
    wau: number;
    mau: number;
    businessRetentionRate: number;
    churnRate: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    ltv: number;
    byPlan: Record<string, number>;
  };
  productUsage: AdminFeatureAdoption[];
}

// ─── Content (feedback / announcements / help center) ───────────────────────

export interface AdminFeedbackItem {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status: string;
  votes: number;
  businessName?: string | null;
  userName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAnnouncementItem {
  id: string;
  title: string;
  message: string;
  type: string;
  audience: string;
  selectedTenantIds: string[];
  publishDate?: string | null;
  expiryDate?: string | null;
  published: boolean;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminHelpArticleItem {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  keywords: string[];
  faq: boolean;
  published: boolean;
  sortOrder: number;
  views: number;
  updatedAt: string;
}

// ─── Ops (system health / logs / security / audit) ──────────────────────────

export interface AdminSystemHealth {
  services: Array<{
    key: string;
    label: string;
    status: "OPERATIONAL" | "DEGRADED" | "DOWN";
    latencyMs?: number;
    errorRate?: number;
    uptime?: number;
  }>;
  overall: "OPERATIONAL" | "DEGRADED" | "DOWN";
  uptime: number;
  incidents24h: number;
  lastChecked: string;
}

export interface AdminLogItem {
  id: string;
  service: string;
  severity: string;
  message: string;
  error?: string | null;
  requestId?: string | null;
  environment?: string | null;
  createdAt: string;
}

export interface AdminSecurityEventItem {
  id: string;
  type: string;
  severity: string;
  message: string;
  userName?: string | null;
  ip?: string | null;
  createdAt: string;
}

export interface AdminAuditLogItem {
  id: string;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  category: string;
  targetType?: string | null;
  targetName?: string | null;
  metadata?: unknown;
  ip?: string | null;
  createdAt: string;
}

// ─── Team & settings ────────────────────────────────────────────────────────

export interface AdminTeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isAdmin: boolean;
  adminRole?: AdminRole | null;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  lastActive?: string | null;
  createdAt: string;
}

export interface AdminSettingsBundle {
  general: Record<string, unknown>;
  brand: Record<string, unknown>;
  email: Record<string, unknown>;
  notifications: Record<string, unknown>;
  billing: Record<string, unknown>;
  auth: Record<string, unknown>;
  security: Record<string, unknown>;
  ai: Record<string, unknown>;
  integrations: Record<string, unknown>;
  support: Record<string, unknown>;
}

// ─── Notifications ──────────────────────────────────────────────────────────

export interface AdminNotificationItem {
  id: string;
  type: string;
  title: string;
  message?: string | null;
  severity: string;
  link?: string | null;
  targetId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminNotificationsOverview {
  items: AdminNotificationItem[];
  unreadCount: number;
}

// ─── Search ─────────────────────────────────────────────────────────────────

export interface AdminSearchResults {
  businesses: AdminBusinessSummary[];
  users: AdminUserItem[];
  customers: AdminCustomerItem[];
  subscriptions: AdminSubscriptionItem[];
  tickets: Array<{ id: string; ticketNumber: string; subject: string; status: string; businessName?: string }>;
  websiteRequests: Array<{ id: string; name: string; status: string; businessName?: string }>;
  invoices: Array<{ id: string; invoiceNumber: string; status: string; businessName?: string; total: number }>;
  total: number;
}

// ─── Impersonation ──────────────────────────────────────────────────────────

export interface AdminImpersonationResult {
  ok: boolean;
  accessToken: string;
  tenantId: string;
  message: string;
}
