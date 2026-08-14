"use client";

import * as React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Search, Bell, Menu, Calendar, ArrowUpRight, ChevronDown } from "lucide-react";
import { TextRoll } from "./ui";
import { useWaitlistModal } from "../components/waitlist-modal";

/* ── tiny SVG sparkline component ── */
function Sparkline({ color, points }: { color: string; points: number[] }) {
  const max = Math.max(...points);
  const w = 120;
  const h = 36;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - (p / max) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sp-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sp-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={w} cy={h - (points[points.length - 1] / max) * (h - 4) - 2} r="3" fill={color} />
    </svg>
  );
}

/* ── donut chart component ── */
function DonutChart() {
  const data = [
    { label: "Subscriptions", pct: 45.2, color: "#8B5CF6" },
    { label: "Appointments", pct: 32.8, color: "#3B82F6" },
    { label: "Products", pct: 22.0, color: "#F59E0B" },
  ];
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0">
        <svg width="140" height="140" viewBox="0 0 140 140">
          {data.map((d, i) => {
            const dashLen = (d.pct / 100) * circ;
            const dashOff = -offset;
            offset += dashLen;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="16"
                strokeDasharray={`${dashLen} ${circ - dashLen}`}
                strokeDashoffset={dashOff}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-extrabold text-[#111827]">₹7,93,981</span>
          <span className="text-[10px] text-gray-500">Total Revenue</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
            <span className="font-semibold text-gray-700 min-w-[90px]">{d.label}</span>
            <span className="font-bold text-gray-900">{d.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── area chart component ── */
function AreaChart() {
  const pts = [1200, 2200, 1800, 3400, 2800, 4200, 3600, 5600, 4800, 7200, 6400, 8200, 9400];
  const max = Math.max(...pts);
  const w = 500;
  const h = 180;
  const path = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - (p / max) * (h - 20) - 10;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const labels = ["Jul 08", "Jul 15", "Jul 22", "Jul 29", "Aug 05"];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = 10 + (i / 4) * (h - 20);
          const val = Math.round(max - (i / 4) * max);
          const label = val >= 1000 ? `${Math.round(val / 1000)}K` : String(val);
          return (
            <g key={i}>
              <line x1="40" y1={y} x2={w} y2={y} stroke="#F3F4F6" strokeWidth="1" />
              <text x="32" y={y + 4} textAnchor="end" className="fill-gray-400" fontSize="9" fontWeight="500">{label}</text>
            </g>
          );
        })}
        <path d={area} fill="url(#area-fill)" />
        <path d={path} fill="none" stroke="#8B5CF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* X-axis labels */}
        {labels.map((l, i) => (
          <text key={l} x={40 + (i / (labels.length - 1)) * (w - 40)} y={h + 18} textAnchor="middle" className="fill-gray-400" fontSize="9" fontWeight="500">{l}</text>
        ))}
      </svg>
    </div>
  );
}

/* ── stat card icon components ── */
function StatIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${color}14` }}>
      {children}
    </div>
  );
}

/* ════════════════════════ MAIN HERO ════════════════════════ */

export function HeroContent() {
  const { openWaitlistModal } = useWaitlistModal();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const dashboardY = useTransform(scrollYProgress, [0, 0.5], [12, 0]);
  const dashboardOpacity = useTransform(scrollYProgress, [0, 0.35], [0.95, 1]);
  const dashboardScale = useTransform(scrollYProgress, [0, 0.5], [0.98, 1]);

  return (
    <div ref={containerRef} className="relative isolate pt-24 pb-12 sm:pt-28 sm:pb-16 w-full bg-[#FAFAFC] overflow-hidden">
      {/* Top Ambient Blue Glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center">
        <div className="h-[520px] w-[860px] rounded-full bg-gradient-to-r from-[#2563EB]/14 via-[#3B82F6]/12 to-[#06B6D4]/14 blur-3xl" />
      </div>

      {/* Background Grid Pattern — blue guide lines spanning 100% screen width */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(37,99,235,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.14) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Smooth radial fade blending into #FAFAFC at edges */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 90% 80% at 50% 35%, transparent 35%, #FAFAFC 98%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1240px] px-6 sm:px-10">
        {/* Top Rating Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-black/5 bg-white/90 px-4 py-1.5 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] backdrop-blur-md">
            <div className="flex -space-x-1.5">
              <img className="h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
              <img className="h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
              <img className="h-5 w-5 rounded-full ring-2 ring-white object-cover" src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80" alt="User avatar" />
            </div>
            <span className="text-[12.5px] font-semibold text-[#282628]">3600+ 5_Stars Reviews</span>
          </div>
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="mt-6 sm:mt-7 text-center max-w-4xl mx-auto px-2 sm:px-0"
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-[#111111] xs:text-4xl sm:text-6xl lg:text-[4.75rem] leading-[1.15] sm:leading-[1.08]">
            Turn First-Time Visitors
            <br className="hidden sm:inline" />
            {" "}Into Loyal Customers.
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-4 sm:mt-6 max-w-2xl text-center text-sm sm:text-lg leading-relaxed text-slate-600 font-normal px-2 sm:px-0"
        >
          Everything you need to manage customers, boost repeat visits, and grow your local business — from one simple platform.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 w-full max-w-xs sm:max-w-none mx-auto"
        >
          <button
            onClick={openWaitlistModal}
            className="group flex w-full sm:w-auto items-center justify-center gap-3.5 rounded-full bg-[#232529] pl-6 pr-2.5 py-3 text.5 sm:text-[15px] font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-0.5 active:scale-95"
          >
            <TextRoll>Start 1 Month Free</TextRoll>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#232529] group-hover:text-[#2563EB] shadow-sm transition-transform duration-300 group-hover:rotate-45 group-hover:translate-x-0.5">
              <ArrowRight className="h-4 w-4 stroke-[2.5]" />
            </div>
          </button>
          <a href="/book-demo" className="group flex items-center justify-center gap-2 px-4 py-3 text-sm sm:text-[15px] font-semibold text-[#1F242B] hover:text-[#2563EB] transition-colors">
            <TextRoll>Book a Demo</TextRoll>
            <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" />
          </a>
        </motion.div>

        {/* ═══ SCROLL-ANIMATED DASHBOARD PREVIEW ═══ */}
        <motion.div
          style={{ y: dashboardY, opacity: dashboardOpacity, scale: dashboardScale }}
          className="relative mx-auto mt-6 sm:mt-8 max-w-[1080px]"
        >
          {/* Gradient Drop Shadow Glow behind Dashboard */}
          <div className="pointer-events-none absolute -inset-2 -z-10 rounded-[2.5rem] bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#06B6D4] opacity-35 blur-2xl transition-all duration-500" />
          <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-[90%] h-48 bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#06B6D4] opacity-45 blur-3xl rounded-full" />

          {/* Dashboard Card */}
          <div className="relative rounded-[2rem] border border-gray-200/90 bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.14)] overflow-hidden">
            {/* ── Top Header Bar ── */}
            <div className="flex items-center justify-between border-b border-gray-100 bg-white px-5 sm:px-7 py-3.5">
              <div className="flex items-center gap-3">
                <Menu className="h-5 w-5 text-gray-400 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2563EB] text-white">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"><path d="M8.5 4.5L16 12L8.5 19.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span className="text-sm font-bold text-[#111827]">Doloyal</span>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-200/70 px-3 py-1.5 text-[11px] text-gray-500 w-48">
                <Search className="h-3 w-3 text-gray-400" />
                <span>Help Center</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="h-4 w-4 text-gray-500" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  <img className="h-7 w-7 rounded-full object-cover ring-2 ring-gray-100" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="User" />
                  <div className="hidden sm:block leading-tight">
                    <span className="block text-[11px] font-bold text-gray-800">Prof. Arjuna</span>
                    <span className="block text-[9px] text-gray-400 font-normal">arjun.aprof@gmail.com</span>
                  </div>
                  <ChevronDown className="h-3 w-3 text-gray-400 hidden sm:block" />
                </div>
              </div>
            </div>

            {/* ── Dashboard Body ── */}
            <div className="bg-[#FBFBFD] px-5 sm:px-7 py-5 sm:py-6 space-y-5">
              {/* Title Row */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#111827]">Dashboard</h3>
                  <p className="text-[11px] text-gray-500">Welcome back! Here&apos;s what&apos;s happening with your business.</p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-gray-600 shadow-sm">
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span>08 Jul 2026 - 07 Aug 2026</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Revenue", value: "₹7,93,981", change: "+22.0%", sub: "vs last 31 days", color: "#8B5CF6", pts: [2, 3, 2.5, 4, 3.5, 5, 4.2, 6, 5.5, 7, 6.8, 8] },
                  { label: "New Customers", value: "88", change: "+18.6%", sub: "vs last 31 days", color: "#10B981", pts: [3, 3.5, 4, 3.8, 4.2, 4.5, 5, 4.8, 5.2, 5.5, 5.8, 6.2] },
                  { label: "Appointments", value: "164", change: "+15.2%", sub: "vs last 31 days", color: "#3B82F6", pts: [4, 3, 4.5, 3.5, 5, 4, 5.5, 4.5, 5, 5.5, 5, 6] },
                  { label: "Invoices", value: "132", change: "+11.8%", sub: "vs last 31 days", color: "#F59E0B", pts: [2, 2.5, 3, 2.8, 3.2, 3.5, 4, 3.8, 4.5, 5, 5.5, 6.5] },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-[11px] font-medium text-gray-500">{s.label}</span>
                      <StatIcon color={s.color}>
                        <div className="h-3.5 w-3.5 rounded-md" style={{ background: s.color, opacity: 0.7 }} />
                      </StatIcon>
                    </div>
                    <div className="mt-1.5">
                      <span className="text-xl sm:text-2xl font-extrabold text-[#111827]">{s.value}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="flex items-center text-[10px] font-bold text-emerald-600">
                        <ArrowUpRight className="h-2.5 w-2.5" /> {s.change}
                      </span>
                      <span className="text-[9px] text-gray-400">{s.sub}</span>
                    </div>
                    <div className="mt-2 h-9">
                      <Sparkline color={s.color} points={s.pts} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Row: Revenue Overview + Donut */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
                {/* Revenue Overview — 3/5 */}
                <div className="lg:col-span-3 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-[#111827]">Revenue Overview</h4>
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">
                      <span>This Month</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  <AreaChart />
                </div>

                {/* Revenue by Source — 2/5 */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-[#111827]">Revenue by Source</h4>
                    <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600">
                      <span>This Month</span>
                      <ChevronDown className="h-3 w-3 text-gray-400" />
                    </div>
                  </div>
                  <DonutChart />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
