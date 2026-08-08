"use client";

import * as React from "react";
import { PageHero } from "./page-hero";
import { SectionHeading, Reveal, ButtonPrimary, ButtonGhost, TextLink, CheckItem } from "./ui";
import { FinalCta } from "./cta";
import { FaqList } from "./faq";
import { INDUSTRIES, getIndustry, type Industry } from "../data/industries";
import { TestimonialGrid } from "./testimonials";
import { cn } from "@/lib/utils";

export function IndustryHero({ industry }: { industry: Industry }) {
  return (
    <PageHero
      eyebrow={<span className="flex items-center gap-2"><industry.icon className="h-3.5 w-3.5" /> {industry.name}</span>}
      title={industry.headline}
      lead={industry.intro}
    >
      <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
        <ButtonPrimary href="/sign-up">Start Free Trial</ButtonPrimary>
        <ButtonGhost href="/book-demo">See it live</ButtonGhost>
      </div>
      <div className="mt-8 flex items-center gap-3 rounded-full border border-[rgb(var(--color-border))] bg-white px-5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <span className="text-[13px] font-semibold text-[rgb(var(--color-subtle))]">Businesses using Doloyal see</span>
        <span className={cn("bg-gradient-to-r bg-clip-text text-xl font-bold tracking-tight text-transparent", industry.gradient)}>
          {industry.heroStat.value}
        </span>
        <span className="hidden text-[13px] font-medium text-[rgb(var(--color-subtle))] sm:inline">{industry.heroStat.label}</span>
      </div>
    </PageHero>
  );
}

export function IndustryFeatures({ industry }: { industry: Industry }) {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <SectionHeading
          eyebrow={`Built for ${industry.name.toLowerCase()}`}
          title="Everything you need, nothing you don't"
        />
        <div className="grid gap-5 md:grid-cols-3">
          {industry.features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.08}>
              <div className="group h-full rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0F172A]/15 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.2)]">
                <span
                  className={cn(
                    "mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white",
                    industry.gradient,
                  )}
                >
                  <industry.icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold tracking-[-0.01em]">{f.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                  {f.description}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IndustryWhy({ industry }: { industry: Industry }) {
  const checklist = [
    "No app download for your customers",
    "Works from WhatsApp, SMS, and your website",
    "Setup in 5 minutes with guided onboarding",
    "Import customers from any spreadsheet or tool",
  ];
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-20">
        <Reveal>
          <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
            The easiest way to keep {industry.name.toLowerCase()} customers coming back
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[rgb(var(--color-muted-foreground))]">
            {industry.tagline}
          </p>
          <ul className="mt-7 space-y-3.5">
            {checklist.map((c) => (
              <CheckItem key={c}>{c}</CheckItem>
            ))}
          </ul>
          <div className="mt-8">
            <TextLink href="/sign-up">Start your free trial</TextLink>
          </div>
        </Reveal>
        <div className="relative">
          <Reveal delay={0.1}>
            <div className="rounded-[2rem] border border-[rgb(var(--color-border))] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_32px_64px_-24px_rgba(15,23,42,0.2)] sm:p-8">
              <div className="mb-4 flex items-center gap-2">
                <img src="/logo-symbol.png" alt="Doloyal" className="h-6 w-6 object-contain" />
                <span className="text-[13px] font-bold">AI retention plan · 7 days</span>
              </div>
              {industry.features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--color-border))] p-4 [&:not(:last-child)]:mb-3"
                >
                  <span className={cn("mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white", industry.gradient)}>
                    {i + 1}
                  </span>
                  <div>
                    <div className="text-[14.5px] font-bold">{f.title}</div>
                    <div className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                      {f.description.split(".")[0]}.
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-5 rounded-2xl bg-[#0F172A] p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white/60">Launching this week</span>
                  <span className={cn("bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent", industry.gradient)}>
                    {industry.heroStat.value}
                  </span>
                </div>
                <div className="mt-1.5 text-[12.5px] text-white/50">{industry.heroStat.label}</div>
              </div>
            </div>
          </Reveal>
          <div
            className={cn(
              "pointer-events-none absolute -right-10 -top-10 -z-10 h-56 w-56 rounded-full bg-gradient-to-br opacity-20 blur-3xl",
              industry.gradient,
            )}
          />
        </div>
      </div>
    </section>
  );
}

export function IndustryFaq({ industry }: { industry: Industry }) {
  return (
    <section id="faq" className="py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <SectionHeading eyebrow="FAQ" title={`${industry.name}: quick answers`} />
        <FaqList items={industry.faqs} />
      </div>
    </section>
  );
}

export function IndustryPageTemplate({ slug }: { slug: string }) {
  const industry = getIndustry(slug);
  if (!industry) return null;
  return (
    <div className="overflow-hidden">
      <IndustryHero industry={industry} />
      <IndustryFeatures industry={industry} />
      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading eyebrow="Loved by" title={`${industry.name} owners like you`} />
          <TestimonialGrid items={industry.testimonials.map((t) => ({ quote: t.quote, name: t.name, role: t.role, initials: t.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(), gradient: industry.gradient }))} />
        </div>
      </section>
      <IndustryWhy industry={industry} />
      <IndustryFaq industry={industry} />
      <section className="py-4 pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-[13px] font-semibold text-[rgb(var(--color-subtle))]">Also built for:</span>
            {INDUSTRIES.filter((i) => i.slug !== industry.slug).map((i) => (
              <a
                key={i.slug}
                href={`/solutions/${i.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-white px-4 py-2 text-[13px] font-medium text-[rgb(var(--color-muted-foreground))] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0F172A]/20 hover:text-[rgb(var(--color-foreground))]"
              >
                <i.icon className="h-3.5 w-3.5" />
                {i.name}
              </a>
            ))}
          </div>
        </div>
      </section>
      <FinalCta
        title={<>Your {industry.name.toLowerCase()} business, <em className="font-[var(--font-instrument)] italic">full every day</em></>}
        lead={`Join ${industry.name.toLowerCase()} owners growing retention with Doloyal — free for 14 days, no credit card.`}
      />
    </div>
  );
}