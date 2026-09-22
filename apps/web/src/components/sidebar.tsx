"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Crown,
  FileText,
  Gift,
  Globe,
  IdCard,
  LogIn,
  LayoutDashboard,
  Link as LinkIcon,
  Link2,
  Megaphone,
  Package,
  Puzzle,
  Settings,
  Settings2,
  Share2,
  ShoppingCart,
  Star,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
} from "lucide-react";
import { APP_NAV_GROUPS } from "@doloyal/shared";
import { cn } from "@doloyal/ui";
import { Badge } from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { useAuth } from "@/lib/auth";
import { useTenant } from "@/lib/tenant-query";
import { getBusinessDisplayName, getBrandLogo, getBrandShortName } from "@/lib/branding";
import { prefetchHref } from "@/lib/prefetch-workspace";

/**
 * Explicit icon registry for nav items referenced by name in
 * APP_NAV_GROUPS. A static map (instead of `import * as Lucide`) keeps
 * every icon tree-shakeable so the whole icon library is never bundled.
 */
const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  BarChart3,
  Bot,
  Users,
  CalendarDays,
  Link: LinkIcon,
  Sparkles,
  Gift,
  Crown,
  Share2,
  ShoppingCart,
  Star,
  Megaphone,
  Package,
  Workflow,
  Globe,
  Link2,
  FileText,
  IdCard,
  LogIn,
  Store,
  Puzzle,
  Settings,
  Settings2,
  CreditCard,
  CircleHelp,
};

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = NAV_ICONS[name];
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

