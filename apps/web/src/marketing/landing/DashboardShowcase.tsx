"use client";

import * as React from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  Users, CalendarClock, FileText, Bot, Megaphone, TrendingUp, Sparkles, Star, Check, CreditCard, Send,
} from "lucide-react";
import { EASE } from "./ui";
import { cn } from "@/lib/utils";

const MODULES = [
  { key: "customers", icon: Users, label: "Customers", tint: "from-[#1761FD] to-[#3B82F6]" },
  { key: "appointments", icon: CalendarClock, label: "Appointments", tint: "from-[#0E4BD8] to-[#3B82F6]" },
  { key: "reports", icon: FileText, label: "Reports", tint: "from-[#1761FD] to-[#7EA6FF]" },
  { key: "aichat", icon: Bot, label: "AI Chat", tint: "from-[#0E4BD8] to-[#3B82F6]" },
  { key: "campaigns", icon: Megaphone, label: "Campaigns", tint: "from-[#1761FD] to-[#8FB4FF]" },
  { key: "revenue", icon: TrendingUp, label: "Revenue", tint: "from-[#0E4BD8] to-[#1761FD]" },
];

/* ---------------------------------------------------------- mini screens */

function CustomersScreen() {
  const rows = [
    { n: "Sarah Kim", t: "Diamond · $1,240", s: "96", tag: "VIP" },
    { n: "Miguel Costa", t: "Gold · $620", s: "84", tag: "Repeat" },
    { n: "Aiko Tanaka", t: "Member · $310", s: "71", tag: "New" },
    { n: "Lena Fischer", t: "Gold · $540", s: "89", tag: "At risk" },
  ];
  return (
    <div className="flex h-full flex-col gap-1.5">
      {rows.map((r) => (
        <div key={r.n} className="flex items-center gap-2 rounded-lg border border-black/[0.04] bg-white px-2.5 py-1.5">
          <span className="gradient-bg flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-bold text-white">
            {r.n.split(" ").map((w) => w[0]).join("")}
          </span>
          <div className="flex-1 leading-none">
            <p className="text-[10px] font-semibold text-[#111]">{r.n}</p>
            <p className="text-[8px] text-[#999]">{r.t}</p>
          </div>
          <span className="rounded-full bg-[#1761FD]/10 px-1.5 py-0.5 text-[7.5px] font-bold text-[#1761FD]">{r.tag}</span>
          <span className="text-[9px] font-bold text-[#4CB76B]">{r.s}%</span>
        </div>
      ))}
    </div>
  );
}

function AppointmentsScreen() {
  const slots = [
    { t: "09:00", n: "Haircut · Sarah", s: "Confirmed", done: true },
    { t: "10:30", n: "Color · Miguel", s: "Confirmed", done: true },
    { t: "12:00", n: "Spa · Aiko", s: "Reminded", done: false },
    { t: "14:30", n: "Massage · Lena", s: "Booked", done: false },
  ];
  return (
    <div className="flex h-full flex-col gap-1.5">
      {slots.map((s) => (
        <div key={s.t} className="flex items-center gap-2 rounded-lg border border-black/[0.04] bg-white px-2.5 py-1.5">
          <span className="w-9 text-[9px] font-bold text-[#1761FD]">{s.t}</span>
          <span className="h-4 w-px bg-black/[0.06]" />
          <span className="flex-1 text-[9.5px] font-semibold text-[#111]">{s.n}</span>
          <span className={cn("flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold", s.done ? "bg-[#E7F6EC] text-[#4CB76B]" : "bg-[#1761FD]/10 text-[#1761FD]")}>
            {s.done && <Check className="h-2 w-2" />} {s.s}
          </span>
        </div>
      ))}
    </div>
  );
}

