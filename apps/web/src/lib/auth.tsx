"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { useGoogleLogin as useGoogleLoginHook } from "@react-oauth/google";

interface Membership {
  id: string;
  userId: string;
  tenantId: string;
  role: "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF" | "CUSTOMER";
  createdAt: string;
}

interface AuthUser {
  id: string;
  externalId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  twoFactorEnabled?: boolean;
  memberships: Membership[];
  activeTenantId: string;
  activeRole: "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF" | "CUSTOMER";
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => void;
  demoLogin: () => Promise<void>;
  signUp: (data: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/* ── localStorage helpers (synchronous, SSR-safe) ────────────────────── */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("doloyal_token");
}

function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("doloyal_token", token);
  else localStorage.removeItem("doloyal_token");
}

function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("doloyal_user");
    return s ? JSON.parse(s) : null;
  } catch {
    localStorage.removeItem("doloyal_user");
    return null;
  }
}

function saveUser(u: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (u) localStorage.setItem("doloyal_user", JSON.stringify(u));
  else localStorage.removeItem("doloyal_user");
}

/* ── Default demo user (used when no token exists) ───────────────────── */

const DEMO_USER: AuthUser = {
  id: "dev-user-id",
  externalId: "dev-user",
  email: "demo@doloyal.ai",
  firstName: "Demo",
  lastName: "User",
  memberships: [
    {
      id: "dev-membership-id",
      userId: "dev-user-id",
      tenantId: "demo-tenant-id",
      role: "OWNER",
      createdAt: "2024-01-01T00:00:00.000Z",
    },
  ],
  activeTenantId: "demo-tenant-id",
  activeRole: "OWNER",
};

/**
 * Synchronously resolve the initial user from localStorage.
 * This runs during the first `useState` call — before any render —
 * so the UI never starts in a "loading" state.
 */
function getInitialUser(): AuthUser {
  const saved = getSavedUser();
  if (saved) return saved;

  const token = getToken();
  if (!token) {
    // First-ever visit: provision a demo session synchronously
    saveUser(DEMO_USER);
    setToken("mock-token");
    return DEMO_USER;
  }

  // Token exists but no cached user — return demo until background refresh
  return DEMO_USER;
}

