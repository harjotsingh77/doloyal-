"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@doloyal/ui";
import { SettingsSection } from "../settings-ui";

const OPTIONS = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export default function AppearanceSettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const current = mounted ? theme ?? "system" : "system";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Appearance</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          How Doloyal looks on this device. Saved automatically.
        </p>
      </div>

      <SettingsSection title="Theme">
        <div
          role="radiogroup"
          aria-label="Theme"
          className="inline-flex rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] p-1"
        >
          {OPTIONS.map((opt) => {
            const active = current === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(opt.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-all",
                  active
                    ? "bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))] shadow-sm"
                    : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]",
                )}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
        {mounted && current === "system" ? (
          <p className="mt-2 text-xs text-[rgb(var(--color-subtle))]">
            Following your device — currently {resolvedTheme}.
          </p>
        ) : null}
      </SettingsSection>
    </div>
  );
}
