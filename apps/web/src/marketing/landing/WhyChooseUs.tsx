"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
  BarChart3,
  Send,
  Check,
  UserCheck,
  Gift,
  RotateCcw,
} from "lucide-react";
import { Container, Reveal } from "./ui";

/* -------------------------------------------------------------------------- */
/*                                CARD 1 GRAPH                                 */
/* -------------------------------------------------------------------------- */
function RetentionGraph() {
  return (
    <div className="relative w-full h-14 mt-2">
      <svg viewBox="0 0 240 60" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ret-grad-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d="M0,45 Q40,38 80,42 T160,20 T240,8 L240,60 L0,60 Z"
          fill="url(#ret-grad-blue)"
        />
        <path
          d="M0,45 Q40,38 80,42 T160,20 T240,8"
          fill="none"
          stroke="#2563EB"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="240" cy="8" r="4" fill="#2563EB" className="animate-ping opacity-75" />
        <circle cx="240" cy="8" r="3" fill="#2563EB" />
      </svg>
    </div>
  );
}

export function WhyChooseUs() {
  return (
    <section id="features" className="relative py-20 sm:py-28 bg-[#FAFAFC] scroll-mt-24">
      <Container>
        {/* Header */}
        <Reveal className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#111111] mb-4">
            Why Choose Doloyal?
          </h2>
          <p className="text-slate-500 text-[16px] sm:text-[18px] font-normal leading-relaxed">
            Everything you need to turn first-time visitors into loyal customers.
          </p>
        </Reveal>

        {/* 3 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* ================================================================= */}
          {/* CARD 1 — SMART CUSTOMER RETENTION                                 */}
          {/* ================================================================= */}
          <Reveal delay={0}>
            <div className="group rounded-[2.2rem] bg-[#F6F6F8] p-6 sm:p-7 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1.5 flex flex-col justify-between h-full">
              {/* Visual Container */}
              <div className="relative h-64 sm:h-72 rounded-2xl bg-slate-100/50 flex items-center justify-center p-4 overflow-hidden border border-slate-200/40">
                {/* Soft Blue/Indigo Glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.14),transparent_65%)] group-hover:opacity-100 transition-opacity duration-500 opacity-70" />
                
                {/* Floating Mini Dashboard Card */}
                <div className="relative z-10 w-full max-w-[250px] bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-[0_12px_32px_rgba(15,23,42,0.06)] group-hover:border-blue-200 transition-all duration-300">
                  {/* Top Row: AI Sparkle + Label + Healthy Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold text-slate-500">
                        Customer Health
                      </span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Healthy
                    </span>
                  </div>

                  {/* Large Stat Number */}
                  <div className="mt-2.5">
                    <span className="text-3xl font-extrabold text-slate-900 tracking-tight block">
                      84%
                    </span>
                  </div>

                  {/* Upward Retention Graph */}
                  <RetentionGraph />

                  {/* Floating Badge */}
                  <div className="absolute -bottom-3 -right-2 bg-blue-600 text-white font-bold text-[10.5px] px-3 py-1 rounded-full shadow-md flex items-center gap-1 group-hover:-translate-y-1 transition-transform duration-300">
                    <TrendingUp className="h-3 w-3 text-white" />
                    +18% Repeat Visits
                  </div>
                </div>
              </div>

              {/* Text Description */}
              <div className="mt-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Smart Customer Retention
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed">
                  Turn one-time visitors into loyal customers with AI-powered retention insights and personalized offers.
                </p>
              </div>
            </div>
          </Reveal>

          {/* ================================================================= */}
          {/* CARD 2 — ALL-IN-ONE GROWTH                                       */}
          {/* ================================================================= */}
          <Reveal delay={0.1}>
            <div className="group rounded-[2.2rem] bg-[#F6F6F8] p-6 sm:p-7 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1.5 flex flex-col justify-between h-full">
              {/* Visual Container */}
              <div className="relative h-64 sm:h-72 rounded-2xl bg-slate-100/50 flex items-center justify-center p-4 overflow-hidden border border-slate-200/40">
                {/* Soft Indigo/Purple Glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.14),transparent_65%)] group-hover:opacity-100 transition-opacity duration-500 opacity-70" />

                {/* SVG Dashed Connecting Lines */}
                <svg className="absolute inset-0 w-full h-full text-blue-400/40 group-hover:text-blue-500/80 transition-colors duration-500" fill="none">
                  <path d="M 50 65 L 130 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M 210 65 L 130 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M 50 205 L 130 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M 210 205 L 130 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                  <path d="M 130 40 L 130 135" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
                </svg>

                {/* Center Floating Doloyal Card ("The Brain") */}
                <div className="relative z-20 bg-white rounded-2xl px-5 py-3 shadow-[0_12px_36px_rgba(15,23,42,0.08)] border border-slate-200/90 flex items-center gap-2.5 group-hover:scale-105 group-hover:-translate-y-1 transition-all duration-300">
                  <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                    ✦
                  </div>
                  <span className="text-base font-extrabold text-slate-900 tracking-tight">
                    Doloyal
                  </span>
                </div>

                {/* 5 Floating Feature Pills */}
                {/* 1. Loyalty (Top Left) */}
                <div className="absolute top-8 left-4 z-10 bg-white border border-slate-200/90 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 group-hover:translate-x-1 group-hover:translate-y-1 transition-transform duration-300">
                  <Award className="h-3.5 w-3.5 text-blue-600" />
                  Loyalty
                </div>

                {/* 2. Booking (Top Right) */}
                <div className="absolute top-8 right-4 z-10 bg-white border border-slate-200/90 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 group-hover:-translate-x-1 group-hover:translate-y-1 transition-transform duration-300">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  Booking
                </div>

                {/* 3. Campaigns (Top Center) */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-white border border-slate-200/90 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold text-slate-700 shadow-sm flex items-center gap-1 group-hover:scale-105 transition-transform duration-300">
                  <Send className="h-3 w-3 text-purple-600" />
                  Campaigns
                </div>

                {/* 4. Rewards (Bottom Left) */}
                <div className="absolute bottom-8 left-4 z-10 bg-white border border-slate-200/90 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300">
                  <Gift className="h-3.5 w-3.5 text-rose-500" />
                  Rewards
                </div>

                {/* 5. Analytics (Bottom Right) */}
                <div className="absolute bottom-8 right-4 z-10 bg-white border border-slate-200/90 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-slate-700 shadow-sm flex items-center gap-1.5 group-hover:-translate-x-1 group-hover:-translate-y-1 transition-transform duration-300">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                  Analytics
                </div>
              </div>

              {/* Text Description */}
              <div className="mt-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  All-in-One Growth
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed">
                  Loyalty, bookings, memberships, campaigns, and analytics — everything your business needs in one place.
                </p>
              </div>
            </div>
          </Reveal>

          {/* ================================================================= */}
          {/* CARD 3 — AUTOMATE & GROW                                         */}
          {/* ================================================================= */}
          <Reveal delay={0.2}>
            <div className="group rounded-[2.2rem] bg-[#F6F6F8] p-6 sm:p-7 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1.5 flex flex-col justify-between h-full">
              {/* Visual Container */}
              <div className="relative h-64 sm:h-72 rounded-2xl bg-slate-100/50 flex flex-col justify-between p-4 overflow-hidden border border-slate-200/40">
                {/* Soft Blue/Cyan Background Glow */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(59,130,246,0.14),transparent_70%)] group-hover:opacity-100 transition-opacity duration-500 opacity-70" />

                {/* 4 Connected Step Cards */}
                <div className="relative z-10 space-y-1.5 w-full my-auto">
                  {/* Step 1 */}
                  <div className="bg-white rounded-xl px-3 py-1.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                        <UserCheck className="h-3 w-3" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-800">
                        Customer Visit
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="h-2.5 w-2.5" /> Completed
                    </span>
                  </div>

                  {/* Arrow 1 */}
                  <div className="flex justify-center -my-1">
                    <span className="text-slate-300 text-[10px] font-bold">↓</span>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-white rounded-xl px-3 py-1.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Gift className="h-3 w-3" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-800">
                        +50 Points
                      </span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-blue-600">
                      Reward Added
                    </span>
                  </div>

                  {/* Arrow 2 */}
                  <div className="flex justify-center -my-1">
                    <span className="text-slate-300 text-[10px] font-bold">↓</span>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-white rounded-xl px-3 py-1.5 border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Send className="h-3 w-3" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-800">
                        Follow-up Sent
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      ✓ Automated
                    </span>
                  </div>

                  {/* Arrow 3 */}
                  <div className="flex justify-center -my-1">
                    <span className="text-slate-300 text-[10px] font-bold">↓</span>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-blue-50/90 rounded-xl px-3 py-1.5 border border-blue-200/90 shadow-sm flex items-center justify-between group-hover:bg-blue-100/80 transition-colors duration-300">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                        <RotateCcw className="h-3 w-3" />
                      </div>
                      <span className="text-[12px] font-bold text-slate-900">
                        Customer Returns
                      </span>
                    </div>
                    <span className="bg-blue-600 text-white font-bold text-[9.5px] px-2 py-0.5 rounded-full shadow-xs group-hover:scale-105 transition-transform duration-300">
                      +24% likelihood
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Description */}
              <div className="mt-6">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mb-2">
                  Automate & Grow
                </h3>
                <p className="text-slate-500 text-[14.5px] leading-relaxed">
                  Automate follow-ups, rewards, and marketing so your business keeps growing while you focus on your customers.
                </p>
              </div>
            </div>
          </Reveal>

        </div>
      </Container>
    </section>
  );
}