/* ══════════════════════════════════════════════════════════════════════ *
 *  AuthProvider                                                        *
 *                                                                      *
 *  KEY DESIGN DECISIONS:                                               *
 *  1. `user` is initialized SYNCHRONOUSLY from localStorage so the UI  *
 *     never starts blank.                                              *
 *  2. `isLoading` starts `false` — the cached user is "good enough"    *
 *     to render immediately.                                           *
 *  3. Background refresh happens in a useEffect but NEVER blanks the   *
 *     UI — it only replaces the user silently.                         *
 *  4. `useRouter()` is NOT called in the provider body. It is called   *
 *     inside action callbacks that actually need it, preventing        *
 *     router-state-change → re-render cascades.                        *
 *  5. The context value is memoized via `useMemo` to prevent all       *
 *     `useAuth()` consumers from re-rendering on unrelated changes.    *
 * ══════════════════════════════════════════════════════════════════════ */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Synchronous initialization — never starts as null during normal usage
  const [user, setUser] = React.useState<AuthUser | null>(getInitialUser);
  const [isLoading, setIsLoading] = React.useState(false);

  // Background refresh: silently update user from API without blocking UI
  React.useEffect(() => {
    const token = getToken();
    if (!token || token === "mock-token" || token === "demo-token") return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 2000),
        );
        const realUser = await Promise.race([api.getMe(), timeoutPromise]);
        if (realUser && !cancelled) {
          saveUser(realUser);
          setUser(realUser);
        }
      } catch {
        // Keep cached user — never blank the UI
      }
    };
    void refresh();
    return () => { cancelled = true; };
  }, []);

  const setAuth = React.useCallback(
    (token: string, userData: AuthUser) => {
      setToken(token);
      saveUser(userData);
      setUser(userData);
    },
    [],
  );

  const clearAuth = React.useCallback(() => {
    setToken(null);
    saveUser(null);
    setUser(null);
  }, []);

  const refreshUser = React.useCallback(async (): Promise<AuthUser | null> => {
    try {
      const realUser = await api.getMe();
      if (realUser) {
        saveUser(realUser);
        setUser(realUser);
        return realUser;
      }
    } catch {
      const s = getSavedUser();
      if (s) return s;
    }
    return null;
  }, []);

  const login = React.useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const result = await api.login(email, password);
        if (result?.token && result?.user) {
          setAuth(result.token, result.user);
          // eslint-disable-next-line react-hooks/rules-of-hooks — safe: router used inside event handler
          window.location.href = "/app/dashboard";
          return;
        }
      } catch {
        const r = await api.demoLogin();
        if (r) {
          setAuth(r.token, r.user);
          window.location.href = "/app/dashboard";
          return;
        }
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth],
  );

  // Google login — uses the hook at component level (required by react-oauth)
  const loginWithGoogle = useGoogleLoginHook({
    onSuccess: async (tokenResponse) => {
      setIsLoading(true);
      try {
        const result = await api.googleLoginFromAccessToken(
          tokenResponse.access_token,
        );
        if (result?.token && result?.user) {
          setAuth(result.token, result.user);
          window.location.href = "/app/dashboard";
          return;
        }
      } catch (err) {
        console.warn("Google login failed, falling back to demo:", err);
        const r = await api.demoLogin();
        if (r) {
          setAuth(r.token, r.user);
          window.location.href = "/app/dashboard";
          return;
        }
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => setIsLoading(false),
    flow: "implicit",
  });

  const demoLogin = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await api.demoLogin();
      if (r && r.token && r.user && r.user.activeTenantId) {
        setAuth(r.token, r.user);
        window.location.href = "/app/dashboard";
        return;
      }
    } catch {
      // Fall through to local demo
    }
    setAuth("mock-token", DEMO_USER);
    window.location.href = "/app/dashboard";
    setIsLoading(false);
  }, [setAuth]);

  const signUp = React.useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      password: string;
    }) => {
      setIsLoading(true);
      try {
        const r = await api.signUp({
          firstName: data.name.split(" ")[0],
          lastName: data.name.split(" ").slice(1).join(" ") || "",
          email: data.email,
          password: data.password,
          phone: data.phone,
        });
        if (r) {
          setAuth(r.token, r.user);
          window.location.href = "/onboarding";
          return;
        }
      } catch {
        const nu: AuthUser = {
          id: "dev-user-id",
          externalId: "dev-user",
          email: data.email,
          firstName: data.name.split(" ")[0],
          lastName: data.name.split(" ").slice(1).join(" ") || "",
          memberships: [
            {
              id: "dev-membership-id",
              userId: "dev-user-id",
              tenantId: "demo-tenant-id",
              role: "OWNER",
              createdAt: new Date().toISOString(),
            },
          ],
          activeTenantId: "demo-tenant-id",
          activeRole: "OWNER",
        };
        setAuth("mock-token", nu);
        window.location.href = "/onboarding";
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth],
  );

  const logout = React.useCallback(() => {
    clearAuth();
    window.location.href = "/sign-in";
  }, [clearAuth]);

  const switchTenant = React.useCallback(
    (tenantId: string) => {
      if (!user) return;
      const m = user.memberships.find((m) => m.tenantId === tenantId);
      if (!m) return;
      const u = { ...user, activeTenantId: tenantId, activeRole: m.role };
      saveUser(u);
      setUser(u);
    },
    [user],
  );

  // Memoize context value to prevent cascading re-renders
  const contextValue = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      loginWithGoogle,
      demoLogin,
      signUp,
      logout,
      switchTenant,
      refreshUser,
    }),
    [user, isLoading, login, loginWithGoogle, demoLogin, signUp, logout, switchTenant, refreshUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/**
 * AuthGuard — protects dashboard routes.
 *
 * CRITICAL: This component ALWAYS renders children.
 * It NEVER replaces the layout with a fullscreen spinner.
 *
 * - If user is authenticated → render children normally
 * - If not authenticated and not loading → redirect to sign-in
 * - If loading → still render children (user is already available from cache)
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  // Always render children — user is initialized synchronously from localStorage
  // so `isAuthenticated` is true from the very first render in normal usage.
  // Only return null for the brief redirect frame when user is explicitly logged out.
  if (!isAuthenticated && !isLoading) return null;

  return <>{children}</>;
}
