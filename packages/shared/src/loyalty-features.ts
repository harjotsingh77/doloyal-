/**
 * Loyalty Feature Management catalog.
 * Core features are always enabled; optional features are tenant-scoped toggles.
 */

export const LOYALTY_FEATURE_CATEGORIES = [
  "Core",
  "Engagement",
  "Operations",
  "Communication",
  "Analytics",
  "Integrations",
  "Security",
] as const;
export type LoyaltyFeatureCategory = (typeof LOYALTY_FEATURE_CATEGORIES)[number];

export const CORE_LOYALTY_FEATURES = ["program_settings", "leaderboard"] as const;
export type CoreLoyaltyFeatureKey = (typeof CORE_LOYALTY_FEATURES)[number];

export const OPTIONAL_LOYALTY_FEATURES = [
  // Engagement
  "loyalty_tiers",
  "customer_challenges",
  "badges_achievements",
  "surprise_rewards",
  "streak_system",
  "spin_wheel",
  "seasonal_campaigns",
  "referral_campaigns",
  "double_points_weekend",
  "holiday_bonus_engine",
  "tier_progress_widget",
  "leaderboard_rewards",
  "customer_milestones",
  "gamification",

  // Operations
  "reward_automation",
  "automation_rules",
  "activity_feed",
  "manual_point_adjustment",
  "points_ledger_explorer",
  "multi_branch_loyalty",

  // Communication
  "smart_notifications",
  "push_notifications",
  "email_notifications",
  "sms_notifications",
  "whatsapp_notifications",

  // Analytics
  "loyalty_analytics",
  "advanced_reports",

  // Integrations
  "membership_integration",
  "qr_code_loyalty",
  "wallet_pass",
  "api_access",

  // Security
  "audit_logs",
] as const;
export type OptionalLoyaltyFeatureKey = (typeof OPTIONAL_LOYALTY_FEATURES)[number];

export type LoyaltyFeatureKey = CoreLoyaltyFeatureKey | OptionalLoyaltyFeatureKey;

export interface LoyaltyFeatureDefinition {
  key: LoyaltyFeatureKey;
  name: string;
  description: string;
  category: LoyaltyFeatureCategory;
  icon: string;
  core: boolean;
  sectionId?: string;
  defaultConfig?: Record<string, unknown>;
}

