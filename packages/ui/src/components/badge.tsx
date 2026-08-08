"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]",
        primary:
          "border-transparent bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]",
        accent:
          "border-transparent bg-[rgb(var(--color-accent)/0.15)] text-[rgb(var(--color-accent))]",
        success:
          "border-transparent bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]",
        danger:
          "border-transparent bg-[rgb(var(--color-danger)/0.12)] text-[rgb(var(--color-danger))]",
        warning:
          "border-transparent bg-[rgb(var(--color-warning)/0.15)] text-[rgb(var(--color-warning))]",
        outline:
          "border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full bg-current", dot && "lf-pulse-soft")}
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  );
}

export { badgeVariants };
