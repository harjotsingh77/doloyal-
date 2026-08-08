"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X, Check, ArrowRight } from "lucide-react";

const WITHOUT = [
  { label: "Multiple tools", detail: "Loyalty app + booking + marketing + spreadsheets" },
  { label: "Manual follow-ups", detail: "Staff calling, texting, hoping customers return" },
  { label: "No loyalty", detail: "No rewards, no tiers, no reason to come back" },
  { label: "Manual booking", detail: "Phone tag, missed calls, no-show surprises" },
  { label: "Disconnected data", detail: "Nobody knows who's loyal, who's leaving" },
];

const WITH = [
  { label: "One platform", detail: "Loyalty, bookings, website, and AI in one dashboard" },
  { label: "AI automation", detail: "Win-backs, birthday offers, reminders — on autopilot" },
  { label: "Smart rewards", detail: "Points, tiers, and perks customers actually use" },
  { label: "Online booking", detail: "24/7 booking with reminders that cut no-shows" },
  { label: "Unified dashboard", detail: "Every customer scored, every number in one place" },
];

export function Comparison() {
  return (
    <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-2">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-3xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-6 sm:p-8"
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">Without Doloyal</h3>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--color-border))] text-[rgb(var(--color-subtle))]">
            <X className="h-4 w-4" />
          </span>
        </div>
        <ul className="space-y-4">
          {WITHOUT.map((item) => (
            <li key={item.label} className="flex items-start gap-3.5">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-border))] text-[rgb(var(--color-subtle))]">
                <X className="h-3 w-3" />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-[rgb(var(--color-muted-foreground))]">{item.label}</div>
                <div className="text-[13.5px] text-[rgb(var(--color-subtle))]">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.12 }}
        className="relative overflow-hidden rounded-3xl bg-[#0F172A] p-6 text-white shadow-[0_1px_2px_rgba(15,23,42,0.4),0_32px_64px_-24px_rgba(15,23,42,0.6)] sm:p-8"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#7C3AED]/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-[#2563EB]/30 blur-3xl" />
        <div className="relative mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight">With Doloyal</h3>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0F172A]">
            <Check className="h-4 w-4" />
          </span>
        </div>
        <ul className="relative space-y-4">
          {WITH.map((item) => (
            <li key={item.label} className="flex items-start gap-3.5">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A78BFA]/25 text-[#A78BFA]">
                <Check className="h-3 w-3" />
              </span>
              <div>
                <div className="text-[15px] font-semibold text-white">{item.label}</div>
                <div className="text-[13.5px] text-white/55">{item.detail}</div>
              </div>
            </li>
          ))}
        </ul>
        <div className="relative mt-7 rounded-2xl bg-white/8 p-4 backdrop-blur">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[13px] text-white/60">Average result after switching</div>
              <div className="text-xl font-bold">+38% retention · 6 hrs saved / wk</div>
            </div>
            <a href="/sign-up" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-white">
              Try it free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}