export const Sidebar = React.memo(function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { mode, workspaceBase, selectedBranch } = useBranch();
  const { user } = useAuth();
  // Tenant branding: custom logo/name when the business set one, otherwise
  // the default Doloyal logo and naming (never undefined or empty).
  const { data: tenant } = useTenant();
  const brandName = getBusinessDisplayName(tenant);
  const brandShortName = getBrandShortName(tenant);
  const brandLogo = getBrandLogo(tenant);

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
    if (href === "/app/customers") {
      if (pathname === resolved) return true;
      if (
        pathname.startsWith(`${resolved}/`) &&
        !pathname.includes("/products") &&
        !pathname.includes("/orders")
      )
        return true;
      return false;
    }
    return pathname.startsWith(resolved);
  };

  const isAncestorActive = (item: { href: string; children?: { href: string }[] }) => {
    if (isActive(item.href)) return true;
    return Boolean(item.children?.some((child) => isActive(child.href) || pathname.startsWith(resolveHref(child.href))));
  };

  const groupHasActive = (items: { href: string; children?: { href: string }[] }[]) =>
    items.some((item) => isAncestorActive(item));

  const logoHref = mode === "branch" && selectedBranch ? `${workspaceBase}/dashboard` : "/app/dashboard";
  const [openParents, setOpenParents] = React.useState<Record<string, boolean>>({});

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
          <Link href={logoHref} className="flex items-center justify-center" title={brandName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogo}
              alt={brandShortName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
          </Link>
        ) : (
          <Link href={logoHref} className="flex items-center gap-3 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandLogo}
              alt={brandName}
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-contain shrink-0"
            />
            <div className="leading-tight min-w-0">
              <p className="text-base font-semibold text-[rgb(var(--color-foreground))] truncate group-hover:text-[rgb(var(--color-primary))] transition-colors">
                {brandName}
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
        {APP_NAV_GROUPS.map((group, groupIdx) => {
          const items = group.items.filter((item) => !item.hidden);
          if (items.length === 0) return null;
          return (
          <div key={group.section} className={cn("mb-5", groupIdx === 0 ? "mt-0" : "")}>
            {!collapsed ? (
              <p
                className={cn(
                  "px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider",
                  groupHasActive(items)
                    ? "text-[rgb(var(--color-primary))]"
                    : "text-[rgb(var(--color-muted-foreground))]",
                )}
              >
                {group.section}
              </p>
            ) : (
              groupIdx > 0 && <div className="mx-2 my-2.5 h-px bg-[rgb(var(--color-border))]" />
            )}

            <ul className="flex flex-col gap-1">
              {items.map((item) => {
                const href = resolveHref(item.href);
                const hasChildren = Boolean(item.children?.length);
                const ancestor = isAncestorActive(item);
                const active = hasChildren ? false : isActive(item.href);
                const nestedOpen =
                  hasChildren &&
                  !collapsed &&
                  (openParents[item.href] ?? ancestor);
                return (
                  <li key={item.href}>
                    <div className="relative flex items-center">
                      <Link
                        href={item.badge === "soon" ? "#" : href}
                        prefetch={item.badge === "soon" ? undefined : true}
                        onMouseEnter={() => {
                          if (item.badge !== "soon") prefetchHref(item.href);
                        }}
                        onClick={(e) => {
                          if (item.badge === "soon") e.preventDefault();
                          if (hasChildren && !collapsed) {
                            setOpenParents((prev) => ({ ...prev, [item.href]: true }));
                          }
                          onMobileClose?.();
                        }}
                        className={cn(
                          "group relative flex min-w-0 flex-1 items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium transition-colors",
                          hasChildren && !collapsed && "pr-8",
                          active
                            ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                            : ancestor
                              ? "text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-muted))]"
                              : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                          collapsed && "justify-center px-2 py-2.5",
                        )}
                      >
                        {active && !collapsed && (
                          <span className="absolute inset-0 rounded-[0.625rem] bg-[rgb(var(--color-primary)/0.1)]" />
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
                      {hasChildren && !collapsed && (
                        <button
                          type="button"
                          aria-label={nestedOpen ? `Collapse ${item.label}` : `Expand ${item.label}`}
                          aria-expanded={nestedOpen}
                          className="absolute right-1 z-20 rounded-md p-1 text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenParents((prev) => ({
                              ...prev,
                              [item.href]: !(prev[item.href] ?? ancestor),
                            }));
                          }}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              nestedOpen ? "rotate-0" : "-rotate-90",
                            )}
                          />
                        </button>
                      )}
                    </div>
                    {nestedOpen && item.children ? (
                        <ul className="mt-1 ml-4 overflow-hidden border-l border-[rgb(var(--color-border))] pl-2">
                          {item.children.map((child) => {
                            const childHref = resolveHref(child.href);
                            const childActive = isActive(child.href);
                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.badge === "soon" ? "#" : childHref}
                                  prefetch={child.badge === "soon" ? undefined : true}
                                  onClick={(e) => {
                                    if (child.badge === "soon") e.preventDefault();
                                    onMobileClose?.();
                                  }}
                                  className={cn(
                                    "group relative flex items-center gap-3 rounded-[0.625rem] px-3 py-2 text-sm font-medium transition-colors",
                                    childActive
                                      ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                                      : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                                  )}
                                >
                                  <DynamicIcon name={child.icon} className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                  {child.badge ? (
                                    <Badge
                                      variant={child.badge === "new" ? "primary" : "outline"}
                                      className="ml-auto text-[0.62rem] uppercase leading-none py-0.5 px-2 font-semibold"
                                    >
                                      {child.badge}
                                    </Badge>
                                  ) : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}

        {user?.isAdmin ? (
          <div className="mt-4 pt-3 border-t border-[rgb(var(--color-border))]">
            {!collapsed ? (
              <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-primary))]">
                Super Admin
              </p>
            ) : null}
            <Link
              href="/admin"
              prefetch
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
                <ShieldCheck className={cn("h-4.5 w-4.5 shrink-0 text-[rgb(var(--color-primary))]", collapsed && "h-5 w-5")} />
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
            <Settings className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
          </Link>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[rgb(var(--color-muted-foreground))] font-medium">
              Doloyal AI SaaS
            </span>
            <Link href="/app/settings" title="Settings">
              <Settings className="h-4.5 w-4.5 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))] transition-colors" />
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

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="relative h-full w-64 shadow-2xl z-10">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
});
