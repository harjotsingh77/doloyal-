"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Download,
  FileText,
  Globe,
  Link2,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
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
  EmptyState,
} from "@doloyal/ui";
import {
  WEBSITE_PROJECT_STATUS_LABELS,
  WEBSITE_TYPE_LABELS,
  DESIGN_STYLE_LABELS,
  WEBSITE_FEATURE_LABELS,
  relativeTime,
  formatTime,
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

export default function WebsiteProjectPage() {
  const params = useParams();
  const projectId = params?.projectId as string;
  const router = useRouter();

  const [project, setProject] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await api.getWebsiteProject(projectId);
      setProject(data);
    } catch {
      /* handled by error state */
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
      es = api.subscribeWebsiteProjectEvents();
      const refresh = () => {
        void load();
        window.dispatchEvent(new CustomEvent("website-chat:refresh"));
      };
      ["project.status_changed", "project.assigned", "project.updated", "message.created", "file.uploaded"].forEach(
        (ev) => es?.addEventListener(ev, refresh),
      );
    } catch {
      /* polling on tab focus below */
    }
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      es?.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [projectId, load]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState
            icon={<Globe className="h-10 w-10" />}
            title="Project not found"
            description="This website project doesn't exist or you don't have access to it."
            action={<Link href="/app/websites"><Button>Back to Website Builder</Button></Link>}
          />
        </CardContent>
      </Card>
    );
  }

  const typeLabel = WEBSITE_TYPE_LABELS[project.websiteType as keyof typeof WEBSITE_TYPE_LABELS] ?? project.websiteType;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/app/websites")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-[rgb(var(--color-foreground))]">
                {project.name}
              </h1>
              <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
                {WEBSITE_PROJECT_STATUS_LABELS[project.status as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? project.status}
              </Badge>
            </div>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {typeLabel}
              {project.conversation?.assignedAdminName ? (
                <>
                  {" "}· Working with <span className="font-medium text-[rgb(var(--color-foreground))]">{project.conversation.assignedAdminName}</span>
                </>
              ) : (
                " · Awaiting team assignment"
              )}
            </p>
          </div>
        </div>
        {project.liveUrl ? (
          <a href={project.liveUrl} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ArrowUpRight className="h-4 w-4" />
              Visit live site
            </Button>
          </a>
        ) : null}
      </div>

      {project.statusHistory && project.statusHistory.length > 0 ? (
        <StatusTimeline history={project.statusHistory} />
      ) : null}

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">
            <MessageSquare className="h-4 w-4" />
            Chat with our team
          </TabsTrigger>
          <TabsTrigger value="overview">
            <FileText className="h-4 w-4" />
            Project details
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatPanel projectId={projectId} conversation={project.conversation} />
        </TabsContent>

        <TabsContent value="overview">
          <OverviewPanel project={project} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusTimeline({ history }: { history: any[] }) {
  const ordered = [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[rgb(var(--color-primary))]" />
          <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Project timeline</h2>
        </div>
        <ol className="flex items-start gap-2 overflow-x-auto pb-1">
          {ordered.map((h, i) => (
            <React.Fragment key={h.id}>
              <li className="flex min-w-[8.5rem] flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      i === ordered.length - 1
                        ? "bg-[rgb(var(--color-primary))] ring-4 ring-[rgb(var(--color-primary)/0.15)]"
                        : "bg-[rgb(var(--color-success)/0.7)]",
                    )}
                  />
                  <span className="text-[0.6rem] font-medium text-[rgb(var(--color-muted-foreground))]">
                    {formatTime(h.createdAt)}
                  </span>
                </div>
                <p className="text-xs font-medium text-[rgb(var(--color-foreground))]">
                  {WEBSITE_PROJECT_STATUS_LABELS[h.newStatus as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? h.newStatus}
                </p>
                <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                  {h.changedByName || "Doloyal Team"}
                </p>
                {h.note ? <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">“{h.note}”</p> : null}
              </li>
              {i < ordered.length - 1 && (
                <span className="mt-1.5 flex-1 border-t border-dashed border-[rgb(var(--color-border))]" />
              )}
            </React.Fragment>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function ChatPanel({ projectId, conversation }: { projectId: string; conversation: any }) {
  const [messages, setMessages] = React.useState<any[]>([]);
  const [conversationData, setConversationData] = React.useState<any>(conversation);
  const [loading, setLoading] = React.useState(true);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [attaching, setAttaching] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const loadMessages = React.useCallback(async () => {
    try {
      const data = await api.getWebsiteProjectMessages(projectId);
      setMessages(data.messages || []);
      setConversationData(data.conversation);
      void api.markWebsiteProjectRead(projectId);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    void loadMessages();
    window.addEventListener("website-chat:refresh", loadMessages);
    return () => window.removeEventListener("website-chat:refresh", loadMessages);
  }, [loadMessages]);

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
        const file = await api.uploadWebsiteProjectFile(projectId, pendingFile, "CHAT_ATTACHMENT");
        attachment = { url: file.url, name: file.fileName, mime: file.mimeType || "" };
        setAttaching(false);
      }
      const sent = await api.sendWebsiteProjectMessage(projectId, {
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
              <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Chat with Doloyal</p>
              <p className="text-[0.6rem] text-[rgb(var(--color-muted-foreground))]">
                {conversationData?.assignedAdminName
                  ? `Assigned to ${conversationData.assignedAdminName}`
                  : "Our team will pick this up shortly"}
              </p>
            </div>
          </div>
          {conversationData?.lastMessageAt ? (
            <Badge variant="outline">Last activity {relativeTime(conversationData.lastMessageAt)}</Badge>
          ) : null}
        </div>

        <div ref={scrollRef} className="max-h-[28rem] min-h-[18rem] space-y-4 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/3 ml-auto" />
              <Skeleton className="h-10 w-2/3" />
            </div>
          ) : messages.length === 0 ? (
            <div className="py-10">
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="Start the conversation"
                description="Say hello and share any details, links, or files with our team."
              />
            </div>
          ) : (
            messages.map((m) => <MessageBubble key={m.id} message={m} isMine={m.senderRole === "CUSTOMER"} />)
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
                id="chat-file"
                className="hidden"
                onChange={pickFile}
                accept="image/*,.pdf,.doc,.docx,.txt,.zip"
              />
              <label
                htmlFor="chat-file"
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
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
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

function MessageBubble({ message, isMine }: { message: any; isMine: boolean }) {
  const isLink = message.isLink || (message.attachmentUrl && /^https?:\/\//.test(message.attachmentUrl) && !message.message);
  const isImage =
    message.attachmentUrl && (message.attachmentUrl.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(message.attachmentUrl || ""));

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] space-y-1.5 rounded-2xl px-4 py-2.5 text-sm",
          isMine
            ? "rounded-br-md bg-[rgb(var(--color-primary))] text-white"
            : "rounded-bl-md bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]",
        )}
      >
        {message.message ? <p className="whitespace-pre-wrap break-words">{message.message}</p> : null}

        {message.attachmentUrl ? (
          <div className={cn("overflow-hidden rounded-lg", message.message && "mt-1.5")}>
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={message.attachmentUrl}
                alt={message.attachmentName || "attachment"}
                className="max-h-48 w-full object-cover"
              />
            ) : isLink ? (
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center gap-2 text-xs underline underline-offset-2",
                  isMine ? "text-white" : "text-[rgb(var(--color-primary))]",
                )}
              >
                <Link2 className="h-3.5 w-3.5" />
                {message.attachmentName || message.attachmentUrl}
              </a>
            ) : (
              <a
                href={message.attachmentUrl}
                download={message.attachmentName || undefined}
                className={cn(
                  "flex items-center gap-2 text-xs",
                  isMine ? "text-white/90 hover:text-white" : "text-[rgb(var(--color-primary))] hover:underline",
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                {message.attachmentName || "Attachment"}
                <Download className="h-3 w-3" />
              </a>
            )}
          </div>
        ) : null}

        <div className={cn("flex items-center gap-2 text-[0.6rem]", isMine ? "justify-end text-white/70" : "text-[rgb(var(--color-muted-foreground))]")}>
          <span>{formatTime(message.createdAt)}</span>
          {isMine && <span>{message.senderRole === "CUSTOMER" ? "You" : "Doloyal"}</span>}
          {!isMine && <span>{message.senderRole === "ADMIN" ? "Doloyal Team" : message.senderRole}</span>}
          {message.readAt && isMine ? <CheckCircle2 className="h-3 w-3" /> : null}
        </div>
      </div>
    </div>
  );
}

function OverviewPanel({ project, onChanged }: { project: any; onChanged: () => void }) {
  const { user } = useAuth();
  const currentUserId = user?.id;
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const req = project.requirements;
  const files = project.files || [];

  const removeFile = async (fileId: string) => {
    setDeletingId(fileId);
    try {
      await api.deleteWebsiteProjectFile(project.id, fileId);
      onChanged();
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold text-[rgb(var(--color-foreground))]">Your requirements</h2>
          {req ? (
            <dl className="space-y-3 text-sm">
              <DetailRow label="Business" value={[req.businessName, req.businessType].filter(Boolean).join(" · ")} />
              <DetailRow label="Location" value={req.businessLocation} />
              <DetailRow label="Phone" value={req.businessPhone} />
              <DetailRow label="Email" value={req.businessEmail} />
              {req.existingWebsiteUrl ? (
                <DetailRow
                  label="Existing site"
                  value={
                    <a href={req.existingWebsiteUrl} target="_blank" rel="noreferrer" className="text-[rgb(var(--color-primary))] hover:underline">
                      {req.existingWebsiteUrl}
                    </a>
                  }
                />
              ) : null}
              <DetailRow
                label="Design styles"
                value={req.designStyle.length ? req.designStyle.map((s: string) => DESIGN_STYLE_LABELS[s as keyof typeof DESIGN_STYLE_LABELS]).join(", ") : "Designer's choice"}
              />
              <DetailRow
                label="Preference"
                value={req.designPreference === "REFERENCE" ? "Use reference website" : "Surprise me"}
              />
              {req.referenceUrl ? (
                <DetailRow
                  label="Reference"
                  value={
                    <a href={req.referenceUrl} target="_blank" rel="noreferrer" className="text-[rgb(var(--color-primary))] hover:underline">
                      {req.referenceUrl}
                    </a>
                  }
                />
              ) : null}
              <DetailRow label="Pages" value={`${req.pageCount} pages`} />
              <DetailRow
                label="Features"
                value={req.requiredFeatures.length ? req.requiredFeatures.map((f: string) => WEBSITE_FEATURE_LABELS[f as keyof typeof WEBSITE_FEATURE_LABELS]).join(", ") : "None selected"}
              />
              <DetailRow label="Logo" value={req.hasLogo ? "Have a logo ready" : "No logo yet"} />
              {req.additionalRequirements ? <DetailRow label="Notes" value={req.additionalRequirements} /> : null}
            </dl>
          ) : (
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No requirements captured yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Shared files</h2>
            <Badge variant="outline">{files.length}</Badge>
          </div>
          {files.length === 0 ? (
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              No files shared yet. Upload reference images, logos, or brand assets in the chat.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {files.map((file: any) => {
                const isImage = file.url.startsWith("data:image") || /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(file.fileName || "");
                const canDelete = file.uploadedByUserId === currentUserId;
                return (
                  <div key={file.id} className="group flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] p-3">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt={file.fileName} className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                        <FileText className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[rgb(var(--color-foreground))]">{file.fileName}</p>
                      <p className="text-[0.6rem] capitalize text-[rgb(var(--color-muted-foreground))]">{file.category.toLowerCase().replace("_", " ")}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={file.url} download={file.fileName || undefined} className="p-1 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]">
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      {canDelete && (
                        <button
                          onClick={() => void removeFile(file.id)}
                          disabled={deletingId === file.id}
                          className="p-1 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-danger))]"
                        >
                          {deletingId === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-5 rounded-xl bg-[rgb(var(--color-muted))] p-4 text-xs text-[rgb(var(--color-muted-foreground))]">
            <p className="flex items-center gap-2 font-medium text-[rgb(var(--color-foreground))]">
              <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
              Need to update your requirements?
            </p>
            <p className="mt-1">
              While your request is under review you can share changes with our team directly in the chat — we'll update your project.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="w-32 shrink-0 text-xs text-[rgb(var(--color-muted-foreground))]">{label}</dt>
      <dd className="font-medium text-[rgb(var(--color-foreground))]">{value}</dd>
    </div>
  );
}
