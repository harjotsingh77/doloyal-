"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Inbox, Search, Ticket, Users, X } from "lucide-react";
import { Input } from "@doloyal/ui";
import { api } from "@/lib/api";
import type { AdminSearchResults } from "@doloyal/shared";
import { cn } from "@doloyal/ui";

export function AdminGlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<AdminSearchResults | null>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      api
        .adminGlobalSearch(term)
        .then(setResults)
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    setResults(null);
    router.push(href);
  };

  const resultCount = results
    ? results.businesses.length +
      results.users.length +
      results.customers.length +
      results.subscriptions.length +
      results.tickets.length +
      results.websiteRequests.length +
      results.invoices.length
    : 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))] lg:w-56 lg:justify-start lg:gap-2 lg:border lg:border-[rgb(var(--color-border))] lg:bg-[rgb(var(--color-muted)/0.4)] lg:px-3"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden text-xs text-[rgb(var(--color-muted-foreground))] lg:inline">Search everything…</span>
        <kbd className="ml-auto hidden rounded border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] px-1.5 py-0.5 text-[0.6rem] text-[rgb(var(--color-muted-foreground))] lg:inline">
          ⌘K
        </kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-20">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[rgb(var(--color-border))] px-4">
              <Search className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
              <Input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search businesses, users, customers, tickets…"
                className="border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />
              <button onClick={() => setOpen(false)} className="shrink-0 text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {loading ? (
                <p className="px-3 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">Searching…</p>
              ) : !q.trim() || q.trim().length < 2 ? (
                <p className="px-3 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
                  Type at least 2 characters to search across the platform.
                </p>
              ) : !results || resultCount === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
                  No results for “{q}”.
                </p>
              ) : (
                <div className="space-y-3">
                  {results.businesses.length > 0 ? (
                    <Group label="Businesses" icon={<Building2 className="h-3.5 w-3.5" />}>
                      {results.businesses.map((b) => (
                        <Row key={b.id} onClick={() => go(`/admin/businesses/${b.id}`)} title={b.name} sub={b.plan ?? "free trial"} />
                      ))}
                    </Group>
                  ) : null}
                  {results.users.length > 0 ? (
                    <Group label="Users" icon={<Users className="h-3.5 w-3.5" />}>
                      {results.users.map((u) => (
                        <Row key={u.id} onClick={() => go(`/admin/users/${u.id}`)} title={u.email} sub={`${u.firstName} ${u.lastName}`.trim()} />
                      ))}
                    </Group>
                  ) : null}
                  {results.customers.length > 0 ? (
                    <Group label="Customers" icon={<Users className="h-3.5 w-3.5" />}>
                      {results.customers.map((c) => (
                        <Row key={c.id} onClick={() => go(`/admin/customers?business=${c.businessId}`)} title={`${c.firstName} ${c.lastName}`.trim()} sub={c.businessName} />
                      ))}
                    </Group>
                  ) : null}
                  {results.tickets.length > 0 ? (
                    <Group label="Support tickets" icon={<Ticket className="h-3.5 w-3.5" />}>
                      {results.tickets.map((t) => (
                        <Row key={t.id} onClick={() => go(`/admin/support/${t.id}`)} title={`${t.ticketNumber} · ${t.subject}`} sub={t.businessName} />
                      ))}
                    </Group>
                  ) : null}
                  {results.websiteRequests.length > 0 ? (
                    <Group label="Website requests" icon={<FileText className="h-3.5 w-3.5" />}>
                      {results.websiteRequests.map((r) => (
                        <Row key={r.id} onClick={() => go(`/admin/website-requests/${r.id}`)} title={r.name} sub={r.businessName} />
                      ))}
                    </Group>
                  ) : null}
                  {results.invoices.length > 0 ? (
                    <Group label="Invoices" icon={<Inbox className="h-3.5 w-3.5" />}>
                      {results.invoices.map((i) => (
                        <Row key={i.id} onClick={() => go(`/admin/billing`)} title={i.invoiceNumber} sub={`${i.businessName} · ${i.status}`} />
                      ))}
                    </Group>
                  ) : null}
                </div>
              )}
            </div>

            <div className="border-t border-[rgb(var(--color-border))] px-4 py-2 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
              <span className="font-mono">↑↓</span> to navigate · <span className="font-mono">↵</span> to open ·{" "}
              <span className="font-mono">esc</span> to close
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Group({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
        {icon}
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({ onClick, title, sub }: { onClick: () => void; title: string; sub?: string | null }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[rgb(var(--color-muted))]",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[rgb(var(--color-foreground))]">{title}</p>
        {sub ? <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{sub}</p> : null}
      </div>
    </button>
  );
}
