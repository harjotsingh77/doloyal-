"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

/**
 * Status label: a neutral, bordered chip whose meaning is carried by a small
 * coloured marker rather than a tinted fill, so a table full of statuses
 * stays readable and the colours stay reserved for the state itself.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-2 py-0.5 text-xs font-medium text-[rgb(var(--color-foreground))]",
  {
    variants: {
      variant: {
        default: "",
        primary: "",
        accent: "",
        success: "",
        danger: "",
        warning: "",
        outline: "bg-transparent text-[rgb(var(--color-muted-foreground))]",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const MARKER: Record<string, string> = {
  primary: "bg-[rgb(var(--color-primary))]",
  accent: "bg-[rgb(var(--color-accent))]",
  success: "bg-[rgb(var(--color-success))]",
  danger: "bg-[rgb(var(--color-danger))]",
  warning: "bg-[rgb(var(--color-warning))]",
};

/** Initialisms that stay capitalised when an enum value is shown as a label. */
const KEEP_UPPER = new Set(["AI", "SMS", "VIP", "API", "URL", "QR", "SEO", "OTP", "UPI", "PDF", "CSV", "ID", "PRO"]);
const SPECIAL: Record<string, string> = { WHATSAPP: "WhatsApp" };

/** "ATTENTION_NEEDED" → "Attention needed". Mixed-case text is left alone. */
function readable(text: string): string {
  if (!/[A-Z]{2}/.test(text) || /[a-z]/.test(text)) return text;
  const words = text.split(/([_\s]+)/).map((part) => {
    if (/^[_\s]+$/.test(part)) return " ";
    if (KEEP_UPPER.has(part)) return part;
    return SPECIAL[part] ?? part.toLowerCase();
  });
  const joined = words.join("");
  return joined.replace(/[a-zA-Z]/, (c) => c.toUpperCase());
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Pulse the marker (for something live or in progress). */
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  const parts = React.Children.toArray(children);
  // A badge that brings its own icon does not also get a marker.
  const hasIcon = React.isValidElement(parts[0]);
  const marker = MARKER[variant ?? "default"];
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {(marker && !hasIcon) || dot ? (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            marker ?? "bg-current",
            dot && "lf-pulse-soft",
          )}
          aria-hidden="true"
        />
      ) : null}
      {parts.map((part) => (typeof part === "string" ? readable(part) : part))}
    </span>
  );
}

export { badgeVariants };
