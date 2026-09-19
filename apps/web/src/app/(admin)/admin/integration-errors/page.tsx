"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
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
import type { AdminSyncErrorItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

export default function AdminIntegrationErrorsPage() {
  const [items, setItems] = React.useState<AdminSyncErrorItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("OPEN");
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState<string | null>(null);
  const pageSize = 25;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListIntegrationErrors({
        status: status || undefined,
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
  }, [status, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status]);

  const act = async (id: string, kind: "retry" | "resolve") => {
    setBusy(id);
    try {
      if (kind === "retry") await api.adminRetryIntegrationError(id);
      else await api.adminResolveIntegrationError(id);
      toast.success(kind === "retry" ? "Retry queued" : "Marked resolved");
      void load();
    } catch {
      toast.error("Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integration Errors"
        description="Failed syncs across Google, payments, email, and other connected providers."
        breadcrumbs={[{ label: "Admin" }, { label: "Integration Errors" }]}
      />

      <Select value={status} onValueChange={setStatus}>
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="OPEN">Open failures</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="ALL">All logs</SelectItem>
        </SelectContent>
      </Select>

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
                title="No integration errors"
                description="Failed syncs appear here when a connected provider cannot complete a job."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Integration</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="hidden md:table-cell">When</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <p className="font-medium text-[rgb(var(--color-foreground))]">{row.integration.replace(/_/g, " ")}</p>
                      <Badge variant={row.status === "RESOLVED" ? "outline" : "danger"}>{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.businessName}</TableCell>
                    <TableCell className="max-w-sm truncate text-xs text-[rgb(var(--color-muted-foreground))]">
                      {row.error || "Unknown error"}
                    </TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">
                      {relativeTime(row.startedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.status !== "RESOLVED" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" loading={busy === row.id} onClick={() => act(row.id, "retry")}>
                            Retry
                          </Button>
                          <Button size="sm" variant="ghost" loading={busy === row.id} onClick={() => act(row.id, "resolve")}>
                            Resolve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-[rgb(var(--color-muted-foreground))]">Closed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Errors" />
    </div>
  );
}
