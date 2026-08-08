"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-[rgb(var(--color-foreground))]">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-[rgb(var(--color-muted-foreground))]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** Polished "coming soon" placeholder for not-yet-built routes. */
export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <EmptyState
      icon={
        <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
          <path
            d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      }
      title={`${title} is coming soon`}
      description={
        description ??
        "This module's data model is already in place. The full experience is being polished and will land in an upcoming release."
      }
    />
  );
}
