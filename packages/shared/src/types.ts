/**
 * Doloyal — shared domain types (API response shapes).
 *
 * These describe what the API returns to the web client. They are intentionally
 * decoupled from Prisma's generated types so the frontend never imports Prisma.
 */
import type {
  AppointmentStatus,
  BookingAssignmentMode,
  BookingApprovalMode,
  BookingAuthMode,
  BookingCustomerFieldKey,
  BookingLinkType,
  BookingMembershipAccess,
  BookingPaymentMethod,
  BookingPaymentMode,
  BookingSource,
  BusinessCategory,
  CampaignChannel,
  CampaignStatus,
  ChurnRiskLevel,
  InvoiceStatus,
  IntegrationStatus,
  IntegrationType,
  LoyaltyBand,
  LoyaltyMode,
  MembershipTierName,
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  PaymentMethod,
  PaymentStatus,
  PointsLedgerType,
  RedemptionStatus,
  RewardStatus,
  Role,
  AppointmentStatusExtended,
  WebsiteConnectionStatus,
  WebsiteFramework,
  ConnectionLogLevel,
} from "./enums";

export interface Tenant {
  id: string;
  name: string;
  category: BusinessCategory;
  phone: string;
  email: string;
  website?: string | null;
  address?: string | null;
  gst?: string | null;
  registrationNumber?: string | null;
  logoUrl?: string | null;
  coverBannerUrl?: string | null;
  faviconUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  whatsapp?: string | null;
  mapsUrl?: string | null;
  currency: string;
  timezone: string;
  language?: string;
  dateFormat?: string;
  timeFormat?: string;
  brandColor: string;
  secondaryColor?: string | null;
  accentColor?: string | null;
  fontFamily?: string | null;
  taxRate: number;
  businessHours?: BusinessHoursSettings | null;
  socialLinks?: SocialLinksSettings | null;
  legalPolicies?: LegalPoliciesSettings | null;
  businessStatus?: BusinessStatusSettings | null;
  notificationPrefs?: NotificationPrefsSettings | null;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface BusinessHoursSettings {
  openingTime?: string;
  closingTime?: string;
  weeklyOff?: string[];
  breakStart?: string;
  breakEnd?: string;
}

export interface SocialLinksSettings {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  googleBusiness?: string;
  whatsapp?: string;
}

export interface LegalPoliciesSettings {
  privacyPolicy?: string;
  termsAndConditions?: string;
  refundPolicy?: string;
  cancellationPolicy?: string;
}

export interface BusinessStatusSettings {
  activeBusiness?: boolean;
  onlineBooking?: boolean;
  walkIns?: boolean;
  showOnWebsite?: boolean;
}

export interface NotificationPrefsSettings {
  email?: boolean;
  sms?: boolean;
  whatsapp?: boolean;
  marketingEmails?: boolean;
}

export interface AuthSessionInfo {
  id: string;
  device: string;
  ip?: string | null;
  lastActiveAt: string;
  current?: boolean;
}

export interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: Role;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  externalId: string; // Clerk user id (or "dev-user" in mock mode)
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  isAdmin?: boolean;
  adminRole?: import("./admin").AdminRole | null;
  adminPermissions?: import("./admin").AdminPermission[];
  memberships: Membership[];
  activeTenantId: string;
  activeRole: Role;
}

// ─── Team Management ────────────────────────────────────────────────────────

export interface StaffBranchRef {
  id: string;
  name: string;
  address?: string | null;
  primary: boolean;
}

export interface StaffMember {
  id: string; // StaffProfile id
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  role: Role;
  status: import("./enums").StaffStatus;
  department?: string | null;
  jobTitle?: string | null;
  notes?: string | null;
  permissions: string[];
  twoFactorEnabled: boolean;
  twoFactorRequired: boolean;
  requirePasswordReset: boolean;
  isOnline: boolean;
  lastSeenAt?: string | null;
  lastLoginAt?: string | null;
  lastLogoutAt?: string | null;
  lastLoginDevice?: string | null;
  lastLoginBrowser?: string | null;
  lastLoginOs?: string | null;
  lastLoginIp?: string | null;
  lastLoginLocation?: string | null;
  dateJoined: string;
  branches: StaffBranchRef[];
  invitationStatus?: import("./enums").InvitationStatus | null;
  invitationSentAt?: string | null;
  isCurrentUser: boolean;
  loginCount: number;
}

export interface StaffStats {
  total: number;
  admins: number;
  managers: number;
  staff: number;
  pendingInvitations: number;
  online: number;
  inactive: number;
  suspended: number;
}

export interface StaffInvitation {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: Role;
  status: import("./enums").InvitationStatus;
  branchIds: string[];
  branchNames?: string[];
  department?: string | null;
  jobTitle?: string | null;
  message?: string | null;
  token?: string;
  invitationUrl?: string | null;
  expiresAt: string;
  sentAt: string | null;
  lastSentAt?: string | null;
  acceptedAt?: string | null;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  cancelledByName?: string | null;
  acceptedByUserId?: string | null;
  acceptedByName?: string | null;
  invitedById?: string | null;
  invitedByName?: string | null;
  joinedMemberId?: string | null;
  resendCount: number;
  createdAt: string;
}

export interface InvitationCounts {
  ALL: number;
  PENDING: number;
  ACCEPTED: number;
  EXPIRED: number;
  CANCELLED: number;
}

