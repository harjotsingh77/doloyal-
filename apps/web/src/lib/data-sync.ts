import * as React from "react";
import { invalidateGetCache } from "./api-cache";
import { getApiBaseUrl } from "./api-base";
import { getStaffAuthToken } from "./access-token";

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
    invalidateGetCache(scopes);
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
  // Drop cached GETs before listeners refetch, so they cannot read the pre-mutation payload.
  invalidateGetCache(unique);
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
    // Refetch only after the tab was actually away. Focusing the window to
    // pick a file, or clicking back from another app for a moment, must not
    // throw away the page and wait on the API again.
    let hiddenAt = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt || Date.now() < suppressFocusReloadUntil) return;
      if (Date.now() - hiddenAt >= 45_000) reloadRef.current();
      hiddenAt = 0;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisibility);
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
      if (document.visibilityState !== "visible") return;
      // Drop GET cache before refetch so public buy/booking orders are not
      // masked by a fresh-but-stale prefetch from /app/customers/orders.
      invalidateGetCache(scopes.length ? scopes : ["all"]);
      reloadRef.current();
    };
    const interval = window.setInterval(poll, slug ? 30_000 : 12_000);
    return () => {
      window.clearInterval(interval);
    };
  }, [scopesKey, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  // Staff tabs: subscribe to commerce SSE so public purchase/booking publishes
  // invalidate orders immediately when the API process is shared.
  React.useEffect(() => {
    if (typeof window === "undefined" || slug) return;
    const token = getStaffAuthToken();
    if (!token) return;
    const base = getApiBaseUrl().replace(/\/+$/, "");
    const url = `${base}/commerce/events?access_token=${encodeURIComponent(token)}`;
    const source = new EventSource(url);
    const wanted = new Set(scopes);
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { scope?: AppDataScope };
        const scope = data?.scope;
        if (!scope) return;
        if (!wanted.has("all") && !wanted.has(scope)) return;
        notifyAppChange([scope]);
        reloadRef.current();
      } catch {
        // ignore malformed keepalive payloads
      }
    };
    return () => {
      source.close();
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
