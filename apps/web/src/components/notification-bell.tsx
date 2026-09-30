"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AppNotificationItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const SEVERITY_DOT: Record<string, string> = {
  SUCCESS: "#10B981",
  WARNING: "#F59E0B",
  INFO: "#2563EB",
};

/** How often the feed is re-checked while the tab is visible. */
const POLL_MS = 120_000;
const MAX_REMEMBERED = 300;

function readSeen(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Header bell for the staff workspace: platform announcements, support ticket
 * and website request updates, plan changes and last week's business trend.
 * Which entries were read is remembered per user and business in this browser.
 */
export function NotificationBell() {
  const router = useRouter();
  const { user } = useAuth();
  const storageKey = user ? `doloyal_notifications_seen:${user.id}:${user.activeTenantId}` : "";
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AppNotificationItem[]>([]);
  const [seen, setSeen] = React.useState<Set<string>>(() => new Set());
  const ref = React.useRef<HTMLDivElement>(null);
  const lastLoadedAt = React.useRef(Date.now());

  React.useEffect(() => {
    setSeen(new Set(storageKey ? readSeen(storageKey) : []));
    setItems([]);
  }, [storageKey]);

  const load = React.useCallback(async () => {
    lastLoadedAt.current = Date.now();
    try {
      const res = await api.getNotificationFeed();
      setItems(res.items || []);
    } catch {
      // Keep the last list; the next poll tries again.
    }
  }, []);

  // First check shortly after mount so it does not compete with the page's
  // own data, then while the tab is visible. Returning to the tab re-checks
  // only when the list is older than a poll would have left it.
  React.useEffect(() => {
    if (!storageKey) return;
    const first = setTimeout(() => void load(), 5_000);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadedAt.current >= POLL_MS) void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load, storageKey]);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markSeen = React.useCallback(
    (ids: string[]) => {
      setSeen((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        if (next.size === prev.size) return prev;
        try {
          localStorage.setItem(storageKey, JSON.stringify([...next].slice(-MAX_REMEMBERED)));
        } catch {
          // Private mode or full storage: read state lasts for this visit only.
        }
        return next;
      });
    },
    [storageKey],
  );

  const unread = items.reduce((count, n) => count + (seen.has(n.id) ? 0 : 1), 0);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => {
          if (!open) void load();
          setOpen((v) => !v);
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--color-danger))] px-1 text-[0.55rem] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-x-4 top-14 z-50 overflow-hidden sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-96 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-3">
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Notifications</p>
            {unread > 0 ? (
              <button
                onClick={() => markSeen(items.map((n) => n.id))}
                className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {items.map((n) => {
                  const isUnread = !seen.has(n.id);
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => {
                          markSeen([n.id]);
                          if (n.link) {
                            setOpen(false);
                            router.push(n.link);
                          }
                        }}
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--color-muted))]",
                          isUnread && "bg-[rgb(var(--color-primary)/0.04)]",
                        )}
                      >
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: SEVERITY_DOT[n.severity] ?? "#94A3B8" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[0.82rem] font-medium leading-snug text-[rgb(var(--color-foreground))]">
                            {n.title}
                          </p>
                          {n.message ? (
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[rgb(var(--color-muted-foreground))]">
                              {n.message}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[0.62rem] text-[rgb(var(--color-subtle))]">
                            {relativeTime(n.createdAt)}
                          </p>
                        </div>
                        {isUnread ? (
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--color-primary))]" />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
