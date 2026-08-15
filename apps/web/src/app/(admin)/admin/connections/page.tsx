"use client";

import * as React from "react";
import { Search, Webhook } from "lucide-react";
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
import type { AdminWebsiteConnectionItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const STATUS_VARIANT: Record<string, string> = {
  CONNECTED: "success",
  ACTIVE: "success",
  DISCONNECTED: "danger",
  ERROR: "danger",
  PAUSED: "warning",
  PENDING: "warning",
};

export default function AdminConnectionsPage() {
  const [items, setItems] = React.useState<AdminWebsiteConnectionItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
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
      const res = await api.adminListWebsiteConnections({ status: status || undefined, search: debounced || undefined, page, pageSize });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [status, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status, debounced]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Connections"
        description="Embedded Doloyal website connections on customer sites."
        breadcrumbs={[{ label: "Admin" }, { label: "Connections" }]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search by domain or business…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="DISCONNECTED">Disconnected</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Webhook className="h-10 w-10" />}
                title="No connections found"
                description={search || status ? "Try adjusting your filters." : "Website connections appear here when businesses embed them."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Framework</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Events (30d)</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Errors (30d)</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <p className="font-medium text-[rgb(var(--color-foreground))]">{c.websiteName}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{c.businessName}</p>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-[rgb(var(--color-primary))]">{c.domain}</span>
                    </TableCell>
                    <TableCell className="text-xs">{c.framework}</TableCell>
                    <TableCell className="hidden text-right text-sm md:table-cell">{c.events30d}</TableCell>
                    <TableCell className="hidden text-right md:table-cell">
                      <span className={`text-sm ${c.errors30d > 0 ? "font-semibold text-[rgb(var(--color-danger))]" : "text-[rgb(var(--color-muted-foreground))]"}`}>
                        {c.errors30d}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(STATUS_VARIANT[c.status] as any) ?? "outline"}>{c.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Connections" />
    </div>
  );
}