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
import { getBranch } from "@/lib/branches";
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

  const branch = React.useMemo(() => (branchId ? getBranch(branchId) : null), [branchId]);

  // Access control: Owners/Managers access every branch. Receptionists &
  // Staff are limited to a single assigned branch (demo: a fixed branch).
  const authorized = React.useMemo(() => {
    if (!user) return false;
    if (user.activeRole === "OWNER" || user.activeRole === "MANAGER") return true;
    if (user.activeRole === "STAFF" || user.activeRole === "RECEPTIONIST") {
      const homeBranchId = user.activeRole === "STAFF" ? "b1" : "b2";
      return branchId === homeBranchId;
    }
    return false;
  }, [user, branchId]);

  React.useEffect(() => {
    if (!authorized) {
      router.replace("/app/dashboard");
      return;
    }
    if (!branch) {
      router.replace("/app/branches");
      return;
    }
    enterBranchById(branch.id);
  }, [branch, branchId, enterBranchById, router, authorized]);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!authorized || !branch) return null;

  return (
    <AuthGuard>
      <AskDoloyal>
        <div className="flex h-screen overflow-hidden bg-[rgb(var(--color-background))]">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileOpen(true)}
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
            <div className="p-4 lg:p-8">{children}</div>
          </main>
        </div>
        </div>
      </AskDoloyal>
    </AuthGuard>
  );
}