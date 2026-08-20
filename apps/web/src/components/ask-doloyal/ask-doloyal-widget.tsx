"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  X,
  Plus,
  MessageSquare,
  LifeBuoy,
  Ticket,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  CreditCard,
  Wrench,
  Plug,
  HelpCircle,
} from "lucide-react";
import { Button, Input, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, cn } from "@doloyal/ui";
import { SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_PRIORITY_LABELS } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useAskDoloyal } from "./ask-doloyal-context";
import type {
  SupportConversation,
  SupportConversationDetail,
  SupportConversationMessage,
  AskDoloyalChatResponse,
} from "@doloyal/shared";

const QUICK_ACTIONS = [
  { label: "How do I use Doloyal?", prompt: "How do I use Doloyal?", icon: HelpCircle },
  { label: "Something isn't working", prompt: "Something isn't working — here's what happened:", icon: Wrench },
  { label: "Billing help", prompt: "I need help with billing and payments.", icon: CreditCard },
  { label: "Integrations help", prompt: "I need help connecting an integration like Google Calendar, WhatsApp, Stripe or Razorpay.", icon: Plug },
  { label: "Contact support", prompt: "I'd like to contact human support.", icon: LifeBuoy },
];

type LocalMessage = {
  id: string;
  senderType: "USER" | "AI" | "SYSTEM";
  content: string;
  createdAt: string;
  metadata?: SupportConversationMessage["metadata"];
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:mt-2 prose-headings:mb-1 prose-headings:text-[rgb(var(--color-foreground))] prose-p:text-[rgb(var(--color-foreground))] prose-strong:text-[rgb(var(--color-foreground))] prose-li:text-[rgb(var(--color-foreground))] prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-a:text-[rgb(var(--color-primary))] prose-code:rounded prose-code:bg-[rgb(var(--color-muted))] prose-code:px-1 prose-code:py-0.5 prose-pre:bg-[rgb(var(--color-muted))] prose-pre:text-[rgb(var(--color-foreground))]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AvatarMark({ senderType }: { senderType: string }) {
  if (senderType === "AI" || senderType === "SYSTEM") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--color-primary))] text-white">
        <img src="/ask-doloyal-icon.png" alt="AI" className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
      <MessageSquare className="h-3.5 w-3.5" />
    </div>
  );
}

