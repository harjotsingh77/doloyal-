"use client";

import * as React from "react";
import { toast } from "sonner";
import { KeyRound, ShieldCheck, MonitorSmartphone, LogOut } from "lucide-react";
import { Button, Input, Field, Badge, cn } from "@doloyal/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSettingsChrome } from "../settings-chrome";
import {
  SettingsSection,
  SettingRow,
  SettingsSkeleton,
} from "../settings-ui";

type SessionInfo = {
  id: string;
  device: string;
  ip?: string | null;
  lastActiveAt: string;
  current?: boolean;
};

function passwordScore(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong", "Excellent"];
  const colors = [
    "bg-[rgb(var(--color-border))]",
    "bg-[rgb(var(--color-danger))]",
    "bg-[rgb(var(--color-warning))]",
    "bg-[rgb(var(--color-warning))]",
    "bg-[rgb(var(--color-success))]",
    "bg-[rgb(var(--color-success))]",
  ];
  return { score, label: labels[score], color: colors[score] };
}

function formatLastActive(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function SecuritySettingsPage() {
  const { user, logout } = useAuth();
  const { setStatus } = useSettingsChrome();

  // Password
  const [pw, setPw] = React.useState({ current: "", next: "", confirm: "" });
  const [changingPw, setChangingPw] = React.useState(false);
  const strength = passwordScore(pw.next);
  const pwMismatch = pw.confirm.length > 0 && pw.next !== pw.confirm;

  // 2FA
  const [twoFactor, setTwoFactor] = React.useState<boolean | null>(
    user?.twoFactorEnabled != null ? Boolean(user.twoFactorEnabled) : null,
  );
  const [twoFactorBusy, setTwoFactorBusy] = React.useState(false);

  // Sessions
  const [sessions, setSessions] = React.useState<SessionInfo[] | null>(null);
  const [loggingOutAll, setLoggingOutAll] = React.useState(false);

  React.useEffect(() => {
    if (user?.twoFactorEnabled != null) setTwoFactor(Boolean(user.twoFactorEnabled));
  }, [user?.twoFactorEnabled]);

  React.useEffect(() => {
    let cancelled = false;
    api
      .listSessions()
      .then((list) => !cancelled && setSessions(list as SessionInfo[]))
      .catch(() => !cancelled && setSessions([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const updatePassword = async () => {
    if (pw.next.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (pw.next !== pw.confirm) {
      toast.error("New passwords do not match");
      return;
    }
    setChangingPw(true);
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setChangingPw(false);
    }
  };

  const toggle2FA = async () => {
    if (twoFactor == null) return;
    setTwoFactorBusy(true);
    try {
      const res = await api.setTwoFactor(!twoFactor);
      setTwoFactor(res.twoFactorEnabled);
      setStatus("saved");
      toast.success(res.twoFactorEnabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update two-factor authentication");
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const logoutAllDevices = async () => {
    setLoggingOutAll(true);
    try {
      await api.logoutAllDevices();
      toast.success("Logged out from all devices");
      logout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log out other sessions");
      setLoggingOutAll(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Security</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          Protect your account with a strong password and two-factor authentication.
        </p>
      </div>

      {/* Password */}
      <SettingsSection title="Password">
        <div className="grid gap-x-6 sm:grid-cols-3">
          <Field label="Current password">
            <Input
              type="password"
              value={pw.current}
              autoComplete="current-password"
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              value={pw.next}
              autoComplete="new-password"
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
            />
          </Field>
          <Field
            label="Confirm new password"
            error={pwMismatch ? "Passwords do not match" : undefined}
          >
            <Input
              type="password"
              value={pw.confirm}
              autoComplete="new-password"
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
            />
          </Field>
        </div>

        {pw.next ? (
          <div className="mt-1 flex items-center gap-3">
            <div className="flex h-1.5 w-40 overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
              <div
                className={cn("h-full rounded-full transition-all duration-200", strength.color)}
                style={{ width: `${(strength.score / 5) * 100}%` }}
              />
            </div>
            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{strength.label}</span>
          </div>
        ) : null}

        <div className="pt-4">
          <Button
            variant="secondary"
            size="sm"
            loading={changingPw}
            disabled={!pw.current || !pw.next || !pw.confirm}
            onClick={updatePassword}
          >
            <KeyRound className="h-4 w-4" />
            Update password
          </Button>
        </div>
      </SettingsSection>

      {/* Two-factor */}
      <SettingsSection title="Two-factor authentication">
        <SettingRow
          label="Extra verification at sign-in"
          description="Require a second step in addition to your password."
        >
          <div className="flex items-center justify-end gap-3">
            <Badge variant={twoFactor ? "success" : "outline"}>
              {twoFactor == null ? "—" : twoFactor ? "Enabled" : "Disabled"}
            </Badge>
            <Button
              variant={twoFactor ? "secondary" : "primary"}
              size="sm"
              loading={twoFactorBusy}
              disabled={twoFactor == null}
              onClick={toggle2FA}
            >
              {twoFactor ? "Disable" : "Enable"}
            </Button>
          </div>
        </SettingRow>
      </SettingsSection>

      {/* Active sessions */}
      <SettingsSection title="Active sessions" description="Devices currently signed in to your account.">
        {sessions === null ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[rgb(var(--color-muted)/0.6)]" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No active sessions found.</p>
        ) : (
          <ul className="divide-y divide-[rgb(var(--color-border))] rounded-xl border border-[rgb(var(--color-border))]">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                <MonitorSmartphone className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">{s.device}</span>
                    {s.current ? (
                      <span className="shrink-0 rounded-full bg-[rgb(var(--color-success)/0.12)] px-2 py-0.5 text-[0.65rem] font-semibold text-[rgb(var(--color-success))]">
                        This device
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    Last active {formatLastActive(s.lastActiveAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="pt-4">
          <Button variant="danger" size="sm" loading={loggingOutAll} onClick={logoutAllDevices}>
            <LogOut className="h-4 w-4" />
            Log out all devices
          </Button>
        </div>
      </SettingsSection>

      <SettingsSection>
        <div className="flex items-start gap-2 text-xs leading-relaxed text-[rgb(var(--color-subtle))]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Changing your password signs out all other devices automatically.</span>
        </div>
      </SettingsSection>
    </div>
  );
}
