/**
 * Where the browser talks to the Nest API.
 *
 * NEXT_PUBLIC_* values are inlined at `next build`. If Vercel builds without
 * NEXT_PUBLIC_API_BASE_URL, the bundle used to contain http://localhost:4000
 * and every production login failed.
 *
 * Production therefore uses a same-origin `/backend` proxy. The real API host
 * is read at request time from API_BASE_URL (server env — not baked into JS).
 */

const DEV_API_FALLBACK = "http://localhost:4000";
const PRODUCTION_PROXY_PATH = "/backend";

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/.test(url);
}

export function getApiBaseUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");

  if (process.env.NODE_ENV !== "production") {
    if (typeof window !== "undefined") {
      return `${window.location.origin}${PRODUCTION_PROXY_PATH}`;
    }
    return explicit || DEV_API_FALLBACK;
  }

  if (explicit && !isLocalhostUrl(explicit)) {
    return explicit;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${PRODUCTION_PROXY_PATH}`;
  }

  const server = (process.env.API_BASE_URL || "").replace(/\/+$/, "");
  if (server && !isLocalhostUrl(server)) return server;

  return PRODUCTION_PROXY_PATH;
}

/** Kept for call sites. Production no longer throws — traffic goes through `/backend`. */
export function assertApiBaseUrlConfigured(): void {}

/**
 * Canonical origin of this web app, with no trailing slash.
 *
 * Use this for any customer-facing URL rendered in the dashboard — booking
 * links, referral links, widget embed snippets. In the browser it prefers the
 * live origin, so a link copied from production is always a production link.
 */
export function getAppBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;

  const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (configured && !isLocalhostUrl(configured)) return configured;

  return process.env.NODE_ENV === "production"
    ? "https://doloyal.com"
    : "http://localhost:3000";
}
