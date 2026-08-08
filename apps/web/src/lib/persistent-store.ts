const PREFIX = "doloyal_store_";

export function isMockSession(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("doloyal_token");
  return !token || token === "mock-token" || token === "demo-token";
}

export function loadStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveStore<T>(key: string, value: T): T {
  if (typeof window !== "undefined") {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
  }
  return value;
}

export function patchStore<T extends Record<string, unknown>>(
  key: string,
  patch: Partial<T>,
  fallback: T,
): T {
  const current = loadStore<T>(key, fallback);
  const next = { ...current, ...patch };
  return saveStore(key, next);
}

export function deepMergeDefaults<T>(value: T | null | undefined, defaults: T): T {
  if (!value || typeof value !== "object") return { ...defaults };
  return { ...defaults, ...value };
}
