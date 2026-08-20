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

export function AskDoloyalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(0);
  const refreshToken = React.useRef(0);

  const refreshUnread = React.useCallback(async () => {
    const token = ++refreshToken.current;
    try {
      const badge = await api.getSupportUnreadBadge();
      if (token === refreshToken.current) setUnread(badge.unread || 0);
    } catch {
      // Ignore — badge stays at its last known value.
    }
  }, []);

  // Refresh on mount + poll every 30s so a human reply bumps the badge.
  React.useEffect(() => {
    void refreshUnread();
    const t = setInterval(() => void refreshUnread(), 30_000);
    return () => clearInterval(t);
  }, [refreshUnread]);

  // Re-check when the window regains focus (tab switch).
  React.useEffect(() => {
    const onFocus = () => void refreshUnread();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
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