"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Square,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  FileText,
  AlertCircle,
  Pin,
  MessagesSquare,
  MoreVertical,
} from "lucide-react";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Skeleton,
  Spinner,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  cn,
} from "@doloyal/ui";

import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type AttachmentDraft = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textExtract?: string;
  previewUrl?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  attachments?: AttachmentDraft[];
  streaming?: boolean;
  error?: boolean;
};

type ConversationSummary = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: number;
  lastMessage?: string;
};

const ACCEPTED =
  ".png,.jpg,.jpeg,.webp,.pdf,.csv,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function cleanDisplayName(raw?: string | null) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (/^(undefined|null|\[object object\])$/i.test(value)) return "";
  return value.split(/\s+/)[0];
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function summarizeRow(row: {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  messages?: Array<{ content: string }>;
}): ConversationSummary {
  const preview = row.messages?.[0]?.content;
  return {
    id: row.id,
    title: row.title?.trim() || "New chat",
    pinned: Boolean(row.pinned),
    updatedAt: new Date(row.updatedAt).getTime() || Date.now(),
    lastMessage: preview ? preview.replace(/\s+/g, " ").trim().slice(0, 140) : undefined,
  };
}

function sortSummaries(a: ConversationSummary, b: ConversationSummary) {
  return Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt;
}

async function fileToDraft(file: File): Promise<AttachmentDraft> {
  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const draft: AttachmentDraft = {
    id,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };

  if (file.type.startsWith("image/")) {
    draft.previewUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  } else if (
    file.type.includes("csv") ||
    file.type.includes("text") ||
    /\.(csv|txt|json)$/i.test(file.name)
  ) {
    const text = await file.text();
    draft.textExtract = text.slice(0, 18000);
  } else if (/\.xlsx?$/i.test(file.name)) {
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      draft.textExtract = XLSX.utils.sheet_to_csv(sheet).slice(0, 18000);
    } catch {
      draft.textExtract = `[Spreadsheet: ${file.name}]`;
    }
  } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    draft.textExtract = `[PDF uploaded: ${file.name}. Please analyze this business document.]`;
  }

  return draft;
}

