"use client";

import * as React from "react";
import { Package, Search } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
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
import { formatCompact, relativeTime } from "@doloyal/shared";
import type { AdminSubscriptionItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { ExportCsvButton, Pagination, SubscriptionStatusBadge } from "../_components/admin-utils";

const PLANS = ["free", "starter", "growth", "professional", "enterprise"];
const STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELING", "CANCELED", "PAYMENT_FAILED"];

export default function AdminSubscriptionsPage() {
  const [items, setItems] = React.useState<AdminSubscriptionItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [plan, setPlan] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [busy, setBusy] = React.useState<string | null>(null);
  const pageSize = 20;

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.adminListSubscriptions({
        status: status || undefined,
        plan: plan || undefined,
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
  }, [status, plan, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [status, plan, debounced]);

  const act = async (id: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(success);
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
        title="Subscriptions"
        description="Plans and billing state across every business."
        breadcrumbs={[{ label: "Admin" }, { label: "Subscriptions" }]}
        actions={<ExportCsvButton entity="subscriptions" />}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search by business name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
        <Select value={plan} onValueChange={(v) => setPlan(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All plans</SelectItem>
            {PLANS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "free" ? "Free Trial" : p.charAt(0).toUpperCase() + p.slice(1)}
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
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Package className="h-10 w-10" />}
                title="No subscriptions found"
                description={search || status || plan ? "Try adjusting your filters." : "Subscriptions appear here as businesses upgrade."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Renews</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-medium text-[rgb(var(--color-foreground))]">{s.businessName}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{s.ownerEmail ?? "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.plan === "free" ? "Free Trial" : s.plan.charAt(0).toUpperCase() + s.plan.slice(1)}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(s.amount)}</p>
                      <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{s.billingCycle}</p>
                    </TableCell>
                    <TableCell>
                      <SubscriptionStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{s.renewal ? relativeTime(s.renewal) : "—"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {s.status === "CANCELED" ? (
                          <Button size="sm" variant="success" loading={busy === s.id} onClick={() => act(s.id, () => api.adminRestartSubscription(s.id), "Subscription restarted")}>
                            Restart
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={busy === s.id}
                            onClick={() => {
                              if (window.confirm(`Cancel the subscription for ${s.businessName}?`)) {
                                act(s.id, () => api.adminCancelSubscription(s.id), "Subscription canceled");
                              }
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Subscriptions" />
    </div>
  );
}