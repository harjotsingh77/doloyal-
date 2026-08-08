"use client";

import type { ComponentType } from "react";
import type { LoyaltyFeatureKey } from "@doloyal/shared";
import type { LoyaltyModuleProps } from "@/components/loyalty/module-shell";
import { ProgramSettingsModule, LeaderboardModule } from "./core-modules";
import {
  TiersModule,
  ChallengesModule,
  BadgesModule,
  StreaksModule,
  AnalyticsModule,
  ActivityFeedModule,
  AutomationsModule,
  LedgerModule,
  AdjustModule,
  ReferralsModule,
  AuditLogsModule,
  SurpriseModule,
  SpinWheelModule,
  SeasonalCampaignsModule,
  HolidayBonusModule,
  DoublePointsModule,
  QrCodeModule,
  ApiAccessModule,
  NotificationsModule,
  ReportsModule,
  MilestonesModule,
  WalletPassModule,
  MultiBranchModule,
  ConfigOnlyModule,
} from "./feature-modules";

export const LOYALTY_MODULE_REGISTRY: Partial<
  Record<LoyaltyFeatureKey, ComponentType<LoyaltyModuleProps>>
> = {
  program_settings: ProgramSettingsModule,
  leaderboard: LeaderboardModule,
  loyalty_tiers: TiersModule,
  customer_challenges: ChallengesModule,
  badges_achievements: BadgesModule,
  surprise_rewards: SurpriseModule,
  streak_system: StreaksModule,
  spin_wheel: SpinWheelModule,
  seasonal_campaigns: SeasonalCampaignsModule,
  referral_campaigns: ReferralsModule,
  double_points_weekend: DoublePointsModule,
  holiday_bonus_engine: HolidayBonusModule,
  tier_progress_widget: ConfigOnlyModule,
  leaderboard_rewards: ConfigOnlyModule,
  customer_milestones: MilestonesModule,
  gamification: ConfigOnlyModule,
  reward_automation: AutomationsModule,
  automation_rules: AutomationsModule,
  activity_feed: ActivityFeedModule,
  manual_point_adjustment: AdjustModule,
  points_ledger_explorer: LedgerModule,
  multi_branch_loyalty: MultiBranchModule,
  smart_notifications: NotificationsModule,
  push_notifications: NotificationsModule,
  email_notifications: NotificationsModule,
  sms_notifications: NotificationsModule,
  whatsapp_notifications: NotificationsModule,
  loyalty_analytics: AnalyticsModule,
  advanced_reports: ReportsModule,
  membership_integration: ConfigOnlyModule,
  qr_code_loyalty: QrCodeModule,
  wallet_pass: WalletPassModule,
  api_access: ApiAccessModule,
  audit_logs: AuditLogsModule,
};

export function getLoyaltyModule(key: string): ComponentType<LoyaltyModuleProps> {
  return LOYALTY_MODULE_REGISTRY[key as LoyaltyFeatureKey] || ConfigOnlyModule;
}
