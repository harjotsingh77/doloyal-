"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Info, ShieldBan, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from "@doloyal/ui";
import { avatarColor, initials, relativeTime } from "@doloyal/shared";
import type { AdminUserDetail } from "@doloyal/shared";
import { api } from "@/lib/api";

const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "STAFF", "CUSTOMER"];

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = React.useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.adminGetUser(id));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleSuspend = async () => {
    if (!data) return;
    const action = data.status === "SUSPENDED" ? "reactivate" : "suspend";
    if (!window.confirm(`Are you sure you want to ${action} ${data.email}? This revokes active sessions.`)) return;
    setBusy(true);
    try {
      await api.adminSetUserSuspended(id, data.status !== "SUSPENDED");
      toast.success(action === "suspend" ? "User suspended" : "User reactivated");
      void load();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (tenantId: string, role: string) => {
    try {
      await api.adminChangeUserRole(id, tenantId, role);
      toast.success("Role updated");
      void load();
    } catch {
      toast.error("Could not update role");
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Info className="h-10 w-10" />} title="User not found" description="This user may have been removed." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${data.firstName} ${data.lastName}`.trim() || data.email}
        description={data.email}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Users", href: "/admin/users" }, { label: data.email }]}
        actions={
          <>
            <Button variant={data.status === "SUSPENDED" ? "success" : "danger"} onClick={toggleSuspend} loading={busy}>
              <ShieldBan className="h-4 w-4" />
              {data.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/users">
                <ArrowLeft className="h-4 w-4" />
                Back
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback style={{ backgroundColor: avatarColor(data.email) }} className="text-lg">
                  {initials(`${data.firstName} ${data.lastName}`.trim() || data.email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-lg font-semibold text-[rgb(var(--color-foreground))]">
                  {data.firstName || data.lastName ? `${data.firstName} ${data.lastName}`.trim() : "—"}
                </p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{data.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant={data.status === "SUSPENDED" ? "danger" : "success"}>{data.status}</Badge>
                  {data.isAdmin ? <Badge variant="primary">{data.adminRole?.replace(/_/g, " ") ?? "Admin"}</Badge> : null}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Phone</p>
                <p className="font-medium text-[rgb(var(--color-foreground))]">{data.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">2FA</p>
                <p className="font-medium text-[rgb(var(--color-foreground))]">{data.twoFactorEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Businesses</p>
                <p className="font-medium text-[rgb(var(--color-foreground))]">{data.businessCount}</p>
              </div>
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Joined</p>
                <p className="font-medium text-[rgb(var(--color-foreground))]">{relativeTime(data.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Memberships
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.memberships.length === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No business memberships.</p>
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {data.memberships.map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{m.tenantName}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Joined {relativeTime(m.createdAt)}</p>
                    </div>
                    <Select value={m.role} onValueChange={(r) => changeRole(m.tenantId, r)}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r.charAt(0) + r.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Login history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.loginHistory.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No logins recorded.</p>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {data.loginHistory.map((l) => (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${l.successful ? "bg-[rgb(var(--color-success))]" : "bg-[rgb(var(--color-danger))]"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[rgb(var(--color-foreground))]">
                      {l.successful ? "Successful" : "Failed"} login
                    </p>
                    <p className="truncate text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                      {[l.browser, l.device, l.ip, l.location].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <span className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(l.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}