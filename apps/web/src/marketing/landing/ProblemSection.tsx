"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Store,
  Users,
  Calendar,
  Award,
  Megaphone,
  BarChart3,
  Clock,
  TrendingDown,
  ArrowDown,
  UserX,
  Gift,
  Sparkles,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Container, Eyebrow, Reveal, Stagger, StaggerItem, EASE } from "./ui";

const gridStyle: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(37, 99, 235, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.06) 1px, transparent 1px)",
  backgroundSize: "56px 56px",
};

const NODES: {
  name: string;
  icon: React.ReactNode;
  tint: string;
  left: string;
  top: string;
  chip?: { label: string; left: string; top: string; hideOnMobile?: boolean };
}[] = [
  {
    name: "Customers",
    icon: <Users className="h-3.5 w-3.5 text-white" />,
    tint: "#2563EB",
    left: "21%",
    top: "6%",
    chip: { label: "Customer data", left: "21%", top: "32%" },
  },
  {
    name: "Booking",
    icon: <Calendar className="h-3.5 w-3.5 text-white" />,
    tint: "#3B82F6",
    left: "79%",
    top: "6%",
    chip: { label: "Booking data", left: "79%", top: "32%" },
  },
  {
    name: "Marketing",
    icon: <Megaphone className="h-3.5 w-3.5 text-white" />,
    tint: "#0284C7",
    left: "50%",
    top: "4%",
    chip: { label: "Campaigns", left: "50%", top: "80%", hideOnMobile: true },
  },
  {
    name: "Loyalty",
    icon: <Award className="h-3.5 w-3.5 text-white" />,
    tint: "#1D4ED8",
    left: "18%",
    top: "82%",
    chip: { label: "Revenue", left: "82%", top: "72%", hideOnMobile: true },
  },
  {
    name: "Analytics",
    icon: <BarChart3 className="h-3.5 w-3.5 text-white" />,
    tint: "#2563EB",
    left: "82%",
    top: "82%",
  },
];

/* -------------------------------------------------------------------------- */
/*                        main disconnected-system diagram                    */
/* -------------------------------------------------------------------------- */

