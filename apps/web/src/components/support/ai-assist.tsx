"use client";

import * as React from "react";
import { Sparkles, Loader2, RefreshCw, Check, FileText } from "lucide-react";
import { Button, Badge } from "@doloyal/ui";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AiAssistProps {
  ticketId: string;
  onInsert: (draft: string) => void;
}

export function AiAssist({ ticketId, onInsert }: AiAssistProps) {
  const [loading, setLoading] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const [articles, setArticles] = React.useState<{ id: string; slug: string; title: string; category: string }[]>([]);
  const [provider, setProvider] = React.useState("");
  const [inserted, setInserted] = React.useState(false);

  const generate = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminAiAssistTicket(ticketId);
      setDraft(res.draft);
      setArticles(res.articles || []);
      setProvider(res.provider);
      setInserted(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate a draft.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const useDraft = () => {
    if (!draft) return;
    onInsert(draft);
    setInserted(true);
  };

  if (!draft && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={() => void generate()}>
        <Sparkles className="h-3.5 w-3.5" />
        AI Assist
      </Button>
    );
  }

  return (
    <div className="mb-2 rounded-xl border border-[rgb(var(--color-primary)/0.3)] bg-[rgb(var(--color-primary)/0.05)] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[rgb(var(--color-foreground))]">
          <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--color-primary))]" />
          AI draft
          {provider ? <Badge variant="outline">{provider}</Badge> : null}
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon-sm" onClick={() => void generate()} disabled={loading} aria-label="Regenerate draft">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
          <button
            onClick={() => {
              setDraft(null);
              setArticles([]);
            }}
            className="rounded-md p-1 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
            aria-label="Dismiss draft"
          >
            <span className="text-base leading-none">×</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-xs text-[rgb(var(--color-muted-foreground))]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Drafting a reply from the knowledge base…
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap rounded-lg bg-[rgb(var(--color-surface))] px-3 py-2.5 text-xs leading-relaxed text-[rgb(var(--color-foreground))]">
            {draft}
          </p>

          {articles.length > 0 ? (
            <div className="mt-2 space-y-1">
              <p className="text-[0.62rem] font-medium uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                Referenced from the help center
              </p>
              {articles.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{a.title}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-2 flex justify-end">
            <Button size="sm" onClick={useDraft} disabled={inserted}>
              {inserted ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Inserted
                </>
              ) : (
                "Use draft"
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}