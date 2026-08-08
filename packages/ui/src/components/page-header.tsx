"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  className?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 md:flex-row md:items-end md:justify-between", className)}>
      <div className="min-w-0 space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={i}>
                {i > 0 ? <span className="opacity-50">/</span> : null}
                {b.href ? (
                  <a href={b.href} className="hover:text-[rgb(var(--color-foreground))]">
                    {b.label}
                  </a>
                ) : (
                  <span className="text-[rgb(var(--color-foreground))]">{b.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-[rgb(var(--color-foreground))] md:text-[1.7rem]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-[rgb(var(--color-muted-foreground))]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.2" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
