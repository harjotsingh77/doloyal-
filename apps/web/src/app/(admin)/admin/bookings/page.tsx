"use client";

import * as React from "react";
import { CalendarClock, CalendarDays, CircleCheck, CircleX, UserX, CalendarX } from "lucide-react";
import {
  Badge,
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
import type { AdminBookingItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard, Pagination } from "../_components/admin-utils";

const BOOKING_STATUSES = ["CONFIRMED", "PENDING", "CANCELLED", "COMPLETED", "NO_SHOW"];

const STATUS_VARIANT: Record<string, string> = {
  CONFIRMED: "success",
  COMPLETED: "success",
  PENDING: "warning",
  CANCELLED: "danger",
  NO_SHOW: "danger",
};

export default function AdminBookingsPage() {
  const [items, setItems] = React.useState<AdminBookingItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [overview, setOverview] = React.useState<{ today: number; upcoming: number; completed: number; canceled: number; noShows: number; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [list, ov] = await Promise.all([
        api.adminListBookings({ status: status || undefined, page, pageSize }),
        api.adminBookingsOverview(),
      ]);
      setItems(list.items || []);
      setTotal(list.total || 0);
      setOverview(ov);
    } catch {
      setItems([]);
      setTotal(0);
      setOverview(null);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Appointments scheduled across every business."
        breadcrumbs={[{ label: "Admin" }, { label: "Bookings" }]}
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <AdminStatCard label="Today" value={overview?.today ?? "—"} icon={<CalendarDays className="h-4 w-4" />} tone="primary" />
        <AdminStatCard label="Upcoming" value={overview?.upcoming ?? "—"} icon={<CalendarClock className="h-4 w-4" />} tone="accent" />
        <AdminStatCard label="Completed" value={overview?.completed ?? "—"} icon={<CircleCheck className="h-4 w-4" />} tone="success" />
        <AdminStatCard label="Canceled" value={overview?.canceled ?? "—"} icon={<CircleX className="h-4 w-4" />} tone="danger" />
        <AdminStatCard label="No shows" value={overview?.noShows ?? "—"} icon={<UserX className="h-4 w-4" />} tone="warning" />
        <AdminStatCard label="Total" value={overview?.total ?? "—"} icon={<CalendarX className="h-4 w-4" />} />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="w-44">
          <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {BOOKING_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ").toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState icon={<CalendarClock className="h-10 w-10" />} title="No bookings found" description="No bookings match these filters." />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead className="hidden lg:table-cell">Staff</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <p className="font-medium text-[rgb(var(--color-foreground))]">{b.customerName ?? "Walk-in"}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{b.paymentStatus.replace(/_/g, " ").toLowerCase()}</p>
                    </TableCell>
                    <TableCell className="text-sm">{b.serviceName}</TableCell>
                    <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{b.businessName}</TableCell>
                    <TableCell className="hidden text-sm text-[rgb(var(--color-muted-foreground))] lg:table-cell">{b.staffName ?? "—"}</TableCell>
                    <TableCell className="text-xs text-[rgb(var(--color-muted-foreground))]">{new Date(b.startTime).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.source.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(STATUS_VARIANT[b.status] as any) ?? "outline"}>{b.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Bookings" />
    </div>
  );
}