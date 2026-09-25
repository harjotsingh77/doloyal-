"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "./card";
import { CardHoverHint } from "./card-hover-hint";
import { cn } from "../lib/utils";

export interface KpiCardProps {
  label: string;
  value: number | string;
  format?: (v: number) => string;
  delta?: number; // percent change vs previous period
  deltaSuffix?: string;
  deltaLabel?: string;
  deltaInvert?: boolean;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "danger" | "warning" | "accent" | "violet";
  hint?: React.ReactNode;
  loading?: boolean;
  delay?: number;
  className?: string;
  onClick?: () => void;
  onPointerEnter?: () => void;
  /** Label and value only — extra comparison, hint, and "View details" stay in the opened view. */
  compact?: boolean;
}

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
  deltaLabel,
  deltaInvert,
  hint,
  loading,
  delay = 0,
  className,
  onClick,
  onPointerEnter,
  compact,
}: KpiCardProps) {
  const isNumeric = typeof value === "number";
  const animated = useCountUp(isNumeric ? (value as number) : 0);
  const display = isNumeric
    ? format
      ? format(animated)
      : Math.round(animated).toLocaleString("en-IN")
    : (value as string);

  const positive = deltaInvert ? (delta ?? 0) <= 0 : (delta ?? 0) >= 0;
  const footer = !compact && (delta !== undefined || hint || onClick);
  const deltaTone =
    delta === 0 || deltaLabel === "No change" || deltaLabel === "New"
      ? "text-[rgb(var(--color-muted-foreground))]"
      : positive
        ? "text-[rgb(var(--color-success))]"
        : "text-[rgb(var(--color-danger))]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn("h-full", className)}
    >
      <Card
        onClick={onClick}
        onPointerEnter={onPointerEnter}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `${label} details` : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        className={cn(
          "group relative flex h-full flex-col rounded-lg p-4 shadow-none",
          onClick &&
            "cursor-pointer transition-all hover:border-[rgb(var(--color-primary)/0.28)] hover:bg-[rgb(var(--color-muted)/0.35)] hover:shadow-sm",
        )}
      >
        {onClick ? <CardHoverHint /> : null}
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-[rgb(var(--color-muted-foreground))]">
          {label}
        </p>
        <div className="mt-2 text-[1.5rem] font-semibold leading-none tracking-tight tabular-nums text-[rgb(var(--color-foreground))]">
          {loading ? <span className="opacity-40">—</span> : display}
        </div>
        {footer ? (
          <div className="mt-2 text-[11px] leading-4 text-[rgb(var(--color-muted-foreground))]">
            {delta !== undefined ? (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                <span
                  className={cn(
                    "inline-flex items-center font-semibold tabular-nums",
                    deltaTone,
                  )}
                >
                  {delta !== 0 && deltaLabel !== "No change" && deltaLabel !== "New" ? (
                    positive ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )
                  ) : null}
                  {deltaLabel ?? `${Math.abs(delta ?? 0).toFixed(1)}%`}
                </span>
                <span>{deltaSuffix}</span>
              </div>
            ) : null}
            {hint ? <div className={delta !== undefined ? "mt-0.5" : undefined}>{hint}</div> : null}
            {onClick ? (
              <span className="mt-1 block text-[10px] font-medium text-[rgb(var(--color-muted-foreground))] opacity-70 transition-opacity group-hover:opacity-100">
                View details
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
