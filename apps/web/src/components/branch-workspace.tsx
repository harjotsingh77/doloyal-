"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Store,
  ArrowLeft,
  Globe,
  Plus,
  Check,
  MapPin,
} from "lucide-react";
import {
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@doloyal/ui";
import { cn } from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { getBranchInitials, type BranchProfile } from "@/lib/branches";

const WORKSPACE_PAGES = [
  { slug: "dashboard", label: "Dashboard" },
  { slug: "customers", label: "Customers" },
  { slug: "appointments", label: "Appointments" },
  { slug: "booking-links", label: "Booking Links" },
  { slug: "loyalty", label: "Loyalty" },
  { slug: "rewards", label: "Rewards" },
  { slug: "memberships", label: "Memberships" },
  { slug: "referrals", label: "Referrals" },
  { slug: "campaigns", label: "Campaigns" },
  { slug: "assistant", label: "AI Assistant" },
  { slug: "analytics", label: "Analytics" },
  { slug: "invoices", label: "Invoices" },
  { slug: "staff", label: "Staff" },
  { slug: "settings", label: "Settings" },
];

export function branchPageLabel(slug: string): string {
  return WORKSPACE_PAGES.find((p) => p.slug === slug)?.label ?? slug;
}

export function useWorkspaceNav() {
  const pathname = usePathname();
  const segment = pathname.split("/").filter(Boolean)[2];
  return { slug: segment ?? "dashboard", label: branchPageLabel(segment ?? "dashboard") };
}

export function BranchAvatar({
  branch,
  size = "md",
}: {
  branch: { id?: string; name: string; accent: string };
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-11 w-11 text-base" : size === "sm" ? "h-7 w-7 text-[0.6rem]" : "h-9 w-9 text-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[0.625rem] font-semibold text-white",
        sizeClass,
      )}
      style={{ backgroundColor: branch.accent }}
    >
      {getBranchInitials(branch.name)}
    </div>
  );
}

/** Dropdown used to switch branches or return to the global workspace. */
export function BranchSwitcher() {
  const router = useRouter();
  const { branches, selectedBranch, enterBranchById, exitBranch } = useBranch();

  const goToBranch = (b: BranchProfile) => {
    enterBranchById(b.id);
    router.push(`/branches/${b.id}/dashboard`);
  };

  const goToAll = () => {
    exitBranch();
    router.push("/app/branches");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center gap-2 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-1.5 text-sm font-medium shadow-sm transition-all hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-[var(--shadow-lifted)]">
          {selectedBranch ? (
            <>
              <BranchAvatar branch={selectedBranch} size="sm" />
              <span className="hidden sm:block">{selectedBranch.name}</span>
              <span className="block sm:hidden">Branch</span>
            </>
          ) : (
            <>
              <Globe className="h-4 w-4 text-[rgb(var(--color-primary))]" />
              <span>Global Workspace</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 text-[rgb(var(--color-muted-foreground))] transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
          Workspace
        </DropdownMenuLabel>

        <DropdownMenuItem
          onClick={goToAll}
          className={cn(
            "cursor-pointer",
            !selectedBranch && "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]",
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
            <Globe className="h-4 w-4" />
          </span>
          <span className="flex-1">
            <span className="block text-sm">All Branches</span>
            <span className="block text-xs text-[rgb(var(--color-muted-foreground))]">
              Combined business view
            </span>
          </span>
          {!selectedBranch && <Check className="h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuLabel className="mt-1 text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
          Your Branches
        </DropdownMenuLabel>
        {branches.map((b) => (
          <DropdownMenuItem
            key={b.id}
            onClick={() => goToBranch(b)}
            className="cursor-pointer"
          >
            <BranchAvatar branch={b} size="sm" />
            <span className="flex-1">
              <span className="block text-sm">{b.name}</span>
              <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{b.address.split(",").slice(0, 2).join(",").trim()}</span>
              </span>
            </span>
            {b.status === "Paused" && (
              <Badge variant="outline" className="text-[0.6rem]">Paused</Badge>
            )}
            {selectedBranch?.id === b.id && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/app/branches")} className="cursor-pointer">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))]">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-sm">New Branch...</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Pill showing whether the app is scoped to a branch or all branches. */
export function WorkspaceModeBadge() {
  const { mode, selectedBranch } = useBranch();
  if (mode === "branch" && selectedBranch) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--color-primary)/0.25)] bg-[rgb(var(--color-primary)/0.1)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--color-primary))]">
        <Store className="h-3.5 w-3.5" />
        {selectedBranch.name}
        <span className="hidden font-normal text-[rgb(var(--color-primary)/0.7)] sm:inline">
          — showing data for this branch only
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--color-accent)/0.25)] bg-[rgb(var(--color-accent)/0.1)] px-2.5 py-1 text-xs font-medium text-[rgb(var(--color-accent))]">
      <Globe className="h-3.5 w-3.5" />
      Global Workspace
    </span>
  );
}

/** Breadcrumb: Home › Branches › {Branch} › {Page} */
export function WorkspaceBreadcrumb({ page }: { page: string }) {
  const { selectedBranch } = useBranch();
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
      <Link href="/app/dashboard" className="transition-colors hover:text-[rgb(var(--color-foreground))]">
        Home
      </Link>
      <span className="opacity-50">›</span>
      <Link href="/app/branches" className="transition-colors hover:text-[rgb(var(--color-foreground))]">
        Branches
      </Link>
      <span className="opacity-50">›</span>
      {selectedBranch ? (
        <>
          <span className="font-medium text-[rgb(var(--color-foreground))]">{selectedBranch.name}</span>
          <span className="opacity-50">›</span>
        </>
      ) : null}
      <span className="font-medium text-[rgb(var(--color-foreground))]">{page}</span>
    </nav>
  );
}

/** Back button that returns to the global Branches page. */
export function BackToBranches() {
  const { exitBranch } = useBranch();
  return (
    <Link
      href="/app/branches"
      onClick={exitBranch}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to All Branches
    </Link>
  );
}