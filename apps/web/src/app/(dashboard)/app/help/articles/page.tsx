"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Search } from "lucide-react";
import { Badge, Button, Card, Input, PageHeader, Skeleton } from "@doloyal/ui";
import { api } from "@/lib/api";

type Article = Awaited<ReturnType<typeof api.listHelpArticles>>["articles"][number];

function HelpArticlesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("search") ?? "";

  const [query, setQuery] = React.useState(search);
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);
  const [activeCategory, setActiveCategory] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const debouncedQuery = React.useDeferredValue(query.trim());

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const res = await api.listHelpArticles({
          search: debouncedQuery || undefined,
          category: activeCategory || undefined,
        });
        if (!active) return;
        setArticles(res.articles);
        setCategories(res.categories);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedQuery, activeCategory]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, Article[]>();
    for (const article of articles) {
      const list = map.get(article.category) ?? [];
      list.push(article);
      map.set(article.category, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [articles]);

  const categoryCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const article of articles) {
      counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
    }
    return counts;
  }, [articles]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-mb-2">
        <Link href="/app/help">
          <ArrowLeft className="h-4 w-4" /> Back to Help &amp; Support
        </Link>
      </Button>

      <PageHeader
        title="Help Center"
        description="Browse every guide for getting the most out of Doloyal."
      />

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
        <Input
          placeholder="Search all articles..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) router.replace("/app/help/articles", { scroll: false });
          }}
          className="pl-10"
        />
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button
            key="all"
            size="sm"
            variant={activeCategory === "" ? "primary" : "outline"}
            onClick={() => setActiveCategory("")}
          >
            All ({articles.length})
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              size="sm"
              variant={activeCategory === category ? "primary" : "outline"}
              onClick={() => setActiveCategory(category)}
            >
              {category} ({categoryCounts.get(category) ?? 0})
            </Button>
          ))}
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="px-6 py-12 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
          We couldn&apos;t load the help articles. Please try again later.
        </Card>
      ) : grouped.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
            <BookOpen className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
            No articles found
          </p>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Try a different search term, or contact our support team directly.
          </p>
          <Button size="sm" asChild>
            <Link href="/app/help">Go to Help &amp; Support</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          {grouped.map(([category, items]) => (
            <section key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[rgb(var(--color-foreground))]">
                  {category}
                </h2>
                <span className="rounded-full bg-[rgb(var(--color-muted))] px-2 py-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                  {items.length}
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
                {items.map((article, i) => (
                  <Link
                    key={article.id}
                    href={`/app/help/articles/${article.slug}`}
                    className={`group flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[rgb(var(--color-muted))] ${
                      i > 0 ? "border-t border-[rgb(var(--color-border))]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
                          {article.title}
                        </p>
                        {article.faq ? (
                          <Badge variant="accent" className="shrink-0">
                            FAQ
                          </Badge>
                        ) : null}
                      </div>
                      {article.description ? (
                        <p className="mt-0.5 line-clamp-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                          {article.description}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))] transition-transform group-hover:translate-x-0.5 group-hover:text-[rgb(var(--color-primary))]" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HelpArticlesPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      }
    >
      <HelpArticlesContent />
    </React.Suspense>
  );
}