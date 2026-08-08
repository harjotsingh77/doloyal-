"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@doloyal/ui";

export type LoyaltySectionDef = {
  id: string;
  label: string;
  /** Feature key required to show this section. Undefined = always shown (overview shell). */
  featureKey?: string;
};

export const SECTIONS: LoyaltySectionDef[] = [
  { id: "overview", label: "Overview" },
  { id: "settings", label: "Program", featureKey: "program_settings" },
  { id: "leaderboard", label: "Leaderboard", featureKey: "leaderboard" },
  { id: "challenges", label: "Challenges", featureKey: "customer_challenges" },
  { id: "tiers", label: "Tiers", featureKey: "loyalty_tiers" },
  { id: "badges", label: "Badges", featureKey: "badges_achievements" },
  { id: "analytics", label: "Analytics", featureKey: "loyalty_analytics" },
  { id: "surprise", label: "Surprise", featureKey: "surprise_rewards" },
  { id: "streaks", label: "Streaks", featureKey: "streak_system" },
  { id: "ledger", label: "Ledger", featureKey: "points_ledger_explorer" },
  { id: "adjust", label: "Adjust", featureKey: "manual_point_adjustment" },
  { id: "automations", label: "Automations", featureKey: "automation_rules" },
  { id: "notifications", label: "Notifications", featureKey: "smart_notifications" },
  { id: "activity", label: "Activity", featureKey: "activity_feed" },
];

export function Section({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-28", className)}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SoftCard({
  children,
  className,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]",
        hover && "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export function Sparkline({
  data,
  positive = true,
}: {
  data: number[];
  positive?: boolean;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const w = 72;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const color = positive ? "#2563EB" : "#EF4444";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function ProgressBar({ value, color = "#2563EB" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

export function formatValue(
  value: number,
  format: "number" | "currency" | "percent" | "points",
  currency = "INR",
) {
  if (format === "percent") return `${value}%`;
  if (format === "points") return value.toLocaleString("en-IN");
  if (format === "currency") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString("en-IN");
}

export function EmptyBlock({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[18px] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  );
}
