"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Target,
  BarChart3,
  ArrowRight,
  HeartHandshake,
  Layers,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";

const EASE = [0.16, 1, 0.3, 1] as const;

/* -------------------------------------------------------------------------- */
/*                                Real-Time Insights                           */
/* -------------------------------------------------------------------------- */

const INSIGHTS_FEATURES = [
  {
    icon: <Users className="h-6 w-6 text-[#2563EB]" />,
    title: "Customer Insights",
    desc: "Understand customer behavior, visits, spending, and retention — all from one dashboard.",
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-[#3B82F6]" />,
    title: "Revenue Tracking",
    desc: "Track revenue, repeat purchases, and business performance in real time.",
  },
  {
    icon: <TrendingUp className="h-6 w-6 text-[#0284C7]" />,
    title: "Retention Insights",
    desc: "Identify customers at risk of leaving and take action before they become inactive.",
  },
  {
    icon: <Target className="h-6 w-6 text-[#109356]" />,
    title: "Team & Branch Insights",
    desc: "Keep staff and multiple locations aligned with shared data, performance, and customer activity.",
  },
];

export default function AboutPage() {
  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* ═══ 1. HERO SECTION (Matching Bartoon About Header) ═══ */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="text-5xl font-extrabold tracking-tight text-[#282628] sm:text-7xl lg:text-[5rem]"
            >
              Our Story
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
              className="mt-6 text-base sm:text-xl leading-relaxed text-[#58585E] font-normal"
            >
              We&apos;re redefining the future of sales and customer retention with intelligent, AI-powered solutions that are built for modern sales teams.
            </motion.p>
          </div>

          {/* Hero Banner Team Image */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="mt-14 overflow-hidden rounded-[2.5rem] border border-black/5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.08)] bg-white"
          >
            <div className="relative aspect-[21/9] w-full overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1600&auto=format&fit=crop&q=80"
                alt="Doloyal Team Collaboration"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ 2. REAL-TIME INSIGHTS SECTION ═══ */}
      <section className="py-20 sm:py-28 bg-[#F9F6F4]/60 border-y border-black/5">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="text-3xl font-extrabold tracking-tight text-[#282628] sm:text-5xl"
            >
              Insights That Help You Grow
            </motion.h2>
            <p className="mt-4 text-base sm:text-lg text-[#58585E]">
              See your customers, revenue, and retention in one place. Doloyal turns everyday business data into simple insights you can act on.
            </p>
          </div>

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {INSIGHTS_FEATURES.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: EASE }}
                className="rounded-3xl border border-black/5 bg-white p-8 transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F0F5FF]">
                  {feat.icon}
                </div>
                <h3 className="mt-6 text-lg font-bold text-[#282628]">{feat.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-[#58585E]">
                  {feat.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3. OUR MISSION (Matching Bartoon Dark Card Layout) ═══ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-black/10 bg-[#232123] p-8 sm:p-16 text-white shadow-2xl">
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[#2563EB]/25 blur-3xl" />

            <div className="relative z-10 grid gap-12 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-white">
                  <Target className="h-3.5 w-3.5 text-[#3B82F6]" />
                  Our Mission
                </span>
                <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-5xl sm:leading-[1.15]">
                  Make Every Customer Worth Coming Back For
                </h2>
                <p className="mt-6 text-base sm:text-lg leading-relaxed text-white/80">
                  Doloyal was built to help local businesses build stronger customer relationships without juggling multiple tools. From loyalty and rewards to bookings, memberships, campaigns, and customer insights, everything stays connected in one simple platform.
                </p>
                <p className="mt-4 text-base sm:text-lg leading-relaxed text-white/80">
                  We help salons, cafés, restaurants, spas, gyms, and other local businesses turn one-time visitors into loyal, returning customers — while making customer retention easier to manage.
                </p>
              </div>

              {/* Verified Product-Based Stats */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">1 Month</div>
                  <div className="mt-1 text-[13px] text-white/60">Free to Start</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#3B82F6]">All-in-One</div>
                  <div className="mt-1 text-[13px] text-white/60">Customer Growth Platform</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#06B6D4]">24/7</div>
                  <div className="mt-1 text-[13px] text-white/60">Customer Access</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                  <div className="text-2xl sm:text-3xl font-extrabold text-[#109356]">1 Platform</div>
                  <div className="mt-1 text-[13px] text-white/60">Everything Connected</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 4. FOUNDER SECTION (Clean 2-Column Authentic Layout) ═══ */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* LEFT SIDE (40% width): SINGLE FOUNDER PROFILE CARD */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="lg:col-span-5"
            >
              <div className="group relative mx-auto max-w-md overflow-hidden rounded-[2.5rem] border border-black/5 bg-white p-7 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-12px_rgba(37,99,235,0.15)]">
                {/* Subtle Ambient Blue Glow Behind Image */}
                <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-[#2563EB]/15 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                
                {/* Large Profile Image */}
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-gray-100 border border-black/5">
                  <img
                    src="/harjot.jpeg"
                    alt="Harjot Singh - Founder of Doloyal"
                    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Card Content */}
                <div className="mt-6 text-center">
                  <h3 className="text-2xl font-extrabold text-[#282628]">Harjot Singh</h3>
                  <p className="mt-1 text-sm font-semibold text-[#2563EB]">Founder</p>
                </div>
              </div>
            </motion.div>

            {/* RIGHT SIDE (60% width): FOUNDER STORY */}
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              {/* Main Heading */}
              <h2 className="text-3xl font-extrabold tracking-tight text-[#282628] sm:text-5xl lg:leading-[1.15]">
                Building Doloyal to Help Local Businesses Grow
              </h2>

              {/* Main Description Paragraphs */}
              <div className="mt-6 space-y-4 text-base sm:text-[17px] leading-relaxed text-[#58585E]">
                <p>
                  I’m Harjot Singh, a 19-year-old entrepreneur and the founder of Doloyal. I’m currently pursuing my BBA in Digital Transformation & Strategy at Chitkara University, while building Doloyal with the goal of helping local businesses build stronger and longer-lasting customer relationships.
                </p>
                <p>
                  Doloyal started with a simple idea: local businesses should not need to manage different tools for customers, loyalty, bookings, rewards, memberships, campaigns, and analytics. I’m building Doloyal as one connected platform that brings these essential tools together and makes customer retention easier to manage.
                </p>
                <p>
                  As a young founder, I’m involved in building Doloyal from the ground up — from product and technology to user experience, business strategy, and growth. My focus is to create a practical product that helps salons, cafés, restaurants, spas, gyms, and other local businesses turn first-time visitors into loyal, returning customers.
                </p>
              </div>

              {/* Short Closing Statement */}
              <div className="mt-6 rounded-2xl border border-[#2563EB]/15 bg-[#F0F5FF]/70 p-4.5 font-semibold text-[#2563EB] text-sm sm:text-base leading-relaxed">
                The vision is simple: make customer retention easier, smarter, and accessible to every local business.
              </div>

              {/* Small Detail Pills Below */}
              <div className="mt-7 flex flex-wrap gap-2.5">
                {[
                  "19 Years Old",
                  "BBA — Digital Transformation & Strategy",
                  "Chitkara University",
                  "Founder of Doloyal",
                ].map((detail) => (
                  <span
                    key={detail}
                    className="rounded-full border border-black/5 bg-white px-4 py-1.5 text-xs font-semibold text-[#282628] shadow-sm"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ═══ 5. PRE-FOOTER FINAL CTA ═══ */}
      <FinalCta />
    </div>
  );
}