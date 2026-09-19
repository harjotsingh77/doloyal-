import * as React from "react";

export type AppDataScope =
  | "dashboard"
  | "customers"
  | "orders"
  | "products"
  | "reviews"
  | "campaigns"
  | "invoices"
  | "loyalty"
  | "rewards"
  | "appointments"
  | "all";

const EVENT = "doloyal:data-changed";
const CHANNEL = "doloyal-sync";

const PATH_SCOPES: Array<{ test: RegExp; scopes: AppDataScope[] }> = [
  { test: /^\/customers/, scopes: ["customers", "dashboard", "campaigns"] },
  { test: /^\/orders/, scopes: ["orders", "customers", "dashboard", "products", "loyalty"] },
  { test: /^\/products/, scopes: ["products", "orders", "dashboard"] },
  { test: /^\/reviews/, scopes: ["reviews", "dashboard", "customers"] },
  { test: /^\/public\/reviews/, scopes: ["reviews", "dashboard", "customers"] },
  { test: /^\/campaigns/, scopes: ["campaigns", "dashboard"] },
  { test: /^\/invoices/, scopes: ["invoices", "customers", "dashboard", "loyalty"] },
  { test: /^\/loyalty/, scopes: ["loyalty", "rewards", "customers", "dashboard"] },
  { test: /^\/rewards/, scopes: ["rewards", "loyalty", "customers", "dashboard"] },
  { test: /^\/referrals/, scopes: ["customers", "dashboard", "loyalty"] },
  { test: /^\/appointments/, scopes: ["appointments", "dashboard"] },
  { test: /^\/memberships/, scopes: ["dashboard"] },
  { test: /^\/dashboard/, scopes: ["dashboard"] },
];

let channel: BroadcastChannel | null = null;
let listenersBound = false;

function getChannel() {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL);
    } catch {
      channel = null;
    }
  }
  return channel;
}

function bindCrossTab() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  const ch = getChannel();
  if (!ch) return;
  ch.onmessage = (event) => {
    const scopes = Array.isArray(event.data?.scopes) ? event.data.scopes : ["all"];
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { scopes } }));
  };
}

export function scopesForApiPath(path: string, method = "GET"): AppDataScope[] | null {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD" || verb === "OPTIONS") return null;
  const pathname = path.split("?")[0] || path;
  const matched = PATH_SCOPES.filter((row) => row.test.test(pathname)).flatMap((row) => row.scopes);
  if (!matched.length) return ["dashboard"];
  return Array.from(new Set(matched));
}

export function notifyAppChange(scopes: AppDataScope[]) {
  if (typeof window === "undefined") return;
  bindCrossTab();
  const unique = Array.from(new Set(scopes.length ? scopes : (["all"] as AppDataScope[])));
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { scopes: unique } }));
  getChannel()?.postMessage({ scopes: unique });
}

export function notifyFromApiPath(path: string, method: string) {
  const scopes = scopesForApiPath(path, method);
  if (scopes) notifyAppChange(scopes);
}

/** Finder / OS file dialogs blur the window. Reloading on focus would unmount
 *  the <input type="file"> before its change event fires. */
let suppressFocusReloadUntil = 0;

export function suppressAppSyncFocusReload(ms = 20_000) {
  suppressFocusReloadUntil = Math.max(suppressFocusReloadUntil, Date.now() + ms);
}

export function useAppSync(scopes: AppDataScope[], reload: () => void) {
  const reloadRef = React.useRef(reload);
  reloadRef.current = reload;
  const scopesKey = scopes.slice().sort().join(",");

  React.useEffect(() => {
    bindCrossTab();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const wanted = new Set(scopes);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scopes?: AppDataScope[] }>).detail;
      const incoming = detail?.scopes || ["all"];
      const hit = incoming.includes("all") || incoming.some((scope) => wanted.has(scope) || wanted.has("all"));
      if (!hit) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => reloadRef.current(), 120);
    };

    window.addEventListener(EVENT, onChange);
    const onFocus = () => {
      if (Date.now() < suppressFocusReloadUntil) return;
      reloadRef.current();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [scopesKey]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function useCommerceLive(
  scopes: AppDataScope[],
  reload: () => void,
  options?: { publicSlug?: string | null },
) {
  useAppSync(scopes, reload);
  const reloadRef = React.useRef(reload);
  reloadRef.current = reload;
  const scopesKey = scopes.slice().sort().join(",");
  const slug = options?.publicSlug || "";

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // Cross-request in-memory event buses are not reliable on serverless:
    // the mutation and EventSource connection can land on different function
    // instances. Poll only while visible; local mutation/cross-tab updates are
    // still immediate through useAppSync above.
    const poll = () => {
      if (document.visibilityState === "visible") reloadRef.current();
    };
    const interval = window.setInterval(poll, slug ? 10_000 : 15_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [scopesKey, slug]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Reliable near-realtime refresh for Vercel Functions. */
export function useServerlessPolling(
  reload: () => void,
  intervalMs = 15_000,
  enabled = true,
) {
  const reloadRef = React.useRef(reload);
  reloadRef.current = reload;

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const poll = () => {
      if (document.visibilityState === "visible") reloadRef.current();
    };
    const interval = window.setInterval(poll, intervalMs);
    return () => window.clearInterval(interval);
  }, [enabled, intervalMs]);
}
