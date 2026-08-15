"use client";

import * as React from "react";
import {
  Users, Shield, IdCard, Plus, Search, Send, Copy, Check, Mail,
  UserMinus, Trash2, RotateCcw, Camera, Lock, KeyRound, Activity,
  ScrollText, History, StickyNote, Ban, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button, Input, Card, CardHeader, CardTitle, CardContent, CardDescription,
  Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose, Table, TableHeader, TableBody,
  TableRow, TableHead, TableCell, Field, Select, SelectTrigger, SelectValue,
  SelectContent, SelectItem, Tabs, TabsList, TabsTrigger, TabsContent,
  Avatar, AvatarImage, AvatarFallback, EmptyState, Skeleton, Switch, DropdownMenu,
  DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, Textarea,
} from "@doloyal/ui";
import {
  ROLE_LABELS, STAFF_STATUS_LABELS, INVITATION_STATUS_LABELS,
  STAFF_PERMISSION_MODULES, permissionModuleFor,
  type StaffMember, type StaffStats, type StaffInvitation,
  type StaffProfileDetail, type EmployeeNote, type StaffActivityItem,
  type StaffAuditLogEntry, type LoginHistoryEntry, type StaffMemberList,
} from "@doloyal/shared";
import { api } from "@/lib/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

type BadgeVariant = "primary" | "accent" | "success" | "danger" | "warning" | "outline" | "default";

export function sfInitials(m: Pick<StaffMember, "firstName" | "lastName" | "email">): string {
  const f = m.firstName?.[0] ?? "";
  const l = m.lastName?.[0] ?? "";
  return (f + l).toUpperCase() || (m.email || "?").charAt(0).toUpperCase();
}

export function sfName(m: Pick<StaffMember, "firstName" | "lastName" | "email">): string {
  if (m.firstName && m.lastName) return `${m.firstName} ${m.lastName}`;
  if (m.firstName) return m.firstName;
  return (m.email || "Member").split("@")[0];
}

export function roleBadge(role: string): BadgeVariant {
  if (role === "OWNER") return "primary";
  if (role === "MANAGER") return "accent";
  if (role === "RECEPTIONIST") return "warning";
  return "outline";
}

