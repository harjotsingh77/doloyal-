"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Building2,
  Command,
  CreditCard,
  FileText,
  Globe,
  Heart,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Megaphone,
  Menu,
  MessagesSquare,
  Package,
  Palette,
  RefreshCcw,
  Rocket,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  SquareStack,
  Ticket,
  Users,
  Webhook,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth, AdminGuard } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@doloyal/ui";
import { AdminGlobalSearch } from "./_components/global-search";
import { AdminNotifications } from "./_components/notifications";
import { relativeTime } from "@doloyal/shared";

const NAV = [
  {
    section: "Overview",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
      { href: "/admin/analytics", label: "Analytics", icon: Activity, match: (p: string) => p.startsWith("/admin/analytics") },
    ],
  },
  {
    section: "Business",
    items: [
      { href: "/admin/businesses", label: "Businesses", icon: Building2, match: (p: string) => p.startsWith("/admin/businesses") },
      { href: "/admin/users", label: "Users", icon: Users, match: (p: string) => p.startsWith("/admin/users") },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: Package, match: (p: string) => p.startsWith("/admin/subscriptions") },
      { href: "/admin/billing", label: "Billing", icon: CreditCard, match: (p: string) => p.startsWith("/admin/billing") },
      { href: "/admin/plans", label: "Plans & Pricing", icon: Rocket, match: (p: string) => p.startsWith("/admin/plans") },
    ],
  },
  {
    section: "Engagement",
    items: [
      { href: "/admin/customers", label: "Customers", icon: Users, match: (p: string) => p.startsWith("/admin/customers") },
      { href: "/admin/bookings", label: "Bookings", icon: ShoppingBag, match: (p: string) => p.startsWith("/admin/bookings") },
      { href: "/admin/loyalty", label: "Loyalty", icon: Heart, match: (p: string) => p.startsWith("/admin/loyalty") },
      { href: "/admin/rewards", label: "Rewards", icon: GiftIcon, match: (p: string) => p.startsWith("/admin/rewards") },
      { href: "/admin/memberships", label: "Memberships", icon: SquareStack, match: (p: string) => p.startsWith("/admin/memberships") },
      { href: "/admin/campaigns", label: "Campaigns", icon: Megaphone, match: (p: string) => p.startsWith("/admin/campaigns") },
    ],
  },
  {
    section: "AI & Websites",
    items: [
      { href: "/admin/ai", label: "AI", icon: Sparkles, match: (p: string) => p.startsWith("/admin/ai") },
      { href: "/admin/websites", label: "Website Builder", icon: Globe, match: (p: string) => p.startsWith("/admin/websites") },
      { href: "/admin/website-requests", label: "Website Requests", icon: FileText, match: (p: string) => p.startsWith("/admin/website-requests") },
      { href: "/admin/connections", label: "Connections", icon: Webhook, match: (p: string) => p.startsWith("/admin/connections") },
    ],
  },
  {
    section: "Support & Content",
    items: [
      { href: "/admin/support", label: "Support", icon: LifeBuoy, match: (p: string) => p.startsWith("/admin/support") },
      { href: "/admin/feedback", label: "Feedback", icon: MessagesSquare, match: (p: string) => p.startsWith("/admin/feedback") },
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone, match: (p: string) => p.startsWith("/admin/announcements") },
      { href: "/admin/help-center", label: "Help Center", icon: Ticket, match: (p: string) => p.startsWith("/admin/help-center") },
    ],
  },
  {
    section: "System",
    items: [
      { href: "/admin/system", label: "System Health", icon: Activity, match: (p: string) => p.startsWith("/admin/system") },
      { href: "/admin/logs", label: "Logs", icon: FileText, match: (p: string) => p.startsWith("/admin/logs") },
      { href: "/admin/security", label: "Security", icon: Shield, match: (p: string) => p.startsWith("/admin/security") },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck, match: (p: string) => p.startsWith("/admin/audit-logs") },
    ],
  },
  {
    section: "Team & Settings",
    items: [
      { href: "/admin/team", label: "Admin Team", icon: Users, match: (p: string) => p.startsWith("/admin/team") },
      { href: "/admin/integrations", label: "Integrations", icon: Webhook, match: (p: string) => p.startsWith("/admin/integrations") },
      { href: "/admin/settings", label: "Settings", icon: Settings, match: (p: string) => p.startsWith("/admin/settings") },
    ],
  },
];

