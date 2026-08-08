"use client";

import { LoyaltyFeaturesProvider } from "@/lib/loyalty-features-context";

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <LoyaltyFeaturesProvider>{children}</LoyaltyFeaturesProvider>;
}
