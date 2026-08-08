"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { Button, Skeleton, cn } from "@doloyal/ui";
import type { FeatureFlagState } from "@doloyal/shared";

export function ModuleShell({
  feature,
  children,
  actions,
  onConfigure,
  className,
}: {
  feature: FeatureFlagState;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onConfigure?: () => void;
  className?: string;
}) {
  return (
    <motion.section
      id={feature.sectionId || feature.key}
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn("scroll-mt-28", className)}
    >
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
            {feature.category}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            {feature.name}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{feature.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions}
          {onConfigure && (
            <Button variant="secondary" size="sm" onClick={onConfigure}>
              <Settings2 className="h-3.5 w-3.5" />
              Configure
            </Button>
          )}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

export function ModuleCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModuleLoading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 rounded-[18px]" />
      <Skeleton className="h-40 rounded-[18px]" />
    </div>
  );
}

export function ModuleEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export type LoyaltyModuleProps = {
  feature: FeatureFlagState;
  onConfigure: () => void;
  onConfigSaved?: () => void;
};
