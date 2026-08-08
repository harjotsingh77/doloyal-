"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Skeleton,
} from "@doloyal/ui";

export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
  delay = 0,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          {title ? (
            <CardTitle className="flex items-center gap-2 text-[0.95rem]">
              {icon}
              {title}
            </CardTitle>
          ) : (
            <span />
          )}
          {action}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "accent" | "primary" | "outline" | "muted";
  children: React.ReactNode;
}) {
  return (
    <Badge variant={tone as any} className="text-[0.6rem] uppercase tracking-wider">
      {children}
    </Badge>
  );
}

export function ProgressBar({
  value,
  accent = "#8B5CF6",
}: {
  value: number;
  accent?: string;
}) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.max(2, Math.min(100, value))}%`, backgroundColor: accent }}
      />
    </div>
  );
}

export function StatMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-3 py-2.5">
      <p className="text-[0.7rem] text-[rgb(var(--color-muted-foreground))]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-[rgb(var(--color-foreground))]">{value}</p>
      {sub ? <p className="mt-0.5 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">{sub}</p> : null}
    </div>
  );
}

export function PageSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[0.625rem]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[260px] rounded-[var(--radius)]" />
        <Skeleton className="h-[260px] rounded-[var(--radius)]" />
      </div>
    </div>
  );
}

export function usePageLoading(delay = 450) {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loading;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
        {children}
      </td>
    </tr>
  );
}