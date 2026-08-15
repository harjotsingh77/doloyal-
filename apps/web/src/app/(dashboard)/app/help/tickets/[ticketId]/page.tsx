"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  CheckCheck,
  Clock,
  Loader2,
  Paperclip,
  Ticket,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge, Button, Card, Skeleton } from "@doloyal/ui";
import { SUPPORT_STATUS_LABELS } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Message = Awaited<ReturnType<typeof api.getSupportTicketMessages>>["messages"][number];
type Ticket = Awaited<ReturnType<typeof api.getSupportTicket>>;

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-[rgb(var(--color-warning))]",
  IN_PROGRESS: "bg-[rgb(var(--color-primary))]",
  WAITING_FOR_CUSTOMER: "bg-[rgb(var(--color-accent))]",
  RESOLVED: "bg-[rgb(var(--color-success))]",
  CLOSED: "bg-[rgb(var(--color-muted-foreground))]",
};

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "warning" | "outline"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  WAITING_FOR_CUSTOMER: "accent",
  RESOLVED: "success",
  CLOSED: "default",
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function AttachmentPreview({ message }: { message: Message }) {
  const isImage =
    message.attachmentMimeType?.startsWith("image/") &&
    message.attachmentUrl?.startsWith("data:image/");
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={message.attachmentUrl!}
          alt={message.attachmentName ?? "attachment"}
          className="max-h-64 w-full object-cover"
        />
      ) : (
        <a
          href={message.attachmentUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 text-xs text-[rgb(var(--color-primary))] hover:underline"
        >
          <Paperclip className="h-4 w-4 shrink-0" />
          <span className="truncate">{message.attachmentName ?? "Attachment"}</span>
        </a>
      )}
    </div>
  );
}

