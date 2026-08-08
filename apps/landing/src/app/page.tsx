"use client";

import { Faq } from "../../../web/src/marketing/landing/Faq";
import { FeaturesSection } from "../../../web/src/marketing/landing/FeaturesSection";
import { FinalCta } from "../../../web/src/marketing/landing/FinalCta";
import { HeroContent } from "../../../web/src/marketing/landing/Hero";
import { Pricing } from "../../../web/src/marketing/landing/Pricing";
import { ProblemSection } from "../../../web/src/marketing/landing/ProblemSection";
import { WhyChooseUs } from "../../../web/src/marketing/landing/WhyChooseUs";

export default function LandingPage() {
  return (
    <div className="overflow-hidden bg-[#FAFAFC] font-[family-name:var(--font-sora)]">
      <HeroContent />
      <WhyChooseUs />
      <ProblemSection />
      <FeaturesSection />
      <Pricing />
      <Faq />
      <FinalCta />
    </div>
  );
}
