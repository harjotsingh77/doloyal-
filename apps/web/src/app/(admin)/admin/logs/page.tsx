"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
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
import type { AdminLogItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { Pagination } from "../_components/admin-utils";

const SEVERITIES = ["INFO", "WARNING", "ERROR", "CRITICAL"];

const SEVERITY_VARIANT: Record<string, string> = {
  INFO: "outline",
  WARNING: "warning",
  ERROR: "danger",
  CRITICAL: "danger",
};

export default function AdminLogsPage() {
  const [items, setItems] = React.useState<AdminLogItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [severity, setSeverity] = React.useState("");
  const [service, setService] = React.useState("");
  const [date, setDate] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListLogs({
        severity: severity || undefined,
        service: service || undefined,
        date: date || undefined,
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
  }, [severity, service, date, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [severity, service, date]);

  const services = [...new Set(items.map((l) => l.service))].sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="Application logs across all services."
        breadcrumbs={[{ label: "Admin" }, { label: "Logs" }]}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Select value={severity} onValueChange={(v) => setSeverity(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={service} onValueChange={(v) => setService(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All services" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full lg:w-44" />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<ScrollText className="h-10 w-10" />} title="No logs found" description="No logs match these filters." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(l.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.service}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(SEVERITY_VARIANT[l.severity] as any) ?? "outline"}>{l.severity}</Badge>
                    </TableCell>
                    <TableCell className="max-w-lg">
                      <p className="truncate font-mono text-xs text-[rgb(var(--color-foreground))]">{l.message}</p>
                      {l.error ? <p className="mt-1 truncate text-[0.62rem] text-[rgb(var(--color-danger))]">{l.error}</p> : null}
                      {l.requestId ? <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">req {l.requestId}</p> : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Logs" />
    </div>
  );
}