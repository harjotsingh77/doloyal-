"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./card";
import { cn } from "../lib/utils";

export interface KpiCardProps {
  label: string;
  value: number | string;
  format?: (v: number) => string;
  delta?: number; // percent change vs previous period
  deltaSuffix?: string;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "danger" | "warning" | "accent" | "violet";
  hint?: string;
  loading?: boolean;
  delay?: number;
}

const ACCENT_BG: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  primary: "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]",
  accent: "bg-[rgb(var(--color-accent)/0.15)] text-[rgb(var(--color-accent))]",
  success: "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]",
  danger: "bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))]",
  warning: "bg-[rgb(var(--color-warning)/0.15)] text-[rgb(var(--color-warning))]",
  violet: "bg-[rgb(139,92,246/0.15)] text-[rgb(139,92,246)]",
};

function useCountUp(target: number, durationMs = 800) {
  const ref = React.useRef(0);
  const [value, setValue] = React.useState(target);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (reduce) {
      setValue(target);
      ref.current = target;
      return;
    }
    let raf = 0;
    const from = ref.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    ref.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, reduce]);
  return value;
}

export function KpiCard({
  label,
  value,
  format,
  delta,
  deltaSuffix = "vs last period",
  icon,
  accent = "primary",
  hint,
  loading,
  delay = 0,
}: KpiCardProps) {
  const isNumeric = typeof value === "number";
  const animated = useCountUp(isNumeric ? (value as number) : 0);
  const display = isNumeric
    ? format
      ? format(animated)
      : Math.round(animated).toLocaleString("en-IN")
    : (value as string);

  const positive = (delta ?? 0) >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card interactive className="relative overflow-hidden p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-[rgb(var(--color-muted-foreground))]">
              {label}
            </p>
            <div className="mt-2 text-[1.75rem] font-semibold leading-tight tracking-tight text-[rgb(var(--color-foreground))]">
              {loading ? <span className="opacity-40">—</span> : display}
            </div>
          </div>
          {icon ? (
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", ACCENT_BG[accent])}>
              {icon}
            </div>
          ) : null}
        </div>
        {delta !== undefined ? (
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium",
                positive ? "text-[rgb(var(--color-success))]" : "text-[rgb(var(--color-danger))]",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
            <span className="text-[rgb(var(--color-muted-foreground))]">{deltaSuffix}</span>
          </div>
        ) : hint ? (
          <p className="mt-3 text-xs text-[rgb(var(--color-muted-foreground))]">{hint}</p>
        ) : null}
      </Card>
    </motion.div>
  );
}
