"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  LifeBuoy,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  StickyNote,
  UserCheck,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@doloyal/ui";
import {
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_CATEGORIES,
  initials,
  avatarColor,
  formatTime,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { cn } from "@doloyal/ui";
import { useAuth } from "@/lib/auth";

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  WAITING_FOR_CUSTOMER: "accent",
  RESOLVED: "success",
  CLOSED: "default",
};

type TicketDetail = Awaited<ReturnType<typeof api.adminGetSupportTicket>>;
type Message = Awaited<ReturnType<typeof api.adminGetSupportTicketMessages>>["messages"][number];

export default function AdminSupportTicketPage() {
  const params = useParams();
  const ticketId = params?.ticketId as string;
  const router = useRouter();

  const [ticket, setTicket] = React.useState<TicketDetail | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminGetSupportTicket(ticketId);
      setTicket(data);
    } catch {
      /* handled below */
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    if (!ticketId) return;
    void load();
  }, [ticketId, load]);

  React.useEffect(() => {
    if (!ticketId) return;
    let es: EventSource | null = null;
    try {
      es = api.subscribeAdminSupportEvents();
      const refresh = () => {
        void load();
        window.dispatchEvent(new CustomEvent("admin-support:refresh"));
      };
      ["ticket.status_changed", "ticket.assigned", "ticket.updated", "message.created", "file.uploaded"].forEach(
        (ev) => es?.addEventListener(ev, refresh),
      );
    } catch {
      /* polling fallback */
    }
    return () => es?.close();
  }, [ticketId, load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState
            icon={<LifeBuoy className="h-10 w-10" />}
            title="Ticket not found"
            description="This support ticket doesn't exist."
            action={
              <Link href="/admin/support">
                <Button>Back to Support</Button>
              </Link>
            }
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/admin/support")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
                <span className="text-[rgb(var(--color-primary))]">{ticket.ticketNumber}</span>{" "}
                {ticket.subject}
              </h1>
              <Badge variant={STATUS_VARIANT[ticket.status] ?? "outline"}>
                {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS] ?? ticket.status}
              </Badge>
            </div>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {ticket.category} · {SUPPORT_PRIORITY_LABELS[ticket.priority as keyof typeof SUPPORT_PRIORITY_LABELS] ?? ticket.priority}
              {ticket.tenant?.name ? ` · ${ticket.tenant.name}` : ""}
            </p>
          </div>
        </div>
        <StatusControls ticket={ticket} onChanged={load} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <CustomerCard ticket={ticket} />
          <TicketDetailsCard ticket={ticket} />
          <StatusHistoryCard history={ticket.statusHistory || []} />
          <FilesPanel attachments={ticket.attachments || []} />
        </div>

        <div className="lg:col-span-2">
          <AdminChat ticketId={ticket.id} />
          <div className="mt-4">
            <NotesPanel ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusControls({ ticket, onChanged }: { ticket: TicketDetail; onChanged: () => void }) {
  const { user } = useAuth();
  const [value, setValue] = React.useState<string>(ticket.status);
  const [note, setNote] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setValue(ticket.status), [ticket.status]);

  const save = async () => {
    if (value === ticket.status) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await api.adminUpdateSupportTicketStatus(ticket.id, value, note.trim() || undefined);
      setOpen(false);
      setNote("");
      onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const assign = async () => {
    try {
      await api.adminAssignSupportTicket(ticket.id, user?.id);
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!ticket.assignedAgentId && (
        <Button variant="outline" onClick={() => void assign()}>
          <UserCheck className="h-4 w-4" />
          Assign to me
        </Button>
      )}
      <Button onClick={() => setOpen(true)}>Update status</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update ticket status</DialogTitle>
            <DialogDescription>
              Current: {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS] ?? ticket.status}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>New status</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUPPORT_STATUS_LABELS[s as keyof typeof SUPPORT_STATUS_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (visible to customer)</Label>
              <Textarea
                rows={3}
                placeholder="e.g. We're looking into this — expect an update today."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void save()}>
              Save status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerCard({ ticket }: { ticket: TicketDetail }) {
  const customer = ticket.user;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-[rgb(var(--color-foreground))]">Customer</h2>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor(customer?.email || ticket.userId) }}
          >
            {initials(`${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim() || customer?.email || "C")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
              {customer?.firstName ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : customer?.email || "Unknown"}
            </p>
            {customer?.email ? <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{customer.email}</p> : null}
            {customer?.phone ? <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{customer.phone}</p> : null}
          </div>
        </div>
        <div className="mt-4 space-y-1.5 border-t border-[rgb(var(--color-border))] pt-3 text-xs text-[rgb(var(--color-muted-foreground))]">
          <p>
            Tenant: <span className="font-medium text-[rgb(var(--color-foreground))]">{ticket.tenant?.name || "—"}</span>
          </p>
          <p>
            Created: <span className="font-medium text-[rgb(var(--color-foreground))]">{formatTime(ticket.createdAt)}</span>
          </p>
          {ticket.assignedAgent ? (
            <p className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3" />
              Assigned to{" "}
              <span className="font-medium text-[rgb(var(--color-primary))]">
                {ticket.assignedAgent.firstName || ticket.assignedAgent.email}
              </span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function TicketDetailsCard({ ticket }: { ticket: TicketDetail }) {
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-[rgb(var(--color-foreground))]">Description</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[rgb(var(--color-foreground))]">
          {ticket.description}
        </p>
        <div className="mt-4 space-y-1.5 border-t border-[rgb(var(--color-border))] pt-3 text-xs text-[rgb(var(--color-muted-foreground))]">
          <p>
            Category:{" "}
            <span className="font-medium text-[rgb(var(--color-foreground))]">{ticket.category}</span>
          </p>
          <p>
            Priority:{" "}
            <span className="font-medium text-[rgb(var(--color-foreground))]">
              {SUPPORT_PRIORITY_LABELS[ticket.priority as keyof typeof SUPPORT_PRIORITY_LABELS] ?? ticket.priority}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusHistoryCard({ history }: { history: TicketDetail["statusHistory"] }) {
  const ordered = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-[rgb(var(--color-foreground))]">Status history</h2>
        {ordered.length === 0 ? (
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">No status changes yet.</p>
        ) : (
          <ol className="space-y-3">
            {ordered.map((h) => (
              <li key={h.id} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-primary))]" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[rgb(var(--color-foreground))]">
                    {SUPPORT_STATUS_LABELS[h.newStatus as keyof typeof SUPPORT_STATUS_LABELS] ?? h.newStatus}
                    {h.oldStatus ? (
                      <span className="text-[rgb(var(--color-muted-foreground))]">
                        {" "}· from {SUPPORT_STATUS_LABELS[h.oldStatus as keyof typeof SUPPORT_STATUS_LABELS] ?? h.oldStatus}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                    {formatTime(h.createdAt)} · {h.changedByName || "System"}
                  </p>
                  {h.note ? <p className="mt-0.5 text-[0.6rem] italic text-[rgb(var(--color-muted-foreground))]">“{h.note}”</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function FilesPanel({ attachments }: { attachments: TicketDetail["attachments"] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Files</h2>
          <Badge variant="outline">{attachments.length}</Badge>
        </div>
        {attachments.length === 0 ? (
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">No files shared yet.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((file) => {
              const isImage = file.fileUrl.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(file.fileName || "");
              return (
                <li key={file.id} className="flex items-center gap-3">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.fileUrl} alt={file.fileName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[rgb(var(--color-foreground))]">{file.fileName}</p>
                    <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">{formatTime(file.createdAt)}</p>
                  </div>
                  <a href={file.fileUrl} download={file.fileName || undefined} className="p-1 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]">
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AdminChat({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [attaching, setAttaching] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminGetSupportTicketMessages(ticketId);
      setMessages(data.messages || []);
      void api.adminMarkSupportTicketRead(ticketId).catch(() => {});
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    void load();
    window.addEventListener("admin-support:refresh", load);
    return () => window.removeEventListener("admin-support:refresh", load);
  }, [load]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    e.target.value = "";
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !pendingFile) return;
    setSending(true);
    try {
      let attachment: { url: string; name: string; mime: string } | null = null;
      if (pendingFile) {
        setAttaching(true);
        const file = await api.adminUploadSupportTicketFile(ticketId, pendingFile);
        attachment = { url: file.fileUrl, name: file.fileName, mime: file.fileType || "" };
        setAttaching(false);
      }
      const sent = await api.adminSendSupportTicketMessage(ticketId, {
        message: body,
        attachmentUrl: attachment?.url,
        attachmentName: attachment?.name,
        attachmentMimeType: attachment?.mime,
      });
      setMessages((m) => [...m, sent]);
      setText("");
      setPendingFile(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-[rgb(var(--color-border))] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--color-primary)/0.1)]">
              <MessageSquare className="h-4 w-4 text-[rgb(var(--color-primary))]" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Customer conversation</p>
              <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">Replies here are visible to the customer.</p>
            </div>
          </div>
          <Badge variant="outline">Live</Badge>
        </div>

        <div ref={scrollRef} className="max-h-[28rem] min-h-[16rem] space-y-4 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/3 ml-auto" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-8">
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="No messages yet"
                description="Say hello to the customer and confirm you've received their ticket."
              />
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex", m.senderRole === "ADMIN" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] space-y-1.5 rounded-2xl px-4 py-2.5 text-sm",
                    m.senderRole === "ADMIN"
                      ? "rounded-br-md bg-[rgb(var(--color-primary))] text-white"
                      : "rounded-bl-md bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]",
                  )}
                >
                  {m.message ? <p className="whitespace-pre-wrap break-words">{m.message}</p> : null}
                  {m.attachmentUrl ? <AttachmentInline message={m} mine={m.senderRole === "ADMIN"} /> : null}
                  <div
                    className={cn(
                      "flex items-center gap-2 text-[0.6rem]",
                      m.senderRole === "ADMIN" ? "justify-end text-white/70" : "text-[rgb(var(--color-muted-foreground))]",
                    )}
                  >
                    <span>{formatTime(m.createdAt)}</span>
                    <span>{m.senderRole === "ADMIN" ? "You" : m.senderName || "Customer"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[rgb(var(--color-border))] p-4">
          {pendingFile ? (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-3 py-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
                <span className="truncate text-xs text-[rgb(var(--color-foreground))]">{pendingFile.name}</span>
              </div>
              <button onClick={() => setPendingFile(null)} className="text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <div className="relative">
              <input
                type="file"
                id="admin-support-chat-file"
                className="hidden"
                onChange={pickFile}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              <label
                htmlFor="admin-support-chat-file"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
              >
                {attaching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
              </label>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Reply to customer… (Enter to send)"
              rows={1}
              className="max-h-32 min-h-10 flex-1 resize-none"
            />
            <Button size="icon" onClick={() => void send()} disabled={sending || (!text.trim() && !pendingFile)}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AttachmentInline({ message, mine }: { message: Message; mine: boolean }) {
  const isImage = message.attachmentUrl && (message.attachmentUrl.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(message.attachmentUrl || ""));
  const isLink = message.isLink || (message.attachmentUrl && /^https?:\/\//.test(message.attachmentUrl) && !message.message);
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={message.attachmentUrl ?? ""} alt={message.attachmentName || "attachment"} className="max-h-48 w-full rounded-lg object-cover" />;
  }
  if (isLink) {
    return (
      <a
href={message.attachmentUrl ?? "#"}
        target="_blank"
        rel="noreferrer"
        className={cn("flex items-center gap-2 text-xs underline underline-offset-2", mine ? "text-white" : "text-[rgb(var(--color-primary))]")}
      >
        <Link2 className="h-3.5 w-3.5" />
        {message.attachmentName || message.attachmentUrl}
      </a>
    );
  }
  return (
    <a
      href={message.attachmentUrl ?? "#"}
      download={message.attachmentName || undefined}
      className={cn("flex items-center gap-2 text-xs", mine ? "text-white/90" : "text-[rgb(var(--color-primary))] hover:underline")}
    >
      <FileText className="h-3.5 w-3.5" />
      {message.attachmentName || "Attachment"}
      <Download className="h-3 w-3" />
    </a>
  );
}

function NotesPanel({ ticketId }: { ticketId: string }) {
  const [notes, setNotes] = React.useState<Awaited<ReturnType<typeof api.adminListSupportTicketNotes>>>([]);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminListSupportTicketNotes(ticketId);
      setNotes(data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.adminAddSupportTicketNote(ticketId, note.trim());
      setNote("");
      void load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Private notes</h2>
          <Badge variant="outline">Internal only</Badge>
        </div>
        <div className="mb-4 flex items-end gap-2">
          <Textarea
            rows={2}
            placeholder="Add an internal note for the team…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 resize-none"
          />
          <Button size="icon" onClick={() => void add()} disabled={saving || !note.trim()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<StickyNote className="h-8 w-8" />}
            title="No notes yet"
            description="Internal notes stay visible to admins only."
          />
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-[rgb(var(--color-border))] p-3">
                <p className="text-sm text-[rgb(var(--color-foreground))]">{n.note}</p>
                <p className="mt-1 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                  {n.adminName || "Admin"} · {formatTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}