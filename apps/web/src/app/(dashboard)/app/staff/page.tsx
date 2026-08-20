"use client";

import * as React from "react";
import { Plus, Search, Download, Users, MoreVertical, Filter, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription, PageHeader,
  Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Avatar, AvatarImage, AvatarFallback, EmptyState, Skeleton, DropdownMenu,
  DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@doloyal/ui";
import {
  ROLE_LABELS, STAFF_STATUS_LABELS, INVITATION_STATUS_LABELS,
  type StaffMember, type StaffStats, type StaffMemberList,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import {
  StatsCards, InviteMemberDialog, ManageMemberDialog, InvitationsPanel,
  sfInitials, sfName, roleBadge, statusBadge, relTime, fmtDate,
} from "@/components/staff/staff-parts";

const STATUS_FILTERS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "PENDING", label: "Pending" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
];

const ROLE_FILTERS = [
  { value: "ALL", label: "All roles" },
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "STAFF", label: "Staff" },
];

export default function StaffPage() {
  const [tab, setTab] = React.useState<"members" | "invitations">("members");
  const [stats, setStats] = React.useState<StaffStats | null>(null);
  const [list, setList] = React.useState<StaffMemberList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = React.useState("dateJoined");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [manageId, setManageId] = React.useState<string | null>(null);
  const [manageOpen, setManageOpen] = React.useState(false);
  const [exporting, setExporting] = React.useState<"csv" | "xlsx" | null>(null);
  const [bulkBusy, setBulkBusy] = React.useState(false);

  const pageSize = 20;

  const loadStats = React.useCallback(async () => {
    try {
      setStats(await api.getStaffStats());
    } catch { /* stats optional */ }
  }, []);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.listStaffMembers({
        search: search || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
        status: statusFilter !== "ALL" ? (statusFilter as import("@doloyal/shared").StaffStatus) : undefined,
        sortBy, sortDir, page, pageSize,
      });
      setList(res);
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of prev) {
          if (!res.items.some((m) => m.id === id)) next.delete(id);
        }
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, sortBy, sortDir, page]);

  const refresh = React.useCallback(async () => {
    await Promise.all([load(), loadStats()]);
  }, [load, loadStats]);

  React.useEffect(() => {
    loadStats();
  }, [loadStats]);

  React.useEffect(() => {
    const t = setTimeout(() => { if (page !== 1) setPage(1); else load(); }, 250);
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter]);

  React.useEffect(() => { load(); }, [load, page, sortBy, sortDir]);

  const members = list?.items ?? [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      const all = members.filter((m) => !m.isCurrentUser).map((m) => m.id);
      const next = new Set(prev);
      const anyUnselected = all.some((id) => !next.has(id));
      if (anyUnselected) all.forEach((id) => next.add(id));
      else all.forEach((id) => next.delete(id));
      return next;
    });
  };

  const doExport = async (format: "csv" | "xlsx") => {
    try {
      setExporting(format);
      const { blob, filename } = await api.exportStaff(format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${format.toUpperCase()} file`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(null);
    }
  };

  const runBulk = async (action: "DEACTIVATE" | "ACTIVATE" | "SUSPEND" | "RESEND_INVITATION", label: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (action === "SUSPEND" && !window.confirm(`Suspend ${ids.length} member(s)?`)) return;
    try {
      setBulkBusy(true);
      const res = await api.staffBulkAction({ ids, action });
      toast.success(`${label}: ${res.succeeded} succeeded${res.failed ? `, ${res.failed} failed` : ""}`);
      setSelected(new Set());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  };

  const openManage = (m: StaffMember) => {
    setManageId(m.id);
    setManageOpen(true);
  };

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const SortableHead = ({ label, k }: { label: string; k: string }) => (
    <TableHead className="cursor-pointer select-none" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sortBy === k && <span className="text-[0.6rem] text-[rgb(var(--color-primary))]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team Management"
        description="Manage staff, invitations, roles, permissions and security."
        actions={
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" loading={!!exporting}>
                  {exporting ? <FileSpreadsheet className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Export members</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => doExport("csv")}>
                  <FileText className="h-4 w-4" /> CSV file
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => doExport("xlsx")}>
                  <FileSpreadsheet className="h-4 w-4" /> Excel (XLSX)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" /> Invite Member
            </Button>
            <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onCreated={refresh} />
          </div>
        }
      />

      <StatsCards stats={stats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-4">
            <div className="flex rounded-lg border border-[rgb(var(--color-border))] p-0.5">
              {(["members", "invitations"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                    tab === t
                      ? "bg-[rgb(var(--color-primary))] text-white"
                      : "text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
                  }`}
                >
                  {t === "members" ? "Members" : "Invitations"}
                </button>
              ))}
            </div>
            {tab === "invitations" && <CardDescription>Invitations, pending and history</CardDescription>}
          </div>
          {tab === "members" && (
            <CardDescription>
              {list ? `${list.total} member${list.total === 1 ? "" : "s"}` : "Loading..."}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {tab === "members" ? (
            <>
              <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(var(--color-border))] px-6 py-4">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
                  <Input
                    placeholder="Search name, email or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTERS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onCreated={refresh} />
                {selected.size > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--color-primary)/0.08)] px-3 py-1.5">
                    <span className="text-xs font-medium text-[rgb(var(--color-primary))]">{selected.size} selected</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" loading={bulkBusy} onClick={() => runBulk("ACTIVATE", "Activated")}>Activate</Button>
                      <Button variant="ghost" size="sm" loading={bulkBusy} onClick={() => runBulk("DEACTIVATE", "Deactivated")}>Deactivate</Button>
                      <Button variant="ghost" size="sm" className="text-[rgb(var(--color-warning))]" loading={bulkBusy} onClick={() => runBulk("SUSPEND", "Suspended")}>Suspend</Button>
                      <Button variant="ghost" size="sm" className="text-[rgb(var(--color-danger))]" loading={bulkBusy} onClick={() => runBulk("RESEND_INVITATION", "Invitation resent")}>Resend invite</Button>
                    </div>
                  </div>
                )}
              </div>

              {loading && !list ? (
                <div className="space-y-4 p-6">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : members.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No members found"
                    description="Invite your first team member or adjust your filters."
                    action={<Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite member</Button>}
                  />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[rgb(var(--color-primary))]"
                            checked={members.filter((m) => !m.isCurrentUser).length > 0 && members.filter((m) => !m.isCurrentUser).every((m) => selected.has(m.id))}
                            onChange={toggleAll}
                          />
                        </TableHead>
                        <SortableHead label="Name" k="name" />
                        <SortableHead label="Role" k="role" />
                        <SortableHead label="Status" k="status" />
                        <TableHead>Online</TableHead>
                        <SortableHead label="Joined" k="dateJoined" />
                        <SortableHead label="Last active" k="lastLogin" />
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((m) => (
                        <TableRow
                          key={m.id}
                          className={m.isCurrentUser ? "bg-[rgb(var(--color-primary)/0.04)]" : ""}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
                              checked={selected.has(m.id)}
                              disabled={m.isCurrentUser}
                              onChange={() => toggleSelect(m.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <button className="flex items-center gap-3 text-left" onClick={() => openManage(m)}>
                              <Avatar className="h-8 w-8">
                                {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt={sfName(m)} /> : null}
                                <AvatarFallback className="text-[0.65rem] font-medium">{sfInitials(m)}</AvatarFallback>
                              </Avatar>
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-[rgb(var(--color-foreground))]">
                                  {sfName(m)}
                                  {m.isCurrentUser && <span className="ml-1.5 text-[0.65rem] text-[rgb(var(--color-primary))]">(you)</span>}
                                </span>
                                <span className="block truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                                  {m.email}{m.jobTitle ? ` · ${m.jobTitle}` : ""}
                                </span>
                              </span>
                            </button>
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleBadge(m.role)} className="text-[0.65rem]">{ROLE_LABELS[m.role]}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusBadge(m.status)} className="text-[0.65rem]">{STAFF_STATUS_LABELS[m.status]}</Badge>
                            {m.invitationStatus && m.status === "PENDING" && (
                              <p className="mt-0.5 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                                {INVITATION_STATUS_LABELS[m.invitationStatus]} · {fmtDate(m.invitationSentAt)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {m.isOnline ? (
                              <Badge variant="success" className="text-[0.65rem]" dot>Online</Badge>
                            ) : (
                              <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                                {m.lastSeenAt ? `Seen ${relTime(m.lastSeenAt)}` : "—"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-[rgb(var(--color-muted-foreground))]">{fmtDate(m.dateJoined)}</TableCell>
                          <TableCell className="text-[rgb(var(--color-muted-foreground))]">
                            {m.lastLoginAt ? relTime(m.lastLoginAt) : "—"}
                            {m.lastLoginDevice && <span className="block text-[0.6rem]">{m.lastLoginDevice}</span>}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{sfName(m)}</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openManage(m)}>Manage</DropdownMenuItem>
                                {!m.isCurrentUser && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => openManage(m)}>
                                      Remove
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {list && list.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-[rgb(var(--color-border))] px-6 py-3">
                      <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        Page {list.page} of {list.totalPages} · {list.total} total
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="secondary" size="sm" disabled={page >= list.totalPages} onClick={() => setPage((p) => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <InvitationsPanel onChanged={refresh} onViewMember={(memberId) => { setManageId(memberId); setManageOpen(true); }} />
          )}
        </CardContent>
      </Card>

      <ManageMemberDialog
        memberId={manageId}
        open={manageOpen}
        onOpenChange={(o) => { setManageOpen(o); if (!o) setManageId(null); }}
        onChanged={refresh}
      />
    </div>
  );
}