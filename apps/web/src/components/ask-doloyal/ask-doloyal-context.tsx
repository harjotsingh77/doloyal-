"use client";

import * as React from "react";
import { api } from "@/lib/api";

interface AskDoloyalContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  unread: number;
  refreshUnread: () => Promise<void>;
}

const AskDoloyalContext = React.createContext<AskDoloyalContextValue | null>(null);

/** How often the unread badge is re-checked while the tab is visible. */
const UNREAD_POLL_MS = 60_000;

export function AskDoloyalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const refreshToken = React.useRef(0);

  // Starts at mount so a visibility change before the first scheduled check
  // does not add a second request on load.
  const lastCheckedAt = React.useRef(Date.now());

  const refreshUnread = React.useCallback(async () => {
    const token = ++refreshToken.current;
    lastCheckedAt.current = Date.now();
    try {
      const badge = await api.getSupportUnreadBadge();
      if (token === refreshToken.current) setUnread(badge.unread || 0);
    } catch {
      // Ignore — badge stays at its last known value.
    }
  }, []);

  // First check shortly after mount (so it does not compete with the page's
  // own data), then poll every 60s while the tab is visible, and re-check when
  // the tab comes back into view. Background tabs generate no traffic.
  // Returning to the tab only re-checks when the badge is older than the
  // poll would have left it: switching windows back and forth used to send a
  // request on every return.
  React.useEffect(() => {
    const first = setTimeout(() => void refreshUnread(), 4_000);
    const t = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        void refreshUnread();
      }
    }, UNREAD_POLL_MS);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastCheckedAt.current >= UNREAD_POLL_MS) void refreshUnread();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refreshUnread]);

  const value = React.useMemo<AskDoloyalContextValue>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((o) => !o),
      unread,
      refreshUnread,
    }),
    [isOpen, unread, refreshUnread],
  );

  return <AskDoloyalContext.Provider value={value}>{children}</AskDoloyalContext.Provider>;
}

export function useAskDoloyal(): AskDoloyalContextValue {
  const ctx = React.useContext(AskDoloyalContext);
  if (!ctx) throw new Error("useAskDoloyal must be used within AskDoloyalProvider");
  return ctx;
}