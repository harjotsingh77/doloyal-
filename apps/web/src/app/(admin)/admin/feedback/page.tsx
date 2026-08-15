"use client";

import * as React from "react";
import { MessageSquare, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@doloyal/ui";
import { relativeTime } from "@doloyal/shared";
import type { AdminFeedbackItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const TYPES = ["FEATURE_REQUEST", "FEEDBACK", "BUG_REPORT"];
const STATUSES = ["NEW", "REVIEWING", "PLANNED", "IN_PROGRESS", "RELEASED", "REJECTED"];

const TYPE_VARIANT: Record<string, string> = {
  FEATURE_REQUEST: "accent",
  FEEDBACK: "outline",
  BUG_REPORT: "danger",
};

const STATUS_VARIANT: Record<string, string> = {
  NEW: "warning",
  REVIEWING: "outline",
  PLANNED: "violet",
  IN_PROGRESS: "primary",
  RELEASED: "success",
  REJECTED: "danger",
};

export default function AdminFeedbackPage() {
  const [items, setItems] = React.useState<AdminFeedbackItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [type, setType] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListFeedback({ type: type || undefined, status: status || undefined, search: debounced || undefined, page, pageSize });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [type, status, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [type, status, debounced]);

  const setFeedbackStatus = async (id: string, next: string) => {
    try {
      await api.adminUpdateFeedbackStatus(id, next);
      toast.success("Status updated");
      void load();
    } catch {
      toast.error("Could not update status");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedback"
        description="Feature requests, feedback, and bug reports from customers."
        breadcrumbs={[{ label: "Admin" }, { label: "Feedback" }]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search feedback…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={type} onValueChange={(v) => setType(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace(/_/g, " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<MessageSquare className="h-10 w-10" />} title="No feedback found" description="Customer feedback appears here as it comes in." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feedback</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden md:table-cell">From</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Votes</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="max-w-md">
                      <p className="truncate font-medium text-[rgb(var(--color-foreground))]">{f.title}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{f.description}</p>
                      <p className="mt-1 text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                        {f.category ?? "uncategorized"} · {relativeTime(f.createdAt)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(TYPE_VARIANT[f.type] as any) ?? "outline"}>{f.type.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs text-[rgb(var(--color-foreground))]">{f.userName ?? "—"}</p>
                      <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{f.businessName ?? ""}</p>
                    </TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{f.votes}</TableCell>
                    <TableCell className="text-right">
                      <Select value={f.status} onValueChange={(v) => setFeedbackStatus(f.id, v)}>
                        <SelectTrigger className="ml-auto w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ").toLowerCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Feedback" />
    </div>
  );
}