export const LOYALTY_FEATURE_CATALOG: LoyaltyFeatureDefinition[] = [
  // --- CORE ---
  {
    key: "program_settings",
    name: "Program Settings",
    description: "Core point earning rates, currency values, expiry days, and signup bonus rules.",
    category: "Core",
    icon: "Settings2",
    core: true,
    sectionId: "settings",
    defaultConfig: {
      mode: "CURRENCY",
      pointsPerCurrency: 0.1,
      pointsPerVisit: 10,
      currencyPerPoint: 1,
      welcomeBonus: 100,
      referralBonus: 100,
      expiryDays: 365,
      minSpend: 0,
      maxRedemption: 10000,
      minRedemption: 100,
      tierMultiplier: 1,
      weekendMultiplier: 1,
      holidayMultiplier: 1,
      birthdayBonus: 100,
      reviewBonus: 50,
      autoExpiry: true,
      doublePoints: false,
      weekendBonus: false,
      holidayBonus: false,
    },
  },
  {
    key: "leaderboard",
    name: "Leaderboard",
    description: "Public or private customer rankings by points earned, visits, and spend.",
    category: "Core",
    icon: "Trophy",
    core: true,
    sectionId: "leaderboard",
    defaultConfig: {
      period: "monthly",
      topCount: 10,
      metric: "points",
      showAvatars: true,
      showBadges: true,
      automaticRewards: false,
      rewardTopN: 10,
      rewardPoints: 200,
    },
  },

  // --- ENGAGEMENT ---
  {
    key: "loyalty_tiers",
    name: "Loyalty Tiers",
    description: "Multi-level tier progression (Bronze, Silver, Gold, VIP) with custom point multipliers.",
    category: "Engagement",
    icon: "Layers",
    core: false,
    sectionId: "tiers",
    defaultConfig: {
      tiers: [
        { name: "Bronze", pointsRequired: 0, multiplier: 1.0, perks: "Basic Member" },
        { name: "Silver", pointsRequired: 500, multiplier: 1.25, perks: "1.25x Points + Birthday Gift" },
        { name: "Gold", pointsRequired: 1500, multiplier: 1.5, perks: "1.5x Points + Priority Booking" },
        { name: "Platinum", pointsRequired: 3000, multiplier: 2.0, perks: "2.0x Points + Free Upgrades" },
      ],
    },
  },
  {
    key: "customer_challenges",
    name: "Customer Challenges",
    description: "Time-limited missions and goals for customers to earn bonus points.",
    category: "Engagement",
    icon: "Target",
    core: false,
    sectionId: "challenges",
    defaultConfig: { title: "Weekend Warrior", targetVisits: 3, rewardPoints: 250, durationDays: 14 },
  },
  {
    key: "badges_achievements",
    name: "Badges & Achievements",
    description: "Unlockable status badges awarded for milestones like 10th visit or VIP status.",
    category: "Engagement",
    icon: "Award",
    core: false,
    sectionId: "badges",
    defaultConfig: { enableCustomBadges: true, notifyOnUnlock: true },
  },
  {
    key: "surprise_rewards",
    name: "Surprise Rewards",
    description: "Automated surprise reward drops to delight loyal customers randomly or on visits.",
    category: "Engagement",
    icon: "Gift",
    core: false,
    sectionId: "surprise",
    defaultConfig: { triggerOnVisitCount: 5, rewardPoints: 150, probabilityPercent: 20 },
  },
  {
    key: "streak_system",
    name: "Streak System",
    description: "Track consecutive weekly/monthly customer visits and award streak bonus points.",
    category: "Engagement",
    icon: "Flame",
    core: false,
    sectionId: "streaks",
    defaultConfig: { minVisitsPerMonth: 2, streakBonusPoints: 100, maxStreakMonths: 12 },
  },
  {
    key: "spin_wheel",
    name: "Spin Wheel",
    description: "Interactive spin-to-win game for customers to win bonus points or coupons.",
    category: "Engagement",
    icon: "Disc",
    core: false,
    sectionId: "spin_wheel",
    defaultConfig: { costPerSpinPoints: 50, prizes: ["100 Points", "20% Off Coupon", "Free Drink", "500 Points"] },
  },
  {
    key: "seasonal_campaigns",
    name: "Seasonal Campaigns",
    description: "Run limited-time festive and holiday loyalty promotions with custom multipliers.",
    category: "Engagement",
    icon: "Calendar",
    core: false,
    sectionId: "seasonal_campaigns",
    defaultConfig: { campaignName: "Summer Solstice", bonusMultiplier: 2.0, activeDays: 7 },
  },
  {
    key: "referral_campaigns",
    name: "Referral Campaigns",
    description: "Reward both referrer and referred friends with bonus points or discount codes.",
    category: "Engagement",
    icon: "UserPlus",
    core: false,
    sectionId: "referral_campaigns",
    defaultConfig: { referrerRewardPoints: 200, refereeDiscountPercent: 15 },
  },
  {
    key: "double_points_weekend",
    name: "Double Points Weekend",
    description: "Automatically double all points earned on Saturdays and Sundays.",
    category: "Engagement",
    icon: "Zap",
    core: false,
    sectionId: "double_points_weekend",
    defaultConfig: { multiplier: 2.0, days: ["Saturday", "Sunday"], enabledOnHolidays: true },
  },
  {
    key: "holiday_bonus_engine",
    name: "Holiday Bonus Engine",
    description: "Configurable holiday calendar that automatically awards bonus points on key dates.",
    category: "Engagement",
    icon: "Sparkles",
    core: false,
    sectionId: "holiday_bonus_engine",
    defaultConfig: { holidays: ["New Year", "Diwali", "Christmas", "Black Friday"], bonusPoints: 300 },
  },
  {
    key: "tier_progress_widget",
    name: "Tier Progress Widget",
    description: "Visual progress bar showing customers how close they are to the next tier.",
    category: "Engagement",
    icon: "Gauge",
    core: false,
    sectionId: "tier_progress_widget",
    defaultConfig: { showOnReceipt: true, showInCustomerPortal: true },
  },
  {
    key: "leaderboard_rewards",
    name: "Leaderboard Rewards",
    description: "Automatically reward top 3 or top 10 customers on the monthly leaderboard.",
    category: "Engagement",
    icon: "Medal",
    core: false,
    sectionId: "leaderboard_rewards",
    defaultConfig: { top3RewardPoints: 1000, top10RewardPoints: 500, autoDistribute: true },
  },
  {
    key: "customer_milestones",
    name: "Customer Milestones",
    description: "Celebrate key milestones (1st visit, 50th visit, ₹10k spend) with instant rewards.",
    category: "Engagement",
    icon: "Flag",
    core: false,
    sectionId: "customer_milestones",
    defaultConfig: { visitMilestones: [1, 10, 25, 50, 100], spendMilestones: [5000, 10000, 25000] },
  },
  {
    key: "gamification",
    name: "Gamification",
    description: "Enable overall gaming elements including progress bars, levels, and sound effects.",
    category: "Engagement",
    icon: "Gamepad2",
    core: false,
    sectionId: "gamification",
    defaultConfig: { enableSoundEffects: false, showLevelBadge: true },
  },

  // --- OPERATIONS ---
  {
    key: "reward_automation",
    name: "Reward Automation",
    description: "Automate reward generation and delivery based on customer behavior triggers.",
    category: "Operations",
    icon: "Cog",
    core: false,
    sectionId: "reward_automation",
    defaultConfig: { autoApproveRedemptions: true, notifyStaffOnRedeem: true },
  },
  {
    key: "automation_rules",
    name: "Automation Rules",
    description: "Build custom IF / THEN loyalty automation workflows.",
    category: "Operations",
    icon: "Workflow",
    core: false,
    sectionId: "automations",
    defaultConfig: { maxRules: 10, notifyOnTrigger: true },
  },
  {
    key: "activity_feed",
    name: "Activity Feed",
    description: "Realtime activity log of all points earned, redeemed, and tier upgrades.",
    category: "Operations",
    icon: "Activity",
    core: false,
    sectionId: "activity",
    defaultConfig: { autoRefreshSeconds: 10 },
  },
  {
    key: "manual_point_adjustment",
    name: "Manual Point Adjustment",
    description: "Allow authorized staff to manually add or deduct points with audit reason notes.",
    category: "Operations",
    icon: "SlidersHorizontal",
    core: false,
    sectionId: "adjust",
    defaultConfig: { requireReasonNote: true, maxManualPointsPerDay: 5000 },
  },
  {
    key: "points_ledger_explorer",
    name: "Points Ledger Explorer",
    description: "Searchable, immutable ledger table of all historical point transactions.",
    category: "Operations",
    icon: "FileText",
    core: false,
    sectionId: "ledger",
    defaultConfig: { itemsPerPage: 25, exportCsv: true },
  },
  {
    key: "multi_branch_loyalty",
    name: "Multi Branch Loyalty",
    description: "Share customer point balances seamlessly across all business locations.",
    category: "Operations",
    icon: "Building2",
    core: false,
    sectionId: "multi_branch_loyalty",
    defaultConfig: { syncAcrossBranches: true, trackEarningBranch: true },
  },

  // --- COMMUNICATION ---
  {
    key: "smart_notifications",
    name: "Smart Notifications",
    description: "Intelligent notification routing based on customer channel preferences.",
    category: "Communication",
    icon: "Bell",
    core: false,
    sectionId: "notifications",
    defaultConfig: { preferredChannelOrder: ["whatsapp", "sms", "email"] },
  },
  {
    key: "push_notifications",
    name: "Push Notifications",
    description: "Send web and mobile push notifications for instant point and reward alerts.",
    category: "Communication",
    icon: "Smartphone",
    core: false,
    sectionId: "push_notifications",
    defaultConfig: { soundEnabled: true },
  },
  {
    key: "email_notifications",
    name: "Email Notifications",
    description: "Automated HTML emails for monthly point summaries and reward vouchers.",
    category: "Communication",
    icon: "Mail",
    core: false,
    sectionId: "email_notifications",
    defaultConfig: { sendMonthlySummary: true },
  },
  {
    key: "sms_notifications",
    name: "SMS Notifications",
    description: "Instant transactional SMS alerts when points are earned or redeemed.",
    category: "Communication",
    icon: "MessageSquare",
    core: false,
    sectionId: "sms_notifications",
    defaultConfig: { senderId: "DOLOYL" },
  },
  {
    key: "whatsapp_notifications",
    name: "WhatsApp Notifications",
    description: "Official WhatsApp templates for point updates, tier alerts, and vouchers.",
    category: "Communication",
    icon: "MessageCircle",
    core: false,
    sectionId: "whatsapp_notifications",
    defaultConfig: { autoSendVouchers: true },
  },

  // --- ANALYTICS ---
  {
    key: "loyalty_analytics",
    name: "Loyalty Analytics",
    description: "Comprehensive charts for points velocity, redemption rates, and retention ROI.",
    category: "Analytics",
    icon: "BarChart3",
    core: false,
    sectionId: "analytics",
    defaultConfig: { dateRangeDays: 30 },
  },
  {
    key: "advanced_reports",
    name: "Advanced Reports",
    description: "Export detailed CSV/PDF reports for financial auditing and breakage analysis.",
    category: "Analytics",
    icon: "FileSpreadsheet",
    core: false,
    sectionId: "advanced_reports",
    defaultConfig: { includeMemberDetails: true },
  },

  // --- INTEGRATIONS ---
  {
    key: "membership_integration",
    name: "Membership Integration",
    description: "Link VIP recurring memberships directly to loyalty multiplier tiers.",
    category: "Integrations",
    icon: "BadgeCheck",
    core: false,
    sectionId: "membership_integration",
    defaultConfig: { autoUpgradeTierOnMembership: true },
  },
  {
    key: "qr_code_loyalty",
    name: "QR Code Loyalty",
    description: "Generate customer QR codes for instant in-store point scanning and check-in.",
    category: "Integrations",
    icon: "QrCode",
    core: false,
    sectionId: "qr_code_loyalty",
    defaultConfig: { qrExpiryMinutes: 15 },
  },
  {
    key: "wallet_pass",
    name: "Wallet Pass",
    description: "Issue Apple Wallet and Google Pay digital loyalty passes with live point updates.",
    category: "Integrations",
    icon: "Wallet",
    core: false,
    sectionId: "wallet_pass",
    defaultConfig: { passColor: "#2563eb", showBarcode: true },
  },
  {
    key: "api_access",
    name: "API Access",
    description: "REST API keys for custom POS and mobile app loyalty integrations.",
    category: "Integrations",
    icon: "Code2",
    core: false,
    sectionId: "api_access",
    defaultConfig: { rateLimitPerMinute: 60 },
  },

  // --- SECURITY ---
  {
    key: "audit_logs",
    name: "Audit Logs",
    description: "Immutable log of all staff manual point changes, config edits, and rule updates.",
    category: "Security",
    icon: "ShieldCheck",
    core: false,
    sectionId: "audit_logs",
    defaultConfig: { retainDays: 90, logStaffActions: true },
  },
];

