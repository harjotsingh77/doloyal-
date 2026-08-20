"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Lucide from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAV_GROUPS } from "@doloyal/shared";
import { cn } from "@doloyal/ui";
import { Badge } from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { useAuth } from "@/lib/auth";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const iconName = name as keyof typeof Lucide;
  const IconComponent = Lucide[iconName] as React.ComponentType<{
    className?: string;
  }> | undefined;
  if (!IconComponent) return null;
  return <IconComponent className={className} />;
}

/**
 * Global nav items that have a branch-scoped counterpart inside a
 * Branch Workspace. Everything else (Branches, Integrations, Websites,
 * Billing, Help…) stays global by design.
 */
const BRANCH_ROUTE_MAP: Record<string, string> = {
  "/app": "/dashboard",
  "/app/customers": "/customers",
  "/app/appointments": "/appointments",
  "/app/appointments/booking-links": "/booking-links",
  "/app/loyalty": "/loyalty",
  "/app/rewards": "/rewards",
  "/app/memberships": "/memberships",
  "/app/referrals": "/referrals",
  "/app/campaigns": "/campaigns",
  "/app/assistant": "/assistant",
  "/app/analytics": "/analytics",
  "/app/invoices": "/invoices",
  "/app/staff": "/staff",
};

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { mode, workspaceBase, selectedBranch } = useBranch();
  const { user } = useAuth();

  const resolveHref = (href: string) => {
    if (mode === "branch" && selectedBranch) {
      const branchPath = BRANCH_ROUTE_MAP[href];
      if (branchPath) return `${workspaceBase}${branchPath}`;
    }
    return href;
  };

  const isActive = (href: string) => {
    const resolved = resolveHref(href);
    if (resolved === "/app" || resolved === `${workspaceBase}/dashboard`)
      return pathname === resolved || pathname === "/app/dashboard";
    return pathname.startsWith(resolved);
  };

  const logoHref = mode === "branch" && selectedBranch ? `${workspaceBase}/dashboard` : "/app/dashboard";

  const sidebarContent = (
    <div
      className={cn(
        "flex h-full flex-col border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] transition-all duration-300",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      {/* Brand Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-[rgb(var(--color-border))] px-4",
          collapsed ? "justify-center px-2" : "gap-3",
        )}
      >
        {collapsed ? (
          <Link href={logoHref} className="flex items-center justify-center">
            <img
              src="/8bg.png"
              alt="Doloyal"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
          </Link>
        ) : (
          <Link href={logoHref} className="flex items-center gap-3 group">
            <img
              src="/8bg.png"
              alt="Doloyal"
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
            <div className="leading-tight">
              <p className="text-base font-semibold text-[rgb(var(--color-foreground))] group-hover:text-[rgb(var(--color-primary))] transition-colors">
                Doloyal
              </p>
              <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                {mode === "branch" && selectedBranch ? selectedBranch.name : "Workspace"}
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {APP_NAV_GROUPS.map((group, groupIdx) => (
          <div key={group.section} className={cn("mb-5", groupIdx === 0 ? "mt-0" : "")}>
            {!collapsed ? (
              <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                {group.section}
              </p>
            ) : (
              groupIdx > 0 && <div className="mx-2 my-2.5 h-px bg-[rgb(var(--color-border))]" />
            )}

            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const href = resolveHref(item.href);
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.badge === "soon" ? "#" : href}
                      onClick={(e) => {
                        if (item.badge === "soon") e.preventDefault();
                        onMobileClose?.();
                      }}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                          : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                        collapsed && "justify-center px-2 py-2.5",
                      )}
                    >
                      {active && !collapsed && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 rounded-[0.625rem] bg-[rgb(var(--color-primary)/0.1)]"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">
                        <DynamicIcon
                          name={item.icon}
                          className={cn("h-4.5 w-4.5 shrink-0", collapsed && "h-5 w-5")}
                        />
                      </span>
                      {!collapsed && (
                        <span className="relative z-10 truncate">{item.label}</span>
                      )}
                      {!collapsed && item.badge && (
                        <Badge
                          variant={item.badge === "new" ? "primary" : "outline"}
                          className="ml-auto text-[0.62rem] uppercase leading-none py-0.5 px-2 font-semibold"
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {collapsed && item.badge && (
                        <span
                          className={cn(
                            "absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full",
                            item.badge === "new"
                              ? "bg-[rgb(var(--color-primary))]"
                              : "bg-[rgb(var(--color-muted-foreground))]",
                          )}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {user?.isAdmin ? (
          <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
            {!collapsed ? (
              <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-primary))]">
                Super Admin
              </p>
            ) : null}
            <Link
              href="/admin"
              onClick={() => onMobileClose?.()}
              className={cn(
                "group relative flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                  : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                collapsed && "justify-center px-2 py-2.5",
              )}
            >
              <span className="relative z-10">
                <Lucide.ShieldCheck className={cn("h-4.5 w-4.5 shrink-0 text-[rgb(var(--color-primary))]", collapsed && "h-5 w-5")} />
              </span>
              {!collapsed && <span className="relative z-10 truncate font-semibold">Admin Panel</span>}
            </Link>
          </div>
        ) : null}
      </nav>

      {/* Sidebar Footer */}
      <div
        className={cn(
          "shrink-0 border-t border-[rgb(var(--color-border))] px-4 py-3.5",
          collapsed && "px-2 text-center",
        )}
      >
        {collapsed ? (
          <Link
            href="/app/settings"
            className="flex items-center justify-center"
            title="Settings"
          >
            <Lucide.Settings className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
          </Link>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[rgb(var(--color-muted-foreground))] font-medium">
              Doloyal AI SaaS
            </span>
            <Link href="/app/settings" title="Settings">
              <Lucide.Settings className="h-4.5 w-4.5 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={onMobileClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative h-full w-64 shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
