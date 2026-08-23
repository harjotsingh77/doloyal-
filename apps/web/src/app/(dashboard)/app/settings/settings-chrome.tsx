"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  cn,
} from "@doloyal/ui";

/* ── Save-status ───────────────────────────────────────────────────────────
 * Pages report their persistence state up to the settings header so the
 * indicator is always real: nothing is ever claimed "saved" that isn't.
 */
export type SettingsSaveStatus = "idle" | "saving" | "unsaved" | "saved" | "error";

interface SettingsChromeValue {
  status: SettingsSaveStatus;
  setStatus: (s: SettingsSaveStatus) => void;
  /** Resolves true when the user chooses to discard their changes. */
  confirmDiscard: () => Promise<boolean>;
  registerGuard: (isDirty: () => boolean) => () => void;
}

const SettingsChromeContext = React.createContext<SettingsChromeValue | null>(null);

export function useSettingsChrome(): SettingsChromeValue {
  const ctx = React.useContext(SettingsChromeContext);
  if (!ctx) throw new Error("useSettingsChrome must be used within SettingsLayout");
  return ctx;
}

/**
 * Hook for pages with explicit-save forms. Reports dirty state to the header
 * and guards navigation (in-app links + tab close) so input is never lost.
 */
export function useUnsavedGuard(dirty: boolean) {
  const { setStatus, registerGuard } = useSettingsChrome();

  React.useEffect(() => {
    setStatus(dirty ? "unsaved" : "idle");
    return () => setStatus("idle");
  }, [dirty, setStatus]);

  React.useEffect(() => {
    return registerGuard(() => dirty);
  }, [dirty, registerGuard]);
}

/* ── Provider (mounted once by the settings layout) ─────────────────────── */

export function SettingsChromeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<SettingsSaveStatus>("idle");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const dirtyRef = React.useRef<() => boolean>(() => false);
  const pendingHref = React.useRef<string | null>(null);
  const resolver = React.useRef<((discard: boolean) => void) | null>(null);

  const registerGuard = React.useCallback((isDirty: () => boolean) => {
    dirtyRef.current = isDirty;
    return () => {
      if (dirtyRef.current === isDirty) dirtyRef.current = () => false;
    };
  }, []);

  // Block tab close / refresh while a page reports unsaved work.
  React.useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Intercept clicks on any link while a page reports unsaved work.
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current()) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || anchor.target === "_blank")
        return;
      if (window.location.pathname + window.location.search === href) return;

      e.preventDefault();
      e.stopPropagation();
      pendingHref.current = href;
      setDialogOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const settle = React.useCallback(
    (discard: boolean) => {
      setDialogOpen(false);
      const href = pendingHref.current;
      pendingHref.current = null;
      resolver.current?.(discard);
      resolver.current = null;
      if (discard && href) {
        dirtyRef.current = () => false; // user explicitly discarded
        router.push(href);
      }
    },
    [router],
  );

  const confirmDiscard = React.useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setDialogOpen(true);
      }),
    [],
  );

  const value = React.useMemo(
    () => ({ status, setStatus, confirmDiscard, registerGuard }),
    [status, confirmDiscard, registerGuard],
  );

  return (
    <SettingsChromeContext.Provider value={value}>
      {children}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && settle(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Do you want to leave without saving?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => settle(false)}>
              Stay
            </Button>
            <Button variant="danger" onClick={() => settle(true)}>
              Discard changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsChromeContext.Provider>
  );
}

/* ── Status pill shown in the settings header ───────────────────────────── */

export function SaveStatusIndicator({ className }: { className?: string }) {
  const { status } = useSettingsChrome();

  const map: Record<
    SettingsSaveStatus,
    { label: string; dot: string; text: string } | null
  > = {
    idle: null,
    saving: { label: "Saving…", dot: "bg-[rgb(var(--color-warning))]", text: "text-[rgb(var(--color-muted-foreground))]" },
    unsaved: { label: "Unsaved changes", dot: "bg-[rgb(var(--color-warning))]", text: "text-[rgb(var(--color-foreground))]" },
    saved: { label: "Saved", dot: "bg-[rgb(var(--color-success))]", text: "text-[rgb(var(--color-muted-foreground))]" },
    error: { label: "Not saved", dot: "bg-[rgb(var(--color-danger))]", text: "text-[rgb(var(--color-danger))]" },
  };
  const view = map[status];
  if (!view) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-1.5 text-xs font-medium",
        view.text,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", view.dot)} />
      {view.label}
    </div>
  );
}
