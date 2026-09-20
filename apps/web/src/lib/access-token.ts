/**
 * Doloyal API sessions are JWTs with `kind: "staff" | "customer"`.
 * Supabase access tokens must never be sent as `Authorization: Bearer` —
 * Nest's JWT guard rejects them as 401 Unauthorized.
 */

export function isDoloyalAccessToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || !parts[1]) return false;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8");
    const payload = JSON.parse(json) as { kind?: unknown };
    return payload.kind === "staff" || payload.kind === "customer";
  } catch {
    return false;
  }
}

export function sanitizeApiToken(raw: string | null): string | null {
  if (!raw) return null;
  if (process.env.NODE_ENV !== "production" && (raw === "mock-token" || raw === "demo-token")) {
    return raw;
  }
  return isDoloyalAccessToken(raw) ? raw : null;
}

export function getStaffAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeApiToken(localStorage.getItem("doloyal_token"));
}

export function getClientAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return sanitizeApiToken(localStorage.getItem("doloyal_client_token"));
}

/** Drop a Supabase/demo token that would 401 every dashboard request. */
export function purgeInvalidStaffSession(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem("doloyal_token");
  if (!raw || sanitizeApiToken(raw)) return false;
  localStorage.removeItem("doloyal_token");
  localStorage.removeItem("doloyal_user");
  return true;
}