function ReportsScreen() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: "MRR", v: "$48.2k", d: "+12%" },
          { l: "Churn", v: "2.1%", d: "-0.4%" },
          { l: "LTV", v: "$1,902", d: "+9%" },
        ].map((c) => (
          <div key={c.l} className="rounded-lg border border-black/[0.04] bg-white p-2">
            <p className="text-[7.5px] font-medium text-[#999]">{c.l}</p>
            <p className="text-[11px] font-bold text-[#111]">{c.v}</p>
            <p className="text-[7.5px] font-bold text-[#4CB76B]">{c.d}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-1 items-end gap-1 rounded-lg border border-black/[0.04] bg-white p-2">
        {[35, 55, 42, 70, 60, 85, 74, 95, 80].map((h, i) => (
          <motion.span
            key={i}
            className="gradient-bg w-full rounded-[2px]"
            initial={{ height: "12%" }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

function AiChatScreen() {
  const msgs = [
    { me: true, t: "Find customers at risk of churn this month" },
    { me: false, t: "Found 23 customers with <25% engagement in 60 days. Suggested win-back campaigns ready." },
    { me: false, t: "3 are VIPs worth contacting personally — drafted messages attached." },
  ];
  return (
    <div className="flex h-full flex-col justify-end gap-1.5">
      {msgs.map((m, i) => (
        <div
          key={i}
          className={cn(
            "max-w-[85%] rounded-xl px-2.5 py-1.5 text-[8.5px] leading-snug",
            m.me
              ? "ml-auto rounded-br-sm bg-gradient-to-r from-[#1761FD] to-[#3B82F6] text-white"
              : "rounded-bl-sm bg-[#EAF0FB] text-[#444]",
          )}
        >
          {m.t}
        </div>
      ))}
    </div>
  );
}

function CampaignsScreen() {
  const c = [
    { n: "Win-back · 2 weeks idle", r: "84%", a: "Sent" },
    { n: "VIP birthday offers", r: "72%", a: "Scheduled" },
    { n: "Referral bonus promo", r: "91%", a: "Live" },
  ];
  return (
    <div className="flex h-full flex-col gap-1.5">
      {c.map((k) => (
        <div key={k.n} className="rounded-lg border border-black/[0.04] bg-white px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[9px] font-semibold text-[#111]">{k.n}</p>
            <span className="gradient-bg rounded-full px-1.5 py-0.5 text-[7px] font-bold text-white">{k.a}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#EDF2FB]">
              <span className="gradient-bg block h-full w-[70%] rounded-full" />
            </span>
            <span className="text-[8px] font-bold text-[#1761FD]">{k.r}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevenueScreen() {
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[8px] font-medium text-[#999]">Total revenue</p>
          <p className="text-[18px] font-bold text-[#111]">$284,910</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[#E7F6EC] px-1.5 py-0.5 text-[7.5px] font-bold text-[#4CB76B]">
          <TrendingUp className="h-2 w-2" /> +18.4%
        </span>
      </div>
      <div className="flex flex-1 items-end gap-1">
        {[42, 58, 40, 72, 55, 88, 66, 100, 78].map((h, i) => (
          <motion.span
            key={i}
            className="w-full rounded-t-[2px] bg-gradient-to-t from-[#0E4BD8] to-[#3B82F6]"
            initial={{ height: "15%" }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

const SCREENS: Record<string, React.ComponentType> = {
  customers: CustomersScreen,
  appointments: AppointmentsScreen,
  reports: ReportsScreen,
  aichat: AiChatScreen,
  campaigns: CampaignsScreen,
  revenue: RevenueScreen,
};

/* -------------------------------------------------------------- section */

export function DashboardShowcase() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useTransform(scrollYProgress, (v) => Math.min(0.9999, v));
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    return progress.on("change", (v) => {
      setActive(Math.floor(v * MODULES.length));
    });
  }, [progress]);

  const mod = MODULES[active];
  const Screen = SCREENS[mod.key];

  return (
    <section ref={ref} className="relative h-[480vh]">
      <div className="sticky top-0 isolate flex h-screen flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#FAFAFC] via-white to-[#F6F1FA]" />

        <div className="mx-auto w-full max-w-[1100px] px-5 sm:px-8">
          {/* heading */}
          <div className="mb-10 text-center">
            <h2 className="text-balance text-[2.1rem] font-bold tracking-[-0.035em] text-[#111] sm:text-[2.9rem]">
              Scroll to explore <span className="gradient-text">your operating system</span>
            </h2>
          </div>

          {/* module stepper */}
          <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              const isActive = i === active;
              const isDone = i < active;
              return (
                <div key={m.key} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-all duration-500",
                      isActive
                        ? "gradient-bg border-transparent text-white shadow-[0_10px_30px_-10px_rgba(23,97,253,0.7)]"
                        : "border-black/[0.06] bg-white text-[#666]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {m.label}
                  </div>
                  {i < MODULES.length - 1 && (
                    <span className={cn("h-0.5 w-4 rounded-full transition-colors duration-500", isDone ? "bg-[#1761FD]/50" : "bg-black/[0.08]")} />
                  )}
                </div>
              );
            })}
          </div>

          {/* laptop */}
          <div className="relative mx-auto max-w-[900px]">
            <div className="pointer-events-none absolute -inset-10 -z-10">
              <div className="absolute left-1/2 top-1/2 h-[380px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#1761FD]/18 via-[#3B82F6]/16 to-[#0E4BD8]/18 blur-3xl" />
            </div>

            <motion.div
              animate={{ scale: active === MODULES.length - 1 ? 0.985 : 1 }}
              transition={{ duration: 0.4 }}
              className="relative rounded-[1.4rem] bg-gradient-to-br from-[#1C2747] to-[#0b132c] p-2 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.5)]"
            >
              <div className="mb-2 flex items-center gap-1.5 px-2 pt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                <div className="ml-3 flex-1 rounded-md bg-white/10 px-3 py-1 text-[10px] font-medium text-white/40">
                  doloyal.ai — {mod.label}
                </div>
              </div>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[0.9rem] bg-[#FBFAFC]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mod.key}
                    initial={{ opacity: 0, y: 18, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -14, scale: 0.99 }}
                    transition={{ duration: 0.4, ease: EASE }}
                    className="h-full p-4 sm:p-6"
                  >
                    <Screen />
                  </motion.div>
                </AnimatePresence>
                <div className="pointer-events-none absolute inset-0 rounded-[0.9rem] ring-1 ring-inset ring-white/10" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
