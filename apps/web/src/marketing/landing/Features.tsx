"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Users, CalendarDays, Megaphone, BarChart3, Store, UserCog,
  Bot, FileText, Send, Workflow, Package, Sparkles, Star, CreditCard,
} from "lucide-react";
import { Container, Section, SectionHead, Stagger, StaggerItem } from "./ui";
import { cn } from "@/lib/utils";

type Feature = {
  icon: React.ElementType;
  title: string;
  desc: string;
  span?: string;
  tint?: string;
  Illustration: React.ComponentType;
};

/* --- tiny illustrated previews (pure CSS/SVG) --------------------------------- */

function MockChat() {
  return (
    <div className="flex h-full flex-col justify-end gap-1.5">
      <div className="ml-auto w-3/4 rounded-lg rounded-br-sm bg-gradient-to-r from-[#1761FD] to-[#3B82F6] px-2.5 py-1.5 text-[9px] text-white">
        Hi! Ready to book this weekend?
      </div>
      <div className="w-1/2 rounded-lg rounded-bl-sm bg-[#EAF0FB] px-2.5 py-1.5 text-[9px] text-[#555]">
        Yes — Saturday works!
      </div>
      <div className="ml-auto w-5/6 rounded-lg rounded-tr-sm bg-[#0E4BD8] px-2.5 py-1.5 text-[9px] text-white">
        Booked it. See you at 11am ✓
      </div>
    </div>
  );
}

function MockStars() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5">
      <div className="flex gap-0.5 text-[#F5A623]">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-current" />
        ))}
      </div>
      <p className="text-[8.5px] font-medium text-[#999]">+2.4x repeat visits</p>
    </div>
  );
}

function MockCalendar() {
  const days = [10, 14, 22, 28, 33, 41, 38];
  return (
    <div className="grid h-full grid-cols-7 gap-1">
      {days.map((h, i) => (
        <motion.div
          key={i}
          className="gradient-bg rounded-[3px]"
          initial={{ height: "20%" }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.04 }}
          style={{ alignSelf: "end" }}
        />
      ))}
    </div>
  );
}

