/**
 * Single source of truth for the Doloyal API base URL.
 *
 * The value of `NEXT_PUBLIC_API_BASE_URL` is inlined into the client bundle at
 * BUILD time by Next.js. If it is unset (or still the localhost default) when
 * `next build` runs, every API call silently targets `http://localhost:4000`
 * and production fails with CORS / "Failed to fetch" errors — exactly what was
 * happening in production.
 *
 * To fix a misconfigured production bundle, set `NEXT_PUBLIC_API_BASE_URL` in
 * the web app's Vercel project (Settings → Environment Variables) to the
 * deployed API URL, then redeploy with "Use existing Build Cache" UNCHECKED.
 */

const DEV_API_FALLBACK = "http://localhost:4000";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || DEV_API_FALLBACK;
  return raw.replace(/\/+$/, "");
}

/**
 * Throws a descriptive error when a production bundle is about to issue a
 * request against the localhost fallback. Kept as a no-op in development so
 * localhost workflows keep working without keys.
 */
export function assertApiBaseUrlConfigured(): void {
  const env = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NODE_ENV !== "production") return;
  if (env && env !== DEV_API_FALLBACK && env.trim() !== "") return;
  throw new Error(
    "Doloyal API base URL is misconfigured in this production build: " +
      "NEXT_PUBLIC_API_BASE_URL is not set to the deployed API URL, so the app " +
      "falls back to http://localhost:4000, which the browser cannot reach. " +
      "Set NEXT_PUBLIC_API_BASE_URL in the web app's Vercel project and redeploy " +
      "with the build cache disabled.",
  );
}
