"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheck, Globe, LogOut } from "lucide-react";
import { useAuth, AuthGuard } from "@/lib/auth";
import { Logo } from "@doloyal/ui";
import { cn } from "@doloyal/ui";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (user && user.isAdmin !== true) {
      router.replace("/app");
    }
  }, [user, router]);

  const isRequests = pathname.startsWith("/admin/website-requests");

  return (
    <AuthGuard>
      <div className="flex h-screen flex-col bg-[rgb(var(--color-background))]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin/website-requests" className="flex items-center gap-2">
              <Logo size={24} />
            </Link>
            <span className="flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-primary)/0.1)] px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-primary))]">
              <ShieldCheck className="h-3 w-3" />
              Doloyal Admin
            </span>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              href="/admin/website-requests"
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isRequests
                  ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                  : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
              )}
            >
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website Requests
              </span>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[rgb(var(--color-muted-foreground))] sm:block">
              {user?.firstName ? `${user.firstName} ${user.lastName ?? ""}` : user?.email}
            </span>
            <Link
              href="/app"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))] transition-colors"
              title="Back to app"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 lg:px-6">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
