"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, ArrowLeft } from "lucide-react";
import { cn } from "@doloyal/ui";
import {
  SETTINGS_NAV,
  SETTINGS_FLAT_NAV,
  searchSettings,
  type SettingsSearchResult,
} from "./settings-nav";
import {
  SettingsChromeProvider,
  SaveStatusIndicator,
} from "./settings-chrome";

function NavItemLink({
  href,
  label,
  Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[rgb(var(--color-primary)/0.08)] font-medium text-[rgb(var(--color-primary))]"
          : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [query, setQuery] = React.useState("");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results: SettingsSearchResult[] = React.useMemo(
    () => searchSettings(query),
    [query],
  );

  // Close the results popover on outside click / Escape.
  React.useEffect(() => {
    if (!searchOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const pickResult = () => {
    setQuery("");
    setSearchOpen(false);
    inputRef.current?.blur();
  };

  return (
    <SettingsChromeProvider>
      <div className="mx-auto w-full max-w-6xl">
        {/* ── Settings header ── */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href="/app/dashboard"
                className="-ml-1 flex h-7 w-7 items-center justify-center rounded-md text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] lg:hidden"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-semibold tracking-tight md:text-[1.7rem] text-[rgb(var(--color-foreground))]">
                Settings
              </h1>
            </div>
            <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
              Manage your business, workspace, account and preferences.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SaveStatusIndicator />
            <div ref={searchRef} className="relative w-full min-w-0 md:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-subtle))]" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search settings…"
                aria-label="Search settings"
                className="h-9 w-full rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] pl-9 pr-3 text-sm shadow-sm outline-none transition-colors placeholder:text-[rgb(var(--color-subtle))] focus:border-[rgb(var(--color-primary))] focus:ring-2 focus:ring-[rgb(var(--color-primary)/0.25)]"
              />
              {searchOpen && query.trim() ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-[var(--shadow-lifted)]">
                  {results.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-[rgb(var(--color-muted-foreground))]">
                      No settings match “{query.trim()}”
                    </p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto py-1.5">
                      {results.map((r) => (
                        <li key={r.id}>
                          <Link
                            href={r.href}
                            prefetch
                            onClick={pickResult}
                            className="flex items-start gap-3 px-4 py-2.5 hover:bg-[rgb(var(--color-muted))]"
                          >
                            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
                                {r.label}
                              </span>
                              <span className="block truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                                {r.group} · {r.description}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Mobile section chips (sticks below the app header while scrolling) ── */}
        <nav
          aria-label="Settings sections"
          className="sticky top-0 z-30 -mx-4 mb-5 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))]/95 px-4 backdrop-blur-sm lg:hidden"
        >
          <div className="flex gap-1.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SETTINGS_FLAT_NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                prefetch
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "border-[rgb(var(--color-primary)/0.3)] bg-[rgb(var(--color-primary)/0.08)] text-[rgb(var(--color-primary))]"
                    : "border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-muted-foreground))]",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="flex gap-10">
          {/* ── Desktop navigation ── */}
          <nav
            aria-label="Settings sections"
            className="sticky top-8 hidden h-fit w-56 shrink-0 flex-col gap-5 self-start pb-10 lg:flex"
          >
            {SETTINGS_NAV.map((group) => (
              <div key={group.section}>
                <p
                  className={cn(
                    "px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider",
                    group.section === "Danger Zone"
                      ? "text-[rgb(var(--color-danger))]"
                      : "text-[rgb(var(--color-subtle))]",
                  )}
                >
                  {group.section}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <NavItemLink
                        href={item.href}
                        label={item.label}
                        Icon={item.icon}
                        active={pathname.startsWith(item.href)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          {/* ── Content ── */}
          <main className="min-w-0 flex-1 pb-16">{children}</main>
        </div>
      </div>
    </SettingsChromeProvider>
  );
}
