"use client";

import * as React from "react";
import { ScrollText, Search } from "lucide-react";
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
import type { AdminAuditLogItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const CATEGORIES = [
  "DASHBOARD",
  "BUSINESS",
  "USER",
  "SUBSCRIPTION",
  "BILLING",
  "CUSTOMER",
  "BOOKING",
  "LOYALTY",
  "CAMPAIGN",
  "AI",
  "WEBSITE",
  "SUPPORT",
  "INTEGRATION",
  "ANALYTICS",
  "CONTENT",
  "OPS",
  "SECURITY",
  "TEAM",
  "SETTINGS",
];

export default function AdminAuditLogsPage() {
  const [items, setItems] = React.useState<AdminAuditLogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [category, setCategory] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminAuditLogs({
        category: category || undefined,
        search: debounced || undefined,
        page,
        pageSize,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [category, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [category, debounced]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Every sensitive action taken by admin staff."
        breadcrumbs={[{ label: "Admin" }, { label: "Audit Logs" }]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search by actor, action, or target…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace(/_/g, " ").toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<ScrollText className="h-10 w-10" />} title="No audit logs found" description="Admin actions will be recorded here." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="hidden md:table-cell">Target</TableHead>
                  <TableHead className="hidden lg:table-cell">Actor</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <p className="font-mono text-xs font-medium text-[rgb(var(--color-foreground))]">{l.action}</p>
                      {l.metadata ? (
                        <p className="mt-0.5 max-w-xs truncate text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{JSON.stringify(l.metadata)}</p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.category.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs md:table-cell">
                      {l.targetName ?? "—"}
                      <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{l.targetType ?? ""}</p>
                    </TableCell>
                    <TableCell className="hidden text-xs lg:table-cell">
                      <p className="text-[rgb(var(--color-foreground))]">{l.actorName ?? "—"}</p>
                      <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{l.actorEmail ?? ""}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(l.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Audit logs" />
    </div>
  );
}