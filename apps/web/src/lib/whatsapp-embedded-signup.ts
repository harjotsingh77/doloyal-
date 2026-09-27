"use client";

/**
 * Meta WhatsApp Embedded Signup (Facebook Login for Business) helpers.
 * Loads the FB JS SDK once and launches the Embedded Signup dialog.
 * Secrets never touch the client — only appId + configId are public.
 */

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: { authResponse?: { code?: string } | null; status?: string }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export type EmbeddedSignupSession = {
  phoneNumberId: string;
  wabaId: string;
  businessId?: string;
};

export type EmbeddedSignupMessage =
  | { kind: "finish"; session: EmbeddedSignupSession }
  | { kind: "failure"; message: string };

/** Only Meta's own https pages may post Embedded Signup results to this window. */
export function isMetaOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:") return false;
    return url.hostname === "facebook.com" || url.hostname.endsWith(".facebook.com");
  } catch {
    return false;
  }
}

/** Parses a WA_EMBEDDED_SIGNUP postMessage payload (session info v3). Unrelated messages return null. */
export function parseEmbeddedSignupMessage(data: unknown): EmbeddedSignupMessage | null {
  let raw: any = data;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object" || raw.type !== "WA_EMBEDDED_SIGNUP") return null;

  const event = String(raw.event || "").toUpperCase();
  const info = raw.data && typeof raw.data === "object" ? raw.data : {};

  if (event === "FINISH" || event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
    const phoneNumberId = String(info.phone_number_id || "").trim();
    const wabaId = String(info.waba_id || "").trim();
    if (!phoneNumberId || !wabaId) {
      return { kind: "failure", message: "Meta did not return the WhatsApp number you selected. Please try again." };
    }
    return {
      kind: "finish",
      session: {
        phoneNumberId,
        wabaId,
        businessId: info.business_id ? String(info.business_id) : undefined,
      },
    };
  }
  if (event === "FINISH_ONLY_WABA") {
    return {
      kind: "failure",
      message: "No phone number was added in the Meta window. Please try again and add or select a WhatsApp number.",
    };
  }
  if (event === "CANCEL" || event === "ERROR") {
    if (info.error_message) {
      return { kind: "failure", message: `Meta reported an error: ${String(info.error_message).slice(0, 200)}` };
    }
    return { kind: "failure", message: "Meta login was cancelled before it finished." };
  }
  return null;
}

let sdkPromise: Promise<void> | null = null;

function initFb(appId: string, graphVersion: string) {
  window.FB?.init({
    appId,
    cookie: true,
    xfbml: false,
    version: graphVersion.startsWith("v") ? graphVersion : `v${graphVersion}`,
  });
}

/** Loads + initialises the FB JS SDK. Call ahead of time so the login click can open the popup immediately. */
export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.FB) {
      initFb(appId, graphVersion);
      resolve();
      return;
    }
    window.fbAsyncInit = () => {
      try {
        initFb(appId, graphVersion);
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    if (document.getElementById("facebook-jssdk")) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Could not load Meta login. Check your connection or disable blockers for facebook.com."));
    document.body.appendChild(script);
  }).catch((err) => {
    sdkPromise = null;
    throw err;
  });

  return sdkPromise;
}

export function isFacebookSdkReady(): boolean {
  return typeof window !== "undefined" && Boolean(window.FB);
}

/**
 * Opens Meta Embedded Signup. Must be called directly from a click handler
 * after `loadFacebookSdk` has resolved — FB.login is invoked synchronously so
 * browsers treat the popup as user-initiated.
 */
export function launchWhatsAppEmbeddedSignup(opts: {
  configId: string;
}): Promise<{ code: string; session: EmbeddedSignupSession }> {
  if (!isFacebookSdkReady()) {
    return Promise.reject(new Error("Meta login is still loading. Please try again in a moment."));
  }
  const FB = window.FB!;

  return new Promise((resolve, reject) => {
    let session: EmbeddedSignupSession | null = null;
    let code: string | null = null;
    let settled = false;
    let sessionTimer: ReturnType<typeof setTimeout> | null = null;

    const finish = (error?: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      if (sessionTimer) clearTimeout(sessionTimer);
      if (error) reject(new Error(error));
      else resolve({ code: code!, session: session! });
    };

    const onMessage = (event: MessageEvent) => {
      if (!isMetaOrigin(event.origin)) return;
      const message = parseEmbeddedSignupMessage(event.data);
      if (!message) return;
      if (message.kind === "failure") {
        finish(message.message);
        return;
      }
      session = message.session;
      if (code) finish();
    };

    window.addEventListener("message", onMessage);

    FB.login(
      (response) => {
        code = response?.authResponse?.code || null;
        if (!code) {
          finish("Meta login was closed before it finished. Please try again.");
          return;
        }
        if (session) {
          finish();
          return;
        }
        // The session message normally arrives first; allow a short grace period (codes expire in ~30s).
        sessionTimer = setTimeout(
          () => finish("Meta did not return the WhatsApp number you selected. Please try again."),
          8_000,
        );
      },
      {
        config_id: opts.configId,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      },
    );
  });
}
