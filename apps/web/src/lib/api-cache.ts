import type { AppDataScope } from "./data-sync";

/** Skip the network while a response is this fresh. */
const FRESH_MS = 90_000;
/** Show the last payload instantly for this long, then refresh behind it. */
const KEEP_MS = 30 * 60_000;
const MAX_ENTRIES = 80;
const DISK_KEY = "doloyal_page_data_v1";
const MAX_DISK_CHARS = 1_500_000;

type Entry = {
  at: number;
  data: unknown;
  generation: number;
};

type DiskRow = { key: string; at: number; data: unknown };

const store = new Map<string, Entry>();
const generations = new Map<string, number>();
const inflight = new Map<string, Promise<unknown>>();
let hydrated = false;
let diskTimer: ReturnType<typeof setTimeout> | null = null;

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

function tokenHash(token: string | null) {
  const value = token || "anon";
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  return (hash >>> 0).toString(36);
}

function pathKey(path: string, token: string | null) {
  return `${tokenHash(token)} ${path}`;
}

export function querySnapshotKey(queryKey: unknown, token: string | null) {
  return `${tokenHash(token)} q:${JSON.stringify(queryKey)}`;
}

function prefixesFor(scopes: AppDataScope[]): string[] {
  if (scopes.includes("all")) return Object.values(PREFIXES).flat();
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

function pathFromKey(key: string) {
  const space = key.indexOf(" ");
  return space === -1 ? key : key.slice(space + 1);
}

export function scopesForCachedPath(path: string): AppDataScope[] {
  const pathname = pathnameOf(path);
  const scopes: AppDataScope[] = [];
  for (const [scope, prefixes] of Object.entries(PREFIXES) as Array<[Exclude<AppDataScope, "all">, string[]]>) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      scopes.push(scope);
    }
  }
  return scopes;
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

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = sessionStorage.getItem(DISK_KEY);
    if (!raw) return;
    const rows = JSON.parse(raw) as DiskRow[];
    const now = Date.now();
    for (const row of rows) {
      if (!row || typeof row.key !== "string" || now - row.at > KEEP_MS) continue;
      const path = pathFromKey(row.key);
      store.set(row.key, {
        at: row.at,
        data: row.data,
        generation: path.startsWith("q:") ? 0 : generationForPath(path),
      });
    }
  } catch {
    sessionStorage.removeItem(DISK_KEY);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  if (diskTimer) clearTimeout(diskTimer);
  diskTimer = setTimeout(() => {
    diskTimer = null;
    try {
      const rows: DiskRow[] = [];
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now - entry.at > KEEP_MS) continue;
        rows.push({ key, at: entry.at, data: entry.data });
      }
      let json = JSON.stringify(rows);
      while (json.length > MAX_DISK_CHARS && rows.length > 1) {
        rows.shift();
        json = JSON.stringify(rows);
      }
      sessionStorage.setItem(DISK_KEY, json);
    } catch {
      // Quota or private mode: memory cache still works for this tab.
    }
  }, 80);
}

function readEntry(key: string) {
  hydrate();
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > KEEP_MS) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

export function readGetCache<T>(path: string, token: string | null): T | undefined {
  if (!isCacheableGet(path)) return undefined;
  const entry = readEntry(pathKey(path, token));
  if (!entry) return undefined;
  if (Date.now() - entry.at > FRESH_MS) return undefined;
  if (entry.generation !== generationForPath(path)) return undefined;
  return entry.data as T;
}

/** Last good payload, even if it should be refreshed. */
export function readStaleCache<T>(path: string, token: string | null): T | undefined {
  if (!isCacheableGet(path)) return undefined;
  const entry = readEntry(pathKey(path, token));
  if (!entry) return undefined;
  if (entry.generation !== generationForPath(path)) return undefined;
  return entry.data as T;
}

export function beginGetCache(path: string) {
  return generationForPath(path);
}

export function writeGetCache(path: string, token: string | null, data: unknown, generation: number) {
  if (!isCacheableGet(path)) return;
  if (generation !== generationForPath(path)) return;
  const key = pathKey(path, token);
  store.set(key, { at: Date.now(), data, generation });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
  persist();
}

export function readQuerySnapshot<T>(queryKey: unknown, token: string | null): { data: T; at: number } | undefined {
  const entry = readEntry(querySnapshotKey(queryKey, token));
  if (!entry) return undefined;
  return { data: entry.data as T, at: entry.at };
}

export function writeQuerySnapshot(queryKey: unknown, token: string | null, data: unknown) {
  const key = querySnapshotKey(queryKey, token);
  store.set(key, { at: Date.now(), data, generation: 0 });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
  persist();
}

export function trackInflight<T>(path: string, token: string | null, run: () => Promise<T>): Promise<T> {
  const key = pathKey(path, token);
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const pending = run().finally(() => {
    if (inflight.get(key) === pending) inflight.delete(key);
  });
  inflight.set(key, pending);
  return pending;
}

export function invalidateGetCache(scopes: AppDataScope[]) {
  hydrate();
  const prefixes = prefixesFor(scopes.length ? scopes : ["all"]);
  for (const scope of scopes.includes("all")
    ? (Object.keys(PREFIXES) as Array<Exclude<AppDataScope, "all">>)
    : scopes) {
    if (scope === "all") continue;
    generations.set(scope, (generations.get(scope) ?? 0) + 1);
  }
  for (const key of store.keys()) {
    const path = pathFromKey(key);
    // Keep query snapshots so a page can paint the last result while the
    // refetch runs. Drop the GET entry so that refetch cannot reuse pre-mutation data.
    if (path.startsWith("q:")) continue;
    const dropPath = prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (dropPath) store.delete(key);
  }
  persist();
}

export function clearPageCache() {
  store.clear();
  inflight.clear();
  generations.clear();
  if (typeof window !== "undefined") sessionStorage.removeItem(DISK_KEY);
}
