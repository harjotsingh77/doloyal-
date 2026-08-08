/**
 * Doloyal — Zod input schemas shared between web forms and API validation.
 *
 * Every schema here is the single source of truth for request shape validation.
 * The API pipes incoming JSON through these via NestJS ValidationPipe-friendly
 * equivalents; the web imports them directly for client-side validation.
 */
import { z } from "zod";
import {
  BUSINESS_CATEGORIES,
  CAMPAIGN_CHANNELS,
  INVITATION_STATUSES,
  LOYALTY_MODES,
  MEMBERSHIP_TIER_NAMES,
  PAYMENT_METHODS,
  REWARD_STATUS,
  REWARD_CATEGORIES,
  REWARD_TYPES,
  ROLES,
  STAFF_STATUSES,
} from "./enums";

// Reusable primitives --------------------------------------------------------

export const id = z.string().cuid().or(z.string().uuid());
export const phone = z
  .string()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s-]+$/, "Invalid phone number");
export const currency = z.number().min(0).max(10_000_000);
export const gqlDate = z.coerce.date();
export const percent = z.number().min(0).max(100);

// Tenant / onboarding --------------------------------------------------------

export const businessCategoryEnum = z.enum(BUSINESS_CATEGORIES);

export const onboardTenantSchema = z.object({
  name: z.string().min(2, "Business name is required").max(120),
  category: businessCategoryEnum,
  phone: phone,
  email: z.string().email("Valid business email required").toLowerCase(),
  address: z.string().max(300).optional(),
  gst: z.string().max(40).optional(),
  logoUrl: z.string().url().optional(),
  currency: z.string().length(3).default("INR"),
  timezone: z.string().max(60).default("Asia/Kolkata"),
  brandColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#2563EB"),
  // Loyalty config created alongside tenant during onboarding
  loyalty: z.object({
    mode: z.enum(LOYALTY_MODES).default("CURRENCY"),
    pointsPerCurrency: z.number().min(0).default(0.1), // e.g. ₹100 = 10 points
    pointsPerVisit: z.number().min(0).default(0),
    currencyPerPoint: z.number().min(0).default(1), // redemption: 1pt = ₹1 by default
    expiryDays: z.number().int().min(0).default(365),
  }),
});
export type OnboardTenantInput = z.infer<typeof onboardTenantSchema>;

export const updateTenantSettingsSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: businessCategoryEnum.optional(),
  phone: phone.optional(),
  email: z.string().email().toLowerCase().optional(),
  website: z.string().url().max(300).optional().or(z.literal("")),
  address: z.string().max(500).optional(),
  gst: z.string().max(40).optional(),
  registrationNumber: z.string().max(80).optional(),
  logoUrl: z.string().max(5_000_000).nullable().optional(),
  coverBannerUrl: z.string().max(5_000_000).nullable().optional(),
  faviconUrl: z.string().max(5_000_000).nullable().optional(),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  whatsapp: z.string().max(40).optional(),
  mapsUrl: z.string().max(1000).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().max(60).optional(),
  language: z.string().max(20).optional(),
  dateFormat: z.string().max(30).optional(),
  timeFormat: z.enum(["12h", "24h"]).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fontFamily: z.string().max(80).optional(),
  taxRate: percent.optional(),
  businessHours: z
    .object({
      openingTime: z.string().optional(),
      closingTime: z.string().optional(),
      weeklyOff: z.array(z.string()).optional(),
      breakStart: z.string().optional(),
      breakEnd: z.string().optional(),
    })
    .optional(),
  socialLinks: z
    .object({
      instagram: z.string().optional(),
      facebook: z.string().optional(),
      linkedin: z.string().optional(),
      youtube: z.string().optional(),
      googleBusiness: z.string().optional(),
      whatsapp: z.string().optional(),
    })
    .optional(),
  legalPolicies: z
    .object({
      privacyPolicy: z.string().optional(),
      termsAndConditions: z.string().optional(),
      refundPolicy: z.string().optional(),
      cancellationPolicy: z.string().optional(),
    })
    .optional(),
  businessStatus: z
    .object({
      activeBusiness: z.boolean().optional(),
      onlineBooking: z.boolean().optional(),
      walkIns: z.boolean().optional(),
      showOnWebsite: z.boolean().optional(),
    })
    .optional(),
  notificationPrefs: z
    .object({
      email: z.boolean().optional(),
      sms: z.boolean().optional(),
      whatsapp: z.boolean().optional(),
      marketingEmails: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>;

// Customers ------------------------------------------------------------------

export const createCustomerSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  phone: phone,
  email: z.string().email().toLowerCase().optional(),
  address: z.string().max(300).optional(),
  dateOfBirth: gqlDate.optional(),
  anniversary: gqlDate.optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "UNSPECIFIED"]).optional(),
  tags: z.array(z.string().max(40)).max(20).default([]),
  notes: z.string().max(2000).optional(),
  staffId: id.optional(),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerQuerySchema = z.object({
  search: z.string().max(120).optional(),
  tags: z.array(z.string()).optional(),
  staffId: id.optional(),
  band: z
    .enum(["NEW", "GROWING", "LOYAL", "VIP", "CHURNED"])
    .optional(),
  churnRisk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: id.optional(),
});
export type CustomerQuery = z.infer<typeof customerQuerySchema>;

