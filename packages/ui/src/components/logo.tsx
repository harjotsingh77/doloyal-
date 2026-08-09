"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface LogoProps {
  size?: number;
  className?: string;
  withWordmark?: boolean;
  color?: string;
}

/**
 * Fallback SVG icon for Doloyal brand mark.
 */
function LogoSvgIcon({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect width="40" height="40" rx="10" fill="#2563EB" />
      <path
        d="M12 20C12 15.5817 15.5817 12 20 12C24.4183 12 28 15.5817 28 20C28 24.4183 24.4183 28 20 28H14"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M11 20L15 16M11 20L15 24"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoMark({ size = 32, className }: LogoProps & { withWordmark?: false }) {
  const [error, setError] = React.useState(false);

  if (error) {
    return <LogoSvgIcon size={size} className={className} />;
  }

  return (
    <img
      src="/logo-symbol.png"
      alt="Doloyal"
      width={size}
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0 object-contain", className)}
      onError={() => setError(true)}
    />
  );
}

export function Logo({ size = 32, className, withWordmark = true }: LogoProps) {
  const [error, setError] = React.useState(false);

  if (!withWordmark) {
    return <LogoMark size={size} className={className} />;
  }

  if (error) {
    return (
      <div className={cn("inline-flex items-center gap-2.5 select-none", className)}>
        <LogoSvgIcon size={size} />
        <span
          className="font-extrabold tracking-tight text-[#1F2937]"
          style={{ fontSize: Math.max(16, size * 0.75) }}
        >
          Doloyal
        </span>
      </div>
    );
  }

  return (
    <img
      src="/logo-full.png"
      alt="Doloyal"
      style={{ height: size, width: "auto" }}
      className={cn("shrink-0 object-contain", className)}
      onError={() => setError(true)}
    />
  );
}
