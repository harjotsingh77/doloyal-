"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X, Check, Unplug, ShieldCheck } from "lucide-react";
import { Container, Section, SectionHead, Stagger, StaggerItem, PrimaryBtn } from "./ui";

const MESS = [
  "Siloed customer data",
  "Five invoices every month",
  "Manual follow-ups & reminders",
  "Disconnected branches",
  "No idea who's about to churn",
  "Hours lost switching tools",
];

const GOOD = [
  "One source of truth for customers",
  "One predictable bill",
  "AI runs follow-ups & campaigns",
  "Every branch on the same page",
  "AI predicts churn before it happens",
  "Automation does the busywork",
];

export function Problem() {
  return (
    <Section>
      <Container>
        <SectionHead
          eyebrow="The problem"
          title={
            <>
              Running your business shouldn&apos;t require{" "}
              <span className="gradient-text">20 different tools</span>
            </>
          }
          lead="Messy stacks don't just cost money — they leak customers. Doloyal unifies everything into a single, intelligent operating system."
        />

        <Stagger className="grid gap-6 lg:grid-cols-2">
          {/* Disconnected */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="card-glare h-full rounded-[1.8rem] border border-black/[0.06] bg-[#FBFAFB] p-8 lg:p-10"
            >
              <div className="mb-8 flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF2FB] text-[#6E86C8]">
                    <Unplug className="h-5 w-5" />
                  </span>
                  <span className="text-[16px] font-bold text-[#888]">The old way</span>
                </span>
                <span className="rounded-full bg-[#EEF2FB] px-3 py-1 text-[11px] font-bold text-[#6E86C8]">
                  Disconnected apps
                </span>
              </div>
              <div className="mb-7 flex flex-wrap gap-2">
                {["CRM", "Excel", "SMS", "Email", "Booking", "Loyalty", "Payroll"].map((t) => (
                  <span key={t} className="rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[12px] font-medium text-[#666]">
                    {t}
                  </span>
                ))}
              </div>
              <ul className="space-y-3.5">
                {MESS.map((m) => (
                  <li key={m} className="flex items-start gap-3 text-[15px] text-[#666]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F3E2E2]">
                      <X className="h-3 w-3 text-[#C4536B]" />
                    </span>
                    <span className="line-through decoration-[#C4536B]/40">{m}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 rounded-xl bg-[#EEF2FB] px-4 py-3 text-[13px] font-medium text-[#6E86C8]">
                ~14 hours a week lost to admin
              </p>
            </motion.div>
          </StaggerItem>

          {/* Doloyal */}
          <StaggerItem>
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="card-glare relative h-full overflow-hidden rounded-[1.8rem] border border-[#1761FD]/20 bg-white p-8 shadow-[0_30px_80px_-40px_rgba(23,97,253,0.6)] lg:p-10"
            >
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#3B82F6]/15 blur-3xl" />
              <div className="mb-8 flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <span className="gradient-bg flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-[0_10px_24px_-8px_rgba(23,97,253,0.7)]">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <span className="text-[16px] font-bold text-[#111]">Doloyal</span>
                </span>
                <span className="gradient-bg rounded-full px-3 py-1 text-[11px] font-bold text-white">
                  1 platform
                </span>
              </div>
              <div className="mb-7 flex flex-wrap gap-2">
                <span className="gradient-bg rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white">Everything</span>
                <span className="rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[12px] font-medium text-[#666]">+ AI</span>
                <span className="rounded-lg border border-black/[0.06] bg-white px-3 py-1.5 text-[12px] font-medium text-[#666]">+ Automations</span>
              </div>
              <ul className="space-y-3.5">
                {GOOD.map((m) => (
                  <li key={m} className="flex items-start gap-3 text-[15px] text-[#111]">
                    <span className="gradient-bg mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
              <PrimaryBtn href="/sign-up" className="mt-8 w-full sm:w-auto" withArrow={false}>
                Switch to smarter
              </PrimaryBtn>
            </motion.div>
          </StaggerItem>
        </Stagger>
      </Container>
    </Section>
  );
}