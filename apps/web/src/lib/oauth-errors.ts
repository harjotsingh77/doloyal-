/**
 * Maps OAuth/callback failures onto sign-in query params so the user sees the
 * real class of failure instead of a generic "Google could not be completed".
 */

export type AuthFailureReason = "error" | "unavailable" | "denied" | "oauth";

const MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled or declined.",
  denied: "Google sign-in was cancelled or declined.",
  auth_failed: "Google sign-in could not be completed. Please try again.",
  error: "Google sign-in could not be completed. Please try again.",
  oauth: "Google sign-in could not be completed. Please try again.",
  unavailable:
    "Sign-in is temporarily unavailable because the database is down. Please try again shortly.",
  database:
    "Sign-in is temporarily unavailable because the database is down. Please try again shortly.",
};

export function messageForAuthQuery(value: string | null | undefined): string | null {
  if (!value) return null;
  return MESSAGES[value] ?? "Google sign-in could not be completed. Please try again.";
}

export function authFailurePath(
  clientSlug: string | null | undefined,
  reason: AuthFailureReason,
): string {
  const q = new URLSearchParams({ auth: reason });
  if (clientSlug) return `/book/${encodeURIComponent(clientSlug)}/sign-in?${q}`;
  return `/sign-in?${q}`;
}

export function authFailureReasonFromUnknown(err: unknown): AuthFailureReason {
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code) : "";
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status?: unknown }).status)
      : 0;
  if (
    code === "DATABASE_UNAVAILABLE" ||
    code === "DATABASE_ERROR" ||
    code === "API_UNREACHABLE" ||
    code === "API_UNCONFIGURED" ||
    status === 503 ||
    status >= 500
  ) {
    return "unavailable";
  }
  return "error";
}
