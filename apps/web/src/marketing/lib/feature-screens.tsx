import type { ReactNode } from "react";
import {
  DashboardScreen,
  LoyaltyScreen,
  BookingScreen,
  BuilderScreen,
  AnalyticsScreen,
  CustomersScreen,
} from "../components/screens";

export type FeatureScreenKey =
  | "ai-retention"
  | "loyalty"
  | "rewards"
  | "booking"
  | "website-builder"
  | "marketing-automation";

export const featureScreens: Record<FeatureScreenKey, () => ReactNode> = {
  "ai-retention": () => <DashboardScreen />,
  loyalty: () => <LoyaltyScreen />,
  rewards: () => <LoyaltyScreen />,
  booking: () => <BookingScreen />,
  "website-builder": () => <BuilderScreen />,
  "marketing-automation": () => <AnalyticsScreen />,
};

export const mainScreens: { id: string; label: string; screen: () => ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", screen: () => <DashboardScreen /> },
  { id: "customers", label: "Customers", screen: () => <CustomersScreen /> },
  { id: "booking", label: "Booking", screen: () => <BookingScreen /> },
  { id: "loyalty", label: "Loyalty", screen: () => <LoyaltyScreen /> },
  { id: "builder", label: "Website Builder", screen: () => <BuilderScreen /> },
  { id: "analytics", label: "Analytics", screen: () => <AnalyticsScreen /> },
];

export const checkItems = [
  "Live in minutes, not months",
  "No code, no technical team required",
  "Works on every device your customers use",
  "Secure, reliable, and always on",
];