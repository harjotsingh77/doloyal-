"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Lucide from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { APP_NAV } from "@doloyal/shared";
import { cn } from "@doloyal/ui";
import { Badge, Logo } from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";

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
        "flex h-full flex-col gap-6 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] transition-all duration-300",
        collapsed ? "w-[4.25rem]" : "w-60",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center px-4 pt-5 pb-1",
          collapsed ? "px-2" : "justify-start",
        )}
      >
        {collapsed ? (
          <Link href={logoHref}>
            <LogoMarkSmall />
          </Link>
        ) : (
          <Link href={logoHref}>
            <Logo size={28} />
          </Link>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        <ul className="flex flex-col gap-1">
          {APP_NAV.map((item) => {
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
                    "group relative flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                      : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                    collapsed && "justify-center px-2",
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
                      className="ml-auto text-[0.6rem] uppercase leading-none"
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
      </nav>

      <div
        className={cn(
          "shrink-0 border-t border-[rgb(var(--color-border))] px-4 py-3",
          collapsed && "px-2 text-center",
        )}
      >
        {collapsed ? (
          <Link
            href="/app/settings"
            className="flex items-center justify-center"
          >
            <Lucide.Settings className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
          </Link>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Doloyal v0.1
            </span>
            <Link href="/app/settings">
              <Lucide.Settings className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors" />
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

function LogoMarkSmall() {
  return (
    <img
      src="/logo-symbol.png"
      alt="doloyal AI"
      className="h-7 w-auto object-contain shrink-0"
    />
  );
}
