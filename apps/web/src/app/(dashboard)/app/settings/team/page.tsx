"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, UserPlus, Users } from "lucide-react";
import { Badge, Button, Skeleton } from "@doloyal/ui";
import { api } from "@/lib/api";
import { useSettingsChrome } from "../settings-chrome";
import { SettingsSection, SettingsError } from "../settings-ui";

type StaffStats = {
  total: number;
  admins: number;
  managers: number;
  staff: number;
  pendingInvitations: number;
  online: number;
};

export default function TeamSettingsPage() {
  const [stats, setStats] = React.useState<StaffStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const { setStatus } = useSettingsChrome();

  React.useEffect(() => {
    let cancelled = false;
    api
      .getStaffStats()
      .then((s) => !cancelled && setStats(s as StaffStats))
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Failed to load team"));
    return () => {
      cancelled = true;
    };
  }, []);

  // This page is read-only; keep the header indicator calm.
  React.useEffect(() => {
    setStatus("idle");
    return () => setStatus("idle");
  }, [setStatus]);

  if (error)
    return <SettingsError message={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Team & Access</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Members, roles and invitations are managed in the Staff center.
        </p>
      </div>

      <SettingsSection title="Overview">
        {stats === null ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={<Users className="h-4 w-4" />} label="Members" value={stats.total} />
            <StatCard icon={<UserPlus className="h-4 w-4" />} label="Pending invites" value={stats.pendingInvitations} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Admins" value={stats.admins} />
            <StatCard icon={<Users className="h-4 w-4" />} label="Online now" value={stats.online} />
          </div>
        )}
      </SettingsSection>

      <SettingsSection>
        <Link
          href="/app/staff"
          prefetch
          className="group flex items-center justify-between rounded-xl border border-[rgb(var(--color-border))] px-4 py-4 transition-colors hover:bg-[rgb(var(--color-muted)/0.4)]"
        >
          <div>
            <p className="text-sm font-medium">Manage team members</p>
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              Invite staff, assign roles and permissions, manage branches.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))] transition-transform group-hover:translate-x-0.5" />
        </Link>
      </SettingsSection>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[rgb(var(--color-border))] p-4">
      <div className="flex items-center gap-1.5 text-[rgb(var(--color-muted-foreground))]">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