function MockBars({ tone = "brand" }: { tone?: "brand" | "muted" }) {
  const h = [45, 70, 55, 85, 60, 95, 75];
  return (
    <div className="flex h-full items-end gap-1">
      {h.map((v, i) => (
        <motion.div
          key={i}
          className={cn("w-full rounded-[3px]", tone === "brand" ? "gradient-bg" : "bg-[#E4EAF7]")}
          initial={{ height: "15%" }}
          whileInView={{ height: `${v}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: i * 0.04 }}
        />
      ))}
    </div>
  );
}

function MockBranches() {
  return (
    <div className="flex h-full items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <Store className="h-4 w-4 text-[#1761FD]" />
        <span className="h-1.5 w-6 rounded-full bg-[#1761FD]/80" />
        <span className="text-[8px] font-medium text-[#999]">Downtown</span>
      </div>
      <div className="flex flex-col items-center gap-1 opacity-70">
        <Store className="h-4 w-4 text-[#0E4BD8]" />
        <span className="h-1.5 w-5 rounded-full bg-[#0E4BD8]/70" />
        <span className="text-[8px] font-medium text-[#999]">Uptown</span>
      </div>
      <div className="flex flex-col items-center gap-1 opacity-45">
        <Store className="h-4 w-4 text-[#3B82F6]" />
        <span className="h-1.5 w-4 rounded-full bg-[#3B82F6]/60" />
        <span className="text-[8px] font-medium text-[#999]">Airport</span>
      </div>
    </div>
  );
}

function MockAvatar() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative flex -space-x-2">
        {["AK", "ML", "JT", "RC"].map((a, i) => (
          <span
            key={a}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-[#1761FD] to-[#3B82F6] text-[7px] font-bold text-white"
            style={{ zIndex: 4 - i }}
          >
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockAi() {
  return (
    <div className="flex h-full items-center justify-center gap-2">
      <Sparkles className="h-4 w-4 text-[#1761FD]" />
      <div className="flex flex-col gap-1">
        <span className="h-1.5 w-16 rounded-full bg-[#DCE6FA]" />
        <span className="h-1.5 w-11 rounded-full bg-[#EAF0FB]" />
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1 rounded-full bg-[#1761FD]"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function MockDocs() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      {[100, 82, 90, 64].map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="gradient-bg h-1.5 w-1.5 rounded-full" />
          <span className="h-1.5 rounded-full bg-[#EDF2FB]" style={{ width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}

function MockSend() {
  return (
    <div className="flex h-full flex-col justify-center gap-1.5">
      <div className="flex items-center gap-1 rounded-md bg-[#1761FD]/10 px-2 py-1">
        <Send className="h-2.5 w-2.5 text-[#1761FD]" />
        <span className="text-[8.5px] font-bold text-[#1761FD]">Sent · 86% open</span>
      </div>
      <div className="w-4/5 rounded-lg bg-[#EAF0FB] px-2.5 py-1.5 text-[8.5px] text-[#666]">
        Redeem 20% before Saturday →
      </div>
    </div>
  );
}

function MockFlow() {
  return (
    <div className="flex h-full items-center justify-between px-2">
      {[0, 1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <span
            className={cn(
              "h-6 w-6 rounded-full border-2 border-white shadow",
              i === 2 ? "bg-gradient-to-br from-[#3B82F6] to-[#0E4BD8]" : "bg-[#E7EDF9]",
            )}
          />
          {i < 3 && <span className="h-0.5 w-6 rounded bg-[#C8D6F2]" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function MockInventory() {
  return (
    <div className="flex h-full items-center justify-center gap-2.5">
      {[1, 0.7, 0.5].map((o, i) => (
        <span
          key={i}
          className="relative flex h-6 w-4 items-center justify-center rounded-[3px] border border-[#CBD7F2] bg-white"
          style={{ opacity: o }}
        >
          <span className="h-1.5 w-2 rounded-full bg-[#1761FD]/70" />
        </span>
      ))}
    </div>
  );
}

function MockMembership() {
  return (
    <div className="grid h-full grid-cols-2 gap-1.5">
      {["Gold", "VIP", "+20%", "Lvl 4"].map((t) => (
        <span key={t} className="flex items-center justify-center rounded-md bg-[#1761FD]/10 text-[9px] font-bold text-[#1761FD]">
          {t}
        </span>
      ))}
    </div>
  );
}

/* --- feature data ------------------------------------------------------------- */

const FEATURES: Feature[] = [
  { icon: Users, title: "AI CRM", desc: "Every customer, conversation, and purchase in one intelligent profile.", span: "lg:col-span-2", Illustration: MockAvatar },
  { icon: Sparkles, title: "Smart Loyalty", desc: "Points programs readers actually love — auto-tiering built in.", Illustration: MockStars },
  { icon: CalendarDays, title: "Appointments", desc: "Self-serve booking with smart reminders and no-shows cut.", Illustration: MockCalendar },
  { icon: Megaphone, title: "Marketing Automation", desc: "Segments that send the right message at the right time.", Illustration: MockSend },
  { icon: BarChart3, title: "Customer Analytics", desc: "Live revenue, retention, and cohort insights without the SQL.", span: "lg:col-span-2", Illustration: MockBars },
{ icon: Store, title: "Branch Dashboard", desc: "Every location, one view. Compare and act by store.", Illustration: MockBranches },
      { icon: UserCog, title: "Staff Management", desc: "Shift, commission and schedule control that writes itself.", Illustration: MockAvatar },
  { icon: Bot, title: "AI Assistant", desc: "Answers any question about your business, instantly.", Illustration: MockAi },
  { icon: FileText, title: "Reports", desc: "Board-ready reports generated every morning, on auto-pilot.", Illustration: MockDocs },
  { icon: Workflow, title: "Workflow Automation", desc: "Trigger actions across your stack without code.", Illustration: MockFlow },
  { icon: Package, title: "Inventory", desc: "Low-stock alerts and supplier orders in a single view.", Illustration: MockInventory },
  { icon: CreditCard, title: "Memberships", desc: "Recurring plans with built-in billing and upgrades.", Illustration: MockMembership },
];

export function Features() {
  return (
    <Section className="overflow-hidden">
      <Container>
        <SectionHead
          eyebrow="The whole operating system"
          title={
            <>
              Twelve tools. <span className="gradient-text">Zero busywork.</span>
            </>
          }
          lead="Every module plugs into the same intelligence — so your CRM, loyalty, staff, branches, and analytics finally work as one."
        />
      </Container>

      <Container>
        <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title} className={cn(f.span, "h-full")}>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="card-glare group flex h-full flex-col rounded-[1.6rem] border border-black/[0.06] bg-white p-6 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(23,97,253,0.45)]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1761FD]/12 to-[#3B82F6]/12 text-[#1761FD] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-[#EEF2FB] px-2.5 py-1 text-[10px] font-bold text-[#6E86C8]">
                    {FEATURES.indexOf(f) + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-[17px] font-bold tracking-[-0.01em] text-[#111]">{f.title}</h3>
                <p className="mt-1.5 flex-1 text-[14px] leading-relaxed text-[#666]">{f.desc}</p>
                <div className="mt-5 h-20 rounded-xl border border-black/[0.04] bg-[#FAFAFC] p-3">
                  <f.Illustration />
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}