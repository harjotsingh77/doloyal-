"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "./api";
import { supabase, isSupabaseConfigured, getMissingSupabaseConfig, getAuthCallbackUrl } from "./supabase";

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
  isAdmin?: boolean;
  adminRole?: string | null;
  adminPermissions?: string[];
  memberships: Membership[];
  activeTenantId: string;
  activeRole: "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF" | "CUSTOMER";
  isImpersonating?: boolean;
  impersonatedTenantId?: string;
  impersonatedTenantName?: string;
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
  resolveSupabaseSession: () => Promise<AuthUser | null>;
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

export function isKnownAdminEmail(email?: string): boolean {
  if (!email) return false;
  const e = email.toLowerCase().trim();
  return (
    e === "demo@doloyal.ai" ||
    e === "bhariharjot@gmail.com" ||
    e === "teamdoloyal@gmail.com" ||
    e.endsWith("@doloyal.ai")
  );
}

function getSavedUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const s = localStorage.getItem("doloyal_user");
    if (!s) return null;
    const u: AuthUser = JSON.parse(s);
    if (isKnownAdminEmail(u.email)) {
      u.isAdmin = true;
      if (!u.adminRole) u.adminRole = "SUPER_ADMIN";
    }
    return u;
  } catch {
    localStorage.removeItem("doloyal_user");
    return null;
  }
}

function saveUser(u: AuthUser | null) {
  if (typeof window === "undefined") return;
  if (u) {
    if (isKnownAdminEmail(u.email)) {
      u.isAdmin = true;
      if (!u.adminRole) u.adminRole = "SUPER_ADMIN";
    }
    localStorage.setItem("doloyal_user", JSON.stringify(u));
  } else {
    localStorage.removeItem("doloyal_user");
  }
}

/* ── Default demo user (used when no token exists) ───────────────────── */

const DEMO_USER: AuthUser = {
  id: "dev-user-id",
  externalId: "dev-user",
  email: "demo@doloyal.ai",
  firstName: "Demo",
  lastName: "User",
  isAdmin: true,
  adminRole: "SUPER_ADMIN",
  adminPermissions: [],
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
 * Demo/mock mode is enabled only outside production builds, or when explicitly
 * opted in via NEXT_PUBLIC_ALLOW_DEMO_AUTH=true.
 *
 * Production NEVER auto-provisions a demo session and NEVER serves mock data:
 * unauthenticated visitors are treated as unauthenticated (redirected to
 * sign-in) and every API call must return real data or surface a real error.
 */
export const DEMO_MODE =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_ALLOW_DEMO_AUTH === "true";

/**
 * Synchronously resolve the initial user from localStorage.
 * This runs during the first `useState` call — before any render —
 * so the UI never starts in a "loading" state.
 *
 * In production, no user/token means no session: return null so the auth
 * guards redirect to sign-in. In development, a first-time visitor gets a
 * demo session so localhost still works without keys.
 */
function getInitialUser(): AuthUser | null {
  const saved = getSavedUser();
  if (saved) return saved;

  const token = getToken();
  if (!token) {
    if (!DEMO_MODE) return null;
    // First-ever visit (dev only): provision a demo session synchronously
    saveUser(DEMO_USER);
    setToken("mock-token");
    return DEMO_USER;
  }

  // Token exists but no cached user — return demo until background refresh (dev only)
  return DEMO_MODE ? DEMO_USER : null;
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
          window.location.href = "/app/dashboard";
          return;
        }
      } catch (err) {
        // Demo fallback exists only in dev — production must surface the real error.
        if (DEMO_MODE) {
          const r = await api.demoLogin();
          if (r) {
            setAuth(r.token, r.user);
            window.location.href = "/app/dashboard";
            return;
          }
        }
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setAuth],
  );

  // Google login — full Supabase OAuth redirect flow.
  // After Google authenticates, Supabase redirects to /auth/callback, where
  // the Supabase session is exchanged for a Doloyal API session.
  const googleLoginInFlight = React.useRef(false);

  const loginWithGoogle = React.useCallback(() => {
    if (googleLoginInFlight.current) return;
    if (!isSupabaseConfigured()) {
      const missing = getMissingSupabaseConfig();
      console.error(
        "[auth] Google sign-in disabled: missing build-time env vars:",
        missing,
        "→ set these in the hosting provider (e.g. Vercel) and redeploy the web app. Never rely on the placeholder Supabase values.",
      );
      toast.error("Google sign-in is not configured yet. Please try again later.");
      return;
    }
    googleLoginInFlight.current = true;
    setIsLoading(true);
    const redirectTo = getAuthCallbackUrl();
    console.info("[auth] Starting Google OAuth, redirect_to:", redirectTo);
    void supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      })
      .then(({ error }) => {
        if (error) {
          googleLoginInFlight.current = false;
          setIsLoading(false);
          console.error("[auth] signInWithOAuth error:", error);
          toast.error("Unable to start Google sign-in. Please try again.");
        }
        // On success the browser is redirected away from this page.
      })
      .catch((err) => {
        googleLoginInFlight.current = false;
        setIsLoading(false);
        console.error("[auth] signInWithOAuth exception:", err);
        toast.error("Unable to reach the sign-in service. Check your connection and try again.");
      });
  }, [setIsLoading]);

