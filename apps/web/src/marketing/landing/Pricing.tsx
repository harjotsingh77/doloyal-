"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Container, Section, SectionHead, Reveal, EASE, TextRoll } from "./ui";
import { cn } from "@/lib/utils";
import { useWaitlistModal } from "../components/waitlist-modal";

const MONTHLY = {
  free: 0,
  starter: 1499,
  growth: 3499,
};
const YEARLY = {
  free: 0,
  starter: 1249,
  growth: 2916,
};

const PLANS = [
  {
    name: "Free Trial",
    badge: "FREE / TRIAL",
    tagline: "Try all features with full access to test Doloyal for your business.",
    monthly: MONTHLY.free,
    yearly: YEARLY.free,
    isFree: true,
    features: [
      "Full platform access (1 Month Free)",
      "Up to 100 customer profiles",
      "Digital loyalty points & 3 rewards",
      "Online booking widget",
      "Basic customer analytics",
      "Doloyal AI Assistant (50 queries)",
    ],
    cta: "Start 1 Month Free →",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Starter",
    badge: "STARTER",
    tagline: "For single-location businesses getting started with customer retention.",
    monthly: MONTHLY.starter,
    yearly: YEARLY.starter,
    isFree: false,
    features: [
      "Up to 500 customers",
      "Loyalty Program + up to 10 rewards",
      "2 Membership Plans",
      "Manual Campaigns",
      "Online Booking & Booking Links",
      "Customer Management & Profiles",
      "Basic Analytics & Reports",
      "Doloyal AI Assistant",
      "Chat Support",
      "2 Business Location",
      "Basic Website/Booking Page",
    ],
    cta: "Choose Starter →",
    href: "/sign-up",
    highlight: false,
  },
  {
    name: "Growth",
    badge: "GROWTH",
    tagline: "For growing businesses that need automation and deeper customer retention.",
    monthly: MONTHLY.growth,
    yearly: YEARLY.growth,
    isFree: false,
    features: [
      "Everything in Starter",
      "Up to 5,000 customers",
      "Unlimited Loyalty Rewards",
      "Up to 3 Membership Plans",
      "Automated Campaigns — Birthday, Win-back & Follow-ups",
      "AI Customer Retention Insights",
      "AI Retention Engine",
      "Doloyal AI Assistant",
      "Email Campaigns",
      "Advanced Analytics & Retention Reports",
      "Automated Booking Follow-ups",
      "Multi-Branch Support",
      "Priority Support",
    ],
    cta: "Choose Growth →",
    href: "/sign-up",
    highlight: true,
  },
];

export function Pricing() {
  const { openWaitlistModal } = useWaitlistModal();
  const [yearly, setYearly] = React.useState(true);

  return (
    <Section id="pricing">
      <Container>
        <SectionHead
          eyebrow="Pricing"
          title={
            <>
              Simple pricing that pays for <span className="gradient-text">itself</span>
            </>
          }
          lead="Start free. Upgrade when the retention pays for it. No hidden fees, cancel anytime."
        />

        {/* Billing Toggle */}
        <Reveal className="mb-12 flex justify-center">
          <div className="relative flex items-center gap-1 rounded-full border border-black/[0.06] bg-white p-1.5 shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
            {["Monthly", "Yearly"].map((label, i) => {
              const isYearly = i === 1;
              const active = yearly === isYearly;
              return (
                <button
                  key={label}
                  onClick={() => setYearly(isYearly)}
                  className={cn(
                    "relative rounded-full px-5 py-2.5 text-[13.5px] font-semibold transition-colors duration-300",
                    active ? "text-white" : "text-[#666]",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-pill"
                      className="gradient-bg absolute inset-0 rounded-full shadow-[0_8px_20px_-6px_rgba(23,97,253,0.6)]"
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {label}
                    {isYearly && (
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[9.5px] font-bold", active ? "bg-white/20 text-white" : "bg-[#1761FD]/10 text-[#1761FD]")}>
                        -20%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
          {PLANS.map((plan, i) => {
            const price = yearly ? plan.yearly : plan.monthly;
            return (
              <Reveal key={plan.name} delay={i * 0.12} className="h-full">
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "relative flex h-full flex-col rounded-[1.8rem] p-8",
                    plan.highlight
                      ? "border border-transparent bg-gradient-to-br from-[#1761FD] via-[#1551F0] to-[#0E4BD8] text-white shadow-[0_40px_90px_-40px_rgba(14,75,216,0.9)]"
                      : "border border-black/[0.06] bg-white",
                  )}
                >
                  {plan.highlight && (
                    <>
                      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                      <span className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold backdrop-blur">
                        <Zap className="h-3 w-3" /> Most popular
                      </span>
                    </>
                  )}

                  <h3 className={cn("text-[20px] font-bold", plan.highlight ? "text-white" : "text-[#111]")}>
                    {plan.name}
                  </h3>
                  <p className={cn("mt-1.5 text-[13.5px] leading-relaxed", plan.highlight ? "text-white/80" : "text-[#666]")}>
                    {plan.tagline}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <motion.span
                      key={`${plan.name}-${yearly}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                      className={cn("text-[42px] font-extrabold tracking-[-0.03em]", plan.highlight ? "text-white" : "text-[#111]")}
                    >
                      {plan.isFree ? "₹0" : `₹${price.toLocaleString("en-IN")}`}
                    </motion.span>
                    {!plan.isFree && (
                      <span className={cn("text-[14px]", plan.highlight ? "text-white/70" : "text-[#666]")}>
                        /month
                      </span>
                    )}
                  </div>
                  <p className={cn("mt-0.5 text-[12px] font-medium", plan.highlight ? "text-white/60" : "text-[#999]")}>
                    {plan.isFree ? "1 Month Free Trial" : yearly ? "billed yearly" : "billed monthly"}
                  </p>

                  <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                            plan.highlight ? "bg-white/20 text-white" : "bg-[#1761FD]/10 text-[#1761FD]",
                          )}
                        >
                          <Check className="h-3 w-3 stroke-[2.5]" />
                        </span>
                        <span className={cn("text-[13.5px] font-medium leading-relaxed", plan.highlight ? "text-white/90" : "text-[#444]")}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={openWaitlistModal}
                    className={cn(
                      "group mt-8 flex h-12 w-full items-center justify-center rounded-full text-[14.5px] font-semibold transition-all duration-300 hover:-translate-y-0.5 shadow-md",
                      plan.highlight
                        ? "bg-white text-[#0E4BD8] hover:bg-slate-50 shadow-[0_16px_32px_-12px_rgba(0,0,0,0.4)]"
                        : "gradient-bg text-white shadow-[0_12px_28px_-10px_rgba(23,97,253,0.6)]",
                    )}
                  >
                    <TextRoll>{plan.cta}</TextRoll>
                  </button>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}