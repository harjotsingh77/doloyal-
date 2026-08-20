"use client";

import * as React from "react";
import {
  Users, Shield, IdCard, Plus, Search, Send, Copy, Check, Mail,
  UserMinus, Trash2, RotateCcw, Camera, Lock, KeyRound, Activity,
  ScrollText, History, StickyNote, Ban, UserCheck, ExternalLink,
  ChevronRight, RefreshCw, MapPin, Building2, CalendarClock, UserPlus,
  Link2, Clock, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, X,
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
  STAFF_PERMISSION_MODULES, permissionModuleFor, roleAccessPreview,
  type StaffMember, type StaffStats, type StaffInvitation,
  type StaffInvitationDetail, type InvitationCounts, type InvitationActivityItem,
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

function BranchPicker({ selected, onChange }: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [branches, setBranches] = React.useState<Array<{ id: string; name: string }>>([]);
  React.useEffect(() => {
    api.getStaffBranches().then(setBranches).catch(() => { /* branches optional */ });
  }, []);
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((b) => b !== id) : [...selected, id]);
  const all = branches.map((b) => b.id);
  const isAll = all.length > 0 && all.every((id) => selected.includes(id));
  return (
    <div className="space-y-2">
      {branches.length === 0 ? (
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
          No locations available. They will be added to the workspace default.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[rgb(var(--color-muted-foreground))]">
              {selected.length === 0 ? "No locations selected" : `${selected.length} of ${branches.length} selected`}
            </span>
            <button
              type="button"
              className="text-xs font-medium text-[rgb(var(--color-primary))] hover:underline"
              onClick={() => onChange(isAll ? [] : all)}
            >
              {isAll ? "Deselect all" : "Select all locations"}
            </button>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {branches.map((b) => {
              const active = selected.includes(b.id);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggle(b.id)}
                  className={`flex items-center gap-2 rounded-[var(--radius)] border px-2.5 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.06)] text-[rgb(var(--color-foreground))]"
                      : "border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] hover:border-[rgb(var(--color-primary)/0.4)]"
                  }`}
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    active ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))] text-white" : "border-[rgb(var(--color-border))]"
                  }`}>
                    {active && <Check className="h-3 w-3" />}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                    <span className="truncate">{b.name}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function RoleAccessPreview({ role }: { role: string }) {
  const preview = roleAccessPreview(role as "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF");
  if (!preview) return null;
  return (
    <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
        <ShieldCheck className="h-3.5 w-3.5" /> What this role can access
      </p>
      <div className="flex flex-wrap gap-1.5">
        {preview.can.map((m) => (
          <Badge key={m} variant="outline" className="text-[0.65rem]">
            <span className="font-medium">{m}</span>
          </Badge>
        ))}
      </div>
      {preview.cannot.length > 0 && (
        <p className="mt-2 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
          No access to: {preview.cannot.join(", ").toLowerCase()}
        </p>
      )}
    </div>
  );
}

export function InviteMemberDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const blank = {
    firstName: "", lastName: "", email: "", phone: "",
    role: "STAFF", department: "", jobTitle: "", notes: "",
    branchIds: [] as string[], message: "",
    permissions: [] as string[],
    sendWelcomeEmail: true, saveDraft: false,
  };
  const [form, setForm] = React.useState(blank);
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<StaffInvitation | null>(null);
  const [copied, setCopied] = React.useState(false);

  const set = (k: keyof typeof blank, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const reset = () => { setForm(blank); setResult(null); setCopied(false); };

  const onPerm = (next: string[]) => set("permissions", next);

  const rolePreview = roleAccessPreview(form.role as "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF");

  const handleSubmit = async () => {
    if (!form.email.trim()) return toast.error("Email is required");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) return toast.error("Enter a valid email address");
    try {
      setSubmitting(true);
      const inv = await api.inviteMember({
        firstName: form.firstName, lastName: form.lastName,
        email: form.email.trim(), phone: form.phone,
        role: form.role as "OWNER" | "MANAGER" | "RECEPTIONIST" | "STAFF",
        branchIds: form.branchIds,
        department: form.department, jobTitle: form.jobTitle, notes: form.notes,
        message: form.message,
        permissions: form.permissions,
        sendWelcomeEmail: form.sendWelcomeEmail,
        requirePasswordReset: false,
        twoFactorRequired: false,
        saveDraft: form.saveDraft,
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

  const showLink = Boolean(result?.invitationUrl);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{result ? "Invitation ready" : "Invite team member"}</DialogTitle>
          <DialogDescription>
            {result
              ? "Your invitation link is ready to share."
              : "Send an email invitation for a new team member to join your workspace."}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{(result.email || "?").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{result.email}</p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  {ROLE_LABELS[result.role]} · {INVITATION_STATUS_LABELS[result.status]}
                </p>
              </div>
              <Badge variant={statusBadge(result.status)}>{INVITATION_STATUS_LABELS[result.status]}</Badge>
            </div>

            {showLink && (
              <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[rgb(var(--color-foreground))]">
                  <Link2 className="h-4 w-4" /> Invitation link
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={result.invitationUrl ?? ""} className="flex-1 text-xs" />
                  <Button size="icon" variant="secondary" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                  Expires {fmtDateTime(result.expiresAt)} · {form.sendWelcomeEmail && !form.saveDraft ? "An email was sent to " + result.email + "." : "Share this link with the invitee."}
                </p>
              </div>
            )}

            <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.4)] p-4 text-sm text-[rgb(var(--color-muted-foreground))]">
              <div className="flex flex-col gap-1.5">
                {form.sendWelcomeEmail && !form.saveDraft ? (
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> A welcome email has been queued.</span>
                ) : null}
                {form.branchIds.length ? (
                  <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Will be added to {form.branchIds.length} location{form.branchIds.length > 1 ? "s" : ""}.</span>
                ) : null}
                {form.permissions.length ? <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> {form.permissions.length} custom permissions granted.</span> : null}
                {!rolePreview.cannot.length && <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Full access granted with the {ROLE_LABELS[form.role as keyof typeof ROLE_LABELS]} role.</span>}
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
                <RoleAccessPreview role={form.role} />
                <Field label="Location access" hint="Which branches this member will work at.">
                  <BranchPicker selected={form.branchIds} onChange={(v) => set("branchIds", v)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Department">
                    <Input placeholder="Operations" value={form.department} onChange={(e) => set("department", e.target.value)} />
                  </Field>
                  <Field label="Job title">
                    <Input placeholder="Stylist, Manager, ..." value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} />
                  </Field>
                </div>
                <Field label="Personal message" hint="Shown inside the invitation email.">
                  <Textarea
                    placeholder="e.g. Welcome to the team! Looking forward to having you on board."
                    value={form.message}
                    onChange={(e) => set("message", e.target.value)}
                    maxLength={1000}
                  />
                </Field>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                <PermissionsEditor value={form.permissions} onChange={onPerm} compact />
              </TabsContent>
            </Tabs>

            <div className="grid gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-4 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[rgb(var(--color-foreground))]">
                <span>Send welcome email</span>
                <Switch checked={form.sendWelcomeEmail} onCheckedChange={(v) => set("sendWelcomeEmail", v)} />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-2 text-sm text-[rgb(var(--color-foreground))]">
                <span>Save as draft</span>
                <Switch checked={form.saveDraft} onCheckedChange={(v) => set("saveDraft", v)} />
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

// ─── Invitation detail drawer ───────────────────────────────────────────────

function useCooldown(seconds: number | undefined) {
  const [left, setLeft] = React.useState(seconds ?? 0);
  React.useEffect(() => {
    setLeft(seconds ?? 0);
    if (!seconds) return;
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return left;
}

export function InvitationDetailDrawer({ invitationId, open, onOpenChange, onChanged, onViewMember }: {
  invitationId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onChanged: () => void;
  onViewMember?: (memberId: string) => void;
}) {
  const [detail, setDetail] = React.useState<StaffInvitationDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [busy, setBusy] = React.useState<"resend" | "cancel" | null>(null);
  const [copied, setCopied] = React.useState(false);
  const cooldown = useCooldown(detail?.resendCooldownSeconds);

  const load = React.useCallback(async (id: string) => {
    try {
      setLoading(true);
      setDetail(await api.getStaffInvitationDetail(id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (open && invitationId) load(invitationId);
  }, [open, invitationId, load]);

  const copyLink = async () => {
    if (!invitationId || !detail) return;
    try {
      const fresh = detail.invitationUrl ? detail : await api.getInvitationLink(invitationId);
      const target = detail.invitationUrl ?? fresh.invitationUrl;
      if (!target) return toast.error("No invitation link available");
      await navigator.clipboard.writeText(target);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get link");
    }
  };

  const resend = async () => {
    if (!invitationId || cooldown > 0) return;
    try {
      setBusy("resend");
      const updated = await api.resendInvitation(invitationId);
      setDetail(updated);
      toast.success("Invitation resent");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!invitationId || !detail) return;
    if (!window.confirm(`Cancel the invitation to ${detail.email}? The invite link will stop working.`)) return;
    try {
      setBusy("cancel");
      const updated = await api.cancelInvitation(invitationId);
      setDetail(updated);
      toast.success("Invitation cancelled");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(null);
    }
  };

  const viewMember = () => {
    if (detail?.joinedMemberId && onViewMember) {
      onViewMember(detail.joinedMemberId);
      onOpenChange(false);
    }
  };

  const StatusBanner = ({ d }: { d: StaffInvitationDetail }) => {
    if (d.status === "PENDING") {
      return (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-warning)/0.35)] bg-[rgb(var(--color-warning)/0.08)] p-3.5">
          <HourglassIcon className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-warning))]" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Waiting for the invitee</p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              {d.hasExistingAccount ? "This email already has a Doloyal account — they can accept with one click. " : ""}
              Invitation expires {fmtDateTime(d.expiresAt)}.
            </p>
          </div>
        </div>
      );
    }
    if (d.status === "ACCEPTED") {
      return (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-success)/0.35)] bg-[rgb(var(--color-success)/0.08)] p-3.5">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-success))]" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Invitation accepted</p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              {d.acceptedByName ? `${d.acceptedByName} joined the team on ` : "Joined the team on "}{fmtDateTime(d.acceptedAt)}.
            </p>
          </div>
        </div>
      );
    }
    if (d.status === "EXPIRED") {
      return (
        <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.3)] p-3.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
          <div>
            <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Invitation expired</p>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              The invite link is no longer active. Resend to send a fresh invitation.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.08)] p-3.5">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-danger))]" />
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Invitation cancelled</p>
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
            {d.cancelledByName ? `Cancelled by ${d.cancelledByName} on ` : "Cancelled on "}{fmtDateTime(d.cancelledAt)}. The link has been disabled.
          </p>
        </div>
      </div>
    );
  };

  const DetailRow = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">{label}</span>
      <span className={`text-sm text-[rgb(var(--color-foreground))] ${mono ? "break-all font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="!left-auto !top-0 !translate-x-0 !translate-y-0 right-0 h-full w-[min(100vw,480px)] !max-w-none !max-h-none !rounded-none !p-0 overflow-y-auto"
      >
        {loading && !detail ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !detail ? (
          <div className="p-6">
            <EmptyState icon={<Mail className="h-6 w-6" />} title="Invitation not found" description="This invitation could not be loaded." />
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <div className="border-b border-[rgb(var(--color-border))] p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="text-sm">{(detail.firstName?.[0] ?? detail.email.charAt(0) ?? "?").toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[rgb(var(--color-foreground))]">
                    {[detail.firstName, detail.lastName].filter(Boolean).join(" ") || "Pending invite"}
                  </p>
                  <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{detail.email}</p>
                </div>
                <button
                  className="rounded-md p-1 text-[rgb(var(--color-muted-foreground))] opacity-70 transition-opacity hover:opacity-100"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge variant={roleBadge(detail.role)} className="text-[0.65rem]">{ROLE_LABELS[detail.role]}</Badge>
                <Badge variant={statusBadge(detail.status)} className="text-[0.65rem]">{INVITATION_STATUS_LABELS[detail.status]}</Badge>
                {detail.resendCount > 0 && <Badge variant="outline" className="text-[0.6rem]">Resent {detail.resendCount}×</Badge>}
              </div>
            </div>

            <div className="flex-1 space-y-4 p-5">
              <StatusBanner d={detail} />

              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Role" value={ROLE_LABELS[detail.role]} />
                <DetailRow label="Invited by" value={detail.invitedByName} />
                <DetailRow label="Sent" value={detail.sentAt ? fmtDateTime(detail.sentAt) : "Draft (not sent)"} />
                <DetailRow label="Last sent" value={detail.lastSentAt ? relTime(detail.lastSentAt) : "—"} />
                <DetailRow label="Expires" value={detail.expiresAt ? fmtDateTime(detail.expiresAt) : "—"} />
                <DetailRow label="Accepted" value={detail.acceptedAt ? fmtDateTime(detail.acceptedAt) : "—"} />
              </div>

              {detail.branchNames && detail.branchNames.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Locations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.branchNames.map((b) => (
                      <Badge key={b} variant="outline" className="text-[0.65rem]">
                        <MapPin className="mr-1 h-3 w-3" /> {b}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(detail.department || detail.jobTitle || detail.phone) && (
                <div className="grid grid-cols-2 gap-4">
                  {detail.department && <DetailRow label="Department" value={detail.department} />}
                  {detail.jobTitle && <DetailRow label="Job title" value={detail.jobTitle} />}
                  {detail.phone && <DetailRow label="Phone" value={detail.phone} />}
                </div>
              )}

              {detail.message && (
                <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-3.5">
                  <p className="mb-1 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                    <Mail className="h-3.5 w-3.5" /> Message to invitee
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-[rgb(var(--color-foreground))]">{detail.message}</p>
                </div>
              )}

              {detail.activity.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
                    <Activity className="h-3.5 w-3.5" /> Timeline
                  </p>
                  <div className="space-y-1.5">
                    {detail.activity.map((a: InvitationActivityItem) => (
                      <div key={a.id} className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-2.5">
                        <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${a.action.includes("CANCELL") ? "bg-[rgb(var(--color-danger))]" : a.action.includes("ACCEPT") ? "bg-[rgb(var(--color-success))]" : "bg-[rgb(var(--color-primary))]"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[rgb(var(--color-foreground))]">{a.message}</p>
                          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                            {a.actorName ? `${a.actorName} · ` : ""}{relTime(a.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex flex-wrap items-center gap-2 border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
              {(detail.status === "PENDING" || detail.status === "EXPIRED" || detail.status === "CANCELLED") && (
                <Button variant="secondary" size="sm" onClick={copyLink} disabled={!detail.invitationUrl && detail.status === "PENDING" && !detail.hasExistingAccount}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
                </Button>
              )}
              {detail.status === "PENDING" && (
                <Button variant="secondary" size="sm" onClick={cancel} loading={busy === "cancel"}>
                  <Ban className="h-4 w-4" /> Cancel
                </Button>
              )}
              {(detail.status === "PENDING" || detail.status === "EXPIRED" || detail.status === "CANCELLED") && (
                <Button size="sm" onClick={resend} loading={busy === "resend"} disabled={cooldown > 0} className="ml-auto">
                  <RefreshCw className="h-4 w-4" /> {detail.status === "PENDING" ? "Resend" : "Invite again"}
                </Button>
              )}
              {detail.status === "ACCEPTED" && detail.joinedMemberId && (
                <Button size="sm" onClick={viewMember} className="ml-auto">
                  <UserCheck className="h-4 w-4" /> View member
                </Button>
              )}
              {cooldown > 0 && (
                <p className="w-full text-right text-xs text-[rgb(var(--color-muted-foreground))]">
                  Resend available in {Math.ceil(cooldown)}s
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HourglassIcon({ className }: { className?: string }) {
  return <CalendarClock className={className} />;
}

// ─── Invitations panel ─────────────────────────────────────────────────────

const INVITE_TABS: Array<{ value: "ALL" | "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

const INVITE_ROLE_FILTERS = [
  { value: "ALL", label: "All roles" },
  { value: "MANAGER", label: "Manager" },
  { value: "RECEPTIONIST", label: "Receptionist" },
  { value: "STAFF", label: "Staff" },
];

export function InvitationsPanel({ onChanged, onViewMember }: {
  onChanged: () => void;
  onViewMember?: (memberId: string) => void;
}) {
  const [tab, setTab] = React.useState<"ALL" | "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED">("ALL");
  const [items, setItems] = React.useState<StaffInvitation[]>([]);
  const [counts, setCounts] = React.useState<InvitationCounts | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("ALL");
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [detailOpen, setDetailOpen] = React.useState(false);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const res = await api.listStaffInvitations({
        status: tab, search: search || undefined, role: roleFilter !== "ALL" ? roleFilter : undefined,
        pageSize: 100,
      });
      setItems(res.items);
      setCounts(res.counts);
    } catch (err) {
      if (!opts?.silent) toast.error(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [tab, search, roleFilter]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const t = setTimeout(() => { load({ silent: true }); }, 400);
    return () => clearTimeout(t);
  }, [search, roleFilter, tab, load]);

  React.useEffect(() => {
    const interval = setInterval(() => { load({ silent: true }); }, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const openDetail = (inv: StaffInvitation) => {
    setDetailId(inv.id);
    setDetailOpen(true);
  };

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
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (inv: StaffInvitation) => {
    if (!window.confirm(`Cancel the invitation to ${inv.email}? The invite link will stop working.`)) return;
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

  const countFor = (v: string) => counts ? counts[v as keyof InvitationCounts] : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Invitations</CardTitle>
          <CardDescription>
            Sent, pending and accepted team invitations.
          </CardDescription>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4" /> Invite member
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="border-b border-[rgb(var(--color-border))] px-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="w-full justify-start">
              {INVITE_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  {counts && (
                    <span className={`ml-1.5 rounded-full px-1.5 text-[0.6rem] font-semibold ${tab === t.value ? "bg-white/20" : "bg-[rgb(var(--color-muted))]"}`}>
                      {countFor(t.value)}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <div className="flex flex-wrap items-center gap-3 border-b border-[rgb(var(--color-border))] px-6 py-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
            <Input placeholder="Search name, email or invitation id..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {INVITE_ROLE_FILTERS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="p-6">
          {loading && !items.length ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Mail className="h-6 w-6" />}
              title={`No ${tab.toLowerCase() === "all" ? "" : tab.toLowerCase() + " "}invitations`}
              description={tab === "PENDING" ? "Invite team members to your workspace to get started." : "Nothing here yet. Invitations in this state will appear here."}
              action={tab === "PENDING" || tab === "ALL" ? <Button onClick={() => setInviteOpen(true)}><Plus className="h-4 w-4" /> Invite member</Button> : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv) => (
                  <TableRow key={inv.id} className="group cursor-pointer" onClick={() => openDetail(inv)}>
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-[0.65rem] font-medium">
                            {((inv.firstName?.[0] ?? inv.email.charAt(0)) || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 font-medium text-[rgb(var(--color-foreground))]">
                            {inv.firstName ? `${inv.firstName} ${inv.lastName ?? ""}`.trim() : "Pending invite"}
                            {inv.status === "ACCEPTED" && inv.acceptedByName && (
                              <span className="text-[0.6rem] font-normal text-[rgb(var(--color-success))]">joined</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{inv.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={roleBadge(inv.role)} className="text-[0.65rem]">{ROLE_LABELS[inv.role]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(inv.status)} className="text-[0.65rem]">{INVITATION_STATUS_LABELS[inv.status]}</Badge>
                      <p className="mt-0.5 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                        {inv.status === "PENDING" && inv.expiresAt ? `expires ${fmtDate(inv.expiresAt)}` : inv.sentAt ? `sent ${relTime(inv.sentAt)}` : ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {inv.branchNames && inv.branchNames.length ? inv.branchNames.slice(0, 2).join(", ") + (inv.branchNames.length > 2 ? ` +${inv.branchNames.length - 2}` : "") : "—"}
                    </TableCell>
                    <TableCell className="text-[rgb(var(--color-muted-foreground))]">{fmtDate(inv.expiresAt)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" loading={busyId === inv.id}>Actions</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{inv.email}</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openDetail(inv)}>
                            <ChevronRight className="h-4 w-4" /> View details
                          </DropdownMenuItem>
                          {(inv.status === "PENDING" || inv.status === "EXPIRED" || inv.status === "CANCELLED") && (
                            <>
                              <DropdownMenuItem onClick={() => copyLink(inv)}>
                                {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resend(inv.id)}>
                                <RefreshCw className="h-4 w-4" /> {inv.status === "PENDING" ? "Resend invitation" : "Invite again"}
                              </DropdownMenuItem>
                            </>
                          )}
                          {inv.status === "ACCEPTED" && inv.joinedMemberId && onViewMember && (
                            <DropdownMenuItem onClick={() => onViewMember(inv.joinedMemberId!)}>
                              <UserCheck className="h-4 w-4" /> View member
                            </DropdownMenuItem>
                          )}
                          {inv.status === "PENDING" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => cancel(inv)}>
                                <Ban className="h-4 w-4" /> Cancel
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
          )}
        </div>
      </CardContent>

      <InvitationDetailDrawer
        invitationId={detailId}
        open={detailOpen}
        onOpenChange={(o) => { setDetailOpen(o); if (!o) setDetailId(null); }}
        onChanged={() => { load(); onChanged(); }}
        onViewMember={onViewMember}
      />
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} onCreated={() => { load(); onChanged(); }} />
    </Card>
  );
}