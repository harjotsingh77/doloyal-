"use client";

import * as React from "react";
import { Laptop, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminSecurityEventItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"];

const SEVERITY_VARIANT: Record<string, string> = {
  INFO: "outline",
  WARNING: "warning",
  ERROR: "danger",
  CRITICAL: "danger",
};

export default function AdminSecurityPage() {
  const [events, setEvents] = React.useState<AdminSecurityEventItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [sessions, setSessions] = React.useState<Array<{ id: string; email: string; name: string; adminRole: string | null; device: string | null; browser: string | null; ip: string | null; lastActive: string | null; sessions: number }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [severity, setSeverity] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState<string | null>(null);
  const pageSize = 20;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [ev, ses] = await Promise.all([
        api.adminListSecurityEvents({ severity: severity || undefined, page, pageSize }),
        api.adminListSessions(),
      ]);
      setEvents(ev.items || []);
      setTotal(ev.total || 0);
      setSessions(ses || []);
    } catch {
      setEvents([]);
      setTotal(0);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [severity, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [severity]);

  const terminate = async (userId: string) => {
    if (!window.confirm("Terminate all sessions for this admin user?")) return;
    setBusy(userId);
    try {
      await api.adminTerminateSession(userId);
      toast.success("Sessions terminated");
      void load();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Security events and active admin sessions."
        breadcrumbs={[{ label: "Admin" }, { label: "Security" }]}
      />

      <div className="w-44">
        <Select value={severity} onValueChange={(v) => setSeverity(v === "ALL" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeaderWithTitle title="Security events" icon={<Shield className="h-4 w-4" />} />
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="p-10">
              <EmptyState icon={<Shield className="h-10 w-10" />} title="No security events" description="Security events appear here when they occur." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">IP</TableHead>
                  <TableHead className="text-right">Severity</TableHead>
                  <TableHead className="hidden text-right md:table-cell">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{e.type.replace(/_/g, " ")}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{e.message}</p>
                    </TableCell>
                    <TableCell className="text-sm">{e.userName ?? "—"}</TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">{e.ip ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(SEVERITY_VARIANT[e.severity] as any) ?? "outline"}>{e.severity}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">{relativeTime(e.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Security events" />

      <Card>
        <CardHeaderWithTitle title="Active admin sessions" icon={<Laptop className="h-4 w-4" />} />
        <CardContent className="p-0">
          {sessions.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No active admin sessions.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Device</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Sessions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{s.name || s.email}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{s.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.adminRole?.replace(/_/g, " ") ?? "—"}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] lg:table-cell">
                      {[s.browser, s.device, s.ip].filter(Boolean).join(" · ") || "—"}
                      {s.lastActive ? <p className="mt-0.5 text-[0.62rem]">last active {relativeTime(s.lastActive)}</p> : null}
                    </TableCell>
                    <TableCell className="hidden text-right md:table-cell">{s.sessions}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="danger" onClick={() => terminate(s.id)} loading={busy === s.id}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Terminate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CardHeaderWithTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-5 pb-2">
      <span className="text-[rgb(var(--color-muted-foreground))]">{icon}</span>
      <h3 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{title}</h3>
    </div>
  );
}