export default function SupportTicketConversationPage() {
  const params = useParams<{ ticketId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params.ticketId;

  const [ticket, setTicket] = React.useState<Ticket | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const [pendingCount, setPendingCount] = React.useState(0);
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ticketRes, conv] = await Promise.all([
          api.getSupportTicket(ticketId),
          api.getSupportTicketMessages(ticketId),
        ]);
        if (!active) return;
        setTicket(ticketRes);
        setMessages(conv.messages);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ticketId]);

  // Mark as read once loaded.
  React.useEffect(() => {
    if (!loading && !error) {
      void api.markSupportTicketRead(ticketId).catch(() => {});
    }
  }, [loading, error, ticketId]);

  // Autoscroll on new messages.
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Realtime SSE.
  React.useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = api.subscribeSupportEvents();
    } catch {
      return;
    }
    const onMessage = (ev: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(ev.data) as { type: string; ticketId: string; message?: Message };
        if (!payload.ticketId || payload.ticketId !== ticketId) return;
        if (payload.type === "message.created" && payload.message) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.message!.id)) return prev;
            return [...prev, payload.message!];
          });
          setPendingCount((c) => c + 1);
          void api.markSupportTicketRead(ticketId).catch(() => {});
        } else if (payload.type === "ticket.status_changed" || payload.type === "ticket.updated") {
          void api.getSupportTicket(ticketId).then(setTicket).catch(() => {});
        }
      } catch {
        /* ignore malformed events */
      }
    };
    es.addEventListener("message", onMessage);
    es.addEventListener("support.event", onMessage);
    return () => {
      es?.removeEventListener("message", onMessage);
      es?.removeEventListener("support.event", onMessage);
      es?.close();
    };
  }, [ticketId]);

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  };

  const send = async () => {
    const content = text.trim();
    if (!content && !file) return;
    setSending(true);
    try {
      let sent: Message;
      if (file) {
        const attachment = await api.uploadSupportTicketFile(ticketId, file);
        sent = await api.sendSupportTicketMessage(ticketId, {
          message: content,
          attachmentUrl: attachment.fileUrl,
          attachmentName: attachment.fileName,
          attachmentMimeType: attachment.fileType ?? undefined,
        });
      } else {
        sent = await api.sendSupportTicketMessage(ticketId, { message: content });
      }
      setMessages((prev) => (prev.some((m) => m.id === sent.id) ? prev : [...prev, sent]));
      setText("");
      setFile(null);
      setPendingCount(0);
      void api.markSupportTicketRead(ticketId).catch(() => {});
    } catch (err) {
      // Surface a console warning; keep input so the user doesn't lose their message.
      console.error("Failed to send message", err);
      window.alert("Failed to send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[60vh] w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
            We couldn&apos;t load this conversation
          </p>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            It may have been removed, or you don&apos;t have access to it.
          </p>
          <Button variant="secondary" asChild>
            <Link href="/app/help">Back to Help &amp; Support</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-4.5rem)] max-w-3xl flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[rgb(var(--color-border))] py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 px-2"
            onClick={() => router.push("/app/help")}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-[rgb(var(--color-primary))]">
                {ticket.ticketNumber}
              </span>
              <Badge
                variant={STATUS_VARIANT[ticket.status] ?? "default"}
                className="shrink-0"
              >
                {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS] ?? ticket.status}
              </Badge>
            </div>
            <p className="truncate text-sm text-[rgb(var(--color-foreground))]">
              {ticket.subject}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">
          {ticket.category}
        </Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
              <Ticket className="h-7 w-7" />
            </div>
            <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
              Conversation started
            </p>
            <p className="max-w-sm text-sm text-[rgb(var(--color-muted-foreground))]">
              Send a message below and our support team will reply right here.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, i) => {
              const prev = messages[i - 1];
              const isSystem = message.senderRole === "SYSTEM";
              const isMe =
                message.senderRole === "CUSTOMER" &&
                (user?.id ? message.senderId === user.id : true);
              const showDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
              return (
                <React.Fragment key={message.id}>
                  {showDay ? (
                    <div className="flex items-center justify-center gap-2 py-1">
                      <span className="rounded-full bg-[rgb(var(--color-muted))] px-3 py-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                  ) : null}
                  {isSystem ? (
                    <div className="flex justify-center">
                      <div className="flex items-center gap-1.5 rounded-full bg-[rgb(var(--color-muted))] px-3 py-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                        <Clock className="h-3 w-3" />
                        {message.message}
                      </div>
                    </div>
                  ) : (
                    <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? "rounded-br-md bg-[rgb(var(--color-primary))] text-white"
                            : "rounded-bl-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))]"
                        }`}
                      >
                        {!isMe ? (
                          <p className="mb-1 text-xs font-medium text-[rgb(var(--color-primary))]">
                            {message.senderName ?? "Doloyal Support"}
                          </p>
                        ) : null}
                        {message.message ? <p className="whitespace-pre-wrap">{message.message}</p> : null}
                        <AttachmentPreview message={message} />
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isMe ? "text-white/70" : "text-[rgb(var(--color-muted-foreground))]"
                          }`}
                        >
                          {formatTime(message.createdAt)}
                          {isMe && message.readAt ? (
                            <CheckCheck className="h-3 w-3 text-[rgb(var(--color-success))]" />
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] py-4">
        {file ? (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-3 py-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <Paperclip className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
              <span className="truncate text-xs">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              placeholder="Type a message..."
              className="w-full resize-none rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 py-3 pr-12 text-sm outline-none placeholder:text-[rgb(var(--color-subtle))] focus:border-[rgb(var(--color-primary))] focus:ring-2 focus:ring-[rgb(var(--color-primary)/0.25)]"
            />
            <label
              htmlFor="conversation-attachment"
              className="absolute bottom-2.5 right-2.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]"
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </label>
            <input
              id="conversation-attachment"
              type="file"
              className="hidden"
              onChange={pickFile}
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
          </div>
          <Button
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => void send()}
            disabled={sending || (!text.trim() && !file)}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">
          Enter to send, Shift+Enter for a new line. Attach images, PDFs, or documents up to 5&nbsp;MB.
        </p>
      </div>
    </div>
  );
}