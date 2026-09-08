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

export function EmptyState({ icon: _icon, title, description, action, className }: EmptyStateProps) {
  void _icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-6 py-14 text-center",
        className,
      )}
    >
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
      title={`${title} is coming soon`}
      description={
        description ??
        "This module's data model is already in place. The full experience is being polished and will land in an upcoming release."
      }
    />
  );
}
