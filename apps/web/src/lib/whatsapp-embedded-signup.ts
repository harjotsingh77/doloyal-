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
        cb: (response: { authResponse?: { code?: string }; status?: string }) => void,
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

let sdkPromise: Promise<void> | null = null;

export function loadFacebookSdk(appId: string, graphVersion: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      try {
        window.FB?.init({
          appId,
          cookie: true,
          xfbml: false,
          version: graphVersion.startsWith("v") ? graphVersion : `v${graphVersion}`,
        });
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    if (document.getElementById("facebook-jssdk")) {
      // Script already injected; wait for init.
      const started = Date.now();
      const tick = () => {
        if (window.FB) {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: false,
            version: graphVersion.startsWith("v") ? graphVersion : `v${graphVersion}`,
          });
          resolve();
          return;
        }
        if (Date.now() - started > 15000) {
          reject(new Error("Facebook SDK failed to load"));
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.onerror = () => reject(new Error("Failed to load Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Listens for the WA_EMBEDDED_SIGNUP message event that carries WABA + phone IDs.
 * Must be attached before launching FB.login.
 */
export function waitForEmbeddedSignupSession(timeoutMs = 120_000): {
  promise: Promise<EmbeddedSignupSession>;
  cancel: () => void;
} {
  let done = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = new Promise<EmbeddedSignupSession>((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      if (done) return;
      if (!event.origin.includes("facebook.com") && !event.origin.includes("fb.com")) return;

      try {
        const raw = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (!raw || raw.type !== "WA_EMBEDDED_SIGNUP") return;

        if (raw.event === "CANCEL" || raw.event === "error") {
          done = true;
          cleanup();
          reject(new Error("Meta login was cancelled."));
          return;
        }

        const phoneNumberId = String(raw?.data?.phone_number_id || "").trim();
        const wabaId = String(raw?.data?.waba_id || "").trim();
        const businessId = raw?.data?.business_id
          ? String(raw.data.business_id)
          : undefined;

        if (phoneNumberId && wabaId) {
          done = true;
          cleanup();
          resolve({ phoneNumberId, wabaId, businessId });
        }
      } catch {
        // Ignore non-JSON / unrelated messages.
      }
    };

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (timer) clearTimeout(timer);
    };

    window.addEventListener("message", onMessage);
    timer = setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("Timed out waiting for Meta WhatsApp signup. Please try again."));
    }, timeoutMs);
  });

  return {
    promise,
    cancel: () => {
      done = true;
    },
  };
}

export async function launchWhatsAppEmbeddedSignup(opts: {
  appId: string;
  configId: string;
  graphVersion?: string;
}): Promise<{ code: string; session: EmbeddedSignupSession }> {
  const graphVersion = opts.graphVersion || "v21.0";
  await loadFacebookSdk(opts.appId, graphVersion);

  if (!window.FB) {
    throw new Error("Facebook SDK is unavailable.");
  }

  const sessionWait = waitForEmbeddedSignupSession();

  const code = await new Promise<string>((resolve, reject) => {
    window.FB!.login(
      (response) => {
        const authCode = response?.authResponse?.code;
        if (authCode) {
          resolve(authCode);
          return;
        }
        sessionWait.cancel();
        reject(new Error("Meta login did not return an authorization code. Please try again."));
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

  const session = await sessionWait.promise;
  return { code, session };
}
