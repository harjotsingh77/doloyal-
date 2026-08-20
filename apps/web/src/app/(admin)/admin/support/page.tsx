"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Clock,
  Inbox,
  LifeBuoy,
  Search,
  SquareCheck,
  Ticket,
  TimerReset,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  EmptyState,
} from "@doloyal/ui";
import {
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_PRIORITIES,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_CATEGORIES,
  initials,
  avatarColor,
  relativeTime,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { AnalyticsPanel } from "@/components/support/analytics-panel";

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  OPEN: "warning",
  IN_PROGRESS: "primary",
  WAITING_FOR_CUSTOMER: "accent",
  RESOLVED: "success",
  CLOSED: "default",
};

const PRIORITY_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  LOW: "outline",
  NORMAL: "default",
  HIGH: "warning",
  URGENT: "danger",
};

type Ticket = Awaited<ReturnType<typeof api.adminListSupportTickets>>["items"][number];
type Stats = Awaited<ReturnType<typeof api.adminGetSupportStats>>;

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            tone === "warning"
              ? "bg-[rgb(var(--color-warning)/0.12)] text-[rgb(var(--color-warning))]"
              : tone === "primary"
                ? "bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]"
                : tone === "accent"
                  ? "bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]"
                  : tone === "success"
                    ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                    : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold leading-none text-[rgb(var(--color-foreground))]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [stats, setStats] = React.useState<Stats | null>(null);
  const [items, setItems] = React.useState<Ticket[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [priority, setPriority] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, listRes] = await Promise.all([
        api.adminGetSupportStats(),
        api.adminListSupportTickets({
          status: status || undefined,
          priority: priority || undefined,
          category: category || undefined,
          search: debouncedSearch || undefined,
          page,
          pageSize,
        }),
      ]);
      setStats(statsRes);
      setItems(listRes.items || []);
      setTotal(listRes.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, priority, category, debouncedSearch, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status, priority, category, debouncedSearch]);

  React.useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = api.subscribeAdminSupportEvents();
      const refresh = () => void load();
      ["ticket.created", "ticket.status_changed", "ticket.assigned", "message.created", "ticket.updated", "file.uploaded"].forEach(
        (ev) => es?.addEventListener(ev, refresh),
      );
    } catch {
      /* fallback: no realtime */
    }
    return () => es?.close();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Customer support tickets. Review, assign, chat, and resolve — fast."
        breadcrumbs={[{ label: "Admin" }, { label: "Support" }]}
        actions={<Badge variant="primary">{total} total</Badge>}
      />

      {stats ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Open" value={stats.open} tone="warning" icon={<Clock className="h-5 w-5" />} />
          <StatCard label="In progress" value={stats.inProgress} tone="primary" icon={<LifeBuoy className="h-5 w-5" />} />
          <StatCard label="Waiting on customer" value={stats.waiting} tone="accent" icon={<TimerReset className="h-5 w-5" />} />
          <StatCard label="Resolved" value={stats.resolved} tone="success" icon={<SquareCheck className="h-5 w-5" />} />
          <StatCard label="All tickets" value={stats.total} tone="default" icon={<Ticket className="h-5 w-5" />} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      <AnalyticsPanel />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            placeholder="Search by ticket number, subject, or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {SUPPORT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {SUPPORT_STATUS_LABELS[s as keyof typeof SUPPORT_STATUS_LABELS]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={(v) => setPriority(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All priorities</SelectItem>
            {SUPPORT_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {SUPPORT_PRIORITY_LABELS[p as keyof typeof SUPPORT_PRIORITY_LABELS]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {SUPPORT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Inbox className="h-10 w-10" />}
                title="No support tickets"
                description={search || status || priority || category ? "Try adjusting your filters." : "New tickets from customers will appear here."}
              />
            </div>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {items.map((ticket) => (
                <li key={ticket.id}>
                  <button
                    onClick={() => router.push(`/admin/support/${ticket.id}`)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgb(var(--color-muted))]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                      <Ticket className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[rgb(var(--color-foreground))]">
                          <span className="text-[rgb(var(--color-primary))]">{ticket.ticketNumber}</span>{" "}
                          {ticket.subject}
                        </p>
                        {typeof ticket._count?.messages === "number" && ticket._count.messages > 0 ? (
                          <Badge variant="primary" className="shrink-0">
                            {ticket._count.messages} unread
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                        {ticket.category} ·{" "}
                        {ticket.user?.firstName
                          ? `${ticket.user.firstName} ${ticket.user.lastName ?? ""}`.trim()
                          : ticket.user?.email || "Unknown customer"}
                        {ticket.tenant?.name ? ` · ${ticket.tenant.name}` : ""}
                      </p>
                    </div>

                    <div className="hidden items-center gap-2 md:flex">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white"
                        style={{ backgroundColor: avatarColor(ticket.user?.email || ticket.userId) }}
                      >
                        {initials(`${ticket.user?.firstName ?? ""} ${ticket.user?.lastName ?? ""}`.trim() || ticket.user?.email || "C")}
                      </span>
                      <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {ticket.user?.firstName ? `${ticket.user.firstName} ${ticket.user.lastName ?? ""}`.trim() : ticket.user?.email}
                      </span>
                    </div>

                    <div className="hidden w-24 text-right sm:block">
                      <Badge variant={PRIORITY_VARIANT[ticket.priority] ?? "default"}>
                        {SUPPORT_PRIORITY_LABELS[ticket.priority as keyof typeof SUPPORT_PRIORITY_LABELS] ?? ticket.priority}
                      </Badge>
                    </div>

                    <div className="hidden w-32 text-right lg:block">
                      <Badge variant={STATUS_VARIANT[ticket.status] ?? "default"}>
                        {SUPPORT_STATUS_LABELS[ticket.status as keyof typeof SUPPORT_STATUS_LABELS] ?? ticket.status}
                      </Badge>
                    </div>

                    <div className="hidden w-24 text-right xl:block">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(ticket.updatedAt)}</p>
                      {ticket.assignedAgent ? (
                        <p className="mt-0.5 truncate text-[0.6rem] text-[rgb(var(--color-primary))]">
                          {ticket.assignedAgent.firstName || ticket.assignedAgent.email}
                        </p>
                      ) : null}
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
            Page {page} of {totalPages} · {total} tickets
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}