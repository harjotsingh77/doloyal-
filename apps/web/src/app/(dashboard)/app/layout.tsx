"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, LogOut, ChevronDown, PanelLeftClose } from "lucide-react";
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
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { CurrencySelect } from "@/components/currency-select";
import { TenantCurrencySync } from "@/components/tenant-currency-sync";
import { AskDoloyal } from "@/components/ask-doloyal";
import { initials } from "@doloyal/shared";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <AskDoloyal>
      <div className="flex h-screen overflow-hidden bg-[rgb(var(--color-background))]">
        <TenantCurrencySync />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] transition-colors lg:hidden"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] transition-colors"
            >
              <PanelLeftClose
                className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
              />
            </button>
            <div className="hidden text-sm lg:block">
              <span className="font-medium text-[rgb(var(--color-foreground))]">
                {user?.firstName
                  ? `${user.firstName}'s Dashboard`
                  : "Dashboard"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
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
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* 
          IMPORTANT: No AnimatePresence / motion.div here.
          
          The previous implementation used:
            <AnimatePresence mode="wait">
              <motion.div key={pathname} ...>
          
          This caused the ENTIRE page content to unmount (opacity → 0) before
          the new page could mount, creating a visible white flash on every
          navigation and every HMR update.
          
          Professional SaaS apps (Linear, Stripe, Notion) do NOT animate
          route exits. They simply swap content instantly. Next.js App Router
          handles streaming/suspense transitions internally.
        */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
      </div>
    </AskDoloyal>
  );
}
