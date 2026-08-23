"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from "@doloyal/ui";
import { initials } from "@doloyal/shared";
import { useAuth } from "@/lib/auth";
import { SettingsSection, SettingRow } from "../settings-ui";

export default function ProfileSettingsPage() {
  const { user } = useAuth();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—";
  const role = user?.activeRole ?? "—";

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Profile</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Your personal account details.
        </p>
      </div>

      <SettingsSection title="Account">
        <div className="flex items-center gap-4 py-3">
          <Avatar className="h-14 w-14 border border-[rgb(var(--color-border))]">
            {user?.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={fullName} /> : null}
            <AvatarFallback>{initials(fullName === "—" ? "U" : fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{user?.email}</p>
          </div>
        </div>

        <SettingRow label="Full name">{fullName}</SettingRow>
        <SettingRow label="Email">{user?.email ?? "—"}</SettingRow>
        <SettingRow
          label="Role"
          description="Your access level in this workspace."
        >
          <Badge variant="outline" className="capitalize">{role.toLowerCase()}</Badge>
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Sign-in & security"
        description="Profile details come from your sign-in account. Password, two-factor authentication and sessions are managed under Security."
      >
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link href="/app/settings/security" prefetch>
            <Button variant="secondary" size="sm">
              <ShieldCheck className="h-4 w-4" />
              Security settings
            </Button>
          </Link>
          <Link href="/app/settings/team" prefetch>
            <Button variant="ghost" size="sm">
              Team & access
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </SettingsSection>
    </div>
  );
}
