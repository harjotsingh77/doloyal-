"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- motion */

const EASE = [0.16, 1, 0.3, 1] as const;

export function Reveal({
  children,
  delay = 0,
  y = 24,
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
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
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

/* ------------------------------------------------------------- type/UI */

export function GradientWord({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-clip-text text-transparent",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SerifWord({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <em className={cn("font-[var(--font-instrument)] font-normal italic tracking-tight", className)}>
      {children}
    </em>
  );
}

export function Eyebrow({ children, className }: { children?: React.ReactNode; className?: string }) {
  return null;
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mb-14 flex flex-col gap-5 sm:mb-16",
        align === "center" ? "mx-auto max-w-2xl items-center text-center" : "items-start",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-balance text-3xl font-bold tracking-[-0.03em] text-[rgb(var(--color-foreground))] sm:text-[2.75rem] sm:leading-[1.08]">
        {title}
      </h2>
      {lead ? (
        <p className="text-pretty text-lg leading-relaxed text-[rgb(var(--color-muted-foreground))]">
          {lead}
        </p>
      ) : null}
    </Reveal>
  );
}

/* ------------------------------------------------------------- buttons */

const btnBase =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold tracking-[-0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50";

export function ButtonPrimary({
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
        "bg-[#0F172A] text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_12px_32px_-12px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 hover:bg-[#1E293B] hover:shadow-[0_2px_4px_rgba(15,23,42,0.3),0_20px_44px_-12px_rgba(15,23,42,0.55)] active:translate-y-0",
        className,
      )}
    >
      {children}
      {withArrow ? (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      ) : null}
    </Link>
  );
}

export function ButtonGradient({
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
        "bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-[length:200%_auto] text-white shadow-[0_1px_2px_rgba(37,99,235,0.4),0_12px_32px_-12px_rgba(124,58,237,0.55)] hover:bg-[position:right_center] hover:-translate-y-0.5 active:translate-y-0",
        className,
      )}
    >
      {children}
      {withArrow ? (
        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      ) : null}
    </Link>
  );
}

export function ButtonGhost({
  children,
  href = "#",
  className,
}: {
  children: React.ReactNode;
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        btnBase,
        "border border-[rgb(var(--color-border))] bg-white text-[rgb(var(--color-foreground))] shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 hover:border-[rgb(var(--color-foreground))]/20 hover:bg-[rgb(var(--color-muted))] active:translate-y-0",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

export function TextLink({
  children,
  href,
  className,
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]",
        className,
      )}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
    </Link>
  );
}

/* --------------------------------------------------------------- misc */

export function Stat({ value, label, className }: { value: string; label: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-2xl font-bold tracking-tight text-[rgb(var(--color-foreground))] sm:text-3xl">
        {value}
      </span>
      <span className="text-sm text-[rgb(var(--color-muted-foreground))]">{label}</span>
    </div>
  );
}

export function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] text-[rgb(var(--color-muted-foreground))]">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB]/10">
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}