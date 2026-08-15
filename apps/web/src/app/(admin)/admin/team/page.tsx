"use client";

import * as React from "react";
import { ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
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
import { ADMIN_ROLE_LABELS, avatarColor, initials, relativeTime } from "@doloyal/shared";
import type { AdminTeamMember } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const ROLES = ["SUPER_ADMIN", "ADMIN", "SUPPORT_AGENT", "FINANCE", "SALES", "DEVELOPER"];

export default function AdminTeamPage() {
  const [items, setItems] = React.useState<AdminTeamMember[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const pageSize = 20;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListTeam({ status: status || undefined, search: debounced || undefined, page, pageSize });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status, debounced]);

  const changeRole = async (m: AdminTeamMember, role: string) => {
    try {
      await api.adminChangeTeamRole(m.id, role);
      toast.success("Role updated");
      void load();
    } catch {
      toast.error("Could not update role");
    }
  };

  const toggleStatus = async (m: AdminTeamMember, next: "ACTIVE" | "SUSPENDED") => {
    if (!window.confirm(`${next === "SUSPENDED" ? "Suspend" : "Reactivate"} ${m.email}?`)) return;
    try {
      await api.adminSetTeamStatus(m.id, next);
      toast.success(next === "SUSPENDED" ? "Admin suspended" : "Admin reactivated");
      void load();
    } catch {
      toast.error("Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Internal staff who can access the admin control center."
        breadcrumbs={[{ label: "Admin" }, { label: "Team" }]}
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Invite member
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="INVITED">Invited</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<ShieldCheck className="h-10 w-10" />} title="No team members found" description="Invite your first admin team member." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Last active</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: avatarColor(m.email) }} className="text-[0.6rem]">
                            {initials(`${m.firstName} ${m.lastName}`.trim())}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[rgb(var(--color-foreground))]">
                            {m.firstName} {m.lastName}
                          </p>
                          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{m.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select value={m.adminRole ?? "ADMIN"} onValueChange={(r) => changeRole(m, r)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {ADMIN_ROLE_LABELS[r as keyof typeof ADMIN_ROLE_LABELS] ?? r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">
                      {m.lastActive ? relativeTime(m.lastActive) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={m.status === "ACTIVE" ? "success" : m.status === "INVITED" ? "warning" : "danger"}>{m.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={m.status === "SUSPENDED" ? "success" : "danger"} onClick={() => toggleStatus(m, m.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED")}>
                        {m.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Team members" />

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} onInvited={() => { setInviteOpen(false); void load(); }} />
    </div>
  );
}

function InviteDialog({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: () => void }) {
  const [email, setEmail] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [role, setRole] = React.useState("ADMIN");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    if (!email.trim()) {
      toast.error("Email is required");
      return;
    }
    setBusy(true);
    try {
      await api.adminInviteTeamMember({ email: email.trim(), firstName: firstName || undefined, lastName: lastName || undefined, role });
      toast.success(`Invitation sent to ${email.trim()}`);
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("ADMIN");
      onInvited();
    } catch {
      toast.error("Could not invite member");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite admin team member</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Email</Label>
            <Input type="email" placeholder="admin@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">First name</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Last name</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ADMIN_ROLE_LABELS[r as keyof typeof ADMIN_ROLE_LABELS] ?? r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={busy}>
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}