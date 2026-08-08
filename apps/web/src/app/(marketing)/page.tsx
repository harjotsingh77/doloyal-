"use client";

import { HeroContent } from "@/marketing/landing/Hero";
import { WhyChooseUs } from "@/marketing/landing/WhyChooseUs";
import { ProblemSection } from "@/marketing/landing/ProblemSection";
import { FeaturesSection } from "@/marketing/landing/FeaturesSection";
import { Pricing } from "@/marketing/landing/Pricing";
import { Faq } from "@/marketing/landing/Faq";
import { FinalCta } from "@/marketing/landing/FinalCta";

export default function HomePage() {
  return (
    <div className="overflow-hidden bg-[#FAFAFC] font-[family-name:var(--font-sora)]">
      {/* 1 · HERO */}
      <HeroContent />

      {/* 2 · WHY CHOOSE US */}
      <WhyChooseUs />

      {/* 3 · THE PROBLEM */}
      <ProblemSection />

      {/* 4 · FEATURES */}
      <FeaturesSection />

      {/* 5 · PRICING */}
      <Pricing />

      {/* 6 · FAQ */}
      <Faq />

      {/* 7 · FINAL CTA */}
      <FinalCta />
    </div>
  );
}