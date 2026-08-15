"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Mail,
  MessageCircle,
  MessageSquare,
  Search,
  Ticket,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardTitle,
  Input,
  PageHeader,
  Skeleton,
} from "@doloyal/ui";
import { SUPPORT_STATUS_LABELS, SUPPORT_EMAIL } from "@doloyal/shared";
import { api } from "@/lib/api";
import { CreateTicketDialog } from "@/components/support/create-ticket-dialog";

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] as const;

const STATUS_DOT: Record<string, string> = {
  OPEN: "bg-[rgb(var(--color-warning))]",
  IN_PROGRESS: "bg-[rgb(var(--color-primary))]",
  WAITING_FOR_CUSTOMER: "bg-[rgb(var(--color-accent))]",
  RESOLVED: "bg-[rgb(var(--color-success))]",
  CLOSED: "bg-[rgb(var(--color-muted-foreground))]",
};

type SearchResult = Awaited<ReturnType<typeof api.listHelpArticles>>["articles"][number];

export default function HelpPage() {
  const router = useRouter();

  // Live search
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchFocused, setSearchFocused] = React.useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  // Data
  const [faqs, setFaqs] = React.useState<SearchResult[]>([]);
  const [tickets, setTickets] = React.useState<
    Awaited<ReturnType<typeof api.listSupportTickets>>
  >([]);
  const [loading, setLoading] = React.useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // FAQ accordion
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [faqRes, ticketRes] = await Promise.all([
          api.listHelpArticles({ faq: true }),
          api.listSupportTickets(),
        ]);
        if (!active) return;
        setFaqs(faqRes.articles);
        setTickets(ticketRes);
      } catch {
        // FAQ/tickets are best-effort; the page still works.
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Debounced live search
  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await api.listHelpArticles({ search: q, limit: 6 });
        setResults(res.articles);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Close dropdown on outside click
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const openTicket = tickets.find((t) =>
    OPEN_STATUSES.includes(t.status as (typeof OPEN_STATUSES)[number]),
  );

  const openChat = () => {
    if (openTicket) {
      router.push(`/app/help/tickets/${openTicket.id}`);
    } else {
      setDialogOpen(true);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Help & Support"
        description="Find answers or get help from the Doloyal team."
      />

      {/* ─── Search ─────────────────────────────────────────────────────── */}
      <div ref={searchRef} className="relative mx-auto max-w-2xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            placeholder="Search help articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            className="h-13 w-full pl-12 pr-10 text-base"
          />
          {query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))]"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {searchFocused && query.trim().length >= 2 ? (
          <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-[var(--shadow-lifted)]">
            {searching ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : results.length > 0 ? (
              <div className="py-1.5">
                {results.map((article) => (
                  <Link
                    key={article.id}
                    href={`/app/help/articles/${article.slug}`}
                    onClick={() => setSearchFocused(false)}
                    className="block px-4 py-2.5 transition-colors hover:bg-[rgb(var(--color-muted))]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">
                        {article.title}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {article.category}
                      </Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                      {article.description}
                    </p>
                  </Link>
                ))}
                <Link
                  href={`/app/help/articles?search=${encodeURIComponent(query.trim())}`}
                  onClick={() => setSearchFocused(false)}
                  className="flex items-center justify-center gap-1 border-t border-[rgb(var(--color-border))] px-4 py-2.5 text-sm text-[rgb(var(--color-primary))] hover:bg-[rgb(var(--color-muted))]"
                >
                  View all articles
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                  No articles found for “{query.trim()}”.
                </p>
                <Button size="sm" onClick={() => setDialogOpen(true)}>
                  <Ticket className="h-4 w-4" />
                  Create a Support Ticket
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* ─── Support action cards ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="group relative overflow-hidden">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))] transition-colors group-hover:bg-[rgb(var(--color-primary)/0.16)]">
              <Ticket className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Create Support Ticket</CardTitle>
              <CardDescription className="mt-1 text-sm leading-relaxed">
                Having a specific issue? Submit a ticket and our team will work with
                you to resolve it.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              Create a Ticket <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden">
          <CardContent className="flex h-full flex-col gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))] transition-colors group-hover:bg-[rgb(var(--color-accent)/0.16)]">
              <MessageCircle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Chat with Support</CardTitle>
              <CardDescription className="mt-1 text-sm leading-relaxed">
                {openTicket
                  ? "You have an open conversation. Jump back in and continue chatting."
                  : "Start a real-time conversation with our team right in your dashboard."}
              </CardDescription>
            </div>
            <Button variant="secondary" onClick={openChat}>
              {openTicket ? "Open Conversation" : "Start a Chat"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ─── My Support Requests ────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--color-foreground))]">
              My Support Requests
            </h2>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Track the status of your tickets and continue conversations.
            </p>
          </div>
          {tickets.length > 0 ? (
            <Button variant="ghost" onClick={() => setDialogOpen(true)}>
              New Ticket <Ticket className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">
                  No support requests yet
                </p>
                <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                  When you contact us, your tickets and conversations will appear here.
                </p>
              </div>
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                <Ticket className="h-4 w-4" />
                Create a Support Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/app/help/tickets/${ticket.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 transition-colors hover:border-[rgb(var(--color-primary)/0.4)] hover:bg-[rgb(var(--color-surface-2))]"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[rgb(var(--color-primary))]">
                        {ticket.ticketNumber}
                      </span>
                      <Badge variant="outline" className="shrink-0">
                        {ticket.category}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-[rgb(var(--color-foreground))]">
                      {ticket.subject}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="hidden items-center gap-1.5 sm:flex">
                    <span
                      className={`h-2 w-2 rounded-full ${STATUS_DOT[ticket.status] ?? "bg-[rgb(var(--color-muted-foreground))]"}`}
                    />
                    <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS] ?? ticket.status}
                    </span>
                  </span>
                  {typeof ticket._count?.messages === "number" && ticket._count.messages > 0 ? (
                    <Badge variant="primary">{ticket._count.messages} new</Badge>
                  ) : null}
                  <ArrowRight className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── FAQ ────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--color-foreground))]">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Quick answers to the most common questions.
          </p>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : faqs.length > 0 ? (
          <div className="space-y-1.5">
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={faq.id}
                  className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-sm font-medium text-[rgb(var(--color-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))]"
                  >
                    <span>{faq.title}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))] transition-transform duration-200 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-200 ${
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <Link
                        href={`/app/help/articles/${faq.slug}`}
                        className="block border-t border-[rgb(var(--color-border))] px-5 py-4 text-sm leading-relaxed text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-primary))]"
                      >
                        {faq.description}
                        <span className="mt-2 flex items-center gap-1 text-xs font-medium text-[rgb(var(--color-primary))]">
                          Read the full article
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="px-6 py-8 text-center text-sm text-[rgb(var(--color-muted-foreground))]">
              No FAQs available yet.
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-5 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-[rgb(var(--color-primary))]" />
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Browse every guide in the help center.
            </p>
          </div>
          <Button variant="secondary" asChild>
            <Link href="/app/help/articles">
              View All Help Articles <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-5 py-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Prefer email? Reach us at{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-[rgb(var(--color-primary))] hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>
      </section>

      <CreateTicketDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}