function DisconnectedDiagram() {
  return (
    <div className="group relative overflow-hidden rounded-[1.9rem] border border-[#E5E7EB] bg-[linear-gradient(180deg,#EEF4FF_0%,#F8FAFC_100%)] p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-28 left-1/2 h-60 w-[28rem] -translate-x-1/2 rounded-full bg-[#2563EB]/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0" style={gridStyle} />

      <div className="relative mx-auto h-[300px] max-w-[680px] sm:h-[340px]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden
        >
          {/* connected dashed lines */}
          <path d="M22 18 Q 30 30 39 42" stroke="rgba(37,99,235,0.45)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
          <path d="M78 20 Q 68 32 61 40" stroke="rgba(37,99,235,0.45)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
          <path d="M18 82 Q 26 68 39 54" stroke="rgba(37,99,235,0.45)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
          {/* broken lines that stop short of the centre */}
          <path d="M50 14 L 50 34" stroke="rgba(244,63,94,0.55)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
          <path d="M80 76 Q 74 62 63 56" stroke="rgba(244,63,94,0.55)" strokeWidth="1.4" strokeDasharray="3 4" strokeLinecap="round" />
          {/* break markers */}
          <g>
            <circle cx="50" cy="36.5" r="2.4" fill="#F43F5E" />
            <path d="M48.8 35.8 L51.2 37.2 M48.8 37.2 L51.2 35.8" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
          </g>
          <g>
            <circle cx="60.5" cy="58" r="2.4" fill="#F43F5E" />
            <path d="M59.2 57.3 L61.8 58.7 M59.2 58.7 L61.8 57.3" stroke="#fff" strokeWidth="0.9" strokeLinecap="round" />
          </g>
        </svg>

        {/* centre card — Your Business */}
        <div className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2">
          <div className="pointer-events-none absolute -inset-3 rounded-3xl bg-[#2563EB]/15 blur-xl" />
          <div className="relative flex items-center gap-2.5 rounded-2xl border border-[#E5E7EB] bg-white py-3 pl-3.5 pr-5 shadow-[0_18px_44px_-16px_rgba(37,99,235,0.45)]">
            <span className="pulse-ring relative flex h-9 w-9 items-center justify-center rounded-xl bg-[#2563EB] text-white shadow-[0_6px_16px_-4px_rgba(37,99,235,0.6)]">
              <Store className="h-[17px] w-[17px]" />
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-extrabold tracking-tight text-[#111827]">Your Business</span>
              <span className="block text-[10px] font-medium text-[#64748B]">but everything lives apart</span>
            </span>
          </div>
        </div>

        {/* scattered mini cards */}
        {NODES.map((n) => (
          <div
            key={n.name}
            className="absolute z-20 -translate-x-1/2 transition-transform duration-300 group-hover:-translate-y-0.5"
            style={{ left: n.left, top: n.top }}
          >
            <div className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1.5 shadow-[0_8px_20px_-10px_rgba(37,99,235,0.35)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg" style={{ background: n.tint }}>
                {n.icon}
              </span>
              <span className="text-[11px] font-semibold text-[#111827]">{n.name}</span>
            </div>
          </div>
        ))}

        {/* small data indicator chips */}
        {NODES.filter((n) => n.chip).map((n) => (
          <div
            key={`chip-${n.name}`}
            className={cn(
              "absolute z-10 -translate-x-1/2 items-center rounded-full border border-dashed border-[#2563EB]/25 bg-white/80 px-2.5 py-1 text-[9.5px] font-semibold tracking-wide text-[#64748B] backdrop-blur-sm",
              n.chip?.hideOnMobile ? "hidden sm:flex" : "flex",
            )}
            style={{ left: n.chip?.left, top: n.chip?.top }}
          >
            {n.name === "Marketing" && <Sparkles className="mr-1 h-2.5 w-2.5 text-[#2563EB]" />}
            {n.name === "Loyalty" && <TrendingDown className="mr-1 h-2.5 w-2.5 text-[#F43F5E]" />}
            {n.chip?.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                          card 1 — Lost Customers                           */
/* -------------------------------------------------------------------------- */

function LostCustomersVisual() {
  const avatars = [
    { init: "RA", c: "#FDA4AF" },
    { init: "KV", c: "#F87171" },
    { init: "MS", c: "#F43F5E" },
  ];
  return (
    <div className="relative flex h-full items-center gap-3 overflow-hidden px-5">
      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#2563EB]/15 bg-[#2563EB]/10 text-[#2563EB]">
          <Store className="h-5 w-5" />
        </span>
        <span className="text-[10px] font-semibold text-[#64748B]">Business</span>
      </div>

      <div className="absolute left-[54px] top-1/2 h-px w-[calc(100%-86px)] border-t border-dashed border-[#F43F5E]/40" />

      <div className="relative z-10 flex items-center gap-2">
        {avatars.map((a, i) => (
          <motion.span
            key={a.init}
            initial={{ x: 0, opacity: 1 }}
            whileInView={{ x: 8 + i * 9, opacity: 1 - i * 0.22 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.12 * i }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 text-[10px] font-bold text-white shadow-[0_8px_18px_-6px_rgba(244,63,94,0.5)]"
            style={{ background: a.c }}
          >
            {a.init}
          </motion.span>
        ))}
        <span className="-ml-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[#F43F5E]/50 text-[#F43F5E]">
          <UserX className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* downward retention line */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-11 w-full" viewBox="0 0 220 36" preserveAspectRatio="none" fill="none" aria-hidden>
        <path d="M4 6 Q 80 10 132 20 T 216 34" stroke="rgba(244,63,94,0.5)" strokeWidth="1.5" strokeDasharray="3 5" strokeLinecap="round" />
        <circle cx="216" cy="34" r="2.6" fill="#F43F5E" />
        <path d="M213 31.8 L215 34.5 M213 35.4 L215 33" stroke="#fff" strokeWidth="0.7" strokeLinecap="round" />
      </svg>
      <span className="absolute bottom-7 right-4 flex items-center gap-1 text-[9.5px] font-bold tracking-wide text-[#F43F5E]">
        <TrendingDown className="h-3 w-3" /> retention
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                         card 2 — Too Many Tools                            */
/* -------------------------------------------------------------------------- */

const TOOLS = [
  { name: "Booking", tint: "#2563EB", Icon: Calendar },
  { name: "CRM", tint: "#3B82F6", Icon: Users },
  { name: "Marketing", tint: "#0284C7", Icon: Megaphone },
  { name: "Loyalty", tint: "#1D4ED8", Icon: Award },
  { name: "Analytics", tint: "#2563EB", Icon: BarChart3 },
];

function TooManyToolsVisual() {
  return (
    <div className="relative flex h-full items-center justify-center pt-3">
      {/* disconnected stub lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" aria-hidden>
        <path d="M26 22 L 36 20" stroke="rgba(37,99,235,0.4)" strokeWidth="1.2" strokeDasharray="2 3" />
        <circle cx="38.5" cy="19.6" r="1.7" fill="#F43F5E" />
        <path d="M52 14 L 60 16" stroke="rgba(244,63,94,0.4)" strokeWidth="1.2" strokeDasharray="2 3" />
        <path d="M68 18 L 74 18" stroke="rgba(37,99,235,0.35)" strokeWidth="1.2" strokeDasharray="2 3" />
        <circle cx="72" cy="62" r="1.7" fill="#F43F5E" />
        <path d="M20 62 L 34 58" stroke="rgba(37,99,235,0.35)" strokeWidth="1.2" strokeDasharray="2 3" />
      </svg>

      <div className="mx-auto grid w-full max-w-[300px] grid-cols-3 gap-3">
        {TOOLS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.1 + i * 0.08 }}
            className={cn("flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2 py-3 shadow-[0_8px_20px_-12px_rgba(37,99,235,0.35)]", i === 4 && "col-start-2")}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: t.tint }}>
              <t.Icon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[9px] font-bold tracking-wide text-[#64748B]">{t.name}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       card 3 — Manual Follow-Ups                           */
/* -------------------------------------------------------------------------- */

const FLOW = [
  { label: "Customer inactive", Icon: UserX, tone: "#64748B", pending: false },
  { label: "Reminder", Icon: Clock, tone: "#F59E0B", pending: true },
  { label: "Offer", Icon: Gift, tone: "#3B82F6", pending: false },
  { label: "Follow-up", Icon: Mail, tone: "#2563EB", pending: false },
];

function ManualFollowupsVisual() {
  return (
    <div className="relative h-full overflow-hidden px-5 pt-9">
      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-[#FDE68A] bg-[#FEF3C7] px-2 py-0.5 text-[9px] font-bold text-[#B45309]">
        <Clock className="h-2.5 w-2.5" /> Pending
      </span>

      <div className="mx-auto mt-1 flex max-w-[210px] flex-col">
        {FLOW.map((f, i) => (
          <div key={f.label}>
            <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 shadow-[0_6px_16px_-10px_rgba(17,17,17,0.25)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-lg text-white" style={{ background: f.tone }}>
                <f.Icon className="h-2.5 w-2.5" />
              </span>
              <span className="text-[11px] font-bold text-[#111827]">{f.label}</span>
              {f.pending ? (
                <span className="ml-auto rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[8px] font-bold text-[#B45309]">pending</span>
              ) : (
                <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: `${f.tone}55` }} />
              )}
            </div>
            {i < FLOW.length - 1 && (
              <div className="flex justify-center py-[7px]">
                <ArrowDown className="h-3 w-3 text-[#CBD5E1]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   section                                   */
/* -------------------------------------------------------------------------- */

const PROBLEM_CARDS = [
  { title: "Lost Customers", desc: "Customers visit once, then disappear.", visual: <LostCustomersVisual />, index: "01" },
  { title: "Too Many Tools", desc: "Bookings, loyalty, marketing and data live in different places.", visual: <TooManyToolsVisual />, index: "02" },
  { title: "Manual Follow-Ups", desc: "You shouldn't have to chase customers to bring them back.", visual: <ManualFollowupsVisual />, index: "03" },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#F8FAFC] py-20 sm:py-28">
      {/* faint grid, mostly visible near the edges */}
      <div className="pointer-events-none absolute inset-0" style={{ ...gridStyle, backgroundSize: "64px 64px" }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 42%, rgba(248,250,252,0.98) 38%, rgba(248,250,252,0.6) 72%, rgba(248,250,252,0) 100%)",
        }}
      />

      <Container className="relative">
        <Reveal className="mx-auto max-w-3xl text-center">
          <Eyebrow>THE PROBLEM</Eyebrow>
          <h2 className="mt-6 text-balance text-[2.5rem] font-bold leading-[1.05] tracking-[-0.035em] text-[#111827] sm:text-[3.4rem]">
            Your customers are leaving.
            <br />
            <span className="gradient-text">Your tools aren&apos;t helping.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[17px] leading-relaxed text-[#64748B] sm:text-[18px]">
            Most local businesses lose customers between visits, bookings, and follow-ups.
          </p>
        </Reveal>

        <Reveal delay={0.1} y={24} className="relative z-10 mx-auto mt-12 max-w-[900px] sm:mt-16">
          <DisconnectedDiagram />
        </Reveal>

        <Stagger className="relative z-10 mt-8 grid grid-cols-1 gap-5 sm:mt-10 md:grid-cols-3 lg:gap-6">
          {PROBLEM_CARDS.map((c) => (
            <StaggerItem key={c.title} className="h-full">
              <div className="group flex h-full flex-col rounded-[1.9rem] border border-[#E5E7EB] bg-white p-5 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-[0_26px_60px_-26px_rgba(37,99,235,0.3)] sm:p-6">
                <div className="relative h-[190px] overflow-hidden rounded-2xl border border-[#E5E7EB]/60 bg-[linear-gradient(180deg,#FAFCFF_0%,#F5F8FC_100%)]">
                  <span className="pointer-events-none absolute right-3 top-2 text-[22px] font-extrabold tracking-tight text-[#E2E8F0]">
                    {c.index}
                  </span>
                  {c.visual}
                </div>
                <h3 className="mt-5 text-[19px] font-bold tracking-tight text-[#111827]">{c.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-[#64748B]">{c.desc}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </section>
  );
}