export function statusBadge(status: string): BadgeVariant {
  switch (status) {
    case "ACTIVE": return "success";
    case "PENDING": return "warning";
    case "INACTIVE": return "outline";
    case "SUSPENDED": return "danger";
    case "ACCEPTED": return "success";
    case "EXPIRED": return "outline";
    case "CANCELLED": return "danger";
    default: return "outline";
  }
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function relTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

export function fmtDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Stats cards ────────────────────────────────────────────────────────────

export function StatsCards({ stats }: { stats: StaffStats | null }) {
  const cards: Array<{ label: string; value: number | string; icon: React.ReactNode; tint: string }> = stats
    ? [
        { label: "Total Members", value: stats.total, icon: <Users className="h-4 w-4" />, tint: "text-[rgb(var(--color-primary))]" },
        { label: "Admins", value: stats.admins, icon: <Shield className="h-4 w-4" />, tint: "text-[rgb(var(--color-accent))]" },
        { label: "Staff", value: stats.staff, icon: <IdCard className="h-4 w-4" />, tint: "text-[rgb(var(--color-muted-foreground))]" },
        { label: "Online", value: stats.online, icon: <UserCheck className="h-4 w-4" />, tint: "text-[rgb(var(--color-success))]" },
        { label: "Pending Invites", value: stats.pendingInvitations, icon: <Mail className="h-4 w-4" />, tint: "text-[rgb(var(--color-warning))]" },
      ]
    : Array.from({ length: 5 }).map((_, i) => ({ label: "", value: "—", icon: null, tint: "" }));
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-[rgb(var(--color-muted-foreground))]">{c.label}</CardTitle>
            {c.icon && <span className={c.tint}>{c.icon}</span>}
          </CardHeader>
          <CardContent>
            {stats ? (
              <p className="text-2xl font-bold text-[rgb(var(--color-foreground))]">{c.value}</p>
            ) : (
              <Skeleton className="h-7 w-12" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Permissions editor ─────────────────────────────────────────────────────

export function PermissionsEditor({
  value, onChange, compact,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  compact?: boolean;
}) {
  const toggle = (key: string) => {
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);
  };
  const moduleState = (moduleKeys: string[]) => {
    const active = moduleKeys.filter((k) => value.includes(k)).length;
    if (active === moduleKeys.length) return "all";
    if (active === 0) return "none";
    return "some";
  };
  return (
    <div className="space-y-3">
      {STAFF_PERMISSION_MODULES.map((mod) => {
        const state = moduleState(mod.permissions.map((p) => p.key));
        return (
          <div key={mod.key} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{mod.module}</span>
              <button
                type="button"
                className="text-xs font-medium text-[rgb(var(--color-primary))] hover:underline"
                onClick={() => {
                  const keys = mod.permissions.map((p) => p.key);
                  if (state === "all") onChange(value.filter((k) => !keys.includes(k)));
                  else onChange(Array.from(new Set([...value, ...keys])));
                }}
              >
                {state === "all" ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className={`grid gap-2 ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
              {mod.permissions.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-2 rounded-[var(--radius)] p-1.5 hover:bg-[rgb(var(--color-muted)/0.5)]"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-primary))]"
                    checked={value.includes(p.key)}
                    onChange={() => toggle(p.key)}
                  />
                  <span className="min-w-0">
                    <span className="block text-[0.8rem] font-medium text-[rgb(var(--color-foreground))]">{p.label}</span>
                    <span className="block text-xs text-[rgb(var(--color-muted-foreground))]">{p.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Invite dialog ──────────────────────────────────────────────────────────

const ROLE_OPTIONS: Array<{ value: string; label: string; hint: string }> = [
  { value: "MANAGER", label: "Manager", hint: "Full access, manages the business" },
  { value: "RECEPTIONIST", label: "Receptionist", hint: "Handles customers and appointments" },
  { value: "STAFF", label: "Staff", hint: "Day-to-day operations" },
];

export function InviteMemberDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const blank = {
    firstName: "", lastName: "", email: "", phone: "",
    role: "STAFF", department: "", jobTitle: "", notes: "",
    permissions: [] as string[],
    sendWelcomeEmail: true, requirePasswordReset: false, twoFactorRequired: false, saveDraft: false,
  };
  const [form, setForm] = React.useState(blank);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<StaffInvitation | null>(null);
  const [copied, setCopied] = React.useState(false);

  const set = (k: keyof typeof blank, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => { setForm(blank); setResult(null); setCopied(false); };

  const onPerm = (next: string[]) => set("permissions", next);

  const handleSubmit = async () => {
    if (!form.email.trim()) return toast.error("Email is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return toast.error("Enter a valid email address");
    try {
      setSubmitting(true);
      const inv = await api.inviteMember({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email.trim(), phone: form.phone,
        role: form.role as "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF",
        branchIds: [],
        department: form.department, jobTitle: form.jobTitle, notes: form.notes,
        permissions: form.permissions,
        sendWelcomeEmail: form.sendWelcomeEmail, requirePasswordReset: form.requirePasswordReset,
        twoFactorRequired: form.twoFactorRequired, saveDraft: form.saveDraft,
      });
      setResult(inv);
      toast.success(form.saveDraft || !form.sendWelcomeEmail ? "Invitation saved as draft" : "Invitation sent");
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async () => {
    if (!result?.invitationUrl) return;
    try {
      await navigator.clipboard.writeText(result.invitationUrl);
      setCopied(true);
      toast.success("Invitation link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const showLink = result && result.invitationUrl && (!form.sendWelcomeEmail || form.saveDraft);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{result ? "Invitation ready" : "Invite team member"}</DialogTitle>
          <DialogDescription>
            {result
              ? "Team member will be added to your workspace below."
              : "Send an email invitation or a shareable link for a new team member to join."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{(form.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{result.email}</p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {ROLE_LABELS[result.role]} · {INVITATION_STATUS_LABELS[result.status]}
                  </p>
                </div>
                <Badge variant={statusBadge(result.status)}>{INVITATION_STATUS_LABELS[result.status]}</Badge>
              </div>
            </div>

            {showLink && (
              <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
                <p className="mb-2 text-sm font-medium text-[rgb(var(--color-foreground))]">Invitation link</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={result.invitationUrl ?? ""} className="flex-1 text-xs" />
                  <Button size="icon" variant="secondary" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">Expires {fmtDateTime(result.expiresAt)}</p>
              </div>
            )}

            <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.4)] p-4 text-sm text-[rgb(var(--color-muted-foreground))]">
              <div className="flex flex-col gap-1.5">
                {form.sendWelcomeEmail && !form.saveDraft ? (
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> A welcome email has been queued.</span>
                ) : null}
                {form.requirePasswordReset ? <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Password reset required on first sign in.</span> : null}
                {form.twoFactorRequired ? <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Two-factor authentication required.</span> : null}
                {form.permissions.length ? <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> {form.permissions.length} custom permissions granted.</span> : null}
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Done</Button>
              </DialogClose>
              <Button onClick={reset}>
                <Plus className="h-4 w-4" /> Invite another
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="permissions">Permissions {form.permissions.length ? `(${form.permissions.length})` : ""}</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input placeholder="First name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <Input placeholder="Last name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email address" required>
                    <Input type="email" placeholder="member@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <Input placeholder="+1 (555) 000-0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Role" required>
                    <Select value={form.role} onValueChange={(v) => set("role", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            <div><div>{r.label}</div><div className="text-xs text-[rgb(var(--color-muted-foreground))]">{r.hint}</div></div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Department">
                    <Input placeholder="Operations" value={form.department} onChange={(e) => set("department", e.target.value)} />
                  </Field>
                </div>
                <Field label="Job title">
                  <Input placeholder="Stylist, Manager, ..." value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
                </Field>
                <Field label="Notes">
                  <Textarea placeholder="Optional private note about this member." value={form.notes} onChange={(e) => set("notes", e.target.value)} />
                </Field>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                <PermissionsEditor value={form.permissions} onChange={onPerm} compact />
              </TabsContent>
            </Tabs>

            <div className="grid gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-4 sm:grid-cols-3">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[rgb(var(--color-foreground))]">
                <span>Send welcome email</span>
                <Switch checked={form.sendWelcomeEmail} onCheckedChange={(v) => set("sendWelcomeEmail", v)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[rgb(var(--color-foreground))]">
                <span>Require password reset</span>
                <Switch checked={form.requirePasswordReset} onCheckedChange={(v) => set("requirePasswordReset", v)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[rgb(var(--color-foreground))]">
                <span>Require 2FA</span>
                <Switch checked={form.twoFactorRequired} onCheckedChange={(v) => set("twoFactorRequired", v)} />
              </label>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit} loading={submitting}>
                <Send className="h-4 w-4" /> Send Invitation
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Single permission display (compact chips) ─────────────────────────────

export function PermChips({ permissions }: { permissions: string[] }) {
  if (!permissions.length) return <span className="text-xs text-[rgb(var(--color-muted-foreground))]">No custom permissions</span>;
  const grouped = new Map<string, string[]>();
  for (const key of permissions) {
    const info = permissionModuleFor(key);
    const moduleName = info?.module ?? "Other";
    if (!grouped.has(moduleName)) grouped.set(moduleName, []);
    grouped.get(moduleName)!.push(info?.label ?? key);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from(grouped.entries()).map(([module, labels], i) => (
        <div key={module} className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[0.65rem]">
            <span className="font-semibold">{module}</span>
            <span className="text-[rgb(var(--color-muted-foreground))]">: {labels.join(", ")}</span>
          </Badge>
          {i < grouped.size - 1 && null}
        </div>
      ))}
    </div>
  );
}

// ─── Manage member dialog ──────────────────────────────────────────────────

export function ManageMemberDialog({ memberId, open, onOpenChange, onChanged }: {
  memberId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = React.useState<StaffProfileDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");
  const [noteCat, setNoteCat] = React.useState("");
  const [role, setRole] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [perms, setPerms] = React.useState<string[]>([]);

  const load = React.useCallback(async (id: string) => {
    try {
      setLoading(true);
      const d = await api.getStaffMember(id);
      setDetail(d);
      setRole(d.role);
      setStatus(d.status);
      setPerms(d.permissions);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load member");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && memberId) load(memberId);
  }, [open, memberId, load]);

  const canRole = detail && detail.role !== "OWNER";

  const save = async () => {
    if (!memberId || !detail) return;
    try {
      setSaving(true);
      await api.updateStaffMember(memberId, {
        role: role as never, status: status as never, permissions: perms,
      });
      toast.success("Member updated");
      onChanged();
      setDetail((d) => (d ? { ...d, role: role as never, status: status as never, permissions: perms } : d));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!memberId) return;
    try {
      setRemoving(true);
      await api.removeStaffMember(memberId);
      toast.success("Member removed");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemoving(false);
    }
  };

  const addNote = async () => {
    if (!memberId || !noteText.trim()) return;
    try {
      const n = await api.addStaffNote(memberId, noteText.trim(), noteCat || undefined);
      setDetail((d) => (d ? { ...d, employeeNotes: [n, ...d.employeeNotes] } : d));
      setNoteText("");
      setNoteCat("");
      toast.success("Note added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    }
  };

  const delNote = async (noteId: string) => {
    if (!memberId) return;
    try {
      await api.deleteStaffNote(memberId, noteId);
      setDetail((d) => (d ? { ...d, employeeNotes: d.employeeNotes.filter((n) => n.id !== noteId) } : d));
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!memberId) return;
    try {
      const d = await api.uploadStaffPhoto(memberId, file);
      setDetail(d);
      setPerms(d.permissions);
      setRole(d.role);
      setStatus(d.status);
      toast.success("Photo updated");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    }
  };

  const removePhoto = async () => {
    if (!memberId) return;
    try {
      const d = await api.removeStaffPhoto(memberId);
      setDetail(d);
      toast.success("Photo removed");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove photo");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{detail ? sfName(detail) : "Manage member"}</DialogTitle>
          <DialogDescription>{detail?.email}</DialogDescription>
        </DialogHeader>

        {!memberId ? null : loading && !detail ? (
          <div className="space-y-4 p-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !detail ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="Member not found" description="This member could not be loaded." />
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3">
              <label className="group relative cursor-pointer">
                <Avatar className="h-14 w-14">
                  {detail.avatarUrl ? <AvatarImage src={detail.avatarUrl} alt={sfName(detail)} /> : null}
                  <AvatarFallback className="text-base">{sfInitials(detail)}</AvatarFallback>
                </Avatar>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); e.currentTarget.value = ""; }} />
                <span className="absolute inset-0 hidden items-center justify-center rounded-full bg-black/50 text-white group-hover:flex">
                  <Camera className="h-4 w-4" />
                </span>
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[rgb(var(--color-foreground))]">{sfName(detail)}</span>
                  <Badge variant={roleBadge(detail.role)} className="text-[0.65rem]">{ROLE_LABELS[detail.role]}</Badge>
                </div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{detail.role}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                  {detail.isOnline ? <Badge variant="success" className="text-[0.6rem]">Online</Badge> : <Badge variant="outline" className="text-[0.6rem]">Offline</Badge>}
                  {!detail.isCurrentUser && (
                    <button
                      className="font-medium text-[rgb(var(--color-primary))] hover:underline"
                      onClick={() => detail.avatarUrl ? removePhoto() : toast.info("Click the avatar to upload a photo")}
                    >
                      {detail.avatarUrl ? "Remove photo" : "Upload photo"}
                    </button>
                  )}
                </div>
              </div>
              {status !== "SUSPENDED" && (
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { if (status === "ACTIVE" && !maySuspend(detail)) return; setStatus(status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"); toast.info("Click Save to apply status change"); }}
                >
                  {status === "ACTIVE" ? <Ban className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  {status === "ACTIVE" ? "Suspend" : "Activate"}
                </Button>
              )}
            </div>

            <Tabs defaultValue="settings">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="permissions">Permissions</TabsTrigger>
                <TabsTrigger value="notes">Notes {detail.employeeNotes.length ? `(${detail.employeeNotes.length})` : ""}</TabsTrigger>
                <TabsTrigger value="activity">Activity {detail.activity.length ? `(${detail.activity.length})` : ""}</TabsTrigger>
                <TabsTrigger value="logins">Logins {detail.loginHistory.length ? `(${detail.loginHistory.length})` : ""}</TabsTrigger>
                <TabsTrigger value="audit">Audit</TabsTrigger>
              </TabsList>

              <TabsContent value="settings" className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Role">
                    <Select value={role} onValueChange={setRole} disabled={!canRole}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OWNER">Owner</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    {!canRole && <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">The owner cannot be changed.</p>}
                  </Field>
                  <Field label="Status">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-4 sm:grid-cols-2">
                  <Button onClick={save} loading={saving}>
                    <RotateCcw className="h-4 w-4" /> Save changes
                  </Button>
                  <Button variant="danger" onClick={handleRemove} loading={removing} disabled={detail.isCurrentUser}>
                    <UserMinus className="h-4 w-4" /> Remove from team
                  </Button>
                </div>
                <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                    Current permissions
                  </p>
                  <PermChips permissions={perms} />
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto pr-1">
                <PermissionsEditor value={perms} onChange={setPerms} compact />
                <Button onClick={save} loading={saving} className="w-full">
                  <RotateCcw className="h-4 w-4" /> Save permissions
                </Button>
              </TabsContent>

              <TabsContent value="notes" className="mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                  <Textarea placeholder="Add a private note..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                  <div className="flex flex-col gap-2">
                    <Input placeholder="Category (e.g. HR)" value={noteCat} onChange={(e) => setNoteCat(e.target.value)} />
                    <Button onClick={addNote} disabled={!noteText.trim()}>
                      <StickyNote className="h-4 w-4" /> Add note
                    </Button>
                  </div>
                </div>
                <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
                  {detail.employeeNotes.length === 0 ? (
                    <EmptyState icon={<StickyNote className="h-6 w-6" />} title="No notes yet" description="Add a private note about this team member." />
                  ) : (
                    detail.employeeNotes.map((n) => <NoteRow key={n.id} note={n} onDelete={() => delNote(n.id)} />)
                  )}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {detail.activity.length === 0 ? (
                  <EmptyState icon={<Activity className="h-6 w-6" />} title="No activity yet" description="Actions by and about this member appear here." />
                ) : (
                  detail.activity.map((a: StaffActivityItem) => (
                    <div key={a.id} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[rgb(var(--color-foreground))]">{a.message}</span>
                        <span className="shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">{relTime(a.createdAt)}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                        {a.category || a.action}{a.actorName && ` · by ${a.actorName}`}{a.ip && ` · ${a.ip}`}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="logins" className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {detail.loginHistory.length === 0 ? (
                  <EmptyState icon={<History className="h-6 w-6" />} title="No login history" description="Sign-in events will appear here." />
                ) : (
                  detail.loginHistory.map((h: LoginHistoryEntry) => (
                    <div key={h.id} className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={h.successful ? "success" : "danger"} className="text-[0.6rem]">{h.successful ? "Success" : "Failed"}</Badge>
                          <span className="truncate text-sm text-[rgb(var(--color-foreground))]">
                            {h.device || h.browser || "Device"}
                          </span>
                        </div>
                        <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                          {[h.browser, h.os].filter(Boolean).join(" · ") || "—"}{h.ip ? ` · ${h.ip}` : ""}{h.location ? ` · ${h.location}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">{fmtDateTime(h.createdAt)}</span>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="audit" className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                {detail.auditLogs.length === 0 ? (
                  <EmptyState icon={<ScrollText className="h-6 w-6" />} title="No audit activity" description="Security-sensitive changes are logged here." />
                ) : (
                  detail.auditLogs.map((a: StaffAuditLogEntry) => (
                    <div key={a.id} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                          {a.action.replace(/_/g, " ")}
                        </span>
                        <span className="shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">{fmtDateTime(a.createdAt)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                        {a.entityType} · by {a.actorName ?? "—"}{a.ip ? ` · ${a.ip}` : ""}
                      </p>
                      {a.reason && <p className="mt-1 text-xs italic text-[rgb(var(--color-muted-foreground))]">Reason: {a.reason}</p>}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function maySuspend(_: StaffProfileDetail): boolean {
  return true;
}

function NoteRow({ note, onDelete }: { note: EmployeeNote; onDelete: () => void }) {
  return (
    <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {note.category && <Badge variant="outline" className="text-[0.6rem]">{note.category}</Badge>}
          <span className="text-xs text-[rgb(var(--color-muted-foreground))]">by {note.authorName ?? "—"} · {relTime(note.createdAt)}</span>
        </div>
        <button className="text-xs text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-danger))]" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-[rgb(var(--color-foreground))]">{note.body}</p>
    </div>
  );
}

// ─── Invitations panel ─────────────────────────────────────────────────────

export function InvitationsPanel({ onChanged }: { onChanged: () => void }) {
  const [tab, setTab] = React.useState<"PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED">("PENDING");
  const [items, setItems] = React.useState<StaffInvitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.listStaffInvitations({ status: tab, search: search || undefined, pageSize: 100 });
      setItems(res.items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  React.useEffect(() => { load(); }, [load]);

  const copyLink = async (inv: StaffInvitation) => {
    try {
      const fresh = inv.invitationUrl ? inv : await api.getInvitationLink(inv.id);
      const target = inv.invitationUrl ?? fresh.invitationUrl;
      if (!target) return toast.error("No invitation link available");
      await navigator.clipboard.writeText(target);
      setCopiedId(inv.id);
      toast.success("Link copied");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get link");
    }
  };

  const resend = async (id: string) => {
    try {
      setBusyId(id);
      await api.resendInvitation(id);
      toast.success("Invitation resent");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (inv: StaffInvitation) => {
    if (!window.confirm(`Cancel the invitation to ${inv.email}?`)) return;
    try {
      setBusyId(inv.id);
      await api.cancelInvitation(inv.id);
      toast.success("Invitation cancelled");
      load();
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Sent, pending and accepted team invitations.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input placeholder="Search invitations..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-52 pl-8" />
          </div>
          <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onCreated={onChanged} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-[rgb(var(--color-border))] px-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="ACCEPTED">Accepted</TabsTrigger>
              <TabsTrigger value="EXPIRED">Expired</TabsTrigger>
              <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-6 w-6" />}
              title={`No ${tab.toLowerCase()} invitations`}
              description="Invite team members to your workspace to get started."
              action={<Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite member</Button>}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Resends</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium text-[rgb(var(--color-foreground))]">
                          {inv.firstName ? `${inv.firstName} ${inv.lastName ?? ""}`.trim() : "Pending invite"}
                        </p>
                        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{inv.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadge(inv.role)} className="text-[0.65rem]">{ROLE_LABELS[inv.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(inv.status)} className="text-[0.65rem]">{INVITATION_STATUS_LABELS[inv.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-[rgb(var(--color-muted-foreground))]">{fmtDate(inv.expiresAt)}</TableCell>
                    <TableCell className="text-[rgb(var(--color-muted-foreground))]">{inv.resendCount}</TableCell>
                    <TableCell>
                      {(inv.status === "PENDING") && (
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" loading={busyId === inv.id}>Actions</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{inv.email}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => copyLink(inv)}>
                                {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resend(inv.id)}>
                                <Send className="h-4 w-4" /> Resend invitation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => cancel(inv)}>
                                <Ban className="h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}