// Loyalty config -------------------------------------------------------------

export const updateLoyaltyConfigSchema = z.object({
  mode: z.enum(LOYALTY_MODES).optional(),
  pointsPerCurrency: z.number().min(0).max(1000).optional(),
  pointsPerVisit: z.number().min(0).max(10000).optional(),
  currencyPerPoint: z.number().min(0).max(10000).optional(),
  expiryDays: z.number().int().min(0).max(3650).optional(),
  welcomeBonus: z.number().int().min(0).max(100000).optional(),
  referralBonus: z.number().int().min(0).max(100000).optional(),
  settings: z
    .object({
      birthdayBonus: z.number().int().min(0).max(100000).optional(),
      reviewBonus: z.number().int().min(0).max(100000).optional(),
      socialShareBonus: z.number().int().min(0).max(100000).optional(),
      googleReviewBonus: z.number().int().min(0).max(100000).optional(),
      instagramStoryBonus: z.number().int().min(0).max(100000).optional(),
      minRedemption: z.number().int().min(0).max(100000).optional(),
      maxRedemption: z.number().int().min(0).max(1000000).optional(),
      tierMultiplier: z.number().min(0).max(10).optional(),
      autoExpiry: z.boolean().optional(),
      doublePoints: z.boolean().optional(),
      weekendBonus: z.boolean().optional(),
      holidayBonus: z.boolean().optional(),
    })
    .optional(),
});
export type UpdateLoyaltyConfigInput = z.infer<typeof updateLoyaltyConfigSchema>;

export const loyaltyCopilotSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});
export type LoyaltyCopilotInput = z.infer<typeof loyaltyCopilotSchema>;

export const createLoyaltyChallengeSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(600).optional(),
  type: z.string().min(2).max(40),
  targetValue: z.number().int().min(1),
  rewardPoints: z.number().int().min(0),
  rewardLabel: z.string().max(120).optional(),
  endsAt: z.string().datetime().optional(),
  aiGenerated: z.boolean().optional(),
});
export type CreateLoyaltyChallengeInput = z.infer<typeof createLoyaltyChallengeSchema>;

export const createLoyaltyAutomationSchema = z.object({
  name: z.string().min(2).max(120),
  trigger: z.string().min(2).max(80),
  conditions: z.record(z.unknown()).optional(),
  actions: z.union([z.record(z.unknown()), z.array(z.record(z.unknown()))]),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});
export type CreateLoyaltyAutomationInput = z.infer<typeof createLoyaltyAutomationSchema>;

export const createLoyaltyBadgeSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  criteria: z.record(z.unknown()).optional(),
  aiSuggested: z.boolean().optional(),
});
export type CreateLoyaltyBadgeInput = z.infer<typeof createLoyaltyBadgeSchema>;