function GiftIcon(props: React.ComponentProps<"svg">) {
  return <Palette {...props} />;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  const isImpersonating = user?.isImpersonating === true;

  const handleExitImpersonation = React.useCallback(() => {
    logout();
  }, [logout]);

  const handleLogout = React.useCallback(() => {
    logout();
  }, [logout]);

  const SidebarContent = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[rgb(var(--color-border))] px-4">
        <Link href="/admin" className="flex items-center gap-3 group">
          <img
            src="/8bg.png"
            alt="Doloyal Admin"
            className="h-8 w-8 rounded-lg object-contain shrink-0"
          />
          <div className="leading-tight">
            <p className="text-base font-semibold text-[rgb(var(--color-foreground))] group-hover:text-[rgb(var(--color-primary))] transition-colors">
              Doloyal Admin
            </p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              {user?.adminRole ? user.adminRole.replace(/_/g, " ") : "Control Center"}
            </p>
          </div>
        </Link>
        <button
          onClick={closeDrawer}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => (
          <div key={group.section} className="mb-5">
            <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    className={cn(
                      "flex items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                        : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                    )}
                  >
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-[rgb(var(--color-border))] p-3">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-[0.625rem] px-3 py-2.5 text-sm font-medium text-[rgb(var(--color-danger))] transition-colors hover:bg-[rgb(var(--color-danger)/0.08)]"
        >
          <LogOut className="h-4.5 w-4.5" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <AdminGuard>
      <div className="flex h-screen bg-[rgb(var(--color-background))]">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] lg:block">
          {SidebarContent}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
            <aside className="absolute inset-y-0 left-0 w-64 bg-[rgb(var(--color-surface))] shadow-2xl">{SidebarContent}</aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 lg:px-6">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <Link href="/admin" className="flex items-center gap-2 lg:hidden">
              <img src="/8bg.png" alt="Doloyal Admin" className="h-7 w-7 rounded-lg object-contain" />
              <span className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Doloyal Admin</span>
            </Link>

            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-primary)/0.1)] px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-primary))]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <AdminGlobalSearch />
              <AdminNotifications />
              <div className="mx-1 h-5 w-px bg-[rgb(var(--color-border))]" />
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[0.65rem] font-semibold text-white"
                  style={{
                    backgroundColor: (() => {
                      const palette = ["#2563EB", "#60A5FA", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"];
                      let h = 0;
                      for (const c of user?.email ?? "admin") h = (h * 31 + c.charCodeAt(0)) % 997;
                      return palette[h % palette.length];
                    })(),
                  }}
                >
                  {(user?.firstName?.[0] ?? user?.email?.[0] ?? "A").toUpperCase()}
                </div>
                <div className="hidden leading-tight sm:block">
                  <p className="text-xs font-medium text-[rgb(var(--color-foreground))]">
                    {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}`.trim() : user?.email}
                  </p>
                  <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                    {user?.adminRole ? user.adminRole.replace(/_/g, " ").toLowerCase() : "admin"}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {isImpersonating ? (
            <div className="flex items-center justify-between gap-3 bg-[rgb(var(--color-warning)/0.12)] px-4 py-2 text-xs text-[rgb(var(--color-warning))] lg:px-6">
              <span className="flex items-center gap-2">
                <RefreshCcw className="h-3.5 w-3.5" />
                You are viewing as{" "}
                <strong className="font-semibold">{user.impersonatedTenantName ?? "this business"}</strong>. Every action
                is tracked in the audit log.
              </span>
              <button
                onClick={handleExitImpersonation}
                className="rounded-md bg-[rgb(var(--color-warning))] px-2.5 py-1 font-medium text-white hover:opacity-90"
              >
                Exit impersonation
              </button>
            </div>
          ) : null}

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</div>
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
