"use client";

import * as React from "react";
import { useTheme } from "next-themes";

const STORAGE_KEY = "doloyal-theme";
const MIGRATION_KEY = "doloyal-theme-default-light-v1";

/**
 * Ensures Light mode is the application default.
 * Migrates legacy "system" preferences that were set when system was the old default.
 */
export function ThemeInitializer() {
  const { setTheme } = useTheme();

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(MIGRATION_KEY)) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored || stored === "system") {
      setTheme("light");
      localStorage.setItem(STORAGE_KEY, "light");
    }

    localStorage.setItem(MIGRATION_KEY, "1");
  }, [setTheme]);

  return null;
}
