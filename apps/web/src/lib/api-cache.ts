import type { AppDataScope } from "./data-sync";

/** Fresh enough to make back-navigation instant, short enough to avoid stale lists. */
const FRESH_MS = 90_000;
const MAX_ENTRIES = 200;

type Entry = {
  at: number;
  data: unknown;
  /** Generation captured when the request started. A newer invalidation drops the write. */
  generation: number;
};

const store = new Map<string, Entry>();
const generations = new Map<string, number>();

const PREFIXES: Record<Exclude<AppDataScope, "all">, string[]> = {
  dashboard: ["/dashboard", "/assistant/business-health", "/memberships", "/referrals"],
  customers: ["/customers"],
  orders: ["/orders"],
  products: ["/products"],
  reviews: ["/reviews", "/public/reviews"],
  campaigns: ["/campaigns"],
  invoices: ["/invoices"],
  loyalty: ["/loyalty"],
  rewards: ["/rewards"],
  appointments: ["/appointments"],
};

function pathnameOf(path: string) {
  return path.split("?")[0] || path;
}

function prefixesFor(scopes: AppDataScope[]): string[] {
  if (scopes.includes("all")) {
    return Object.values(PREFIXES).flat();
  }
  return scopes.flatMap((scope) => (scope === "all" ? [] : PREFIXES[scope] ?? []));
}

function generationForPath(path: string) {
  const pathname = pathnameOf(path);
  let generation = 0;
  for (const [scope, prefixes] of Object.entries(PREFIXES) as Array<[Exclude<AppDataScope, "all">, string[]]>) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      generation += generations.get(scope) ?? 0;
    }
  }
  return generation;
}

export function isCacheableGet(path: string) {
  const pathname = pathnameOf(path);
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/billing") ||
    pathname.startsWith("/checkout") ||
    pathname.includes("/export") ||
    pathname.includes("/upload")
  ) {
    return false;
  }
  return Object.values(PREFIXES)
    .flat()
    .some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function readGetCache<T>(path: string, token: string | null): T | undefined {
  if (!isCacheableGet(path)) return undefined;
  const entry = store.get(`${token ?? ""} ${path}`);
  if (!entry) return undefined;
  if (Date.now() - entry.at > FRESH_MS) {
    store.delete(`${token ?? ""} ${path}`);
    return undefined;
  }
  if (entry.generation !== generationForPath(path)) {
    store.delete(`${token ?? ""} ${path}`);
    return undefined;
  }
  return entry.data as T;
}

export function beginGetCache(path: string) {
  return generationForPath(path);
}

export function writeGetCache(path: string, token: string | null, data: unknown, generation: number) {
  if (!isCacheableGet(path)) return;
  if (generation !== generationForPath(path)) return;
  const key = `${token ?? ""} ${path}`;
  store.set(key, { at: Date.now(), data, generation });
  if (store.size <= MAX_ENTRIES) return;
  const oldest = store.keys().next().value;
  if (oldest) store.delete(oldest);
}

/** Drop cached GETs for the resources a mutation just changed. */
export function invalidateGetCache(scopes: AppDataScope[]) {
  const prefixes = prefixesFor(scopes.length ? scopes : ["all"]);
  const touched = new Set<Exclude<AppDataScope, "all">>();
  for (const scope of scopes.includes("all") ? (Object.keys(PREFIXES) as Array<Exclude<AppDataScope, "all">>) : scopes) {
    if (scope === "all") continue;
    touched.add(scope);
    generations.set(scope, (generations.get(scope) ?? 0) + 1);
  }
  if (!touched.size && scopes.includes("all")) {
    for (const scope of Object.keys(PREFIXES) as Array<Exclude<AppDataScope, "all">>) {
      generations.set(scope, (generations.get(scope) ?? 0) + 1);
    }
  }
  for (const key of store.keys()) {
    const path = key.slice(key.indexOf(" ") + 1);
    const pathname = pathnameOf(path);
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      store.delete(key);
    }
  }
}
