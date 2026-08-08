"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
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
  Volume2,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  FileText,
  AlertCircle,
  Pin,
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
  cn,
} from "@doloyal/ui";

import { api } from "@/lib/api";

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



const ACCEPTED =
  ".png,.jpg,.jpeg,.webp,.pdf,.csv,.xls,.xlsx,image/png,image/jpeg,image/webp,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatTime(d: Date) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export default function AssistantPage() {
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

  const [clearOpen, setClearOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);

  const abortRef = React.useRef<{ abort: () => void } | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const imageRef = React.useRef<HTMLInputElement>(null);
  const recognitionRef = React.useRef<any>(null);
  const [isListening, setIsListening] = React.useState(false);

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

  const hasChat = messages.length > 0;

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking, generating]);

  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 10 * 24);
    el.style.height = `${Math.max(next, 28)}px`;
  }, [input]);

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

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && !attachments.length) || generating) return;

    setErrorBanner(null);
    const pendingAttachments = attachments;
    setAttachments([]);
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed || "Please analyze the attached file(s).",
      createdAt: new Date(),
      attachments: pendingAttachments,
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

    setGenerating(true);
    setThinking(true);

    const payloadAttachments = pendingAttachments.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      textExtract: a.textExtract,
      previewUrl: a.previewUrl?.startsWith("data:image") ? a.previewUrl : undefined,
    }));

    try {
      abortRef.current = await api.streamAssistantChat(
        {
          message: userMsg.content,
          conversationId,
          attachments: payloadAttachments,
        },
        {
          onStatus: () => setThinking(true),
          onToken: (token) => {
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token, streaming: true } : m,
              ),
            );
          },
          onMeta: (meta) => {
            if (meta.conversationId) setConversationId(String(meta.conversationId));
            if (meta.title) setConversationTitle(String(meta.title));
            if (meta.messageId) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, id: String(meta.messageId) } : m,
                ),
              );
            }
          },
          onDone: (result) => {
            if (result.conversationId) setConversationId(String(result.conversationId));
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId || m.streaming
                  ? {
                      ...m,
                      id: String(result.messageId || m.id),
                      content: String(result.message || m.content),
                      streaming: false,
                    }
                  : m,
              ),
            );
          },
          onError: (message) => {
            setErrorBanner(message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: "Unable to generate a response. Please try again.",
                      streaming: false,
                      error: true,
                    }
                  : m,
              ),
            );
          },
        },
      );
    } catch {
      setErrorBanner("Unable to reach Doloyal AI. Please try again.");
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: "Unable to generate a response. Please try again.",
                streaming: false,
                error: true,
              }
            : m,
        ),
      );
    } finally {
      setGenerating(false);
      setThinking(false);
      abortRef.current = null;
    }
  };

  const regenerateMessage = async (messageId: string) => {
    if (!conversationId || generating) return;
    setGenerating(true);
    setThinking(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, content: "", streaming: true, error: false } : m,
      ),
    );

    try {
      abortRef.current = await api.streamAssistantChat(
        { conversationId, messageId } as any,
        {
          onStatus: () => setThinking(true),
          onToken: (token) => {
            setThinking(false);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId ? { ...m, content: m.content + token, streaming: true } : m,
              ),
            );
          },
          onMeta: (meta) => {
            if (meta.messageId) {
              setMessages((prev) =>
                prev.map((m) => (m.id === messageId ? { ...m, id: String(meta.messageId) } : m)),
              );
            }
          },
          onDone: (result) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId || m.streaming
                  ? {
                      ...m,
                      id: String(result.messageId || m.id),
                      content: String(result.message || m.content),
                      streaming: false,
                    }
                  : m,
              ),
            );
          },
          onError: (message) => {
            setErrorBanner(message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content: "Unable to regenerate. Please try again.",
                      streaming: false,
                      error: true,
                    }
                  : m,
              ),
            );
          },
        },
        "/assistant/regenerate",
      );
    } finally {
      setGenerating(false);
      setThinking(false);
      abortRef.current = null;
    }
  };

  const newChat = () => {
    stopGenerating();
    setMessages([]);
    setConversationId(undefined);
    setConversationTitle("New chat");
    setPinned(false);
    setAttachments([]);
    setInput("");
    setErrorBanner(null);
  };

  const copyMessage = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("Copied");
  };



  const runSearch = async () => {
    if (!conversationId || !searchQ.trim()) return;
    try {
      const hits = await api.searchAiConversation(conversationId, searchQ.trim());
      setSearchHits(hits);
    } catch {
      toast.error("Unable to search conversation.");
    }
  };

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
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message Doloyal AI..."
          rows={1}
          className="max-h-[240px] min-h-[28px] flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-[#111827] outline-none placeholder:text-[#9CA3AF]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
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
        ref={fileRef}
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
        ref={imageRef}
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
    <div className="-m-4 flex h-[calc(100vh-3.5rem)] flex-col bg-white lg:-m-8">
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
                onClick={() => {
                  setRenameValue(conversationTitle);
                  setRenameOpen(true);
                }}
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
                  className="h-8 w-8 p-0"
                  title={pinned ? "Unpin" : "Pin"}
                  onClick={async () => {
                    try {
                      await api.pinAiConversation(conversationId, !pinned);
                      setPinned(!pinned);
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
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
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
        <div className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 sm:mx-6">
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
      {!hasChat ? (
        <div className="flex flex-1 flex-col items-center justify-end px-4 pb-6">
          <div className="mx-auto w-full max-w-3xl">{Composer}</div>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[#9CA3AF]">
            Doloyal AI can make mistakes. Verify important business decisions.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-3xl space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
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
                        )}
                      >
                        {msg.role === "assistant" ? (
                          msg.content ? (
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
                        <span className="text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
                        {msg.role === "assistant" && !msg.streaming && msg.content ? (
                          <div className="flex items-center gap-0.5">
                            <IconBtn label="Copy" onClick={() => void copyMessage(msg.content)}>
                              <Copy className="h-3.5 w-3.5" />
                            </IconBtn>
                            <IconBtn label="Regenerate" onClick={() => void regenerateMessage(msg.id)}>
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
                            <IconBtn label="Read aloud (coming soon)" disabled>
                              <Volume2 className="h-3.5 w-3.5" />
                            </IconBtn>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 bg-white px-4 py-3 sm:px-6">
            <div className="mx-auto max-w-3xl">{Composer}</div>
            <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[#9CA3AF]">
              Doloyal AI can make mistakes. Verify important business decisions.
            </p>
          </div>
        </>
      )}

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



      {/* Clear */}
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>This will remove the current chat from your history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (conversationId) await api.deleteAiConversation(conversationId);
                  newChat();
                  setClearOpen(false);
                  toast.success("Conversation deleted");
                } catch {
                  toast.error("Unable to delete conversation.");
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!conversationId || !renameValue.trim()) return;
                try {
                  await api.renameAiConversation(conversationId, renameValue.trim());
                  setConversationTitle(renameValue.trim());
                  setRenameOpen(false);
                } catch {
                  toast.error("Unable to rename.");
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
