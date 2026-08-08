"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Container, Section, SectionHead, Stagger, StaggerItem } from "./ui";

const TESTIMONIALS = [
  {
    quote:
      "We replaced 6 tools overnight. Doloyal now books appointments, rewards loyalty, and emails our customers — without us lifting a finger. Retention is up 41%.",
    name: "Sofia Mendes",
    role: "Founder, Bloom Salon Studio",
    initials: "SM",
  },
  {
    quote:
      "The AI genuinely runs the place. It noticed our Tuesday slump, built a promo, and won back 300 guests in a week. I just said yes.",
    name: "Marcus Bell",
    role: "CEO, Joint & Muscle Clinic",
    initials: "MB",
  },
  {
    quote:
      "Branches finally feel like one business. The dashboard shows every location side by side and the AI handles all the messy follow-ups.",
    name: "Aiko Tanaka",
    role: "Owner, Aiko Wellness Group",
    initials: "AT",
  },
  {
    quote:
      "Setup took one evening. By morning, our customer profiles, loyalty tiers, and automations were live. It feels like hiring a whole ops team.",
    name: "Lena Fischer",
    role: "Dir. Ops, Urban Barbers",
    initials: "LF",
  },
  {
    quote:
      "We stopped losing regulars. Doloyal spots at-risk customers before we ever see it and sends the right message at the right time.",
    name: "Diego Ramos",
    role: "Founder, PetCare Plus",
    initials: "DR",
  },
  {
    quote:
      "I manage 8 gyms with a team of two. Between the staff scheduling and AI reporting, it frees up my entire week. Non-negotiable tool.",
    name: "Yara Haddad",
    role: "Founder, CoreFit Gyms",
    initials: "YH",
  },
];

function Stars() {
  return (
    <div className="flex gap-0.5 text-[#F5A623]">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-3.5 w-3.5 fill-current" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <Section className="overflow-hidden">
      <Container>
        <SectionHead
          eyebrow="Loved by founders"
          title={
            <>
              Businesses that run on <span className="gradient-text">autopilot</span>
            </>
          }
          lead="From single salons to multi-branch groups, teams trust Doloyal to keep customers close."
        />

        <Stagger className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <StaggerItem key={t.name} className="h-full">
              <motion.div
                whileHover={{ y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="card-glare flex h-full flex-col rounded-[1.6rem] border border-black/[0.06] bg-white p-7 shadow-[0_1px_2px_rgba(17,17,17,0.04)] transition-shadow duration-300 hover:shadow-[0_30px_60px_-30px_rgba(23,97,253,0.45)]"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#1761FD]/12 to-[#3B82F6]/12 text-[11px] font-bold text-[#1761FD]">
                    {t.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <Stars />
                </div>
                <p className="flex-1 text-[15px] leading-relaxed text-[#333]">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-6 flex items-center gap-3 border-t border-black/[0.05] pt-5">
                  <span className="gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white">
                    {t.name.split(" ").map((w) => w[0]).join("")}
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-[#111]">{t.name}</p>
                    <p className="text-[12.5px] text-[#666]">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}