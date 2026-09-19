"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import type { AdminWebhookEventItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

export default function AdminWebhooksPage() {
  const [items, setItems] = React.useState<AdminWebhookEventItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [detail, setDetail] = React.useState<AdminWebhookEventItem | null>(null);
  const pageSize = 25;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListWebhookEvents({
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

  const openDetail = async (id: string) => {
    try {
      setDetail(await api.adminGetWebhookEvent(id));
    } catch {
      toast.error("Could not load webhook payload");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Inbound provider events. Secrets and credentials are redacted."
        breadcrumbs={[{ label: "Admin" }, { label: "Webhooks" }]}
      />

      <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
        <SelectTrigger className="w-full lg:w-48">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          <SelectItem value="PENDING">Pending</SelectItem>
          <SelectItem value="PROCESSED">Processed</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
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
                title="No webhook events"
                description="Events appear here when Stripe, Google, WhatsApp, or other providers post to Doloyal."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Received</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.eventType}</TableCell>
                    <TableCell className="text-sm">{row.source.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-sm">{row.businessName}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "FAILED" ? "danger" : row.status === "PROCESSED" ? "success" : "warning"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">
                      {relativeTime(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetail(row.id)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Events" />

      <Dialog open={detail !== null} onOpenChange={() => setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.eventType}</DialogTitle>
          </DialogHeader>
          {detail?.error ? <p className="text-xs text-[rgb(var(--color-danger))]">{detail.error}</p> : null}
          <pre className="max-h-80 overflow-auto rounded-md bg-[rgb(var(--color-muted)/0.4)] p-3 text-[0.7rem]">
            {JSON.stringify(detail?.payload ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
