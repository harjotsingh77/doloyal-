"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  /** Override brand color; defaults to current primary. */
  color?: string;
}

/**
 * Doloyal mark — a rounded square with two interlocking "flow" arcs that
 * suggest returning customers (loyalty loop). Designed to read at 24px+.
 */
export function LogoMark({ size = 32, className }: LogoProps & { withWordmark?: false }) {
  return (
    <img
      src="/logo-symbol.png"
      alt="doloyal AI"
      width={size}
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function Logo({ size = 32, className, withWordmark = true }: LogoProps) {
  if (!withWordmark) {
    return <LogoMark size={size} className={className} />;
  }

  return (
    <img
      src="/logo-full.png"
      alt="doloyal AI"
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
