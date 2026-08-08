"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const EASE = [0.16, 1, 0.3, 1] as const;

export function TextRoll({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <span className="inline-block transition-transform duration-300 ease-out group-hover:-translate-y-full">
        {children}
      </span>
      <span className="absolute inset-0 inline-block transition-transform duration-300 ease-out translate-y-full group-hover:translate-y-0">
        {children}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ motion */

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-90px" }}
      transition={{ duration: 0.8, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE } },
};

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-80px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={staggerChild} className={className}>
      {children}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ atoms */

export function GradText({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("gradient-text", className)}>{children}</span>;
}

export function Eyebrow({ children, className }: { children?: React.ReactNode; className?: string }) {
  return null;
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mb-14 flex flex-col gap-5 sm:mb-20",
        align === "center" ? "mx-auto max-w-3xl items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-balance text-[2.1rem] font-bold leading-[1.06] tracking-[-0.035em] text-[#111111] sm:text-[2.9rem] sm:leading-[1.04]">
        {title}
      </h2>
      {lead ? (
        <p className="max-w-2xl text-pretty text-[17px] leading-relaxed text-[rgb(var(--color-muted-foreground))] sm:text-[18px]">
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}

export function Section({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("relative py-24 sm:py-32", className)}>
      {children}
    </section>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1200px] px-5 sm:px-8", className)}>{children}</div>;
}

/* ---------------------------------------------------------------- buttons */

const btnBase =
  "group relative inline-flex h-[52px] items-center justify-center gap-2 overflow-hidden rounded-full px-7 text-[15px] font-semibold tracking-[-0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40";

export function PrimaryBtn({
  children,
  href = "/sign-up",
  className,
  withArrow = true,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
  withArrow?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        btnBase,
        "gradient-bg text-white shadow-[0_1px_2px_rgba(37,99,235,0.4),0_14px_34px_-10px_rgba(37,99,235,0.65)] hover:-translate-y-[2px] hover:shadow-[0_2px_4px_rgba(37,99,235,0.4),0_24px_48px_-12px_rgba(37,99,235,0.8)] active:translate-y-0",
        className,
      )}
    >
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative z-10 flex items-center gap-2">
        {children}
        {withArrow ? (
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        ) : null}
      </span>
    </Link>
  );
}

export function GhostBtn({
  children,
  href = "#",
  className,
  dark = false,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        btnBase,
        dark
          ? "border border-white/15 bg-white/[0.06] text-white backdrop-blur hover:-translate-y-[2px] hover:border-white/25 hover:bg-white/[0.12]"
          : "border border-black/[0.08] bg-white text-[#111111] shadow-[0_1px_2px_rgba(17,17,17,0.05)] hover:-translate-y-[2px] hover:border-black/[0.16] hover:shadow-[0_16px_32px_-16px_rgba(17,17,17,0.2)]",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

/* --------------------------------------------------------------- glass */

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/40 bg-white/70 shadow-[0_8px_40px_-12px_rgba(37,99,235,0.25)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- mini-UI */

export function MiniBars({ bars = 8, tone = "brand" }: { bars?: number; tone?: "brand" | "muted" }) {
  const heights = [40, 65, 30, 80, 55, 90, 48, 72];
  return (
    <div className="flex h-full items-end gap-[5px]">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.span
          key={i}
          className={cn(
            "w-full rounded-full",
            tone === "brand" ? "bg-gradient-to-t from-[#2563EB] to-[#60A5FA]" : "bg-[#E0F2FE]",
          )}
          initial={{ height: "8%" }}
          whileInView={{ height: `${heights[i % heights.length]}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.05 }}
        />
      ))}
    </div>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2563EB] to-[#3B82F6] text-[11px] font-bold text-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}
