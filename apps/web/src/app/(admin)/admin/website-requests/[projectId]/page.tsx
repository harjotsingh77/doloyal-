"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Globe,
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
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  EmptyState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@doloyal/ui";
import {
  WEBSITE_PROJECT_STATUSES,
  WEBSITE_PROJECT_STATUS_LABELS,
  WEBSITE_TYPE_LABELS,
  DESIGN_STYLE_LABELS,
  WEBSITE_FEATURE_LABELS,
  formatTime,
  relativeTime,
  initials,
  avatarColor,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { cn } from "@doloyal/ui";
import { useAuth } from "@/lib/auth";

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  REQUESTED: "warning",
  REVIEWING: "primary",
  IN_DISCUSSION: "primary",
  IN_PROGRESS: "accent",
  DESIGN_REVIEW: "accent",
  DEVELOPMENT: "accent",
  READY_FOR_REVIEW: "warning",
  PUBLISHED: "success",
  COMPLETED: "success",
};

export default function AdminWebsiteRequestDetailPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();

  const [project, setProject] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminGetWebsiteProject(projectId);
      setProject(data);
    } catch {
      /* handled below */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    if (!projectId) return;
    void load();
  }, [projectId, load]);

  React.useEffect(() => {
    if (!projectId) return;
    let es: EventSource | null = null;
    try {
      es = api.subscribeAdminWebsiteProjectEvents();
      const refresh = () => {
        void load();
        window.dispatchEvent(new CustomEvent("admin-chat:refresh"));
      };
      ["project.status_changed", "project.assigned", "project.updated", "message.created", "file.uploaded"].forEach(
        (ev) => es?.addEventListener(ev, refresh),
      );
    } catch {
      /* polling fallback */
    }
    return () => es?.close();
  }, [projectId, load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState
            icon={<Globe className="h-10 w-10" />}
            title="Request not found"
            description="This website request doesn't exist."
            action={<Link href="/admin/website-requests"><Button>Back to requests</Button></Link>}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/admin/website-requests")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">{project.name}</h1>
              <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
                {WEBSITE_PROJECT_STATUS_LABELS[project.status as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? project.status}
              </Badge>
            </div>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {project.tenant?.name || "Unknown tenant"} ·{" "}
              {WEBSITE_TYPE_LABELS[project.websiteType as keyof typeof WEBSITE_TYPE_LABELS] ?? project.websiteType}
            </p>
          </div>
        </div>
        <StatusControls project={project} onChanged={load} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Tabs defaultValue="chat">
            <TabsList>
              <TabsTrigger value="chat"><MessageSquare className="h-4 w-4" /> Chat</TabsTrigger>
              <TabsTrigger value="details"><FileText className="h-4 w-4" /> Requirements</TabsTrigger>
              <TabsTrigger value="notes"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="chat">
              <AdminChat projectId={project.id} conversation={project.conversation} />
            </TabsContent>

            <TabsContent value="details">
              <RequirementsPanel project={project} />
            </TabsContent>

            <TabsContent value="notes">
              <NotesPanel projectId={project.id} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <CustomerCard project={project} />
          <StatusHistoryCard history={project.statusHistory || []} />
          <FilesPanel project={project} />
        </div>
      </div>
    </div>
  );
}

function StatusControls({ project, onChanged }: { project: any; onChanged: () => void }) {
  const { user } = useAuth();
  const [value, setValue] = React.useState<string>(project.status);
  const [note, setNote] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => setValue(project.status), [project.status]);

  const save = async () => {
    if (value === project.status) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await api.adminUpdateWebsiteProjectStatus(project.id, value, note.trim() || undefined);
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
      await api.adminAssignWebsiteProject(project.id, user?.id);
      onChanged();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!project.conversation?.assignedAdminId && (
        <Button variant="outline" onClick={() => void assign()}>
          <UserCheck className="h-4 w-4" />
          Assign to me
        </Button>
      )}
      <Button onClick={() => setOpen(true)}>Update status</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update project status</DialogTitle>
            <DialogDescription>
              Current: {WEBSITE_PROJECT_STATUS_LABELS[project.status as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? project.status}
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
                  {WEBSITE_PROJECT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {WEBSITE_PROJECT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note (visible to customer)</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Reviewing your requirements — will reach out in chat today."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={() => void save()}>Save status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminChat({ projectId, conversation }: { projectId: string; conversation: any }) {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [attaching, setAttaching] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminGetWebsiteProjectMessages(projectId);
      setMessages(data.messages || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
    window.addEventListener("admin-chat:refresh", load);
    return () => window.removeEventListener("admin-chat:refresh", load);
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
        const file = await api.adminUploadWebsiteProjectFile(projectId, pendingFile, "CHAT_ATTACHMENT");
        attachment = { url: file.url, name: file.fileName, mime: file.mimeType || "" };
        setAttaching(false);
      }
      const sent = await api.adminSendWebsiteProjectMessage(projectId, {
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
              <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                {conversation?.assignedAdminName ? `Assigned to ${conversation.assignedAdminName}` : "Not assigned yet"}
              </p>
            </div>
          </div>
          {conversation?.lastMessageAt ? (
            <Badge variant="outline">Last activity {relativeTime(conversation.lastMessageAt)}</Badge>
          ) : null}
        </div>

        <div ref={scrollRef} className="max-h-[26rem] min-h-[16rem] space-y-4 overflow-y-auto px-5 py-5">
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
                description="Say hello to the customer and confirm you've received their request."
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
                  <div className={cn("flex items-center gap-2 text-[0.6rem]", m.senderRole === "ADMIN" ? "justify-end text-white/70" : "text-[rgb(var(--color-muted-foreground))]")}>
                    <span>{formatTime(m.createdAt)}</span>
                    <span>{m.senderRole === "ADMIN" ? "You" : "Customer"}</span>
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
              <input type="file" id="admin-chat-file" className="hidden" onChange={pickFile} accept="image/*,.pdf,.doc,.docx,.txt,.zip" />
              <label
                htmlFor="admin-chat-file"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[rgb(var(--color-border))] text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))] transition-colors"
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

function AttachmentInline({ message, mine }: { message: any; mine: boolean }) {
  const isImage = message.attachmentUrl && (message.attachmentUrl.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(message.attachmentUrl || ""));
  const isLink = message.isLink || (message.attachmentUrl && /^https?:\/\//.test(message.attachmentUrl) && !message.message);
  if (isImage) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={message.attachmentUrl} alt={message.attachmentName || "attachment"} className="max-h-48 w-full rounded-lg object-cover" />;
  }
  if (isLink) {
    return (
      <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className={cn("flex items-center gap-2 text-xs underline underline-offset-2", mine ? "text-white" : "text-[rgb(var(--color-primary))]")}>
        <Link2 className="h-3.5 w-3.5" />
        {message.attachmentName || message.attachmentUrl}
      </a>
    );
  }
  return (
    <a href={message.attachmentUrl} download={message.attachmentName || undefined} className={cn("flex items-center gap-2 text-xs", mine ? "text-white/90" : "text-[rgb(var(--color-primary))] hover:underline")}>
      <FileText className="h-3.5 w-3.5" />
      {message.attachmentName || "Attachment"}
      <Download className="h-3 w-3" />
    </a>
  );
}

function RequirementsPanel({ project }: { project: any }) {
  const req = project.requirements;
  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-[rgb(var(--color-foreground))]">Customer requirements</h2>
        {req ? (
          <dl className="space-y-3 text-sm">
            <AdminDetail label="Business" value={`${req.businessName} · ${req.businessType}`} />
            <AdminDetail label="Location" value={req.businessLocation} />
            <AdminDetail label="Phone" value={req.businessPhone} />
            <AdminDetail label="Email" value={req.businessEmail} />
            <AdminDetail label="Existing website" value={req.existingWebsiteUrl} />
            <AdminDetail label="Design styles" value={req.designStyle.length ? req.designStyle.map((s: string) => DESIGN_STYLE_LABELS[s as keyof typeof DESIGN_STYLE_LABELS]).join(", ") : "Designer's choice"} />
            <AdminDetail label="Preference" value={req.designPreference === "REFERENCE" ? "Use reference website" : "Surprise me"} />
            <AdminDetail label="Reference URL" value={req.referenceUrl} />
            <AdminDetail label="Pages" value={`${req.pageCount} pages`} />
            <AdminDetail label="Features" value={req.requiredFeatures.length ? req.requiredFeatures.map((f: string) => WEBSITE_FEATURE_LABELS[f as keyof typeof WEBSITE_FEATURE_LABELS]).join(", ") : "None"} />
            <AdminDetail label="Logo" value={req.hasLogo ? "Have a logo ready" : "No logo yet"} />
            <AdminDetail label="Additional notes" value={req.additionalRequirements} />
            <AdminDetail label="Goal" value={project.goal} />
          </dl>
        ) : (
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No requirements captured.</p>
        )}
      </CardContent>
    </Card>
  );
}

function CustomerCard({ project }: { project: any }) {
  const customer = project.customerUser;
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-[rgb(var(--color-foreground))]">Customer</h2>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor(customer?.email || project.customerUserId) }}
          >
            {initials(`${customer?.firstName ?? ""} ${customer?.lastName ?? ""}`.trim() || customer?.email || "C")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
              {customer?.firstName ? `${customer.firstName} ${customer.lastName ?? ""}`.trim() : customer?.email || "Unknown"}
            </p>
            {customer?.email ? <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{customer.email}</p> : null}
          </div>
        </div>
        <div className="mt-4 space-y-1.5 border-t border-[rgb(var(--color-border))] pt-3 text-xs text-[rgb(var(--color-muted-foreground))]">
          <p>Tenant: <span className="font-medium text-[rgb(var(--color-foreground))]">{project.tenant?.name || "—"}</span></p>
          <p>Submitted: <span className="font-medium text-[rgb(var(--color-foreground))]">{formatTime(project.createdAt)}</span></p>
          {project.conversation?.assignedAdminName ? (
            <p className="flex items-center gap-1.5">
              <UserCheck className="h-3 w-3" />
              Assigned to <span className="font-medium text-[rgb(var(--color-primary))]">{project.conversation.assignedAdminName}</span>
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusHistoryCard({ history }: { history: any[] }) {
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
                    {WEBSITE_PROJECT_STATUS_LABELS[h.newStatus as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? h.newStatus}
                    {h.oldStatus ? (
                      <span className="text-[rgb(var(--color-muted-foreground))]">
                        {" "}· from {WEBSITE_PROJECT_STATUS_LABELS[h.oldStatus as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? h.oldStatus}
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

function FilesPanel({ project }: { project: any }) {
  const files = project.files || [];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Files</h2>
          <Badge variant="outline">{files.length}</Badge>
        </div>
        {files.length === 0 ? (
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">No files shared yet.</p>
        ) : (
          <ul className="space-y-2">
            {files.map((file: any) => {
              const isImage = file.url.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(file.fileName || "");
              return (
                <li key={file.id} className="flex items-center gap-3">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={file.fileName} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                      <FileText className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[rgb(var(--color-foreground))]">{file.fileName}</p>
                    <p className="text-[0.6rem] capitalize text-[rgb(var(--color-muted-foreground))]">
                      {file.uploadedByRole.toLowerCase()} · {file.category.toLowerCase().replace("_", " ")}
                    </p>
                  </div>
                  <a href={file.url} download={file.fileName || undefined} className="p-1 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]">
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

function NotesPanel({ projectId }: { projectId: string }) {
  const [notes, setNotes] = React.useState<any[]>([]);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.adminListWebsiteProjectNotes(projectId);
      setNotes(data || []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.adminAddWebsiteProjectNote(projectId, note.trim());
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
          <EmptyState icon={<StickyNote className="h-8 w-8" />} title="No notes yet" description="Internal notes stay visible to admins only." />
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-[rgb(var(--color-border))] p-3">
                <p className="text-sm text-[rgb(var(--color-foreground))]">{n.note}</p>
                <p className="mt-1 text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                  {n.authorName || "Admin"} · {formatTime(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AdminDetail({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-36 shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">{label}</dt>
      <dd className="font-medium text-[rgb(var(--color-foreground))]">{value}</dd>
    </div>
  );
}