export const createSurpriseRewardSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.string().min(2).max(40),
  config: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});
export type CreateSurpriseRewardInput = z.infer<typeof createSurpriseRewardSchema>;

export const generateLoyaltyCampaignSchema = z.object({
  businessType: z.string().min(2).max(40),
  campaignType: z.string().min(2).max(80),
  notes: z.string().max(500).optional(),
});
export type GenerateLoyaltyCampaignInput = z.infer<typeof generateLoyaltyCampaignSchema>;

export const toggleFeatureFlagSchema = z.object({
  featureKey: z.string().min(2).max(80),
  enabled: z.boolean(),
});
export type ToggleFeatureFlagInput = z.infer<typeof toggleFeatureFlagSchema>;

export const updateFeatureConfigSchema = z.object({
  featureKey: z.string().min(2).max(80),
  config: z.record(z.unknown()),
});
export type UpdateFeatureConfigInput = z.infer<typeof updateFeatureConfigSchema>;

export const manualAdjustmentSchema = z.object({
  customerId: id,
  points: z.number().int().refine((n) => n !== 0, "Points must be non-zero"),
  reason: z.string().min(2, "Reason is required").max(200),
});
export type ManualAdjustmentInput = z.infer<typeof manualAdjustmentSchema>;

// Rewards --------------------------------------------------------------------

export const createRewardSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(600).optional(),
  pointsCost: z.number().int().min(0).default(0),
  discountVal: z.number().min(0).optional(),
  rewardValue: z.number().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  terms: z.string().max(1000).optional(),
  validityDays: z.number().int().min(1).default(90),
  status: z.enum(REWARD_STATUS).default("DRAFT"),
  totalQuantity: z.number().int().min(0).nullable().optional(),
  unlimitedStock: z.boolean().optional(),
  category: z.enum(REWARD_CATEGORIES).default("STANDARD"),
  rewardType: z.enum(REWARD_TYPES).default("CUSTOM"),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  branchIds: z.array(z.string()).optional(),
  tierRequired: z.string().max(80).optional().nullable(),
  membershipRequired: z.string().max(80).optional().nullable(),
});
export type CreateRewardInput = z.infer<typeof createRewardSchema>;

export const updateRewardSchema = createRewardSchema.partial();
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;

