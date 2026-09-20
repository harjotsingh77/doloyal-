"use client";

import * as React from "react";
import type { AuthUser, ClientPortal } from "@doloyal/shared";
import { api } from "./api";
import { supabase, isSupabaseConfigured, getAuthCallbackUrl, getMissingSupabaseConfig, ensureCanonicalAuthOrigin } from "./supabase";
import { toast } from "sonner";

const TOKEN_KEY = "doloyal_client_token";
const USER_KEY = "doloyal_client_user";
export const CLIENT_OAUTH_SLUG_KEY = "doloyal_client_oauth_slug";

type ClientPortalState = ClientPortal | null;

interface ClientAuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  needsPhone: boolean;
  isLoading: boolean;
  portal: ClientPortalState;
  login: (email: string, password: string, slug: string) => Promise<AuthUser>;
  signUp: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    slug: string;
  }) => Promise<AuthUser>;
  loginWithGoogle: (slug: string) => void;
  completePhone: (phone: string) => Promise<AuthUser>;
  logout: (slug: string) => void;
  setSession: (token: string, user: AuthUser) => void;
  refreshPortal: () => Promise<ClientPortalState>;
}

const ClientAuthContext = React.createContext<ClientAuthContextValue | null>(null);

function readUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

function persist(token: string | null, user: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (token && user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(readUser);
  const [isLoading, setIsLoading] = React.useState(false);
  const [portal, setPortal] = React.useState<ClientPortalState>(null);

  const setSession = React.useCallback((token: string, next: AuthUser) => {
    persist(token, next);
    setUser(next);
  }, []);

  const clear = React.useCallback(() => {
    persist(null, null);
    setUser(null);
    setPortal(null);
  }, []);

  const refreshPortal = React.useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try {
      const data = await api.getClientPortal();
      if (data?.needsPhone) {
        setUser((prev) => (prev ? { ...prev, needsPhone: true } : prev));
        return null;
      }
      if (data?.customer) {
        const next: ClientPortal = {
          customer: data.customer,
          appointments: data.appointments ?? [],
          rewards: data.rewards ?? [],
          membership: data.membership ?? null,
          referralCode: data.referralCode ?? null,
          pointsBalance: data.pointsBalance ?? data.customer.pointsBalance,
        };
        setPortal(next);
        setUser((prev) =>
          prev
            ? { ...prev, needsPhone: false, customerId: data.customer!.id, phone: data.customer!.phone }
            : prev,
        );
        return next;
      }
    } catch {
      // Keep the cached session; the page guard will re-auth if the token is invalid.
    }
    return null;
  }, []);

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!token) return;
    void refreshPortal();
  }, [refreshPortal]);

  const afterAuth = React.useCallback(
    (result: { token: string; user: AuthUser; needsPhone?: boolean }) => {
      const next = {
        ...result.user,
        sessionKind: "customer" as const,
        needsPhone: result.needsPhone ?? result.user.needsPhone,
      };
      setSession(result.token, next);
      void refreshPortal();
      return next;
    },
    [setSession, refreshPortal],
  );

  const login = React.useCallback(
    async (email: string, password: string, slug: string) => {
      setIsLoading(true);
      try {
        const result = await api.clientLogin(email, password, slug);
        if (!result?.token || !result?.user) throw new Error("Login failed. Please try again.");
        return afterAuth(result);
      } finally {
        setIsLoading(false);
      }
    },
    [afterAuth],
  );

  const signUp = React.useCallback(
    async (data: { name: string; email: string; phone: string; password: string; slug: string }) => {
      setIsLoading(true);
      try {
        const parts = data.name.trim().split(/\s+/);
        const result = await api.clientSignUp({
          tenantSlug: data.slug,
          firstName: parts[0] || data.name,
          lastName: parts.slice(1).join(" "),
          email: data.email,
          password: data.password,
          phone: data.phone,
        });
        if (!result?.token || !result?.user) throw new Error("Sign up failed. Please try again.");
        return afterAuth(result);
      } finally {
        setIsLoading(false);
      }
    },
    [afterAuth],
  );

  const googleInFlight = React.useRef(false);
  const loginWithGoogle = React.useCallback((slug: string) => {
    if (googleInFlight.current) return;
    if (!ensureCanonicalAuthOrigin()) return;
    if (!isSupabaseConfigured()) {
      console.error("[client-auth] Google sign-in disabled:", getMissingSupabaseConfig());
      toast.error("Google sign-in is not configured yet. Please try again later.");
      return;
    }
    googleInFlight.current = true;
    setIsLoading(true);
    sessionStorage.setItem(CLIENT_OAUTH_SLUG_KEY, slug);
    const redirectTo = getAuthCallbackUrl({ clientSlug: slug });
    void supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      .then(({ error }) => {
        if (error) {
          googleInFlight.current = false;
          setIsLoading(false);
          toast.error("Unable to start Google sign-in. Please try again.");
        }
      })
      .catch(() => {
        googleInFlight.current = false;
        setIsLoading(false);
        toast.error("Unable to reach the sign-in service. Check your connection and try again.");
      });
  }, []);

  const completePhone = React.useCallback(
    async (phone: string) => {
      setIsLoading(true);
      try {
        const result = await api.clientCompletePhone(phone);
        if (!result?.token || !result?.user) throw new Error("Could not save your phone number.");
        return afterAuth(result);
      } finally {
        setIsLoading(false);
      }
    },
    [afterAuth],
  );

  const logout = React.useCallback(
    (slug: string) => {
      void (async () => {
        try {
          if (isSupabaseConfigured() && sessionStorage.getItem(CLIENT_OAUTH_SLUG_KEY)) {
            await supabase.auth.signOut();
          }
        } catch {
          // Local client session is still cleared below.
        }
        sessionStorage.removeItem(CLIENT_OAUTH_SLUG_KEY);
        clear();
        window.location.href = `/book/${slug}/sign-in`;
      })();
    },
    [clear],
  );

  const value = React.useMemo<ClientAuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      needsPhone: !!user?.needsPhone,
      isLoading,
      portal,
      login,
      signUp,
      loginWithGoogle,
      completePhone,
      logout,
      setSession,
      refreshPortal,
    }),
    [user, isLoading, portal, login, signUp, loginWithGoogle, completePhone, logout, setSession, refreshPortal],
  );

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>;
}

export function useClientAuth(): ClientAuthContextValue {
  const ctx = React.useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}

export function destinationForClientUser(slug: string, user: AuthUser | null) {
  if (!user) return `/book/${slug}/sign-in`;
  if (user.needsPhone) return `/book/${slug}/complete-profile`;
  return `/book/${slug}`;
}
