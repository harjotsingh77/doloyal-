"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Globe, Inbox, Search } from "lucide-react";
import { Button, Card, CardContent, PageHeader, Badge, Skeleton, Input, EmptyState, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@doloyal/ui";
import { WEBSITE_PROJECT_STATUSES, WEBSITE_PROJECT_STATUS_LABELS, relativeTime, initials, avatarColor } from "@doloyal/shared";
import { api } from "@/lib/api";

const STATUS_VARIANT: Record<string, "default" | "primary" | "accent" | "success" | "danger" | "warning" | "outline"> = {
  REQUESTED: "warning",
  REVIEWING: "primary",
  IN_DISCUSSION: "primary",
  IN_PROGRESS: "accent",
  DESIGN_REVIEW: "accent",
  DEVELOPMENT: "accent",
  READY_FOR_REVIEW: "warning",
  PUBLISHED: "success",
  COMPLETED: "success",
};

export default function AdminWebsiteRequestsPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<any[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<string>("");
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
      const data = await api.adminListWebsiteProjects({
        status: status || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [status, debouncedSearch, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  React.useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = api.subscribeAdminWebsiteProjectEvents();
      const refresh = () => void load();
      ["project.created", "project.status_changed", "project.assigned", "message.created", "project.updated", "file.uploaded"].forEach(
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
        title="Website Requests"
        description="All website projects submitted by customers. Review, assign, chat, and manage delivery."
        breadcrumbs={[{ label: "Admin" }, { label: "Website Requests" }]}
        actions={<Badge variant="primary">{total} total</Badge>}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            placeholder="Search by business, customer, or project name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {WEBSITE_PROJECT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {WEBSITE_PROJECT_STATUS_LABELS[s]}
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
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Inbox className="h-10 w-10" />}
                title="No website requests"
                description={search || status ? "Try adjusting your filters." : "New customer requests will appear here."}
              />
            </div>
          ) : (
            <ul className="divide-y divide-[rgb(var(--color-border))]">
              {items.map((project) => (
                <li key={project.id}>
                  <button
                    onClick={() => router.push(`/admin/website-requests/${project.id}`)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[rgb(var(--color-muted))]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                      <Globe className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[rgb(var(--color-foreground))]">{project.name}</p>
                        {project.conversation?._count?.messages > 0 ? (
                          <Badge variant="primary" className="shrink-0">
                            {project.conversation._count.messages} unread
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                        {project.requirements?.businessName || project.tenant?.name || "Unknown business"}
                        {project.requirements?.businessType ? ` · ${project.requirements.businessType}` : ""}
                      </p>
                    </div>

                    <div className="hidden items-center gap-2 md:flex">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[0.6rem] font-semibold text-white" style={{ backgroundColor: avatarColor(project.customerUser?.email || project.customerUserId) }}>
                        {initials(`${project.customerUser?.firstName ?? ""} ${project.customerUser?.lastName ?? ""}`.trim() || project.customerUser?.email || "C")}
                      </span>
                      <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {project.customerUser?.firstName ? `${project.customerUser.firstName} ${project.customerUser.lastName ?? ""}`.trim() : project.customerUser?.email}
                      </span>
                    </div>

                    <div className="hidden w-36 text-right sm:block">
                      <Badge variant={STATUS_VARIANT[project.status] ?? "outline"}>
                        {WEBSITE_PROJECT_STATUS_LABELS[project.status as keyof typeof WEBSITE_PROJECT_STATUS_LABELS] ?? project.status}
                      </Badge>
                    </div>

                    <div className="hidden w-28 text-right lg:block">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(project.updatedAt)}</p>
                      {project.conversation?.assignedAdminName ? (
                        <p className="mt-0.5 truncate text-[0.6rem] text-[rgb(var(--color-primary))]">{project.conversation.assignedAdminName}</p>
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
            Page {page} of {totalPages} · {total} requests
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