function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-[#111827] prose-p:text-[#111827] prose-p:leading-relaxed prose-strong:text-[#111827] prose-li:text-[#111827] prose-a:text-[#6366F1] prose-table:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isBlock = Boolean(className);
            const text = String(children).replace(/\n$/, "");
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8em] text-[#111827]"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            const lang = /language-(\w+)/.exec(className || "")?.[1] || "code";
            return (
              <div className="group relative my-3 overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#0f172a]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {lang}
                  </span>
                  <button
                    type="button"
                    className="text-[10px] font-medium text-slate-400 hover:text-white"
                    onClick={async () => {
                      await navigator.clipboard.writeText(text);
                      toast.success("Code copied");
                    }}
                  >
                    Copy
                  </button>
                </div>
                <pre className="overflow-x-auto p-3 text-[12px] leading-relaxed text-slate-100">
                  <code>{text}</code>
                </pre>
              </div>
            );
          },
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-[#E5E7EB]">
                <table className="w-full border-collapse text-left text-sm">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th className="border-b border-[#E5E7EB] bg-slate-50 px-3 py-2 text-xs font-semibold text-[#111827]">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="border-b border-[#E5E7EB] px-3 py-2 text-xs text-[#374151]">{children}</td>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function AssistantInner() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const rm = Boolean(reduceMotion);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<AttachmentDraft[]>([]);
  const [conversationId, setConversationId] = React.useState<string | undefined>();
  const [conversationTitle, setConversationTitle] = React.useState("New chat");
  const [generating, setGenerating] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [errorBanner, setErrorBanner] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQ, setSearchQ] = React.useState("");
  const [searchHits, setSearchHits] = React.useState<Array<{ id: string; content: string; role: string }>>([]);

  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; title: string } | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);

  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [conversations, setConversations] = React.useState<ConversationSummary[] | null>(null);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState("");
  const [restoring, setRestoring] = React.useState(false);

  const abortRef = React.useRef<{ abort: () => void } | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const composerFocusedRef = React.useRef(false);
  const convIdRef = React.useRef<string | undefined>(undefined);
  const convTitleRef = React.useRef("New chat");
  const hydratedRef = React.useRef(false);
  const historyLoadedRef = React.useRef(false);

  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);
  const imageRef = React.useRef<HTMLInputElement | null>(null);

  const attachTextarea = React.useCallback((el: HTMLTextAreaElement | null) => {
    if (el) textareaRef.current = el;
  }, []);
  const attachFileInput = React.useCallback((el: HTMLInputElement | null) => {
    if (el) fileRef.current = el;
  }, []);
  const attachImageInput = React.useCallback((el: HTMLInputElement | null) => {
    if (el) imageRef.current = el;
  }, []);
  const recognitionRef = React.useRef<any>(null);
  const [isListening, setIsListening] = React.useState(false);

  const hasChat = messages.length > 0;
  const firstName = cleanDisplayName(user?.firstName);
  const greeting = firstName ? `How can I help, ${firstName}?` : "How can I help?";

  const applyActiveMeta = React.useCallback(
    (meta: { conversationId?: string; title?: string; pinned?: boolean }) => {
      if (meta.conversationId !== undefined) {
        convIdRef.current = meta.conversationId;
        setConversationId(meta.conversationId);
      }
      if (meta.title !== undefined) {
        convTitleRef.current = meta.title;
        setConversationTitle(meta.title);
      }
      if (meta.pinned !== undefined) setPinned(meta.pinned);
    },
    [],
  );

  const syncUrlChat = React.useCallback(
    (chatId?: string) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (chatId) params.set("chat", chatId);
      else params.delete("chat");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in your browser.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening... Speak into your microphone");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error !== "no-speech") {
          toast.error(`Voice input error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error(err);
      toast.error("Could not start microphone.");
      setIsListening(false);
    }
  };

  React.useEffect(() => {
    if (!atBottomRef.current) return;
    const el = scrollAreaRef.current;
    if (!el) return;
    const far = el.scrollHeight - el.scrollTop - el.clientHeight > 900;
    bottomRef.current?.scrollIntoView({ behavior: far || rm ? "auto" : "smooth", block: "end" });
  }, [messages, thinking, generating, rm]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 10 * 24);
    el.style.height = `${Math.max(next, 28)}px`;
  }, [input]);

  React.useEffect(() => {
    if (!historyOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyOpen]);

  const loadHistory = React.useCallback(async (force = false) => {
    if (historyLoadedRef.current && !force) return;
    setHistoryLoading(true);
    try {
      const rows = await api.listAiConversations();
      historyLoadedRef.current = true;
      setConversations(rows.map(summarizeRow).sort(sortSummaries));
    } catch {
      if (!historyLoadedRef.current) setConversations([]);
      toast.error("Unable to load chat history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (historyOpen) void loadHistory();
  }, [historyOpen, loadHistory]);

  const upsertHistoryEntry = React.useCallback((entry: ConversationSummary) => {
    setConversations((prev) => {
      const base = (prev ?? []).filter((c) => c.id !== entry.id);
      return [entry, ...base].sort(sortSummaries);
    });
  }, []);

  const removeHistoryEntry = React.useCallback((id: string) => {
    setConversations((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }, []);

  const patchHistoryAfterExchange = React.useCallback(
    (result: Record<string, unknown>) => {
      const cid = result.conversationId ? String(result.conversationId) : convIdRef.current;
      if (!cid) return;
      const preview = result.message
        ? String(result.message).replace(/\s+/g, " ").trim().slice(0, 140)
        : undefined;
      setConversations((prev) => {
        const existing = prev?.find((c) => c.id === cid);
        return [
          {
            id: cid,
            title: convTitleRef.current || "New chat",
            pinned: existing?.pinned ?? false,
            updatedAt: Date.now(),
            lastMessage: preview ?? existing?.lastMessage,
          },
          ...(prev ?? []).filter((c) => c.id !== cid),
        ].sort(sortSummaries);
      });
    },
    [],
  );

  const stopGenerating = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setGenerating(false);
    setThinking(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
    );
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).slice(0, 5 - attachments.length);
    if (!list.length) return;
    try {
      const drafts = await Promise.all(list.map(fileToDraft));
      setAttachments((prev) => [...prev, ...drafts].slice(0, 5));
    } catch {
      toast.error("Unable to attach file. Please try again.");
    }
  };

  const markAssistantFailed = (assistantId: string) => {
    setErrorBanner("Unable to reach Doloyal AI. Please try again.");
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId
          ? {
              ...m,
              content: "",
              streaming: false,
              error: true,
            }
          : m,
      ),
    );
  };

  const streamReply = async (content: string, atts: AttachmentDraft[], assistantId: string) => {
    setGenerating(true);
    setThinking(true);

    const payloadAttachments = atts.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      textExtract: a.textExtract,
      previewUrl: a.previewUrl?.startsWith("data:image") ? a.previewUrl : undefined,
    }));

    try {
      let liveAssistantId = assistantId;
      abortRef.current = await api.streamAssistantChat(
        {
          message: content,
          conversationId: convIdRef.current,
          attachments: payloadAttachments,
        },
        {
          onStatus: () => setThinking(true),
          onToken: (token) => {
            setThinking(false);
            const targetId = liveAssistantId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, content: m.content + token, streaming: true } : m,
              ),
            );
          },
          onMeta: (meta) => {
            if (meta.conversationId && meta.conversationId !== convIdRef.current) {
              applyActiveMeta({ conversationId: String(meta.conversationId) });
              syncUrlChat(String(meta.conversationId));
            }
            if (meta.title) applyActiveMeta({ title: String(meta.title) });
            if (meta.messageId) {
              const realId = String(meta.messageId);
              setMessages((prev) =>
                prev.map((m) => (m.id === liveAssistantId ? { ...m, id: realId } : m)),
              );
              liveAssistantId = realId;
            }
          },
          onDone: (result) => {
            if (result.conversationId && result.conversationId !== convIdRef.current) {
              applyActiveMeta({ conversationId: String(result.conversationId) });
              syncUrlChat(String(result.conversationId));
            }
            const finalContent = String(result.message || "");
            const targetId = liveAssistantId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId
                  ? { ...m, content: m.content || finalContent, streaming: false }
                  : m,
              ),
            );
            patchHistoryAfterExchange(result);
            if (composerFocusedRef.current) {
              setTimeout(() => textareaRef.current?.focus(), 30);
            }
          },
          onError: () => {
            markAssistantFailed(liveAssistantId);
          },
        },
      );
    } catch {
      markAssistantFailed(assistantId);
    } finally {
      setGenerating(false);
      setThinking(false);
      abortRef.current = null;
    }
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !attachments.length) || generating) return;

    setErrorBanner(null);
    const pendingAttachments = attachments;
    setInput("");
    setAttachments([]);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed || "Please analyze the attached file(s).",
      createdAt: new Date(),
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
    };

    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date(),
        streaming: true,
      },
    ]);

    atBottomRef.current = true;
    setTimeout(() => textareaRef.current?.focus(), 90);
    await streamReply(userMsg.content, pendingAttachments, assistantId);
  };

  const retryLastFailed = async () => {
    if (generating) return;
    let errIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i].error) {
        errIdx = i;
        break;
      }
    }
    if (errIdx <= 0) return;
    const target = messages[errIdx];
    const priorUser = messages[errIdx - 1];
    if (priorUser.role !== "user") return;

    setErrorBanner(null);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === target.id ? { ...m, content: "", streaming: true, error: false } : m,
      ),
    );
    atBottomRef.current = true;
    await streamReply(priorUser.content, priorUser.attachments || [], target.id);
  };

  const regenerateMessage = async (messageId: string) => {
    if (!convIdRef.current || generating) return;
    setGenerating(true);
    setThinking(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "", streaming: true, error: false } : m,
      ),
    );

    try {
      let liveId = messageId;
      abortRef.current = await api.streamAssistantChat(
        { conversationId: convIdRef.current, messageId } as any,
        {
          onStatus: () => setThinking(true),
          onToken: (token) => {
            setThinking(false);
            const targetId = liveId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, content: m.content + token, streaming: true } : m,
              ),
            );
          },
          onMeta: (meta) => {
            if (meta.messageId) {
              const realId = String(meta.messageId);
              setMessages((prev) =>
                prev.map((m) => (m.id === liveId ? { ...m, id: realId } : m)),
              );
              liveId = realId;
            }
          },
          onDone: (result) => {
            const targetId = liveId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId
                  ? { ...m, content: m.content || String(result.message || ""), streaming: false }
                  : m,
              ),
            );
            patchHistoryAfterExchange(result);
            if (composerFocusedRef.current) {
              setTimeout(() => textareaRef.current?.focus(), 30);
            }
          },
          onError: () => {
            setErrorBanner("Unable to reach Doloyal AI. Please try again.");
            const targetId = liveId;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === targetId ? { ...m, content: "", streaming: false, error: true } : m,
              ),
            );
          },
        },
        "/assistant/regenerate",
      );
    } catch {
      setErrorBanner("Unable to reach Doloyal AI. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, content: "", streaming: false, error: true } : m,
        ),
      );
    } finally {
      setGenerating(false);
      setThinking(false);
      abortRef.current = null;
    }
  };

  const resetToNewChat = React.useCallback(() => {
    stopGenerating();
    setMessages([]);
    applyActiveMeta({ conversationId: undefined, title: "New chat", pinned: false });
    setAttachments([]);
    setInput("");
    setErrorBanner(null);
    setSearchHits([]);
    atBottomRef.current = true;
    syncUrlChat(undefined);
  }, [applyActiveMeta, syncUrlChat]);

  const newChat = () => {
    setHistoryOpen(false);
    resetToNewChat();
    setTimeout(() => textareaRef.current?.focus(), 80);
  };

  const openConversation = React.useCallback(
    async (id: string, fromUrl = false) => {
      if (id === convIdRef.current && messages.length > 0) {
        setHistoryOpen(false);
        return;
      }
      if (generating || thinking) stopGenerating();
      setHistoryOpen(false);
      setRestoring(true);
      setErrorBanner(null);
      try {
        const conv = await api.getAiConversation(id);
        const restored: ChatMessage[] = (conv.messages || [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            content: m.content,
            createdAt: new Date(m.createdAt),
            streaming: false,
            attachments: (m.attachments || []).map((a) => ({
              id: a.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              sizeBytes: 0,
              previewUrl: a.previewUrl || undefined,
            })),
          }));
        applyActiveMeta({
          conversationId: conv.id,
          title: conv.title?.trim() || "New chat",
          pinned: Boolean(conv.pinned),
        });
        setMessages(restored);
        atBottomRef.current = true;
        syncUrlChat(conv.id);
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ block: "end" });
          if (!fromUrl) setTimeout(() => textareaRef.current?.focus(), 80);
        });
      } catch {
        toast.error("Unable to open that conversation.");
        if (fromUrl) syncUrlChat(undefined);
      } finally {
        setRestoring(false);
      }
    },
    [applyActiveMeta, generating, messages.length, syncUrlChat, thinking],
  );

  React.useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const chatId = searchParams?.get("chat");
    if (chatId) void openConversation(chatId, true);
  }, [openConversation, searchParams]);

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied");
  };

  const runSearch = async () => {
    if (!convIdRef.current || !searchQ.trim()) return;
    try {
      const hits = await api.searchAiConversation(convIdRef.current, searchQ.trim());
      setSearchHits(hits);
    } catch {
      toast.error("Unable to search conversation.");
    }
  };

  const openRenameDialog = (target: { id: string; title: string }) => {
    setRenameTarget(target);
    setRenameValue(target.title);
    setRenameOpen(true);
  };

  const saveRename = async () => {
    const target = renameTarget;
    const next = renameValue.trim();
    if (!target || !next) return;
    try {
      await api.renameAiConversation(target.id, next);
      if (target.id === convIdRef.current) applyActiveMeta({ title: next });
      setConversations((prev) =>
        prev ? prev.map((c) => (c.id === target.id ? { ...c, title: next } : c)) : prev,
      );
      setRenameOpen(false);
      setRenameTarget(null);
      toast.success("Chat renamed");
    } catch {
      toast.error("Unable to rename.");
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    if (!target.id) {
      resetToNewChat();
      setDeleteTarget(null);
      return;
    }
    try {
      await api.deleteAiConversation(target.id);
      removeHistoryEntry(target.id);
      historyLoadedRef.current = true;
      if (target.id === convIdRef.current) resetToNewChat();
      setDeleteTarget(null);
      toast.success("Conversation deleted");
    } catch {
      toast.error("Unable to delete conversation.");
    }
  };

  const groupedConversations = React.useMemo(() => {
    if (!conversations) return [] as Array<{ label: string; items: ConversationSummary[] }>;
    const q = historySearch.trim().toLowerCase();
    const filtered = q
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            (c.lastMessage || "").toLowerCase().includes(q),
        )
      : conversations;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayTs = startOfToday.getTime();
    const yesterdayTs = todayTs - 86_400_000;
    const weekTs = todayTs - 7 * 86_400_000;

    const groups: Array<{ label: string; items: ConversationSummary[] }> = [];
    const push = (label: string, item: ConversationSummary) => {
      let group = groups.find((g) => g.label === label);
      if (!group) {
        group = { label, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    };

    for (const c of filtered) {
      if (c.pinned) push("Pinned", c);
      else if (c.updatedAt >= todayTs) push("Today", c);
      else if (c.updatedAt >= yesterdayTs) push("Yesterday", c);
      else if (c.updatedAt >= weekTs) push("Previous 7 days", c);
      else push("Older", c);
    }
    return groups;
  }, [conversations, historySearch]);

  const Composer = (
    <div
      className={cn(
        "relative w-full rounded-[22px] border bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition",
        dragOver ? "border-[#6366F1] ring-2 ring-[#6366F1]/20" : "border-[#E5E7EB]",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
      }}
    >
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-[#E5E7EB] px-3 pt-3">
          {attachments.map((a) => (
            <div
              key={a.id}
              className="group relative flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-slate-50 px-2 py-1.5"
            >
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <FileText className="h-4 w-4 text-slate-500" />
                </div>
              )}
              <div className="max-w-[140px]">
                <p className="truncate text-[11px] font-medium text-[#111827]">{a.fileName}</p>
                <p className="text-[10px] text-[#6B7280]">{Math.round(a.sizeBytes / 1024)} KB</p>
              </div>
              <button
                type="button"
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 px-3 py-3">
        <div className="flex items-center gap-1 pb-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach file"
            title="Attach file"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
            onClick={() => imageRef.current?.click()}
            aria-label="Upload image"
            title="Upload image"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl transition",
              isListening
                ? "bg-red-100 text-red-600 animate-pulse"
                : "text-[#6B7280] hover:bg-slate-100 hover:text-[#111827]"
            )}
            onClick={toggleVoiceInput}
            aria-label={isListening ? "Stop voice input" : "Start voice input"}
            title={isListening ? "Listening... Click to stop" : "Voice input"}
          >
            {isListening ? (
              <MicOff className="h-4 w-4 text-red-600" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        </div>

        <textarea
          ref={attachTextarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => {
            composerFocusedRef.current = true;
          }}
          onBlur={() => {
            composerFocusedRef.current = false;
          }}
          placeholder="Message Doloyal AI..."
          rows={1}
          className="max-h-[240px] min-h-[28px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[#111827] outline-none placeholder:text-[#9CA3AF]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void sendMessage(input);
            }
          }}
          aria-label="Message Doloyal AI"
        />

        {generating ? (
          <button
            type="button"
            onClick={stopGenerating}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#111827] text-white transition hover:bg-black"
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            disabled={!input.trim() && !attachments.length}
            onClick={() => void sendMessage(input)}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1] text-white transition hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>

      <input
        ref={attachFileInput}
        type="file"
        className="hidden"
        accept={ACCEPTED}
        multiple
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={attachImageInput}
        type="file"
        className="hidden"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        multiple
        onChange={(e) => {
          if (e.target.files) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );

  return (
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden bg-white lg:-m-8">
      {/* Compact header */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold tracking-tight text-[#111827]">
              Doloyal AI
            </h1>
            {hasChat && conversationTitle !== "New chat" ? (
              <button
                type="button"
                className="hidden truncate text-xs text-[#6B7280] hover:text-[#6366F1] sm:inline"
                onClick={() =>
                  conversationId &&
                  openRenameDialog({ id: conversationId, title: conversationTitle })
                }
              >
                · {conversationTitle}
              </button>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {hasChat ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="hidden h-8 gap-1.5 sm:inline-flex"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
                Search
              </Button>

              {conversationId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="hidden h-8 w-8 p-0 sm:inline-flex"
                  title={pinned ? "Unpin" : "Pin"}
                  onClick={async () => {
                    try {
                      await api.pinAiConversation(conversationId, !pinned);
                      setPinned(!pinned);
                      setConversations((prev) =>
                        prev
                          ? prev
                              .map((c) =>
                                c.id === conversationId ? { ...c, pinned: !pinned } : c,
                              )
                              .sort(sortSummaries)
                          : prev,
                      );
                      toast.success(pinned ? "Unpinned" : "Pinned");
                    } catch {
                      toast.error("Unable to update pin.");
                    }
                  }}
                >
                  <Pin className={cn("h-3.5 w-3.5", pinned && "fill-[#6366F1] text-[#6366F1]")} />
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                title="Clear chat"
                onClick={() => {
                  if (conversationId) {
                    setDeleteTarget({ id: conversationId, title: conversationTitle });
                  } else {
                    setDeleteTarget({ id: "", title: conversationTitle });
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 p-0"
                aria-label="Chat history"
                onClick={() => {
                  setHistoryOpen(true);
                  void loadHistory();
                }}
              >
                <MessagesSquare className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Chat history</TooltipContent>
          </Tooltip>

          <Button
            size="sm"
            variant="secondary"
            className="h-8 gap-1.5 border-[#6366F1]/30 text-[#6366F1] hover:bg-[#6366F1]/5"
            onClick={newChat}
          >
            <Plus className="h-3.5 w-3.5" />
            New Chat
          </Button>
        </div>
      </div>

      {errorBanner ? (
        <div className="mx-4 mt-3 flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 sm:mx-6">
          <div className="flex items-center gap-2 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorBanner}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setErrorBanner(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <AnimatePresence>
          {!hasChat ? (
            <motion.div
              key="empty-state"
              className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto bg-white px-4 py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: rm ? 0 : 0.16, ease: "easeIn" } }}
              transition={{ duration: rm ? 0 : 0.22 }}
            >
              <div className="mx-auto w-full max-w-3xl">
                <motion.div
                  className="text-center"
                  initial={rm ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: rm ? 0 : -14 }}
                  transition={{ duration: rm ? 0 : 0.24, ease: "easeOut" }}
                >
                  <h2 className="text-[26px] font-semibold tracking-tight text-[#111827]">
                    {greeting}
                  </h2>
                  <p className="mt-2 text-sm text-[#6B7280]">
                    Ask me anything about your business, customers, growth, or Doloyal.
                  </p>
                </motion.div>
                <motion.div
                  className="mt-8"
                  initial={rm ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: rm ? 0 : 110 }}
                  transition={{
                    duration: rm ? 0 : 0.22,
                    ease: rm ? "linear" : "easeOut",
                    delay: rm ? 0 : 0.04,
                  }}
                >
                  {Composer}
                </motion.div>
                <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[#9CA3AF]">
                  Doloyal AI can make mistakes. Verify important business decisions.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              className="flex min-h-0 flex-1 flex-col"
              initial={rm ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: rm ? 0 : 0.2, ease: "easeOut" }}
            >
              <div
                ref={scrollAreaRef}
                onScroll={() => {
                  const el = scrollAreaRef.current;
                  if (!el) return;
                  atBottomRef.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 140;
                }}
                className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
              >
                <div className="mx-auto max-w-3xl space-y-6">
                  {restoring && !messages.length ? (
                    <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#6B7280]">
                      <Spinner className="h-4 w-4" />
                      Loading conversation…
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {messages.map((msg) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: rm ? 0 : 0.18 }}
                          className={cn(
                            "flex",
                            msg.role === "user" ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[92%] sm:max-w-[85%]",
                              msg.role === "user" ? "items-end" : "items-start",
                              "flex flex-col",
                            )}
                          >
                            {msg.attachments?.length ? (
                              <div className="mb-2 flex flex-wrap gap-2">
                                {msg.attachments.map((a) =>
                                  a.previewUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={a.id}
                                      src={a.previewUrl}
                                      alt={a.fileName}
                                      className="h-20 w-20 rounded-xl border border-white/20 object-cover"
                                    />
                                  ) : (
                                    <div
                                      key={a.id}
                                      className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-2.5 py-1.5 text-[11px] text-[#6B7280]"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      {a.fileName}
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : null}

                            <div
                              className={cn(
                                "rounded-[20px] px-4 py-3 text-[14px] leading-relaxed",
                                msg.role === "user"
                                  ? "bg-[#6366F1] text-white"
                                  : "border border-[#E5E7EB] bg-white text-[#111827] shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                                msg.error && "border-rose-200",
                                msg.error && !msg.content && "px-4 py-2.5",
                              )}
                            >
                              {msg.role === "assistant" ? (
                                msg.error && !msg.content ? (
                                  <p className="text-[13px] text-rose-600">
                                    Unable to reach Doloyal AI. Please try again.
                                  </p>
                                ) : msg.content ? (
                                  <MarkdownBody content={msg.content} />
                                ) : thinking || msg.streaming ? (
                                  <div className="flex items-center gap-2 text-[#6B7280]">
                                    <span className="flex gap-1">
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366F1] [animation-delay:0ms]" />
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366F1] [animation-delay:150ms]" />
                                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6366F1] [animation-delay:300ms]" />
                                    </span>
                                    <span className="text-xs">Thinking…</span>
                                  </div>
                                ) : null
                              ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                              )}
                            </div>

                            <div className="mt-1.5 flex items-center gap-2 px-1">
                              <span className="text-[10px] text-[#9CA3AF]">
                                {formatTime(msg.createdAt)}
                              </span>
                              {msg.role === "assistant" && !msg.streaming && msg.error ? (
                                <button
                                  type="button"
                                  disabled={generating}
                                  onClick={() => void retryLastFailed()}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Retry
                                </button>
                              ) : null}
                              {msg.role === "assistant" && !msg.streaming && msg.content ? (
                                <div className="flex items-center gap-0.5">
                                  <IconBtn label="Copy" onClick={() => void copyMessage(msg.content)}>
                                    <Copy className="h-3.5 w-3.5" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Regenerate"
                                    onClick={() => void regenerateMessage(msg.id)}
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Like"
                                    onClick={async () => {
                                      try {
                                        await api.submitAiFeedback(msg.id, "like");
                                        toast.success("Thanks for the feedback");
                                      } catch {
                                        toast.error("Unable to save feedback");
                                      }
                                    }}
                                  >
                                    <ThumbsUp className="h-3.5 w-3.5" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Dislike"
                                    onClick={async () => {
                                      try {
                                        await api.submitAiFeedback(msg.id, "dislike");
                                        toast.success("Thanks for the feedback");
                                      } catch {
                                        toast.error("Unable to save feedback");
                                      }
                                    }}
                                  >
                                    <ThumbsDown className="h-3.5 w-3.5" />
                                  </IconBtn>
                                  <IconBtn
                                    label="Share"
                                    onClick={async () => {
                                      if (navigator.share) {
                                        await navigator.share({ text: msg.content });
                                      } else {
                                        await copyMessage(msg.content);
                                      }
                                    }}
                                  >
                                    <Share2 className="h-3.5 w-3.5" />
                                  </IconBtn>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="shrink-0 bg-white px-4 py-3 sm:px-6">
                <div className="mx-auto max-w-3xl">{Composer}</div>
                <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[#9CA3AF]">
                  Doloyal AI can make mistakes. Verify important business decisions.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat history drawer */}
        <AnimatePresence>
          {historyOpen ? (
            <>
              <motion.div
                key="history-backdrop"
                className="absolute inset-0 z-20 bg-slate-900/20 sm:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: rm ? 0 : 0.18 }}
                onClick={() => setHistoryOpen(false)}
              />
              <motion.aside
                key="history-panel"
                role="dialog"
                aria-label="Chat history"
                className="absolute inset-y-0 right-0 z-30 flex w-full flex-col border-l border-[#E5E7EB] bg-white shadow-[-12px_0_40px_rgba(15,23,42,0.08)] sm:w-[340px] lg:w-[360px]"
                initial={rm ? false : { x: 32, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: rm ? 0 : 24, opacity: 0 }}
                transition={{ duration: rm ? 0 : 0.2, ease: "easeOut" }}
              >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
                  <h2 className="text-sm font-semibold text-[#111827]">Chat history</h2>
                  <button
                    type="button"
                    className="rounded-lg p-1 text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
                    onClick={() => setHistoryOpen(false)}
                    aria-label="Close chat history"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="shrink-0 px-3 pb-2 pt-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
                    <Input
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search chats..."
                      className="h-9 pl-9 text-[13px]"
                      aria-label="Search chats"
                    />
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
                  {historyLoading ? (
                    <div className="space-y-5 px-2 pt-2">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="space-y-2">
                          <Skeleton className="h-3.5 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      ))}
                    </div>
                  ) : !conversations || conversations.length === 0 ? (
                    <div className="flex flex-col items-center px-6 pt-16 text-center">
                      <MessagesSquare className="h-6 w-6 text-[#C7CAD1]" />
                      <p className="mt-3 text-[13px] font-medium text-[#111827]">
                        No conversations yet
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">
                        Start a new conversation with Doloyal AI.
                      </p>
                    </div>
                  ) : groupedConversations.length === 0 ? (
                    <p className="px-3 pt-8 text-center text-[12px] text-[#6B7280]">
                      No chats match “{historySearch.trim()}”
                    </p>
                  ) : (
                    groupedConversations.map((group) => (
                      <div key={group.label} className="mt-3">
                        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
                          {group.label}
                        </p>
                        <div className="space-y-0.5">
                          {group.items.map((c) => {
                            const active = c.id === convIdRef.current;
                            return (
                              <div
                                key={c.id}
                                className={cn(
                                  "group relative flex items-start gap-1 rounded-xl pl-3 pr-1 py-2 transition-colors",
                                  active
                                    ? "bg-[#6366F1]/[0.07]"
                                    : "hover:bg-slate-50",
                                )}
                              >
                                {active ? (
                                  <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#6366F1]" />
                                ) : null}
                                <button
                                  type="button"
                                  className="min-w-0 flex-1 text-left"
                                  onClick={() => void openConversation(c.id)}
                                >
                                  <span className="flex items-center justify-between gap-2">
                                    <span
                                      className={cn(
                                        "truncate text-[13px] font-medium",
                                        active ? "text-[#4F46E5]" : "text-[#111827]",
                                      )}
                                    >
                                      {c.title}
                                    </span>
                                    <span className="shrink-0 text-[10px] tabular-nums text-[#9CA3AF]">
                                      {relativeTime(c.updatedAt)}
                                    </span>
                                  </span>
                                  <span className="mt-0.5 block truncate text-[11px] text-[#6B7280]">
                                    {c.lastMessage || "No messages yet"}
                                  </span>
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className="mt-0.5 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
                                      aria-label={`Actions for ${c.title}`}
                                    >
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onSelect={() => void openConversation(c.id)}
                                    >
                                      <MessagesSquare className="h-3.5 w-3.5" />
                                      Open
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={() => openRenameDialog({ id: c.id, title: c.title })}
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-rose-600 focus:bg-rose-50 focus:text-rose-600 [&_svg]:text-rose-500"
                                      onSelect={() =>
                                        setDeleteTarget({ id: c.id, title: c.title })
                                      }
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.aside>
            </>
          ) : null}
        </AnimatePresence>
      </div>

      {/* Search */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search conversation</DialogTitle>
            <DialogDescription>Find messages in this chat.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search…"
              onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            />
            <Button onClick={() => void runSearch()}>Search</Button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {searchHits.map((h) => (
              <div key={h.id} className="rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs">
                <p className="font-medium text-[#6B7280]">{h.role}</p>
                <p className="mt-0.5 text-[#111827]">{h.content}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this conversation?</DialogTitle>
            <DialogDescription>
              This conversation and its messages will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog
        open={renameOpen}
        onOpenChange={(open) => {
          setRenameOpen(open);
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveRename();
            }}
            autoFocus
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setRenameOpen(false);
                setRenameTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void saveRename()} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <React.Suspense fallback={null}>
      <AssistantInner />
    </React.Suspense>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg p-1 text-[#9CA3AF] transition hover:bg-slate-100 hover:text-[#111827] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
