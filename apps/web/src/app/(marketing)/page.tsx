"use client";

import { HeroContent } from "@/marketing/landing/Hero";
import { IntegrationStrip } from "@/marketing/landing/IntegrationStrip";
import { ProblemSection } from "@/marketing/landing/ProblemSection";
import { MultiplierSection } from "@/marketing/landing/MultiplierSection";
import { Pricing } from "@/marketing/landing/Pricing";
import { Faq } from "@/marketing/landing/Faq";
import { FinalCta } from "@/marketing/landing/FinalCta";

export default function HomePage() {
  return (
    <div className="overflow-x-clip bg-white font-[family-name:var(--font-sora)]">
      {/* 1 · HERO */}
      <HeroContent />

      {/* 2 · INTEGRATIONS TRUST STRIP */}
      <IntegrationStrip />

      {/* 3 · THE PROBLEM */}
      <ProblemSection />

      {/* 4 · RETENTION MULTIPLIER */}
      <MultiplierSection />

      {/* 5 · PRICING */}
      <Pricing />

      {/* 6 · FAQ */}
      <Faq />

      {/* 7 · FINAL CTA */}
      <FinalCta />
    </div>
  );
}