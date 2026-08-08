"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Store, Bot, Rocket, Check } from "lucide-react";
import { Container, Section, SectionHead, Reveal, PrimaryBtn } from "./ui";

const STEPS = [
  {
    n: "01",
    icon: Store,
    title: "Describe your business",
    desc: "Tell Doloyal what you do, where you operate, and how you price. Two minutes, no forms.",
    checks: ["Industry & services", "Branch setup", "Brand & pricing"],
  },
  {
    n: "02",
    icon: Bot,
    title: "AI builds your Business OS",
    desc: "The engine assembles your CRM, loyalty, booking, staff, and analytics — wired together automatically.",
    checks: ["Profiles created", "Workflows live", "Integrations connected"],
  },
  {
    n: "03",
    icon: Rocket,
    title: "Grow automatically",
    desc: "AI finds opportunities, runs campaigns, and wins customers back. You just review the wins.",
    checks: ["Autopilot campaigns", "Smart insights", "Weekly wins report"],
  },
];

export function HowItWorks() {
  return (
    <Section className="overflow-hidden">
      <Container>
        <SectionHead
          eyebrow="How it works"
          title={
            <>
              From zero to <span className="gradient-text">fully automated</span> in minutes
            </>
          }
          lead="No consultants. No onboarding calls. Tell Doloyal about your business and watch it build itself."
        />

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          <div className="pointer-events-none absolute left-[16.6%] right-[16.6%] top-[36px] hidden h-px bg-gradient-to-r from-[#1761FD]/50 via-[#3B82F6]/50 to-[#0E4BD8]/50 md:block" />

          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.14} className="relative">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.14 }}
                  className="relative mb-7"
                >
                  <span className="absolute inset-0 rounded-[1.6rem] bg-gradient-to-br from-[#1761FD] via-[#3B82F6] to-[#0E4BD8] shadow-[0_20px_44px_-14px_rgba(23,97,253,0.7)]" />
                  <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-[1.4rem] bg-white">
                    <s.icon className="h-7 w-7 text-[#1761FD]" />
                  </span>
                </motion.div>

                <span className="mb-2 text-[12px] font-bold tracking-[0.24em] text-[#8A9BC0]">{s.n}</span>
                <h3 className="text-[20px] font-bold tracking-[-0.01em] text-[#111]">{s.title}</h3>
                <p className="mt-2.5 max-w-[300px] text-[14.5px] leading-relaxed text-[#666]">{s.desc}</p>

                <ul className="mt-5 flex flex-col gap-1.5 text-left">
                  {s.checks.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-[13px] font-medium text-[#555]">
                      <span className="gradient-bg flex h-4 w-4 items-center justify-center rounded-full text-white">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.35} className="mt-16 flex justify-center">
          <PrimaryBtn href="/sign-up">Start building your OS</PrimaryBtn>
        </Reveal>
      </Container>
    </Section>
  );
}