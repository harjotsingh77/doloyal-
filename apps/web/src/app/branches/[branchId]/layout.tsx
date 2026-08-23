"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@doloyal/ui";
import { AuthGuard, useAuth } from "@/lib/auth";
import { useBranch } from "@/lib/branch-context";
import { getBranchStats, type BranchStats } from "@/lib/branches";
import { initials } from "@doloyal/shared";
import { Sidebar } from "@/components/sidebar";
import { CurrencySelect } from "@/components/currency-select";
import { AskDoloyal } from "@/components/ask-doloyal";
import {
  BranchSwitcher,
  WorkspaceModeBadge,
  WorkspaceBreadcrumb,
  BackToBranches,
  useWorkspaceNav,
} from "@/components/branch-workspace";

interface BranchWorkspaceValue {
  stats: BranchStats;
  refresh: () => void;
}
const BranchWorkspaceContext = React.createContext<BranchWorkspaceValue | null>(null);
export function useBranchWorkspace(): BranchWorkspaceValue {
  const ctx = React.useContext(BranchWorkspaceContext);
  if (!ctx) throw new Error("useBranchWorkspace must be used within the branch workspace");
  return ctx;
}

export default function BranchWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { branchId: string };
}) {
  const { branchId } = params;
  const router = useRouter();
  const pathname = usePathname();
  const { enterBranchById } = useBranch();
  const { user, logout } = useAuth();
  const { label } = useWorkspaceNav();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [stats, setStats] = React.useState<BranchStats | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [retryToken, setRetryToken] = React.useState(0);

  // Access control mirrors the backend roles.
  const authorized = React.useMemo(() => {
    if (!user) return false;
    return ["OWNER", "MANAGER", "STAFF", "RECEPTIONIST"].includes(user.activeRole || "");
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setStats(null);
    (async () => {
      try {
        const s = await getBranchStats(branchId);
        if (!cancelled) {
          setStats(s);
          enterBranchById(s.branch.id);
        }
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || "Failed to load this branch");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [branchId, retryToken, enterBranchById]);

  React.useEffect(() => {
    if (user && !authorized) router.replace("/app/dashboard");
  }, [user, authorized, router]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleCollapsed = React.useCallback(() => setCollapsed((c) => !c), []);
  const openMobile = React.useCallback(() => setMobileOpen(true), []);
  const closeMobile = React.useCallback(() => setMobileOpen(false), []);

  if (!authorized) return null;

  const workspace = stats
    ? {
        stats,
        refresh: () => setRetryToken((t) => t + 1),
      }
    : null;

  return (
    <AuthGuard>
      <AskDoloyal>
        <div className="flex h-screen overflow-hidden bg-[rgb(var(--color-background))]">
        <Sidebar
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          mobileOpen={mobileOpen}
          onMobileClose={closeMobile}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={openMobile}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] transition-colors lg:hidden"
              >
                <Menu className="h-4.5 w-4.5" />
              </button>
              <div className="hidden lg:flex">
                <BackToBranches />
              </div>
              <BranchSwitcher />
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <WorkspaceModeBadge />
              </div>
              <CurrencySelect />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[rgb(var(--color-muted))] transition-colors">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user ? initials(`${user.firstName} ${user.lastName ?? ""}`) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:block">
                      {user?.firstName ?? "User"}
                    </span>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))] sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {user?.firstName} {user?.lastName}
                      </span>
                      <span className="text-xs font-normal text-[rgb(var(--color-muted-foreground))]">
                        {user?.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface)/0.5)] px-4 py-2.5 lg:px-6">
            <WorkspaceBreadcrumb page={label} />
            <div className="lg:hidden">
              <WorkspaceModeBadge />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8">
              {loadError ? (
                <div className="mx-auto max-w-md rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-8 text-center">
                  <h3 className="text-lg font-semibold">Couldn&apos;t load this branch</h3>
                  <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{loadError}</p>
                  <button
                    onClick={() => setRetryToken((t) => t + 1)}
                    className="mt-5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
                  >
                    Try again
                  </button>
                </div>
              ) : !workspace ? (
                <div className="space-y-4">
                  <div className="h-8 w-52 animate-pulse rounded-lg bg-[rgb(var(--color-muted))]" />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-[var(--radius)] bg-[rgb(var(--color-muted))]" />
                    ))}
                  </div>
                </div>
              ) : (
                <BranchWorkspaceContext.Provider value={workspace}>
                  {children}
                </BranchWorkspaceContext.Provider>
              )}
            </div>
          </main>
        </div>
        </div>
      </AskDoloyal>
    </AuthGuard>
  );
}