export const updateRewardProgramSchema = z.object({
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdateRewardProgramInput = z.infer<typeof updateRewardProgramSchema>;

export const cashbackRedeemSchema = z.object({
  customerId: id,
  points: z.number().int().min(1),
});
export type CashbackRedeemInput = z.infer<typeof cashbackRedeemSchema>;

export const rewardClaimSchema = z.object({
  customerId: id,
  programType: z.enum(["REVIEW", "SOCIAL", "WHATSAPP"]),
  evidence: z.record(z.unknown()).optional(),
});
export type RewardClaimInput = z.infer<typeof rewardClaimSchema>;

export const redeemRewardSchema = z.object({
  rewardId: id,
  customerId: id,
  note: z.string().max(300).optional(),
});
export type RedeemRewardInput = z.infer<typeof redeemRewardSchema>;

// Memberships ----------------------------------------------------------------

export const createMembershipTierSchema = z.object({
  name: z.enum(MEMBERSHIP_TIER_NAMES),
  price: currency,
  validityDays: z.number().int().min(1).default(365),
  discountPercent: percent.default(0),
  bonusPointsPercent: percent.default(0),
  priorityBooking: z.boolean().default(false),
  benefits: z.array(z.string().max(200)).max(20).default([]),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});
export type CreateMembershipTierInput = z.infer<typeof createMembershipTierSchema>;

export const updateMembershipTierSchema = createMembershipTierSchema.partial();
export type UpdateMembershipTierInput = z.infer<typeof updateMembershipTierSchema>;

// Appointments / Invoices (minimal for this slice) ---------------------------

export const createInvoiceSchema = z.object({
  customerId: id,
  staffId: id.optional(),
  appointmentId: id.optional(),
  items: z
    .array(
      z.object({
        serviceName: z.string().min(1).max(200),
        quantity: z.number().min(1).default(1),
        unitPrice: currency,
      }),
    )
    .min(1, "At least one line item is required"),
  discount: currency.default(0),
  taxRate: percent.default(0),
  paymentMethod: z.enum(PAYMENT_METHODS).default("CASH"),
  notes: z.string().max(500).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// Campaigns (stubbed UI but stored + queryable) ------------------------------

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  channel: z.enum(CAMPAIGN_CHANNELS),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(4000),
  segment: z
    .enum([
      "ALL",
      "INACTIVE_30",
      "INACTIVE_60",
      "VIP",
      "BIRTHDAY",
      "NEW",
      "HIGH_SPENDERS",
      "MEMBERSHIP_HOLDERS",
    ])
    .default("ALL"),
  scheduledAt: gqlDate.optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

// Staff / memberships --------------------------------------------------------

export const inviteStaffSchema = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(2).max(120).optional(),
  role: z.enum(ROLES.filter((r) => r !== "CUSTOMER") as [string, ...string[]]) as z.ZodType<
    "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF"
  >,
  branchId: id.optional(),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;

// Team Management -----------------------------------------------------------

export const inviteMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60).optional(),
  lastName: z.string().min(1, "Last name is required").max(60).optional(),
  email: z.string().email("Enter a valid email address").toLowerCase(),
  phone: z.string().max(40).optional().or(z.literal("")),
  role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "STAFF"] as const),
  branchIds: z.array(z.string()).default([]),
  department: z.string().max(80).optional().or(z.literal("")),
  jobTitle: z.string().max(120).optional().or(z.literal("")),
  permissions: z.array(z.string()).default([]),
  notes: z.string().max(2000).optional().or(z.literal("")),
  sendWelcomeEmail: z.boolean().default(true),
  requirePasswordReset: z.boolean().default(false),
  twoFactorRequired: z.boolean().default(false),
  saveDraft: z.boolean().default(false),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const staffQuerySchema = z.object({
  search: z.string().max(120).optional(),
  role: z.string().max(30).optional(),
  branchId: z.string().max(80).optional(),
  status: z.enum(STAFF_STATUSES).optional(),
  invitationStatus: z.enum(INVITATION_STATUSES).optional(),
  online: z.enum(["true", "false"]).optional(),
  dateJoinedFrom: z.string().optional(),
  dateJoinedTo: z.string().optional(),
  lastLoginFrom: z.string().optional(),
  lastLoginTo: z.string().optional(),
  sortBy: z.string().max(40).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});
export type StaffQuery = z.infer<typeof staffQuerySchema>;

export const updateStaffSchema = z
  .object({
    firstName: z.string().max(60).optional(),
    lastName: z.string().max(60).optional(),
    phone: z.string().max(40).optional().nullable(),
    department: z.string().max(80).optional().nullable(),
    jobTitle: z.string().max(120).optional().nullable(),
    role: z.enum(["OWNER", "MANAGER", "RECEPTIONIST", "STAFF"] as const).optional(),
    status: z.enum(STAFF_STATUSES).optional(),
    notes: z.string().max(2000).optional().nullable(),
    permissions: z.array(z.string()).optional(),
    branchIds: z.array(z.string()).optional(),
    requirePasswordReset: z.boolean().optional(),
    twoFactorRequired: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No update provided" });
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffNoteSchema = z.object({
  body: z.string().min(1, "Note is required").max(2000),
  category: z.string().max(40).optional().or(z.literal("")),
});
export type StaffNoteInput = z.infer<typeof staffNoteSchema>;

export const bulkStaffActionSchema = z.object({
  ids: z.array(z.string()).min(1, "Select at least one member"),
  action: z.enum([
    "DELETE",
    "DEACTIVATE",
    "ACTIVATE",
    "SUSPEND",
    "ASSIGN_BRANCH",
    "CHANGE_ROLE",
    "RESEND_INVITATION",
    "ENABLE_2FA",
    "DISABLE_2FA",
  ]),
  branchId: z.string().optional(),
  role: z.string().optional(),
});
export type BulkStaffActionInput = z.infer<typeof bulkStaffActionSchema>;

// AI assistant ---------------------------------------------------------------

export const assistantMessageSchema = z.object({
  conversationId: z.string().max(120).optional(),
  message: z.string().min(1).max(8000),
  attachments: z
    .array(
      z.object({
        fileName: z.string().min(1).max(200),
        mimeType: z.string().min(1).max(120),
        sizeBytes: z.number().int().nonnegative().optional(),
        textExtract: z.string().max(20000).optional(),
        previewUrl: z.string().max(500000).optional(),
        contentBase64: z.string().max(500000).optional(),
      }),
    )
    .max(5)
    .optional(),
});
export type AssistantMessageInput = z.infer<typeof assistantMessageSchema>;

// Booking System -----------------------------------------------------------

const customerFieldSchema = z.object({
  enabled: z.boolean(),
  required: z.boolean(),
});

export const bookingRulesSchema = z.object({
  businessHours: z.record(z.string(), z.object({
    start: z.string(),
    end: z.string(),
    isAvailable: z.boolean(),
    breakStart: z.string().optional(),
    breakEnd: z.string().optional(),
  }).nullable()).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  minNoticeMinutes: z.number().int().min(0).max(10080).optional(),
  maxAppointmentsPerDay: z.number().int().min(1).max(500).optional(),
  maxBookingsPerSlot: z.number().int().min(1).max(50).optional(),
  cancellationWindowHours: z.number().int().min(0).max(720).optional(),
  reschedulePolicyHours: z.number().int().min(0).max(720).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(120).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(120).optional(),
  appointmentDurationMinutes: z.number().int().min(5).max(480).nullable().optional(),
  approvalMode: z.enum(["AUTOMATIC", "MANUAL"]).optional(),
}).optional();

export const bookingPaymentSchema = z.object({
  mode: z.enum(["NONE", "DEPOSIT", "FULL", "PARTIAL", "PAY_AT_STORE"]),
  depositPercent: z.number().min(0).max(100).optional(),
  depositAmount: z.number().min(0).optional(),
  partialPercent: z.number().min(0).max(100).optional(),
  methods: z.array(z.enum(["STRIPE", "RAZORPAY", "CASH", "UPI"])).optional(),
  payAtStore: z.boolean().optional(),
}).optional();

export const createBookingLinkSchema = z.object({
  staffId: z.string().optional(),
  staffIds: z.array(z.string()).optional(),
  type: z.enum(["PERSONAL", "COMPANY"]).default("PERSONAL"),
  name: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  isActive: z.boolean().default(true),
  assignmentMode: z.enum(["SINGLE", "MULTI", "AUTO", "ROUND_ROBIN"]).optional(),
  serviceIds: z.array(z.string()).optional(),
  customerFields: z.record(customerFieldSchema).optional(),
  rules: bookingRulesSchema,
  payment: bookingPaymentSchema,
  loyalty: z.record(z.any()).optional(),
  membershipAccess: z.object({
    access: z.enum(["EVERYONE", "MEMBERS_ONLY", "GOLD", "SILVER", "VIP", "STAFF_ONLY"]),
    tierIds: z.array(z.string()).optional(),
  }).optional(),
  authMode: z.object({
    mode: z.enum(["GUEST", "REQUIRE_LOGIN", "SIGNUP_BEFORE"]),
    googleLogin: z.boolean().optional(),
    otpLogin: z.boolean().optional(),
    emailLogin: z.boolean().optional(),
    returningCustomerLogin: z.boolean().optional(),
  }).optional(),
  branding: z.record(z.any()).optional(),
  automations: z.record(z.any()).optional(),
  pageConfig: z.record(z.any()).optional(),
  seo: z.record(z.any()).optional(),
  domain: z.object({
    subdomain: z.string().optional(),
    customDomain: z.string().optional(),
    status: z.enum(["PENDING", "ACTIVE", "FAILED"]).optional(),
  }).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
  confirmationMessage: z.string().max(500).optional(),
  redirectUrl: z.string().url().optional().or(z.literal("")),
  webhookUrl: z.string().url().optional().or(z.literal("")),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(300).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});
export type CreateBookingLinkInput = z.infer<typeof createBookingLinkSchema>;

export const updateBookingLinkSchema = createBookingLinkSchema.partial().extend({
  isPaused: z.boolean().optional(),
});
export type UpdateBookingLinkInput = z.infer<typeof updateBookingLinkSchema>;

export const updateBookingPageSchema = z.object({
  pageConfig: z.record(z.any()).optional(),
  branding: z.record(z.any()).optional(),
  seo: z.record(z.any()).optional(),
  domain: z.object({
    subdomain: z.string().optional(),
    customDomain: z.string().optional(),
    status: z.enum(["PENDING", "ACTIVE", "FAILED"]).optional(),
  }).optional(),
  metaTitle: z.string().max(120).optional(),
  metaDescription: z.string().max(300).optional(),
  name: z.string().max(120).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});
export type UpdateBookingPageInput = z.infer<typeof updateBookingPageSchema>;
export const publicBookingSchema = z.object({
  serviceId: z.string(),
  staffId: z.string().optional(),
  startTime: z.string(),
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  customerName: z.string().min(1).max(120).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(7, "Phone is required").max(20),
  notes: z.string().max(500).optional(),
  birthday: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().max(300).optional(),
  referralSource: z.string().max(120).optional(),
  promoCode: z.string().max(60).optional(),
  redeemPoints: z.number().int().min(0).optional(),
  paymentMethod: z.enum(["STRIPE", "RAZORPAY", "CASH", "UPI", "PAY_AT_STORE"]).optional(),
  honeypot: z.string().max(0).optional(),
  customerToken: z.string().optional(),
});
export type PublicBookingInput = z.infer<typeof publicBookingSchema>;

export const updateAvailabilitySchema = z.object({
  businessHours: z.record(z.string(), z.object({ open: z.string(), close: z.string() }).nullable()).optional(),
  maxDailyBookings: z.number().int().min(1).max(500).optional(),
  minBookingNotice: z.number().int().min(0).max(10080).optional(),
  maxAdvanceBookingDays: z.number().int().min(1).max(365).optional(),
  bufferTime: z.number().int().min(0).max(120).optional(),
});
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilitySchema>;

export const blockDateSchema = z.object({
  staffId: z.string().optional(),
  date: z.string(),
  reason: z.string().max(200).optional(),
  isFullDay: z.boolean().default(true),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});
export type BlockDateInput = z.infer<typeof blockDateSchema>;

export const widgetSettingsSchema = z.object({
  isActive: z.boolean().default(true),
  buttonStyle: z.enum(["floating", "inline", "popup"]).default("floating"),
  buttonColor: z.string().default("#2563EB"),
  buttonText: z.string().default("Book Appointment"),
  position: z.enum(["bottom-right", "bottom-left", "top-right", "top-left"]).default("bottom-right"),
  primaryColor: z.string().default("#2563EB"),
  fontFamily: z.string().default("Inter"),
  theme: z.enum(["light", "dark", "auto"]).default("light"),
  services: z.array(z.string()).default([]),
  staff: z.array(z.string()).default([]),
});
export type WidgetSettingsInput = z.infer<typeof widgetSettingsSchema>;

export const notificationTemplateSchema = z.object({
  type: z.string(),
  channel: z.string().default("EMAIL"),
  subject: z.string().max(200).optional(),
  body: z.string().min(1, "Body is required"),
  isActive: z.boolean().default(true),
});
export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>;

export const sendNotificationSchema = z.object({
  appointmentId: z.string(),
  type: z.string(),
  channel: z.string().default("EMAIL"),
});
export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

export const aiSuggestSlotSchema = z.object({
  serviceId: z.string(),
  date: z.string(),
  staffId: z.string().optional(),
  customerId: z.string().optional(),
});
export type AiSuggestSlotInput = z.infer<typeof aiSuggestSlotSchema>;
