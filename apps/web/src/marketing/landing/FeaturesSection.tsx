"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Gift,
  Wallet,
  Calendar,
  CheckCircle2,
  User,
  Send,
  Check,
  Globe,
  ChevronDown,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, Reveal, Stagger, StaggerItem, EASE } from "./ui";

const gridStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(37, 99, 235, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.05) 1px, transparent 1px)",
  backgroundSize: "64px 64px",
};

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex-1 overflow-hidden rounded-2xl border border-[#E5E7EB]/80 bg-[linear-gradient(180deg,#F6F9FF_0%,#FBFDFF_100%)]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0" style={gridStyle} />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Feature 1 — AI Customer Retention                   */
/* -------------------------------------------------------------------------- */

function RetentionChart() {
  const w = 260;
  const h = 64;
  const pts = [46, 38, 42, 30, 33, 22, 16, 10];
  const max = 48;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (p / max) * (h - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none" fill="none">
      <defs>
        <linearGradient id="ret-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#ret-area)" />
      <motion.path
        d={path}
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
      />
      <circle cx={w} cy={h - (pts[pts.length - 1] / max) * (h - 8) - 4} r="3" fill="#2563EB" />
    </svg>
  );
}

function RetentionVisual() {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="relative mx-auto w-full max-w-[400px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_44px_-24px_rgba(37,99,235,0.4)] sm:p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-[#64748B]">
            <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
            Customer Health
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Healthy
          </span>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-[#111827]">84%</span>
          <span className="text-[10px] font-medium text-[#64748B]">+18% this month</span>
        </div>
        <div className="mt-3">
          <RetentionChart />
        </div>
      </div>

      {/* floating badges */}
      <div className="mk-float absolute right-4 top-4 z-20 flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3 py-1.5 text-[10.5px] font-bold text-white shadow-[0_12px_28px_-8px_rgba(37,99,235,0.7)]">
        <TrendingUp className="h-3 w-3" /> +18% Repeat Visits
      </div>
      <div className="mk-float-2 absolute left-4 top-5 z-20 flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3 py-1.5 text-[10px] font-bold text-[#111827] shadow-[0_12px_28px_-12px_rgba(37,99,235,0.4)]">
        <Sparkles className="h-3 w-3 text-[#2563EB]" /> 2 win-backs ready
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Feature 2 — Loyalty & Rewards                       */
/* -------------------------------------------------------------------------- */

function LoyaltyVisual() {
  return (
    <Panel className="p-4">
      <div className="mx-auto w-full max-w-[250px] rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-bold tracking-[0.14em] text-[#64748B]">LOYALTY BALANCE</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
            <Wallet className="h-3 w-3" />
          </span>
        </div>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-[26px] font-extrabold tracking-tight text-[#111827]">2,450</span>
          <span className="text-[10px] font-medium text-[#64748B]">pts</span>
        </div>
        <div className="mt-2.5">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFF6FF]">
            <motion.div
              className="gradient-bg h-full rounded-full"
              initial={{ width: "4%" }}
              whileInView={{ width: "64%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.3 }}
            />
          </div>
          <div className="mt-1.5 text-[9.5px] font-medium text-[#64748B]">1,000 pts → Reward</div>
        </div>
      </div>

      <div className="mk-float absolute -bottom-3 right-4 z-20 flex items-center gap-2 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-2 shadow-[0_12px_28px_-14px_rgba(37,99,235,0.5)]">
        <Gift className="h-3.5 w-3.5 text-[#2563EB]" />
        <span className="text-[12px] font-extrabold text-[#2563EB]">₹200 OFF</span>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Feature 3 — Online Booking                          */
/* -------------------------------------------------------------------------- */

const SLOTS = [
  { time: "10:00 AM", label: "Haircut", active: false },
  { time: "11:30 AM", label: "Hair Spa", active: false },
  { time: "2:00 PM", label: "Color", active: true },
];

function BookingVisual() {
  return (
    <Panel className="p-4">
      <div className="mx-auto w-full max-w-[250px] rounded-xl border border-[#E5E7EB] bg-white shadow-[0_18px_40px_-24px_rgba(37,99,235,0.35)]">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] px-3.5 py-2.5">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#111827]">
            <Calendar className="h-3 w-3 text-[#2563EB]" /> Today&apos;s schedule
          </span>
          <span className="flex items-center gap-0.5 text-[8.5px] font-semibold text-[#64748B]">
            Tue, Aug 12 <ChevronDown className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="space-y-1.5 p-3.5">
          {SLOTS.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.15 + 0.1 * SLOTS.indexOf(s) }}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5",
                s.active ? "border-[#BFDBFE] bg-[#EFF6FF]" : "border-[#F1F5F9] bg-white",
              )}
            >
              <span className={cn("text-[9.5px] font-bold", s.active ? "text-[#2563EB]" : "text-[#111827]")}>{s.time}</span>
              <span className="flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#E2E8F0]">
                  <User className="h-2.5 w-2.5 text-[#64748B]" />
                </span>
                <span className={cn("text-[10px] font-semibold", s.active ? "text-[#2563EB]" : "text-[#475569]")}>{s.label}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="mk-float absolute -bottom-3 left-4 z-20 flex items-center gap-1.5 rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-[10px] font-bold text-emerald-600 shadow-[0_12px_28px_-14px_rgba(16,185,129,0.5)]">
        <CheckCircle2 className="h-3 w-3" /> Booking Confirmed ✓
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                      Feature 4 — Marketing Automation                      */
/* -------------------------------------------------------------------------- */

const AUTOMATION = [
  { label: "Customer inactive", Icon: User, tone: "#64748B" },
  { label: "AI detects churn", Icon: Sparkles, tone: "#2563EB" },
  { label: "Offer sent", Icon: Send, tone: "#3B82F6" },
  { label: "Customer returns", Icon: Zap, tone: "#22C55E" },
];

function AutomationVisual() {
  return (
    <Panel className="p-4">
      <span className="absolute right-3 top-3 z-20 flex items-center gap-1 rounded-full bg-[#2563EB] px-2 py-0.5 text-[8.5px] font-bold tracking-wide text-white shadow-[0_8px_20px_-8px_rgba(37,99,235,0.6)]">
        <Zap className="h-2.5 w-2.5" /> AUTOMATED
      </span>

      <div className="mx-auto mt-5 flex max-w-[220px] flex-col">
        {AUTOMATION.map((s, i) => (
          <div key={s.label}>
            <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 shadow-[0_6px_16px_-10px_rgba(17,17,17,0.25)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg text-white" style={{ background: s.tone }}>
                <s.Icon className="h-2.5 w-2.5" />
              </span>
              <span className="text-[11px] font-bold text-[#111827]">{s.label}</span>
              {i === AUTOMATION.length - 1 && <Check className="ml-auto h-3 w-3 text-emerald-500" />}
            </div>
            {i < AUTOMATION.length - 1 && (
              <div className="flex justify-center py-[7px]">
                <span className="h-2.5 w-px bg-gradient-to-b from-[#2563EB]/50 to-[#2563EB]/20" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                        Feature 5 — Real-Time Analytics                     */
/* -------------------------------------------------------------------------- */

function AnalyticsChart() {
  const w = 220;
  const h = 48;
  const pts = [34, 28, 32, 24, 26, 18, 14];
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (p / 36) * (h - 6) - 3;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-12 w-full" preserveAspectRatio="none" fill="none">
      <motion.path
        d={path}
        stroke="#2563EB"
        strokeWidth="1.8"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.3, ease: EASE, delay: 0.3 }}
      />
    </svg>
  );
}

const STATS = [
  { label: "Revenue", value: "₹28,500", up: true },
  { label: "Repeat Rate", value: "67%", up: true },
  { label: "New Customers", value: "12", up: true },
];

function AnalyticsVisual() {
  return (
    <Panel className="p-4">
      <div className="mx-auto grid w-full max-w-[250px] grid-cols-3 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-xl border border-[#E5E7EB] bg-white px-2 py-2 shadow-[0_10px_24px_-16px_rgba(37,99,235,0.35)]">
            <div className="text-[16px] font-extrabold leading-none tracking-tight text-[#111827]">{s.value}</div>
            <div className="mt-1 flex items-center gap-1">
              {s.up && <TrendingUp className="h-2.5 w-2.5 text-emerald-500" />}
              <span className="text-[7.5px] font-semibold uppercase tracking-wide text-[#64748B]">{s.label}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-3 w-full max-w-[250px] rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 shadow-[0_10px_24px_-16px_rgba(37,99,235,0.3)]">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[8.5px] font-bold tracking-wide text-[#64748B]">GROWTH</span>
          <span className="text-[8px] font-bold text-emerald-500">+22.4%</span>
        </div>
        <AnalyticsChart />
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Feature 6 — AI Website Builder                       */
/* -------------------------------------------------------------------------- */

const SECTIONS = ["Logo", "Hero", "Services", "Booking", "Rewards"];

function BuilderVisual() {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="flex h-full gap-4">
        {/* site canvas */}
        <div className="relative flex-1 rounded-xl border border-[#E5E7EB] bg-white p-3.5 shadow-[0_18px_44px_-24px_rgba(37,99,235,0.35)]">
          <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-[#111827]">
              <Globe className="h-3 w-3 text-[#2563EB]" /> Business Website
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#CBD5E1]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="h-3 w-2/5 rounded-full bg-[#111827]" />
            <div className="flex items-center gap-1.5">
              <div className="h-4 w-10 rounded-md bg-[#E2E8F0]" />
              <div className="h-4 w-10 rounded-md bg-[#E2E8F0]" />
              <div className="h-4 w-10 rounded-md bg-[#E2E8F0]" />
              <div className="gradient-bg ml-auto h-4 w-12 rounded-full" />
            </div>
            <div className="mt-2 space-y-1.5 rounded-lg border border-[#EFF6FF] bg-[#F6F9FF] p-2.5">
              <div className="h-2.5 w-3/4 rounded-full bg-[#E2E8F0]" />
              <div className="h-2.5 w-1/2 rounded-full bg-[#E2E8F0]" />
              <div className="gradient-bg mt-1.5 h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#EFF6FF] bg-[#F6F9FF] p-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[#2563EB]" />
                <div className="h-2 w-16 rounded-full bg-[#E2E8F0]" />
              </div>
              <div className="h-2 w-10 rounded-full bg-[#E2E8F0]" />
            </div>
          </div>
        </div>

        {/* editor controls */}
        <div className="hidden w-36 shrink-0 flex-col gap-2 sm:flex">
          <div className="flex items-center justify-between rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-1.5">
            <span className="text-[9px] font-bold text-[#111827]">Sections</span>
            <ChevronDown className="h-3 w-3 text-[#94A3B8]" />
          </div>
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, x: 8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: EASE, delay: 0.2 + i * 0.07 }}
              className={cn(
                "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold",
                i === 3 ? "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]" : "border-[#E5E7EB] bg-white text-[#475569]",
              )}
            >
              {s}
              <span className={cn("h-2 w-2 rounded-full", i === 3 ? "bg-[#2563EB]" : "bg-[#CBD5E1]")} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* publish button */}
      <div className="mk-float-2 absolute -bottom-4 right-6 z-20 flex items-center gap-1.5 rounded-full bg-[#2563EB] px-3.5 py-2 text-[10.5px] font-bold text-white shadow-[0_16px_32px_-10px_rgba(37,99,235,0.7)]">
        <Globe className="h-3 w-3" /> Publish · yourbusiness.doloyal.com
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   section                                   */
/* -------------------------------------------------------------------------- */

const FEATURES = [
  { title: "AI Customer Retention", desc: "Know who is likely to leave and bring them back at the right time.", visual: <RetentionVisual />, span: "md:col-span-2 lg:col-span-2" },
  { title: "Loyalty & Rewards", desc: "Turn every visit into points, rewards, and reasons to return.", visual: <LoyaltyVisual />, span: "" },
  { title: "Online Booking", desc: "Let customers book appointments anytime, from anywhere.", visual: <BookingVisual />, span: "" },
  { title: "Marketing Automation", desc: "Automatically follow up with customers and bring them back.", visual: <AutomationVisual />, span: "" },
  { title: "Real-Time Analytics", desc: "See revenue, retention, customers, and growth at a glance.", visual: <AnalyticsVisual />, span: "" },
  { title: "AI Website Builder", desc: "Create a beautiful business website with booking and customer tools built in.", visual: <BuilderVisual />, span: "md:col-span-2 lg:col-span-2" },
];

function FeatureCard({ f }: { f: (typeof FEATURES)[number] }) {
  return (
    <div className="group flex h-full flex-col rounded-[1.9rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-[0_30px_70px_-30px_rgba(37,99,235,0.35)] sm:p-6">
      <div className="relative min-h-[220px] flex-1">
        {f.visual}
      </div>
      <h3 className="mt-6 text-[22px] font-bold tracking-tight text-[#111827]">{f.title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[#64748B]">{f.desc}</p>
    </div>
  );
}

export function FeaturesSection() {
  return (
    <section className="relative overflow-hidden bg-white py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0" style={gridStyle} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 75% at 50% 40%, rgba(255,255,255,0.98) 40%, rgba(255,255,255,0.65) 74%, rgba(255,255,255,0) 100%)",
        }}
      />

      <Container className="relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>EVERYTHING IN ONE PLACE</Eyebrow>
          <h2 className="mt-6 text-balance text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-[#111827] sm:text-[3.4rem]">
            Everything you need to keep{" "}
            <span className="gradient-text">customers coming back.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-[#64748B] sm:text-[18px]">
            One platform for retention, loyalty, bookings, marketing, and growth.
          </p>
        </Reveal>

        <Stagger className="mt-12 grid grid-cols-1 gap-5 sm:mt-16 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className={cn("h-full", f.span)}>
              <FeatureCard f={f} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
