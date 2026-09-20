/**
 * Maps OAuth/callback failures onto sign-in query params so the user sees the
 * real class of failure instead of a generic "Google could not be completed".
 */

export type AuthFailureReason = "error" | "unavailable" | "denied" | "oauth";

const DETAIL_KEY = "doloyal_auth_failure_detail";

const MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled or declined.",
  denied: "Google sign-in was cancelled or declined.",
  auth_failed: "Google sign-in could not be completed. Please try again.",
  error: "Google sign-in could not be completed. Please try again.",
  oauth: "Google sign-in could not be completed. Please try again.",
  unavailable:
    "Sign-in could not finish because the database is unavailable (DATABASE_UNAVAILABLE). Google succeeded; the API cannot create a session until DATABASE_URL points at the live Supabase pooler.",
  database:
    "Sign-in could not finish because the database is unavailable (DATABASE_UNAVAILABLE). Google succeeded; the API cannot create a session until DATABASE_URL points at the live Supabase pooler.",
};

export type AuthFailureDetail = {
  reason: AuthFailureReason;
  code?: string;
  message?: string;
};

export function rememberAuthFailure(detail: AuthFailureDetail): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(DETAIL_KEY, JSON.stringify(detail));
  } catch {
    // sessionStorage can be unavailable in locked-down browsers.
  }
}

export function consumeAuthFailureDetail(): AuthFailureDetail | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DETAIL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(DETAIL_KEY);
    const parsed = JSON.parse(raw) as AuthFailureDetail;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function messageFromDetail(detail: AuthFailureDetail | null): string | null {
  if (!detail) return null;
  const code = (detail.code || "").toUpperCase();
  const haystack = `${code} ${detail.message || ""} ${detail.reason}`;
  if (
    code === "DATABASE_UNAVAILABLE" ||
    code === "DATABASE_ERROR" ||
    detail.reason === "unavailable" ||
    /database|prisma|localhost:5432/i.test(haystack)
  ) {
    return MESSAGES.unavailable;
  }
  if (detail.message && detail.reason !== "oauth" && detail.reason !== "error") {
    return detail.message;
  }
  return null;
}

export function messageForAuthQuery(value: string | null | undefined): string | null {
  const fromDetail = messageFromDetail(consumeAuthFailureDetail());
  if (fromDetail) return fromDetail;
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
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message)
      : String(err ?? "");
  if (
    code === "DATABASE_UNAVAILABLE" ||
    code === "DATABASE_ERROR" ||
    code === "API_UNREACHABLE" ||
    code === "API_UNCONFIGURED" ||
    status === 503 ||
    status >= 500 ||
    /database|prisma|localhost:5432/i.test(`${code} ${message}`)
  ) {
    return "unavailable";
  }
  return "error";
}

export function detailFromUnknown(
  err: unknown,
  reason: AuthFailureReason,
): AuthFailureDetail {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: unknown }).code || "")
      : "";
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message || "")
      : err instanceof Error
        ? err.message
        : "";
  return { reason, code: code || undefined, message: message || undefined };
}
