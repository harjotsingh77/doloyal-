"use client";

import * as React from "react";
import { INTEGRATIONS, type Integration } from "../data/integrations";
import { cn } from "@/lib/utils";

function IntegrationChip({ item }: { item: Integration }) {
  return (
    <div className="group flex shrink-0 items-center gap-2.5 rounded-2xl border border-[rgb(var(--color-border))] bg-white py-2.5 pl-2.5 pr-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgb(var(--color-border))] hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15)]">
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-[13px] font-bold text-white",
          item.gradient,
        )}
      >
        {item.mark}
      </span>
      <span className="text-[13.5px] font-semibold text-[rgb(var(--color-foreground))]">{item.name}</span>
    </div>
  );
}

export function IntegrationCloud({ className }: { className?: string }) {
  const row = [...INTEGRATIONS, ...INTEGRATIONS];
  return (
    <div className={cn("relative overflow-hidden py-2", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent" />
      <div className="marquee-track flex w-max">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 gap-4 pr-4" aria-hidden={half === 1}>
            {INTEGRATIONS.map((item) => (
              <IntegrationChip key={`${half}-${item.name}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}