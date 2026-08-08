"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageHero } from "./page-hero";
import { SectionHeading, Reveal, Stagger, StaggerItem, ButtonPrimary, ButtonGhost } from "./ui";
import { FinalCta } from "./cta";
import { FaqList } from "./faq";
import { checkItems, featureScreens, type FeatureScreenKey } from "../lib/feature-screens";
import { FEATURES, getFeature } from "../data/features";
import { cn } from "@/lib/utils";

export function FeatureHero({ feature }: { feature: ReturnType<typeof getFeature> & object }) {
  const Screen = featureScreens[feature.slug as FeatureScreenKey] ?? featureScreens["ai-retention"];
  return (
    <div>
      <PageHero
        eyebrow={feature.name}
        title={
          <>
            <span className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-clip-text text-transparent">
              {feature.headline.split(" ").slice(0, 2).join(" ")}
            </span>{" "}
            {feature.headline.split(" ").slice(2).join(" ")}
          </>
        }
        lead={feature.intro}
      >
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <ButtonPrimary href="/sign-up">Start Free Trial</ButtonPrimary>
          <ButtonGhost href="/book-demo">Book a Demo</ButtonGhost>
        </div>
      </PageHero>

      <Reveal className="relative mx-auto mt-10 max-w-[1200px] px-5 sm:px-8" delay={0.15}>
        <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-r from-[#2563EB]/8 via-[#7C3AED]/8 to-[#D946EF]/8 blur-2xl" />
        <div className="relative">
          <Screen />
        </div>
      </Reveal>
    </div>
  );
}

export function FeatureBullets({ feature }: { feature: ReturnType<typeof getFeature> & object }) {
  return (
    <section className="py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20">
        <Reveal>
          <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_12px_32px_-8px_rgba(124,58,237,0.5)]", feature.gradient)}>
            <feature.icon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            Everything {feature.name.toLowerCase()} should be
          </h2>
          <p className="mt-4 text-lg text-[rgb(var(--color-muted-foreground))]">
            {feature.tagline}
          </p>
          <ul className="mt-8 space-y-4">
            {checkItems.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[15px] text-[rgb(var(--color-muted-foreground))]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-[rgb(var(--color-foreground))] font-medium">{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-9">
            <ButtonPrimary href="/sign-up">Start Free Trial</ButtonPrimary>
          </div>
        </Reveal>
        <Stagger className="space-y-5">
          {feature.bullets.map((b) => (
            <StaggerItem key={b}>
              <div className="flex items-center gap-4 rounded-2xl border border-[rgb(var(--color-border))] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-white">
                  <ArrowRight className="h-4 w-4" />
                </span>
                <span className="text-[15px] font-semibold leading-snug">{b}</span>
              </div>
            </StaggerItem>
          ))}
          <StaggerItem>
            <div className="rounded-2xl bg-[#0F172A] p-6 text-white">
              <div className="text-4xl font-bold tracking-tight">{feature.stat.value}</div>
              <div className="mt-1 text-sm text-white/60">{feature.stat.label}</div>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </section>
  );
}

export function FeatureFaq({ feature }: { feature: ReturnType<typeof getFeature> & object }) {
  const faqs = [
    {
      q: `How quickly can I set up ${feature.name.toLowerCase()}?`,
      a: "Instantly — it ships in the box. Most businesses are live with their first program or workflow within five minutes of signing up.",
    },
    {
      q: "Do I need technical help?",
      a: "No. Everything is visual and guided. Import your customers, pick a template, and Doloyal walks you through the rest.",
    },
    {
      q: "What happens if I need to change it later?",
      a: "Every setting stays editable. Tiers, rewards, rules, and content can be adjusted any time — nothing locks you in.",
    },
  ];
  return (
    <section id="faq" className="py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading eyebrow="FAQ" title={<>Questions, answered</>} />
        <FaqList items={faqs} />
      </div>
    </section>
  );
}

export function FeaturePageTemplate({ slug }: { slug: string }) {
  const feature = FEATURES.find((f) => f.slug === slug);
  if (!feature) return null;
  return (
    <div className="overflow-hidden">
      <FeatureHero feature={feature} />
      <FeatureBullets feature={feature} />
      <SectionHeading
        eyebrow="More from Doloyal"
        title="One platform, every retention tool"
        lead="Explore the rest of the platform — every feature works together, out of the box."
      />
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-4 px-5 pb-20 sm:px-8 md:grid-cols-3">
        {FEATURES.filter((f) => f.slug !== slug).map((f) => (
          <a
            key={f.slug}
            href={`/${f.slug}`}
            className="group rounded-2xl border border-[rgb(var(--color-border))] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#0F172A]/20 hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.25)]"
          >
            <f.icon className="mb-4 h-5 w-5 text-[#2563EB]" />
            <div className="text-[15px] font-bold">{f.name}</div>
            <div className="mt-1 text-[13.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{f.tagline}</div>
          </a>
        ))}
      </div>
      <FeatureFaq feature={feature} />
      <FinalCta />
    </div>
  );
}

export { cn };