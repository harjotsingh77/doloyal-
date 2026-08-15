"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, Clock, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, Skeleton } from "@doloyal/ui";
import { api } from "@/lib/api";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";

type Article = Awaited<ReturnType<typeof api.getHelpArticle>>;

export default function HelpArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [article, setArticle] = React.useState<Article | null>(null);
  const [related, setRelated] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [articleRes, relatedRes] = await Promise.all([
          api.getHelpArticle(slug),
          api.listHelpArticles({ limit: 50 }),
        ]);
        if (!active) return;
        setArticle(articleRes);
        setRelated(
          relatedRes.articles
            .filter((a) => a.id !== articleRes.id && a.category === articleRes.category)
            .slice(0, 4),
        );
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
            Article not found
          </p>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            This article may have been removed or renamed.
          </p>
          <Button variant="secondary" asChild>
            <Link href="/app/help/articles">Browse all articles</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-mb-2">
        <Link href="/app/help/articles">
          <ArrowLeft className="h-4 w-4" /> Back to Help Center
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{article.category}</Badge>
        {article.faq ? <Badge variant="accent">FAQ</Badge> : null}
        <span className="flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
          <Clock className="h-3.5 w-3.5" />
          Last updated {new Date(article.updatedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold leading-tight text-[rgb(var(--color-foreground))]">
          {article.title}
        </h1>
        {article.description ? (
          <p className="text-base text-[rgb(var(--color-muted-foreground))]">
            {article.description}
          </p>
        ) : null}
      </div>

      <Card className="overflow-hidden">
        <div className="space-y-4 px-6 py-6 text-sm leading-relaxed text-[rgb(var(--color-foreground))]">
          {article.content.split(/\n\n+/).map((block, i) => {
            const lines = block.split("\n");
            if (lines.length > 1) {
              const isList = lines.every((l) => /^\d+\.\s/.test(l.trim()));
              return (
                <div key={i} className="space-y-1">
                  {isList ? (
                    <ol className="list-decimal space-y-1.5 pl-5">
                      {lines.map((l, j) => (
                        <li key={j}>{l.replace(/^\d+\.\s/, "")}</li>
                      ))}
                    </ol>
                  ) : (
                    lines.map((l, j) => <p key={j}>{l}</p>)
                  )}
                </div>
              );
            }
            return <p key={i}>{block}</p>;
          })}
        </div>
      </Card>

      {related.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--color-foreground))]">
            Related articles
          </h2>
          <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
            {related.map((rel, i) => (
              <Link
                key={rel.id}
                href={`/app/help/articles/${rel.slug}`}
                className={`block px-5 py-3.5 transition-colors hover:bg-[rgb(var(--color-muted))] ${
                  i > 0 ? "border-t border-[rgb(var(--color-border))]" : ""
                }`}
              >
                <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                  {rel.title}
                </p>
                {rel.description ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                    {rel.description}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Card className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
          <BookOpen className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
          Still stuck?
        </p>
        <p className="max-w-sm text-sm text-[rgb(var(--color-muted-foreground))]">
          Our support team is here to help you get unstuck fast.
        </p>
        <Button onClick={() => setDialogOpen(true)}>Create a Support Ticket</Button>
      </Card>

      <CreateTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultCategory={article.category}
      />
    </div>
  );
}