export function getLoyaltyFeatureDef(key: string): LoyaltyFeatureDefinition | undefined {
  return LOYALTY_FEATURE_CATALOG.find((f) => f.key === key);
}

export function isCoreLoyaltyFeature(key: string): boolean {
  return (CORE_LOYALTY_FEATURES as readonly string[]).includes(key);
}

/**
 * Ordered modules for the main Loyalty page:
 * Program Settings → Leaderboard → every other enabled feature (catalog order).
 */
export function getOrderedLoyaltyPageFeatures(
  enabledKeys: Iterable<string>,
): LoyaltyFeatureDefinition[] {
  const enabled = new Set(enabledKeys);
  const core = LOYALTY_FEATURE_CATALOG.filter((f) => f.core);
  const optional = LOYALTY_FEATURE_CATALOG.filter(
    (f) => !f.core && (enabled.has(f.key) || isCoreLoyaltyFeature(f.key)),
  );
  return [...core, ...optional];
}

/** Map API route fragments / logical operations to required feature keys */
export const LOYALTY_API_FEATURE_MAP: Record<string, LoyaltyFeatureKey> = {
  config: "program_settings",
  leaderboard: "leaderboard",
  challenges: "customer_challenges",
  badges: "badges_achievements",
  tiers: "loyalty_tiers",
  analytics: "loyalty_analytics",
  streaks: "streak_system",
  "surprise-rewards": "surprise_rewards",
  automations: "automation_rules",
  activity: "activity_feed",
  adjust: "manual_point_adjustment",
  ledger: "points_ledger_explorer",
  referrals: "referral_campaigns",
  card: "wallet_pass",
  churn: "loyalty_analytics",
  segments: "loyalty_analytics",
  campaigns: "seasonal_campaigns",
  recommendations: "reward_automation",
  copilot: "gamification",
};
