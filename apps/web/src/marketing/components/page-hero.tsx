"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Eyebrow, GradientWord } from "./ui";

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  align = "center",
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lead?: React.ReactNode;
  children?: React.ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-hidden pt-36 pb-16 sm:pt-44 sm:pb-20", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        <div className="h-[420px] w-[820px] rounded-full bg-gradient-to-r from-[#2563EB]/10 via-[#7C3AED]/10 to-[#D946EF]/10 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "relative mx-auto flex max-w-[1200px] flex-col gap-6 px-5 sm:px-8",
          align === "center" ? "items-center text-center" : "items-start text-left",
        )}
      >
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.03em] text-[rgb(var(--color-foreground))] sm:text-6xl">
          {title}
        </h1>
        {lead ? (
          <div className="max-w-2xl text-lg leading-relaxed text-[rgb(var(--color-muted-foreground))] sm:text-xl">
            {lead}
          </div>
        ) : null}
        {children}
      </motion.div>
    </section>
  );
}

export { GradientWord };