export interface InvitationActivityItem {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  eventType: string;
  action: string;
  category?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface StaffInvitationDetail extends StaffInvitation {
  activity: InvitationActivityItem[];
  /** Seconds until a resend is allowed again (0 when ready). */
  resendCooldownSeconds?: number;
  resendAvailableAt?: string | null;
  /** Whether the invitee email already maps to a Doloyal account. */
  hasExistingAccount?: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  tenantId?: string | null;
  successful: boolean;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  ip?: string | null;
  location?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface StaffActivityItem {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  action: string;
  category?: string | null;
  message: string;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  createdAt: string;
}

export interface StaffAuditLogEntry {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
  createdAt: string;
}

export interface EmployeeNote {
  id: string;
  staffProfileId: string;
  authorId?: string | null;
  authorName?: string | null;
  body: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffProfileDetail extends StaffMember {
  loginHistory: LoginHistoryEntry[];
  activity: StaffActivityItem[];
  auditLogs: StaffAuditLogEntry[];
  employeeNotes: EmployeeNote[];
}

export interface StaffMemberList {
  items: StaffMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  anniversary?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | "UNSPECIFIED" | null;
  avatarUrl?: string | null;
  tags: string[];
  notes?: string | null;
  source?: string | null;
  createdAt: string;
  lastVisitAt?: string | null;
  // Aggregates (computed)
  pointsBalance: number;
  lifetimeValue: number;
  visitCount: number;
  averageSpend: number;
  loyaltyBand: LoyaltyBand;
  churnRisk: ChurnRiskLevel;
  loyaltyScore: number; // 0-100
}

export interface PointsLedgerEntry {
  id: string;
  customerId: string;
  type: PointsLedgerType;
  points: number; // signed
  balanceAfter: number;
  reason: string;
  reference?: string | null;
  invoiceId?: string | null;
  rewardId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

export interface LoyaltySettings {
  birthdayBonus: number;
  reviewBonus: number;
  socialShareBonus: number;
  googleReviewBonus: number;
  instagramStoryBonus: number;
  minRedemption: number;
  maxRedemption: number;
  tierMultiplier: number;
  autoExpiry: boolean;
  doublePoints: boolean;
  weekendBonus: boolean;
  holidayBonus: boolean;
}

export interface LoyaltyConfig {
  id: string;
  tenantId: string;
  mode: LoyaltyMode;
  pointsPerCurrency: number;
  pointsPerVisit: number;
  currencyPerPoint: number;
  expiryDays: number;
  welcomeBonus: number;
  referralBonus: number;
  settings: LoyaltySettings;
}

export interface LoyaltyOverviewKpi {
  key: string;
  label: string;
  value: number;
  previousValue: number;
  changePercent: number;
  format: "number" | "currency" | "percent" | "points";
  sparkline: number[];
}

export interface LoyaltyOverview {
  kpis: LoyaltyOverviewKpi[];
  generatedAt: string;
}

export interface LoyaltyRecommendation {
  id: string;
  title: string;
  description: string;
  impact: string;
  estimatedRevenue?: number;
  retentionLift?: number;
  action: string;
  actionLabel: string;
  priority: "high" | "medium" | "low";
}

export interface LoyaltyCopilotInsight {
  id: string;
  type: "warning" | "opportunity" | "insight";
  text: string;
}

export interface LoyaltyCopilotResponse {
  reply: string;
  insights: LoyaltyCopilotInsight[];
  recommendations: LoyaltyRecommendation[];
  conversationId: string;
}

export interface LoyaltyLeaderboardEntry {
  rank: number;
  customerId: string;
  name: string;
  avatarUrl?: string | null;
  points: number;
  visits: number;
  referrals: number;
  membership?: string | null;
  growthPercent: number;
  badges: string[];
  totalSpent: number;
  rewardsRedeemed: number;
}

export interface LoyaltyChallenge {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  targetValue: number;
  rewardPoints: number;
  rewardLabel?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  aiGenerated: boolean;
  participants: number;
  completionRate: number;
  avgProgress: number;
  remainingDays?: number | null;
}

export interface LoyaltyBadgeDef {
  id: string;
  name: string;
  description?: string | null;
  icon: string;
  color: string;
  unlockCount: number;
  aiSuggested: boolean;
}

export interface LoyaltySegment {
  id: string;
  name: string;
  description: string;
  customerCount: number;
  revenue: number;
  retention: number;
  suggestedCampaign: string;
  color: string;
}

export interface LoyaltyChurnRow {
  customerId: string;
  name: string;
  probability: number;
  reason: string;
  lastVisitAt?: string | null;
  riskScore: number;
  recommendation: string;
  pointsBalance: number;
}

export interface LoyaltyAnalytics {
  repeatRate: number[];
  retentionRate: number[];
  customerGrowth: number[];
  pointsIssued: number[];
  pointsRedeemed: number[];
  revenueGenerated: number[];
  referralRevenue: number[];
  rewardUsage: number[];
  tierDistribution: { name: string; value: number; color: string }[];
  labels: string[];
  roi: number;
}

export interface LoyaltyReferralNode {
  id: string;
  name: string;
  status: string;
  rewardPoints: number;
  children: LoyaltyReferralNode[];
}

export interface LoyaltyAutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions?: Record<string, unknown> | null;
  actions: Record<string, unknown> | Array<Record<string, unknown>>;
  status: string;
  createdAt: string;
}

export interface SurpriseReward {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config?: Record<string, unknown> | null;
}

export interface LoyaltyStreakMilestone {
  days: number;
  label: string;
  rewardPoints: number;
  customersReached: number;
}

export interface LoyaltyActivityItem {
  id: string;
  message: string;
  type: string;
  customerName?: string | null;
  createdAt: string;
}

export interface LoyaltyDigitalCard {
  customerId: string;
  customerName: string;
  tier: string;
  points: number;
  qrPayload: string;
  barcode: string;
  referralCode: string;
}

export interface LoyaltyJourneyEvent {
  id: string;
  label: string;
  date: string;
  points?: number | null;
  reward?: string | null;
  type: string;
}

export interface FeatureFlagState {
  key: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  core: boolean;
  enabled: boolean;
  config: Record<string, unknown>;
  sectionId?: string;
  updatedAt?: string | null;
}

export interface FeatureFlagCatalogResponse {
  features: FeatureFlagState[];
  enabledKeys: string[];
}

export interface Reward {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  terms?: string | null;
  pointsCost: number;
  rewardValue: number;
  rewardType: string;
  validityDays: number;
  category: string;
  status: RewardStatus;
  totalQuantity?: number | null;
  redeemedCount: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  branchIds: string[];
  tierRequired?: string | null;
  membershipRequired?: string | null;
  remainingQuantity?: number | null;
  createdAt: string;
  updatedAt?: string;
}

export interface RewardRedemption {
  id: string;
  rewardId: string;
  customerId: string;
  customerName: string;
  rewardName: string;
  category?: string | null;
  pointsCost: number;
  pointsUsed: number;
  cashbackAmount: number;
  branchName?: string | null;
  transactionId: string;
  status: RedemptionStatus;
  fulfilledAt?: string | null;
  createdAt: string;
}

export interface RewardsOverview {
  totalRewards: number;
  activeRewards: number;
  redeemedRewards: number;
  pendingRewards: number;
  cashbackIssued: number;
  birthdayRewardsSent: number;
}

export interface RewardProgramConfig {
  id: string;
  tenantId: string;
  programType: string;
  enabled: boolean;
  config: Record<string, unknown>;
  updatedAt: string;
}

export interface CashbackTransaction {
  id: string;
  customerId: string;
  customerName?: string;
  pointsUsed: number;
  cashbackAmount: number;
  balanceAfter: number;
  status: string;
  note?: string | null;
  createdAt: string;
}

export interface RewardEngagementClaim {
  id: string;
  customerId: string;
  customerName: string;
  programType: string;
  status: string;
  evidence?: Record<string, unknown> | null;
  rewardPoints: number;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface MembershipTier {
  id: string;
  tenantId: string;
  name: MembershipTierName | string;
  price: number;
  validityDays: number;
  discountPercent: number;
  bonusPointsPercent: number;
  pointsMultiplier?: number;
  minPoints?: number;
  rank?: number;
  priorityBooking: boolean;
  exclusiveRewards?: string[];
  benefits: string[];
  badgeLabel?: string | null;
  color?: string | null;
}

export interface CustomerMembership {
  id: string;
  customerId: string;
  tierId: string;
  tierName: MembershipTierName;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface ReferralOverview {
  referralRevenue: number;
  totalLinks: number;
  totalShares: number;
  totalClicks: number;
  landingVisits: number;
  successfulReferrals: number;
  pendingReferrals: number;
  rewardsGiven: number;
  conversionRate: number;
  topReferrer: string;
  range: { start: string; end: string };
}

export interface ReferralCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  campaignType: string;
  rewardType: string;
  rewardValue: number;
  friendRewardType: string;
  friendRewardValue: number;
  minPurchase: number;
  minAppointmentValue: number;
  maxRewardLimit?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: string;
  usageLimit?: number | null;
  usageCount: number;
  referralExpiryDays: number;
  terms?: string | null;
  clickCount: number;
  shareCount: number;
  visitCount: number;
  conversionCount: number;
  revenueTotal: number;
  rewardsGiven: number;
  totalLinksCount?: number;
  totalConversions?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLink {
  id: string;
  tenantId: string;
  customerId?: string | null;
  campaignId?: string | null;
  name?: string | null;
  code: string;
  customSlug?: string | null;
  secureToken?: string | null;
  url: string;
  shortUrl?: string | null;
  qrUrl: string;
  clickCount: number;
  uniqueVisitors: number;
  shareCount: number;
  conversionCount: number;
  revenue?: number;
  status: string;
  customerName?: string;
  campaignName?: string | null;
  landingViews?: number;
  registrations?: number;
  bookings?: number;
  orders?: number;
  conversionRate?: number;
  lastActivity?: string;
  createdAt: string;
}

export interface ReferralConversionRow {
  id: string;
  referrer: string;
  friend: string;
  source?: string | null;
  orderValue: number;
  bookingValue: number;
  reward: string;
  campaign: string;
  date: string;
  status: string;
  rewardStatus: string;
}

export interface ReferralFunnelStage {
  key: string;
  stage?: string;
  label: string;
  count: number;
  percentage: number;
  dropRate: number;
  conversionFromPrevious?: number;
}

export interface ReferralLeaderboardRow {
  rank: number;
  customerId: string;
  name: string;
  referrals: number;
  revenue: number;
  rewardEarned: number;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  staffId?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  items: {
    id: string;
    serviceName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  createdAt: string;
}

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  staffId?: string | null;
  staffName?: string | null;
  serviceName: string;
  branchName?: string | null;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  notes?: string | null;
}

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  subject?: string | null;
  body: string;
  segment: string;
  status: CampaignStatus;
  audienceCount: number;
  scheduledAt?: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: string;
  type:
    | "INVOICE_PAID"
    | "REWARD_REDEEMED"
    | "POINTS_EARNED"
    | "CUSTOMER_ADDED"
    | "MEMBERSHIP_SOLD"
    | "APPOINTMENT_BOOKED"
    | "CAMPAIGN_SENT"
    | "NOTE";
  message: string;
  customerId?: string | null;
  customerName?: string | null;
  amount?: number | null;
  createdAt: string;
}

// Dashboard ------------------------------------------------------------------

export interface KpiPoint {
  date: string; // ISO date (yyyy-mm-dd)
  revenue: number;
  customers: number;
}

export interface DashboardOverview {
  generatedAt: string;
  period: { from: string; to: string };
  kpis: {
    todayRevenue: number;
    todayCustomers: number;
    repeatCustomers: number;
    newCustomers: number;
    inactiveCustomers: number;
    activeRewards: number;
    pointsRedeemed30d: number;
    membershipSales30d: number;
    appointmentsToday: number;
    pendingReviews: number;
    monthlyGrowthPct: number; // revenue vs previous period
  };
  revenueTrend: KpiPoint[]; // last 30 days
  customerTrend: KpiPoint[]; // last 30 days
  topCustomers: Pick<
    Customer,
    "id" | "name" | "phone" | "lifetimeValue" | "visitCount" | "loyaltyBand" | "churnRisk"
  >[];
  topRewards: Pick<Reward, "id" | "name" | "pointsCost" | "redeemedCount">[];
  topServices?: { service: string; revenue: number; customers: number; growth: number }[];
  recentActivity: ActivityEntry[];
}

// Customer profile detail ----------------------------------------------------

export interface CustomerTimelineEntry {
  id: string;
  kind: "VISIT" | "INVOICE" | "POINTS" | "REWARD" | "MEMBERSHIP" | "NOTE";
  title: string;
  description?: string;
  amount?: number;
  points?: number;
  date: string;
}

export interface CustomerProfile extends Customer {
  preferredServices: { name: string; count: number; lastAt: string }[];
  membership?: CustomerMembership | null;
  timeline: CustomerTimelineEntry[];
  pointsLedger: PointsLedgerEntry[];
  predictedNextVisitDays?: number | null; // null = insufficient data
  upgradeRecommendation?: { tier: MembershipTierName; reason: string } | null;
}

// AI -------------------------------------------------------------------------

export interface AssistantToolCall {
  name: string;
  args: Record<string, unknown>;
  result: string;
}

export interface AssistantResponse {
  conversationId: string;
  message: string;
  toolCalls: AssistantToolCall[];
  mode: "OPENAI" | "FALLBACK"; // tells the client whether the LLM was used
  citations?: { label: string; href?: string }[];
}

export interface ChurnRiskAssessment {
  customerId: string;
  customerName: string;
  risk: ChurnRiskLevel;
  loyaltyScore: number;
  reasons: string[];
  recommendedAction: string;
  estimatedValueAtRisk: number;
}

export interface RetentionInsights {
  generatedAt: string;
  totalAtRisk: number;
  estimatedRevenueAtRisk: number;
  assessments: ChurnRiskAssessment[];
  campaignSuggestions: { segment: string; title: string; body: string; estReach: number }[];
}

// Booking System -----------------------------------------------------------

export interface BookingCustomerFieldConfig {
  enabled: boolean;
  required: boolean;
}

export type BookingCustomerFieldsConfig = Record<BookingCustomerFieldKey, BookingCustomerFieldConfig>;

export interface BookingRulesConfig {
  businessHours?: Record<string, { start: string; end: string; isAvailable: boolean; breakStart?: string; breakEnd?: string } | null>;
  maxAdvanceBookingDays?: number;
  minNoticeMinutes?: number;
  maxAppointmentsPerDay?: number;
  maxBookingsPerSlot?: number;
  cancellationWindowHours?: number;
  reschedulePolicyHours?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  appointmentDurationMinutes?: number | null;
  approvalMode?: BookingApprovalMode;
}

export interface BookingPaymentConfig {
  mode: BookingPaymentMode;
  depositPercent?: number;
  depositAmount?: number;
  partialPercent?: number;
  methods?: BookingPaymentMethod[];
  payAtStore?: boolean;
}

export interface BookingLoyaltyConfig {
  earnPoints?: boolean;
  redeemPoints?: boolean;
  membershipDiscount?: boolean;
  birthdayBonus?: boolean;
  referralBonus?: boolean;
  couponSupport?: boolean;
  promoCodes?: string[];
  rewardRedemption?: boolean;
}

export interface BookingMembershipAccessConfig {
  access: BookingMembershipAccess;
  tierIds?: string[];
}

export interface BookingAuthConfig {
  mode: BookingAuthMode;
  googleLogin?: boolean;
  otpLogin?: boolean;
  emailLogin?: boolean;
  returningCustomerLogin?: boolean;
}

export interface BookingBrandingConfig {
  themeColor?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  coverBannerUrl?: string;
  fontFamily?: string;
  borderRadius?: string;
  buttonStyle?: "solid" | "outline" | "soft";
  backgroundColor?: string;
  backgroundImage?: string;
  customCss?: string;
  confirmationMessage?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  qrColor?: string;
  qrLogoUrl?: string;
  showRating?: boolean;
  showMap?: boolean;
  showWhatsApp?: boolean;
  showSocial?: boolean;
}

export type BookingPageSectionId =
  | "hero"
  | "about"
  | "services"
  | "staff"
  | "gallery"
  | "testimonials"
  | "membership"
  | "loyalty"
  | "booking"
  | "faq"
  | "contact"
  | "map"
  | "footer";

export interface BookingPageSection {
  id: BookingPageSectionId;
  enabled: boolean;
}

export interface BookingPageFaq {
  question: string;
  answer: string;
}

export interface BookingPageGalleryItem {
  url: string;
  caption?: string;
}

export interface BookingPageTestimonial {
  name: string;
  rating: number;
  text: string;
}

export interface BookingPageConfig {
  sections: BookingPageSection[];
  tagline?: string;
  about?: string;
  heroCta?: string;
  policies?: string;
  faqs?: BookingPageFaq[];
  gallery?: BookingPageGalleryItem[];
  testimonials?: BookingPageTestimonial[];
  membershipBlurb?: string;
  loyaltyBlurb?: string;
}

export interface BookingSeoConfig {
  keywords?: string;
  ogImage?: string;
  favicon?: string;
  schemaType?: string;
}

export type BookingDomainStatus = "PENDING" | "ACTIVE" | "FAILED";

export interface BookingDomainConfig {
  subdomain?: string;
  customDomain?: string;
  status?: BookingDomainStatus;
}

export interface BookingAutomationsConfig {
  confirmationEmail?: boolean;
  confirmationWhatsApp?: boolean;
  confirmationSms?: boolean;
  reminderSms?: boolean;
  followUpMessage?: boolean;
  reviewRequest?: boolean;
  addLoyaltyPoints?: boolean;
  generateInvoice?: boolean;
  createCustomer?: boolean;
  updateCrm?: boolean;
  notifyStaff?: boolean;
  notifyOwner?: boolean;
}

export interface BookingLinkMetrics {
  totalVisits: number;
  totalBookings: number;
  conversionRate: number;
  revenueGenerated: number;
  totalCustomers: number;
  upcomingAppointments: number;
  averageBookingValue: number;
  lastBookingAt?: string | null;
}

export interface BookingLink {
  id: string;
  tenantId: string;
  staffId?: string | null;
  staffName?: string | null;
  staffNames?: string[];
  slug: string;
  type: BookingLinkType;
  name?: string | null;
  description?: string | null;
  isActive: boolean;
  isPaused?: boolean;
  assignmentMode?: BookingAssignmentMode;
  staffIds?: string[];
  serviceIds?: string[];
  customerFields?: Partial<BookingCustomerFieldsConfig> | null;
  rules?: BookingRulesConfig | null;
  payment?: BookingPaymentConfig | null;
  loyalty?: BookingLoyaltyConfig | null;
  membershipAccess?: BookingMembershipAccessConfig | null;
  authMode?: BookingAuthConfig | null;
  branding?: BookingBrandingConfig | null;
  automations?: BookingAutomationsConfig | null;
  pageConfig?: BookingPageConfig | null;
  seo?: BookingSeoConfig | null;
  domain?: BookingDomainConfig | null;
  confirmationMessage?: string | null;
  redirectUrl?: string | null;
  webhookUrl?: string | null;
  expiresAt?: string | null;
  visitCount?: number;
  bookingCount?: number;
  revenueGenerated?: number;
  lastBookingAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  publishedAt?: string | null;
  url: string;
  subdomainUrl?: string;
  customDomainUrl?: string | null;
  qrUrl?: string;
  metrics?: BookingLinkMetrics;
  createdAt: string;
  updatedAt?: string;
}

export interface BookingLinkAnalytics {
  linkId: string;
  visits: number;
  uniqueVisitors: number;
  bookings: number;
  conversionRate: number;
  revenue: number;
  averageBookingValue: number;
  topServices: { name: string; count: number; revenue: number }[];
  topStaff: { id: string; name: string; count: number; revenue: number }[];
  repeatCustomers: number;
  newCustomers: number;
  cancelledBookings: number;
  rescheduledBookings: number;
  trafficSources: { source: string; count: number }[];
  insights: { title: string; body: string; severity: "info" | "warning" | "success" }[];
  period: { from: string; to: string };
}

export interface PublicBusinessInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  coverBannerUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  mapsUrl?: string | null;
  brandColor: string;
  currency: string;
  timezone: string;
  rating?: number;
  tagline?: string | null;
  about?: string | null;
  businessHours?: Record<string, { open: string; close: string } | null>;
  pageConfig?: BookingPageConfig | null;
  seo?: BookingSeoConfig | null;
  services?: PublicService[];
  staff?: PublicStaff[];
  bookingLink?: {
    id: string;
    slug: string;
    name?: string | null;
    description?: string | null;
    allowCustomTime?: boolean;
    defaultStaffId?: string | null;
    assignmentMode?: BookingAssignmentMode;
    customerFields?: Partial<BookingCustomerFieldsConfig> | null;
    payment?: BookingPaymentConfig | null;
    authMode?: BookingAuthConfig | null;
    branding?: BookingBrandingConfig | null;
    membershipAccess?: BookingMembershipAccessConfig | null;
    loyalty?: BookingLoyaltyConfig | null;
    rules?: BookingRulesConfig | null;
    pageConfig?: BookingPageConfig | null;
    seo?: BookingSeoConfig | null;
    domain?: BookingDomainConfig | null;
    isPaused?: boolean;
    status?: "DRAFT" | "PUBLISHED";
    confirmationMessage?: string | null;
    redirectUrl?: string | null;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
}

export interface PublicService {
  id: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  category: string;
  isActive: boolean;
}

export interface PublicStaff {
  id: string;
  name: string;
  roleTitle: string;
  avatarUrl?: string | null;
}

export interface BookingSlot {
  time: string;
  available: boolean;
  staffId?: string | null;
}

export interface BookingConfirmation {
  id: string;
  customerName: string;
  serviceName: string;
  staffName?: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  location?: string | null;
  notes?: string | null;
  icsUrl?: string;
  googleCalendarUrl?: string;
}

export interface AppointmentDetail extends Appointment {
  source: BookingSource;
  paymentStatus: PaymentStatus;
  paymentAmount?: number | null;
  bookingLinkId?: string | null;
  cancelledAt?: string | null;
  rescheduledFrom?: string | null;
  serviceId?: string | null;
  activityTimeline?: ActivityEntry[];
  attachments?: { id: string; name: string; url: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  appointmentId?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string | null;
  body?: string | null;
  status: NotificationStatus;
  sentAt?: string | null;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  tenantId: string;
  type: string;
  channel: string;
  subject?: string | null;
  body: string;
  isActive: boolean;
}

export interface BookingAnalytics {
  totalBookings: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
  noShow: number;
  revenue: number;
  topServices: { name: string; count: number; revenue: number }[];
  topStaff: { id: string; name: string; count: number; revenue: number }[];
  peakHours: { hour: number; count: number }[];
  customerRetention: number;
  bookingConversionRate: number;
  monthlyGrowth: number;
  sourceBreakdown: { source: string; count: number }[];
}

export interface WidgetSettings {
  id?: string;
  tenantId: string;
  isActive: boolean;
  buttonStyle: string;
  buttonColor: string;
  buttonText: string;
  position: string;
  primaryColor: string;
  fontFamily: string;
  theme: string;
  services: string[];
  staff: string[];
}

export interface BlockedDateRecord {
  id: string;
  tenantId: string;
  staffId?: string | null;
  date: string;
  reason?: string | null;
  isFullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
}

export interface AvailabilitySettings {
  businessHours: Record<string, { open: string; close: string } | null>;
  timezone: string;
  maxDailyBookings: number;
  minBookingNotice: number;
  maxAdvanceBookingDays: number;
  bufferTime: number;
  holidays: string[];
  blockedDates: BlockedDateRecord[];
}

// ─── Website Builder ─────────────────────────────────────────────────────────

export interface WebsiteTheme {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  spacing: string;
}

export interface WebsitePageSEO {
  metaTitle: string;
  metaDescription: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  schemaMarkup?: Record<string, unknown>;
  noIndex?: boolean;
}

export interface WebsiteSectionContent {
  type: string;
  data: Record<string, unknown>;
}

export interface WebsiteSection {
  id: string;
  pageId: string;
  component: string;
  sortOrder: number;
  content: WebsiteSectionContent;
  styles?: Record<string, unknown>;
  isPublished: boolean;
}

export interface WebsitePage {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  sortOrder: number;
  isHome: boolean;
  seo?: WebsitePageSEO;
  sections: WebsiteSection[];
  status: string;
}

export interface WebsiteDomain {
  id: string;
  websiteId: string;
  domain: string;
  verified: boolean;
  sslStatus: string;
  dnsRecords?: { type: string; name: string; value: string; status: string }[];
  verifiedAt?: string;
  provisionedAt?: string;
}

export interface WebsiteDeployment {
  id: string;
  websiteId: string;
  version: number;
  status: string;
  errorLog?: string;
  buildTimeMs?: number;
  previewUrl?: string;
  liveUrl?: string;
  lighthouse?: {
    performance: number;
    accessibility: number;
    seo: number;
    bestPractices: number;
  };
  createdAt: string;
}

export interface WebsiteAsset {
  id: string;
  websiteId: string;
  url: string;
  type: string;
  alt?: string;
  width?: number;
  height?: number;
  isAi: boolean;
}

export interface Website {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  status: string;
  industry?: string;
  theme?: WebsiteTheme;
  publishedAt?: string;
  draftVersion: number;
  liveVersion: number;
  pages?: WebsitePage[];
  assets?: WebsiteAsset[];
  domains?: WebsiteDomain[];
  deployments?: WebsiteDeployment[];
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteDashboard {
  website: Website;
  draftCount: number;
  publishedCount: number;
  totalPages: number;
  assetCount: number;
  domainCount: number;
  lastDeployment?: WebsiteDeployment;
  liveUrl?: string;
  previewUrl?: string;
}

export interface AIWebsiteGenerationRequest {
  prompt: string;
  industry?: string;
  style?: string;
  pages?: string[];
  regenerateSection?: { pageSlug: string; sectionId: string };
}

export interface AIWebsiteGenerationResult {
  generationId: string;
  pages: {
    title: string;
    slug: string;
    isHome: boolean;
    sections: {
      component: string;
      sortOrder: number;
      content: WebsiteSectionContent;
      styles?: Record<string, unknown>;
    }[];
    seo?: WebsitePageSEO;
  }[];
  theme: WebsiteTheme;
}

export interface WebsiteComponentDefinition {
  type: string;
  label: string;
  icon: string;
  category: "hero" | "content" | "commerce" | "cta" | "media" | "social";
  description: string;
}

export const WEBSITE_COMPONENT_LIBRARY: WebsiteComponentDefinition[] = [
  { type: "HERO", label: "Hero Section", icon: "LayoutDashboard", category: "hero", description: "Full-width hero with headline, subtitle, and CTA" },
  { type: "FEATURES", label: "Features Grid", icon: "Grid3x3", category: "content", description: "Grid of key features or selling points" },
  { type: "SERVICES", label: "Services", icon: "Scissors", category: "commerce", description: "List or grid of services with pricing" },
  { type: "GALLERY", label: "Gallery", icon: "Image", category: "media", description: "Image grid or carousel" },
  { type: "TEAM", label: "Team", icon: "Users", category: "content", description: "Staff profiles with photos and bios" },
  { type: "PRICING", label: "Pricing Table", icon: "DollarSign", category: "commerce", description: "Plan comparison table" },
  { type: "TESTIMONIALS", label: "Testimonials", icon: "MessageSquare", category: "social", description: "Customer reviews and quotes" },
  { type: "FAQ", label: "FAQ Accordion", icon: "HelpCircle", category: "content", description: "Expandable questions and answers" },
  { type: "ABOUT", label: "About", icon: "Info", category: "content", description: "Business story and mission" },
  { type: "CONTACT", label: "Contact Form", icon: "Mail", category: "cta", description: "Contact form with business details" },
  { type: "CTA", label: "Call to Action", icon: "Pointer", category: "cta", description: "Banner with headline and action button" },
  { type: "BLOG", label: "Blog Posts", icon: "FileText", category: "content", description: "Recent articles or posts grid" },
  { type: "NEWSLETTER", label: "Newsletter", icon: "MailPlus", category: "cta", description: "Email signup form" },
  { type: "STATS", label: "Statistics", icon: "BarChart", category: "content", description: "Metrics and achievement counters" },
  { type: "VIDEO", label: "Video Block", icon: "Video", category: "media", description: "Embedded video player" },
  { type: "MAP", label: "Map", icon: "MapPin", category: "media", description: "Google Maps embed" },
  { type: "TIMELINE", label: "Timeline", icon: "Clock", category: "content", description: "Chronological timeline" },
  { type: "HEADER", label: "Header", icon: "PanelTop", category: "content", description: "Site navigation bar" },
  { type: "FOOTER", label: "Footer", icon: "PanelBottom", category: "content", description: "Site footer with links" },
];

// ─── Integrations ─────────────────────────────────────────────────────────

export interface Integration {
  id: string;
  tenantId: string;
  userId?: string | null;
  type: IntegrationType;
  status: IntegrationStatus;
  label?: string | null;
  metadata?: Record<string, unknown> | null;
  errorLog?: string | null;
  lastSyncedAt?: string | null;
  healthStatus?: 'HEALTHY' | 'WARNING' | 'ERROR' | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationWithToken extends Integration {
  token?: IntegrationToken | null;
}

export interface IntegrationToken {
  id: string;
  integrationId: string;
  tokenType: string;
  scope?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationOAuthUrl {
  url: string;
  state: string;
}

export interface OAuthCallbackResult {
  success: boolean;
  integration?: Integration;
  message?: string;
}

export interface SyncLog {
  id: string;
  integrationId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt?: string | null;
  recordsProcessed?: number | null;
  errorMessage?: string | null;
}

export interface WebhookEvent {
  id: string;
  integrationId: string;
  eventType: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  processedAt?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

/**
 * Subscription plan details as returned by the billing API. This matches the
 * shared `Plan` definition (the single source of truth for pricing/limits).
 */
export type SubscriptionPlan = import("./plans").Plan;

export interface TenantSubscription {
  id: string;
  tenantId: string;
  plan: string;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'TRIALING';
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  autoRenew: boolean;
  createdAt: string;
  updatedAt: string;
  planDetails?: SubscriptionPlan | null;
}

// ─── Billing Center ──────────────────────────────────────────────────────────

export type BillingStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'PAUSED'
  | 'CANCELING'
  | 'CANCELED'
  | 'PAYMENT_FAILED';

export interface SubscriptionPaymentMethod {
  brand?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  isDefault?: boolean;
  addedAt?: string;
}

export interface SubscriptionUsageMetric {
  used: number;
  limit: number | null;
}

export interface SubscriptionUsage {
  customers: SubscriptionUsageMetric;
  branches: SubscriptionUsageMetric;
  staff: SubscriptionUsageMetric;
  aiQueries: SubscriptionUsageMetric;
  campaigns: SubscriptionUsageMetric;
}

export interface BillingSubscription {
  id: string;
  tenantId: string;
  plan: string;
  status: BillingStatus;
  rawStatus?: string;
  trialEndsAt?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  nextBillingDate?: string;
  autoRenew: boolean;
  canceledAt?: string | null;
  billingCycle: 'monthly' | 'yearly';
  paymentMethod?: SubscriptionPaymentMethod | null;
  provider: string;
  hasPaymentFailed?: boolean;
  createdAt: string;
  updatedAt: string;
  planDetails?: SubscriptionPlan | null;
  usage?: SubscriptionUsage;
}

export type BillingHistoryType =
  | 'TRIAL_STARTED'
  | 'PLAN_CHANGED'
  | 'PAYMENT_METHOD_UPDATED'
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_RESTARTED'
  | 'PAYMENT_SUCCEEDED'
  | 'PAYMENT_FAILED';

export interface BillingHistoryEntry {
  id: string;
  type: BillingHistoryType;
  description?: string | null;
  plan?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  createdAt: string;
}

export interface ConnectedWebsiteStats {
  customers: number;
  appointments: number;
  memberships: number;
  rewards: number;
  forms: number;
}

export interface ConnectedWebsite {
  id: string;
  tenantId: string;
  businessId: string;
  businessName: string;
  name: string;
  websiteUrl: string;
  framework: WebsiteFramework;
  status: WebsiteConnectionStatus;
  connectionToken: string;
  lastSyncAt?: string | null;
  lastConnectedAt?: string | null;
  stats: ConnectedWebsiteStats;
  domain: string;
  createdAt: string;
  updatedAt: string;
  publicKey?: string | null;
  secretKeyPrefix?: string | null;
  logCount?: number;
  webhookCount?: number;
  sdkInstallCount?: number;
  settings?: Record<string, unknown>;
  apiKeys?: WebsiteConnectionApiKey[];
  webhooks?: WebsiteConnectionWebhook[];
}

export interface WebsiteConnectionApiKey {
  id: string;
  businessId?: string;
  publicKey: string;
  secretKeyPrefix: string;
  webhookSecretPrefix?: string;
  label?: string | null;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  revokedAt?: string | null;
  website?: { id: string; name: string; websiteUrl: string; status?: WebsiteConnectionStatus };
}

export interface WebsiteConnectionWebhook {
  id: string;
  businessId?: string;
  url: string;
  secretPrefix?: string;
  events: string[];
  isActive: boolean;
  failureCount?: number;
  lastDeliveryAt?: string | null;
  createdAt?: string;
  website?: { id: string; name: string; websiteUrl: string };
}

export interface WebsiteConnectionCredentials {
  businessId: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
  connectionToken: string;
}

export interface ConnectedWebsiteCreateResult extends ConnectedWebsite {
  credentials: WebsiteConnectionCredentials;
}

export interface ConnectionLogEntry {
  id: string;
  businessId: string;
  connectedWebsiteId?: string | null;
  websiteName?: string | null;
  level: ConnectionLogLevel;
  event: string;
  message: string;
  metadata?: unknown;
  createdAt: string;
}

export interface CreateConnectedWebsiteInput {
  name: string;
  websiteUrl: string;
  framework: WebsiteFramework;
  businessName?: string;
}

// ─── Website Services (requests + chat) ─────────────────────────────────────

export interface WebsiteProjectRequirement {
  id: string;
  projectId: string;
  businessName: string;
  businessType: string;
  businessLocation?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  existingWebsiteUrl?: string | null;
  websiteTypes: string[];
  designStyle: string[];
  designPreference: string;
  referenceUrl?: string | null;
  hasLogo: boolean;
  logoUrl?: string | null;
  pageCount: string;
  requiredFeatures: string[];
  additionalRequirements?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteProjectFile {
  id: string;
  projectId: string;
  uploadedByUserId: string;
  uploadedByRole: string;
  category: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  url: string;
  createdAt: string;
}

export interface WebsiteProjectStatusHistory {
  id: string;
  projectId: string;
  oldStatus?: string | null;
  newStatus: string;
  changedById?: string | null;
  changedByName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface WebsiteConversationRef {
  id: string;
  projectId: string;
  assignedAdminId?: string | null;
  assignedAdminName?: string | null;
  status: string;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface WebsiteMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  isLink: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface WebsiteConversationNote {
  id: string;
  conversationId: string;
  authorId?: string | null;
  authorName?: string | null;
  note: string;
  createdAt: string;
}

export interface WebsiteProject {
  id: string;
  tenantId: string;
  customerUserId: string;
  name: string;
  websiteType: string;
  goal?: string | null;
  status: string;
  liveUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  requirements?: WebsiteProjectRequirement | null;
  files?: WebsiteProjectFile[];
  conversation?: WebsiteConversationRef | null;
  statusHistory?: WebsiteProjectStatusHistory[];
  customerUser?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
  tenant?: { id: string; name: string; slug?: string | null } | null;
}

export interface WebsiteProjectDetail extends WebsiteProject {
  requirements: WebsiteProjectRequirement | null;
  files: WebsiteProjectFile[];
  conversation: WebsiteConversationRef | null;
  statusHistory: WebsiteProjectStatusHistory[];
}

export interface WebsiteProjectConversation {
  conversation: WebsiteConversationRef;
  messages: WebsiteMessage[];
}

export interface WebsiteProjectCreateInput {
  name: string;
  websiteType: string;
  goal?: string;
  requirements?: {
    businessName?: string;
    businessType?: string;
    businessLocation?: string;
    businessPhone?: string;
    businessEmail?: string;
    existingWebsiteUrl?: string;
    websiteTypes?: string[];
    designStyle?: string[];
    designPreference?: string;
    referenceUrl?: string;
    hasLogo?: boolean;
    logoUrl?: string;
    pageCount?: string;
    requiredFeatures?: string[];
    additionalRequirements?: string;
  };
}

export interface WebsiteProjectUpdateInput {
  name?: string;
  websiteType?: string;
  goal?: string;
  requirements?: Partial<WebsiteProjectCreateInput["requirements"]>;
}

export interface WebsiteMessageInput {
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  isLink?: boolean;
}

export interface AdminWebsiteProjectList {
  items: WebsiteProject[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Help & Support ─────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  tenantId: string;
  userId: string;
  subject: string;
  category: string;
  priority: string;
  description: string;
  status: string;
  assignedAgentId?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  assignedAgent?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
  } | null;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
  tenant?: { id: string; name: string; slug?: string | null } | null;
  /** Most recent message, if any. */
  messages?: Array<{
    id: string;
    message: string;
    senderRole: string;
    senderId: string;
    createdAt: string;
    readAt?: string | null;
  }>;
  /** Filtered count of unread messages from the other party. */
  _count?: {
    messages: number;
  };
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: string; // CUSTOMER | ADMIN | SYSTEM
  message: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  isLink: boolean;
  readAt?: string | null;
  createdAt: string;
  senderName?: string | null;
}

export interface SupportAttachment {
  id: string;
  ticketId: string;
  messageId?: string | null;
  uploadedBy: string;
  fileUrl: string;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
}

export interface SupportInternalNote {
  id: string;
  ticketId: string;
  adminId?: string | null;
  adminName?: string | null;
  note: string;
  createdAt: string;
}

export interface SupportStatusHistory {
  id: string;
  ticketId: string;
  oldStatus?: string | null;
  newStatus: string;
  changedById?: string | null;
  changedByName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface SupportArticle {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  content: string;
  category: string;
  keywords: string[];
  faq: boolean;
  sortOrder: number;
  published: boolean;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
  statusHistory: SupportStatusHistory[];
  attachments: SupportAttachment[];
}

export interface SupportTicketConversation {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

export interface CreateSupportTicketInput {
  subject: string;
  category: string;
  priority?: string;
  description: string;
  /** Ask Doloyal conversation this ticket is escalated from (if any). */
  conversationId?: string;
  /** Dashboard page the user was on when the ticket was created. */
  currentPage?: string;
}

export interface SupportMessageInput {
  message: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMimeType?: string;
  isLink?: boolean;
}

export interface AdminSupportTicketList {
  items: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminSupportStats {
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  total: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ask Doloyal — AI support assistant
// ─────────────────────────────────────────────────────────────────────────────

export type SupportConversationMode = "AI" | "HUMAN";
export type SupportConversationSender = "USER" | "AI" | "SYSTEM";

export interface SupportConversationMessage {
  id: string;
  conversationId: string;
  senderType: SupportConversationSender;
  content: string;
  metadata?: {
    escalate?: boolean;
    suggestedCategory?: string;
    suggestedPriority?: string;
    suggestedSubject?: string;
    sources?: { id: string; slug: string; title: string; category: string }[];
    agentReply?: boolean;
    ticketId?: string;
    ticketNumber?: string;
    provider?: string;
    model?: string;
  } | null;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  mode: SupportConversationMode;
  status: string;
  currentPage?: string | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: {
    id: string;
    senderType: SupportConversationSender;
    content: string;
    createdAt: string;
  } | null;
  ticket?: {
    id: string;
    ticketNumber: string;
    status: string;
  } | null;
}

export interface SupportConversationDetail extends Omit<SupportConversation, "lastMessage" | "messageCount"> {
  messages: SupportConversationMessage[];
  ticket?: SupportConversation["ticket"];
}

export interface AskDoloyalChatInput {
  message: string;
  conversationId?: string;
  currentPage?: string;
}

export interface AskDoloyalChatResponse {
  conversationId: string;
  messageId: string;
  message: string;
  escalate: boolean;
  suggestedCategory?: string;
  suggestedPriority?: string;
  suggestedSubject?: string;
  sources?: { id: string; slug: string; title: string; category: string }[];
  mode: SupportConversationMode;
  provider: string;
  model: string;
}

export interface SupportUnreadBadge {
  unread: number;
}

export interface AdminAiAssistResult {
  draft: string;
  articles: { id: string; slug: string; title: string; category: string }[];
  provider: string;
  model: string;
}

export interface AdminSupportAnalytics {
  range: string;
  tickets: {
    created: number;
    resolved: number;
    avgFirstResponseHours: number | null;
    avgResolutionHours: number | null;
    byCategory: { category: string; count: number }[];
    byPriority: { priority: string; count: number }[];
    daily: { date: string; created: number; resolved: number }[];
  };
  ai: {
    conversations: number;
    aiAnswers: number;
    escalated: number;
    escalationRate: number;
    aiResolutionRate: number;
    chatEscalationRate: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Workflows
// ─────────────────────────────────────────────────────────────────────────────

export type WorkflowStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "ERROR"
  | "ARCHIVED";

export type WorkflowRunStatus =
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

export type WorkflowNodeType =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "branch"
  | "end";

export interface WorkflowTriggerDef {
  type: string;
  config?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

export interface WorkflowNodeDef {
  id: string;
  type: WorkflowNodeType;
  label: string;
  description?: string;
  config?: Record<string, unknown>;
  /** condition / action / delay specifics */
  data?: Record<string, unknown>;
}

export interface WorkflowEdgeDef {
  source: string;
  target: string;
  outcome?: string | null;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  trigger: WorkflowTriggerDef;
  nodes: WorkflowNodeDef[];
  edges: WorkflowEdgeDef[];
}

export interface WorkflowSummary {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  trigger: WorkflowTriggerDef;
  status: WorkflowStatus;
  version: number;
  activatedAt?: string;
  pausedAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  runs: number;
  completedRuns: number;
  failedRuns: number;
  successRate?: number;
  customersReached?: number;
  messagesSent?: number;
  bookingsGenerated?: number;
  rewardsGenerated?: number;
  revenueGenerated?: number;
}

export interface WorkflowDetail extends WorkflowSummary {
  definition: WorkflowDefinition;
  versions: WorkflowVersionInfo[];
  recentRuns: WorkflowRunInfo[];
}

export interface WorkflowVersionInfo {
  id: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED";
  createdAt: string;
  activatedAt?: string;
}

export interface WorkflowRunInfo {
  id: string;
  workflowId: string;
  customerId?: string;
  customerName?: string;
  version: number;
  status: WorkflowRunStatus;
  trigger: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
  steps: WorkflowRunStepInfo[];
}

export interface WorkflowRunStepInfo {
  id: string;
  nodeKey: string;
  type: string;
  status: string;
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: Record<string, unknown> | null;
}

export interface WorkflowTemplateInfo {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface WorkflowMetrics {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  runningRuns: number;
  customersReached: number;
  messagesSent: number;
  bookingsGenerated: number;
  rewardsGenerated: number;
  revenueGenerated: number;
  successRate: number;
}

export interface WorkflowCapabilityCatalog {
  triggers: Array<{ type: string; label: string; category: string; description: string }>;
  conditions: Array<{ key: string; label: string; category: string; operators: string[] }>;
  actions: Array<{ type: string; label: string; category: string; description: string; channels?: string[] }>;
}

export interface WorkflowGenerateResult {
  workflow: WorkflowDetail;
  message: string;
  clarification?: string;
  needsClarification?: boolean;
  warnings?: string[];
}

export interface WorkflowAuditEntry {
  id: string;
  workflowId: string;
  actorName?: string;
  action: string;
  version?: number;
  details?: Record<string, unknown>;
  createdAt: string;
}
