"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminNotificationItem } from "@doloyal/shared";

const TYPE_DOT: Record<string, string> = {
  NEW_SIGNUP: "#10B981",
  NEW_PAID_CUSTOMER: "#10B981",
  PAYMENT_FAILURE: "#EF4444",
  SUBSCRIPTION_CANCELLATION: "#F59E0B",
  SUPPORT_TICKET: "#8B5CF6",
  NEW_WEBSITE_REQUEST: "#2563EB",
  AI_ERROR: "#EF4444",
  INTEGRATION_FAILURE: "#F59E0B",
  SYSTEM_INCIDENT: "#EF4444",
  ENTERPRISE_LEAD: "#10B981",
};

export function AdminNotifications() {
  const [open, setOpen] = React.useState(false);
  const [items, setItems] = React.useState<AdminNotificationItem[]>([]);
  const [unread, setUnread] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await api.adminListNotifications({ limit: 30 });
      setItems(res.items || []);
      setUnread(res.unreadCount || 0);
    } catch {
      /* quiet */
    }
  }, []);

  React.useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAll = async () => {
    try {
      await api.adminMarkAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      setUnread(0);
    } catch {
      /* quiet */
    }
  };

  const markOne = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await api.adminMarkNotificationRead(id);
    } catch {
      /* quiet */
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--color-danger))] px-1 text-[0.55rem] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-4 py-3">
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Notifications</p>
            {unread > 0 ? (
              <button
                onClick={markAll}
                className="flex items-center gap-1 text-xs text-[rgb(var(--color-primary))] hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No notifications yet.</p>
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        if (!n.readAt) markOne(n.id);
                        if (n.link) {
                          setOpen(false);
                          window.location.href = n.link;
                        }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgb(var(--color-muted))]",
                        !n.readAt && "bg-[rgb(var(--color-primary)/0.04)]",
                      )}
                    >
                      <span
                        className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: TYPE_DOT[n.type] ?? "#94A3B8" }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.82rem] font-medium leading-snug text-[rgb(var(--color-foreground))]">{n.title}</p>
                        {n.message ? (
                          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[rgb(var(--color-muted-foreground))]">
                            {n.message}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[0.62rem] text-[rgb(var(--color-subtle))]">{relativeTime(n.createdAt)}</p>
                      </div>
                      {!n.readAt ? (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[rgb(var(--color-primary))]" />
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