export function AskDoloyalWidget() {
  const router = useRouter();
  const { isOpen, close, toggle, unread, refreshUnread } = useAskDoloyal();

  const [conversations, setConversations] = React.useState<SupportConversation[]>([]);
  const [view, setView] = React.useState<"list" | "chat">("list");
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeTitle, setActiveTitle] = React.useState("");
  const [activeMode, setActiveMode] = React.useState<"AI" | "HUMAN">("AI");
  const [activeTicket, setActiveTicket] = React.useState<{ id: string; ticketNumber: string; status: string } | null>(null);
  const [messages, setMessages] = React.useState<LocalMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [pendingEscalation, setPendingEscalation] = React.useState<AskDoloyalChatResponse | null>(null);
  const [ticketDraft, setTicketDraft] = React.useState({
    open: false,
    subject: "",
    category: "Technical Issue",
    priority: "NORMAL",
    description: "",
  });
  const [createdTicket, setCreatedTicket] = React.useState<{ id: string; ticketNumber: string } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const currentPage =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "";

  const loadConversations = React.useCallback(async () => {
    try {
      setConversations(await api.listSupportConversations());
    } catch {
      // Non-fatal — chat still works without the list.
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      void loadConversations();
      void refreshUnread();
    }
  }, [isOpen, loadConversations, refreshUnread]);

  React.useEffect(() => {
    if (view === "chat") {
      composerRef.current?.focus();
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [view, loading, messages.length]);

  const openChat = React.useCallback(async (conversationId: string | null) => {
    setPendingEscalation(null);
    setCreatedTicket(null);
    setTicketDraft((d) => ({ ...d, open: false }));
    setMessages([]);
    setInput("");
    if (!conversationId) {
      setActiveId(null);
      setActiveTitle("");
      setActiveMode("AI");
      setActiveTicket(null);
      setView("chat");
      return;
    }
    try {
      const detail: SupportConversationDetail = await api.getSupportConversation(conversationId);
      setActiveId(detail.id);
      setActiveTitle(detail.title);
      setActiveMode(detail.mode);
      setActiveTicket(detail.ticket ?? null);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          senderType: m.senderType,
          content: m.content,
          createdAt: m.createdAt,
          metadata: m.metadata ?? undefined,
        })),
      );
      setView("chat");
      void api.readSupportConversation(conversationId).catch(() => undefined);
      void refreshUnread();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open conversation.");
    }
  }, [refreshUnread]);

  const sendMessage = React.useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || loading) return;

      const optimistic: LocalMessage = {
        id: `local-${Date.now()}`,
        senderType: "USER",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, optimistic]);
      setInput("");
      setLoading(true);

      try {
        const res = await api.askDoloyal({
          message: content,
          conversationId: activeId ?? undefined,
          currentPage,
        });
        const aiMsg: LocalMessage = {
          id: res.messageId,
          senderType: "AI",
          content: res.message,
          createdAt: new Date().toISOString(),
          metadata: {
            escalate: res.escalate,
            suggestedCategory: res.suggestedCategory,
            suggestedPriority: res.suggestedPriority,
            suggestedSubject: res.suggestedSubject,
          },
        };
        setMessages((m) => [...m, aiMsg]);
        setActiveId(res.conversationId);
        setActiveMode(res.mode);
        if (res.escalate) setPendingEscalation(res);
        void refreshUnread();
      } catch (err) {
        const fallback: LocalMessage = {
          id: `local-${Date.now()}-err`,
          senderType: "AI",
          content:
            "Doloyal AI Support is temporarily unavailable. You can still create a support ticket and our team will get back to you shortly.",
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => [...m, fallback]);
        setPendingEscalation({
          conversationId: activeId ?? "",
          messageId: fallback.id,
          message: fallback.content,
          escalate: true,
          mode: "AI",
          provider: "fallback",
          model: "rules",
        });
        toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [activeId, currentPage, loading, refreshUnread],
  );

  const continueChatting = React.useCallback(() => {
    setPendingEscalation(null);
    composerRef.current?.focus();
  }, []);

  const openTicketDraft = React.useCallback(() => {
    const suggestion = pendingEscalation;
    setTicketDraft({
      open: true,
      subject:
        suggestion?.suggestedSubject || (messages.find((m) => m.senderType === "USER")?.content.slice(0, 90) || "Support request"),
      category: suggestion?.suggestedCategory || "Technical Issue",
      priority: suggestion?.suggestedPriority || "NORMAL",
      description:
        messages
          .filter((m) => m.senderType === "USER")
          .map((m) => m.content)
          .slice(-3)
          .join("\n\n") || "Need help from the Doloyal support team.",
    });
  }, [pendingEscalation, messages]);

  const submitTicket = React.useCallback(async () => {
    if (!ticketDraft.subject.trim() || !ticketDraft.description.trim()) {
      toast.error("Please fill in a subject and description.");
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await api.createSupportTicket({
        subject: ticketDraft.subject.trim(),
        category: ticketDraft.category,
        priority: ticketDraft.priority,
        description: ticketDraft.description.trim(),
        conversationId: activeId ?? undefined,
        currentPage,
      });
      setCreatedTicket({ id: ticket.id, ticketNumber: ticket.ticketNumber });
      setTicketDraft((d) => ({ ...d, open: false }));
      toast.success("Support ticket created");
      void loadConversations();
      void refreshUnread();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong creating your ticket.");
    } finally {
      setSubmitting(false);
    }
  }, [ticketDraft, activeId, currentPage, loadConversations, refreshUnread]);

  const openTicket = React.useCallback(() => {
    if (!createdTicket) return;
    close();
    router.push(`/app/help/tickets/${createdTicket.id}`);
  }, [createdTicket, close, router]);

  const openExistingTicket = React.useCallback(() => {
    if (!activeTicket) return;
    close();
    router.push(`/app/help/tickets/${activeTicket.id}`);
  }, [activeTicket, close, router]);

  const composerDisabled = activeMode === "HUMAN" || loading;
  const humanMode = activeMode === "HUMAN";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label={isOpen ? "Close Ask Doloyal" : "Open Ask Doloyal"}
        className={cn(
          "fixed bottom-5 right-5 z-[70] flex items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6",
          isOpen
            ? "bg-[rgb(var(--color-primary))] p-3.5 text-white shadow-lg shadow-black/20"
            : "p-0 drop-shadow-xl",
        )}
        style={{ height: 56, width: 56 }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <img
            src="/ask-doloyal-icon.png"
            alt="Ask Doloyal"
            className="h-full w-full object-contain select-none pointer-events-none"
          />
        )}
        {!isOpen && unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[rgb(var(--color-danger))] px-1 text-[0.65rem] font-bold text-white ring-2 ring-[rgb(var(--color-background))]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-[rgb(var(--color-surface))] shadow-2xl sm:inset-auto sm:bottom-[5.25rem] sm:right-5 sm:h-[min(680px,calc(100vh-7rem))] sm:w-[400px] sm:rounded-2xl sm:border sm:border-[rgb(var(--color-border))] lg:bottom-24 lg:right-6"
          style={{
            maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))",
          }}
          role="dialog"
          aria-label="Ask Doloyal support assistant"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-4 py-3.5 sm:rounded-t-2xl">
            {view === "chat" ? (
              <button
                onClick={() => {
                  setView("list");
                  void loadConversations();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-[rgb(var(--color-primary))] text-white">
              <img src="/ask-doloyal-icon.png" alt="Ask Doloyal" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Ask Doloyal</p>
              <p className="truncate text-[0.7rem] text-[rgb(var(--color-muted-foreground))]">
                {view === "chat" ? (activeTitle || "New chat") : "AI-powered help, with human support when you need it."}
              </p>
            </div>
            <button
              onClick={close}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
              aria-label="Close Ask Doloyal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="relative flex-1 overflow-hidden">
            {view === "list" ? (
              <div className="flex h-full flex-col overflow-y-auto">
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    Conversations
                  </p>
                  <button
                    onClick={() => openChat(null)}
                    className="flex items-center gap-1.5 rounded-lg bg-[rgb(var(--color-primary)/0.1)] px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary)/0.16)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    New chat
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--color-primary))] text-white shadow-sm">
                      <img src="/ask-doloyal-icon.png" alt="Ask Doloyal" className="h-full w-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">Start a new conversation</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      Ask about dashboards, bookings, loyalty, integrations, billing and more.
                    </p>
                    <Button size="sm" onClick={() => openChat(null)}>
                      Start chatting
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1 px-2 pb-4">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => openChat(c.id)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-[rgb(var(--color-muted))]",
                          c.unreadCount > 0 && "bg-[rgb(var(--color-primary)/0.06)]",
                        )}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
                              {c.title || "New chat"}
                            </p>
                            {c.lastMessage ? (
                              <span className="shrink-0 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                                {formatTime(c.lastMessage.createdAt)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                            {c.mode === "HUMAN"
                              ? `Human support · ${c.ticket ? `Ticket ${c.ticket.ticketNumber}` : "connected"}`
                              : c.lastMessage
                                ? c.lastMessage.content
                                : "New conversation"}
                          </p>
                        </div>
                        {c.unreadCount > 0 ? (
                          <span className="mt-1 flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--color-primary))] px-1 text-[0.6rem] font-bold text-white">
                            {c.unreadCount}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-auto border-t border-[rgb(var(--color-border))] px-4 py-3">
                  <button
                    onClick={() => {
                      close();
                      router.push("/app/help");
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-primary)/0.08)]"
                  >
                    <Ticket className="h-4 w-4" />
                    My Tickets & Help Center
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col">
                {/* Messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 px-2 text-center">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-[rgb(var(--color-primary))] text-white shadow-sm">
                        <img src="/ask-doloyal-icon.png" alt="Ask Doloyal" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                          Hi! I&apos;m Doloyal&apos;s support assistant.
                        </p>
                        <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                          Ask me anything about using Doloyal, or jump straight in:
                        </p>
                      </div>
                      <div className="grid w-full gap-2">
                        {QUICK_ACTIONS.map((qa) => (
                          <button
                            key={qa.label}
                            onClick={() => void sendMessage(qa.prompt)}
                            disabled={loading}
                            className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-3 py-2.5 text-left text-xs font-medium text-[rgb(var(--color-foreground))] transition-colors hover:border-[rgb(var(--color-primary)/0.4)] hover:bg-[rgb(var(--color-primary)/0.05)] disabled:opacity-60"
                          >
                            <qa.icon className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
                            {qa.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {messages.map((m) => (
                        <div key={m.id} className={cn("flex gap-2.5", m.senderType === "USER" && "flex-row-reverse")}>
                          {m.senderType !== "USER" ? <AvatarMark senderType={m.senderType} /> : null}
                          <div
                            className={cn(
                              "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                              m.senderType === "USER"
                                ? "rounded-tr-md bg-[rgb(var(--color-primary))] text-white"
                                : m.senderType === "SYSTEM"
                                  ? "rounded-tl-md bg-[rgb(var(--color-muted))] text-[rgb(var(--color-foreground))]"
                                  : "rounded-tl-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-foreground))]",
                            )}
                          >
                            {m.senderType === "AI" || m.senderType === "SYSTEM" ? (
                              <MarkdownBody content={m.content} />
                            ) : (
                              <p className="whitespace-pre-wrap">{m.content}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {loading ? (
                        <div className="flex items-center gap-2 text-xs text-[rgb(var(--color-muted-foreground))]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Ask Doloyal is typing…
                        </div>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Escalation + ticket states */}
                {humanMode ? (
                  <div className="shrink-0 border-t border-[rgb(var(--color-border))] px-4 py-3">
                    <div className="flex items-center gap-2 rounded-xl border border-[rgb(var(--color-primary)/0.3)] bg-[rgb(var(--color-primary)/0.06)] px-3 py-2.5 text-xs text-[rgb(var(--color-foreground))]">
                      <LifeBuoy className="h-4 w-4 shrink-0 text-[rgb(var(--color-primary))]" />
                      <span className="flex-1">
                        A human support agent is handling this conversation.
                        {activeTicket ? ` Track it under ticket ${activeTicket.ticketNumber}.` : ""}
                      </span>
                    </div>
                    {activeTicket ? (
                      <Button variant="outline" size="sm" className="mt-2 w-full" onClick={openExistingTicket}>
                        <Ticket className="h-3.5 w-3.5" />
                        Open support ticket
                      </Button>
                    ) : null}
                  </div>
                ) : createdTicket ? (
                  <div className="shrink-0 border-t border-[rgb(var(--color-border))] px-4 py-3">
                    <div className="flex items-center gap-2.5 rounded-xl border border-[rgb(var(--color-success)/0.35)] bg-[rgb(var(--color-success)/0.08)] px-3 py-3">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[rgb(var(--color-success))]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
                          Ticket {createdTicket.ticketNumber} created
                        </p>
                        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                          Our team will reply here on your ticket.
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={openTicket}>
                        View Ticket
                      </Button>
                      <Button size="sm" onClick={() => setCreatedTicket(null)}>
                        Continue Chat
                      </Button>
                    </div>
                  </div>
                ) : pendingEscalation ? (
                  <div className="shrink-0 border-t border-[rgb(var(--color-border))] px-4 py-3">
                    <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] px-3.5 py-3">
                      <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                        I couldn&apos;t fully resolve this.
                      </p>
                      <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                        Create a support ticket and a human agent will take it from here.
                      </p>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <Button size="sm" onClick={openTicketDraft}>
                          <Ticket className="h-3.5 w-3.5" />
                          Create Support Ticket
                        </Button>
                        <Button variant="outline" size="sm" onClick={continueChatting}>
                          Continue Chatting
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Ticket draft form */}
                {ticketDraft.open ? (
                  <div className="shrink-0 space-y-2.5 border-t border-[rgb(var(--color-border))] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">Create support ticket</p>
                      <button
                        onClick={() => setTicketDraft((d) => ({ ...d, open: false }))}
                        className="text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
                        aria-label="Close ticket form"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      className="w-full rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] px-3 py-2 text-sm text-[rgb(var(--color-foreground))] outline-none focus:border-[rgb(var(--color-primary))]"
                      placeholder="Subject"
                      value={ticketDraft.subject}
                      maxLength={120}
                      onChange={(e) => setTicketDraft((d) => ({ ...d, subject: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={ticketDraft.category} onValueChange={(v) => setTicketDraft((d) => ({ ...d, category: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORT_CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={ticketDraft.priority} onValueChange={(v) => setTicketDraft((d) => ({ ...d, priority: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORT_PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {SUPPORT_PRIORITY_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="Describe the issue in detail..."
                      value={ticketDraft.description}
                      onChange={(e) => setTicketDraft((d) => ({ ...d, description: e.target.value }))}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setTicketDraft((d) => ({ ...d, open: false }))}>
                        Cancel
                      </Button>
                      <Button size="sm" loading={submitting} onClick={() => void submitTicket()}>
                        {submitting ? "Creating…" : "Submit Ticket"}
                      </Button>
                    </div>
                  </div>
                ) : null}

                {/* Composer */}
                <div className="shrink-0 border-t border-[rgb(var(--color-border))] px-3 py-3" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
                  {composerDisabled ? (
                    <div className="flex items-center gap-2 rounded-xl bg-[rgb(var(--color-muted))] px-3 py-2.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {loading ? "Ask Doloyal is replying…" : "This conversation is handled by a human agent."}
                    </div>
                  ) : (
                    <div className="flex items-end gap-2">
                      <Textarea
                        ref={composerRef}
                        rows={1}
                        placeholder="Type your question…"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            void sendMessage(input);
                          }
                        }}
                        className="max-h-28 min-h-[2.5rem] flex-1 resize-none"
                      />
                      <Button
                        size="icon"
                        onClick={() => void sendMessage(input)}
                        disabled={!input.trim() || loading}
                        aria-label="Send message"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}