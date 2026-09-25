"use client";

import type { ReactNode } from "react";

/** Reopens CookieHub preference center after the floating icon is hidden. */
export function CookieSettingsButton({
  className,
  children = "Cookie settings",
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const hub = (window as Window & { cookiehub?: { openSettings?: () => void } }).cookiehub;
        hub?.openSettings?.();
      }}
    >
      {children}
    </button>
  );
}