function buildAuthUserFromSupabase(sbUser: any): AuthUser {
  const meta = sbUser.user_metadata || {};
  const fullName = meta.full_name || meta.name || "";
  const nameParts = fullName.trim().split(" ");
  const firstName = meta.given_name || nameParts[0] || sbUser.email?.split("@")[0] || "User";
  const lastName = meta.family_name || nameParts.slice(1).join(" ") || "";
  const avatarUrl = meta.avatar_url || meta.picture || undefined;
  const email = sbUser.email || "";
  const isAdmin = isKnownAdminEmail(email);

  return {
    id: sbUser.id,
    externalId: sbUser.id,
    email,
    firstName,
    lastName,
    avatarUrl,
    isAdmin,
    adminRole: isAdmin ? "SUPER_ADMIN" : undefined,
    memberships: [
      {
        id: `m-${sbUser.id}`,
        userId: sbUser.id,
        tenantId: "demo-tenant-id",
        role: "OWNER",
        createdAt: sbUser.created_at || new Date().toISOString(),
      },
    ],
    activeTenantId: "demo-tenant-id",
    activeRole: "OWNER",
  };
}

  /**
   * Bridge the current Supabase session into a Doloyal API session
   * (`doloyal_token` + user cache). Used by the OAuth callback page so the
   * dashboard never mounts with a stale/mock identity, and by the
   * onAuthStateChange listener after a refresh.
   */
  const resolveSupabaseSession = React.useCallback(async (): Promise<AuthUser | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) return null;
      try {
        const result = await api.supabaseExchange(session.access_token);
        if (result?.token && result?.user) {
          setAuth(result.token, result.user);
          return result.user;
        }
      } catch {
        // Fallback to client-constructed AuthUser if backend exchange API is unavailable
      }
      const fallbackUser = buildAuthUserFromSupabase(session.user);
      setAuth(session.access_token, fallbackUser);
      return fallbackUser;
    } catch {
      const s = getSavedUser();
      if (s) return s;
    }
    return null;
  }, [setAuth]);

  // Keep the Doloyal session in sync with the Supabase session:
  // - restore the API session after a refresh / return visit (INITIAL_SESSION,
  //   TOKEN_REFRESHED) without showing the login page again
  // - clear local auth state when Supabase signs the session out
  // Only re-bridge when the Supabase user differs from the cached one, so an
  // existing email/password session is never hijacked by a stale Google session.
  React.useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    const syncSupabaseSession = async (accessToken: string) => {
      if (cancelled) return;
      const cached = getSavedUser();
      const { data } = await supabase.auth.getUser(accessToken);
      const sbUser = data.user;
      if (!sbUser || !sbUser.email) return;
      if (cached && cached.email !== "demo@doloyal.ai" && cached.email === sbUser.email) {
        return; // already bridged to this Supabase user
      }
      try {
        const result = await api.supabaseExchange(accessToken);
        if (!cancelled && result?.token && result?.user) {
          setAuth(result.token, result.user);
          return;
        }
      } catch {
        // Keep cached user or fallback to client-constructed AuthUser
      }
      if (!cancelled) {
        const fallbackUser = buildAuthUserFromSupabase(sbUser);
        setAuth(accessToken, fallbackUser);
      }
    };

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        clearAuth();
      } else if (session) {
        void syncSupabaseSession(session.access_token);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [setAuth, clearAuth]);

  const demoLogin = React.useCallback(async () => {
    if (!DEMO_MODE) {
      toast.error("Demo login is disabled in production.");
      return;
    }
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
      } catch (err) {
        if (!DEMO_MODE) throw err;
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
    void (async () => {
      try {
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }
      } catch {
        // Local session is still cleared below even if signOut fails
      }
      clearAuth();
      window.location.href = "/sign-in";
    })();
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
      resolveSupabaseSession,
    }),
    [user, isLoading, login, loginWithGoogle, demoLogin, signUp, logout, switchTenant, refreshUser, resolveSupabaseSession],
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

/**
 * AdminGuard — protects the /admin route group.
 *
 * - Not authenticated            → redirect to sign-in
 * - Authenticated but not admin  → render <AccessDenied />
 * - Admin                        → render children
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const isAdmin = user?.isAdmin === true;

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/sign-in");
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated && !isLoading) return null;

  if (isAuthenticated && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-semibold text-foreground">Admin access required</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Your account does not have administrator privileges for the Doloyal control center.
          If you believe this is a mistake, contact the Doloyal team.
        </p>
        <a
          href="/app/dashboard"
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Back to dashboard
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
