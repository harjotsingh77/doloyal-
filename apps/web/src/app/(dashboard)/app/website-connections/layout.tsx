"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@doloyal/ui";

const TABS = [
  { href: "/app/website-connections", label: "Connected Websites", exact: true },
  { href: "/app/website-connections/api-keys", label: "API Keys" },
  { href: "/app/website-connections/sdk", label: "SDK" },
  { href: "/app/website-connections/widgets", label: "Widgets" },
  { href: "/app/website-connections/webhooks", label: "Webhooks" },
  { href: "/app/website-connections/documentation", label: "Documentation" },
  { href: "/app/website-connections/logs", label: "Logs" },
  { href: "/app/website-connections/settings", label: "Connection Settings" },
];

export default function WebsiteConnectionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="-mx-1 overflow-x-auto">
        <nav className="flex min-w-max gap-1 border-b border-[rgb(var(--color-border))] px-1">
          {TABS.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "text-[rgb(var(--color-primary))]"
                    : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]",
                )}
              >
                {tab.label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[rgb(var(--color-primary))]" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
