"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Download, Search } from "lucide-react";
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
import { formatNumber, relativeTime } from "@doloyal/shared";
import type { AdminBusinessSummary } from "@doloyal/shared";
import { api } from "@/lib/api";
import { BusinessStatusBadge, ExportCsvButton, Pagination } from "../_components/admin-utils";

const PLANS = ["free", "starter", "growth", "professional", "enterprise"];
const STATUSES = ["ACTIVE", "TRIAL", "PAUSED", "SUSPENDED", "CANCELED"];

export default function AdminBusinessesPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<AdminBusinessSummary[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState("");
  const [plan, setPlan] = React.useState("");
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
      const res = await api.adminListBusinesses({
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Businesses"
        description="Every business on the platform — status, plan, and owner at a glance."
        breadcrumbs={[{ label: "Admin" }, { label: "Businesses" }]}
        actions={<ExportCsvButton entity="businesses" />}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search by name, slug, or owner email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
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
                icon={<Building2 className="h-10 w-10" />}
                title="No businesses found"
                description={search || status || plan ? "Try adjusting your filters." : "New businesses appear here as they sign up."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Customers</TableHead>
                  <TableHead className="hidden text-right xl:table-cell">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => router.push(`/admin/businesses/${b.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[rgb(var(--color-foreground))]">{b.name}</p>
                          <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{b.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="truncate text-sm text-[rgb(var(--color-foreground))]">{b.ownerName ?? "—"}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{b.ownerEmail ?? ""}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{b.category}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{b.plan === "free" ? "Free Trial" : b.plan.charAt(0).toUpperCase() + b.plan.slice(1)}</Badge>
                    </TableCell>
                    <TableCell>
                      <BusinessStatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      <p className="text-sm font-medium text-[rgb(var(--color-foreground))]">{formatNumber(b.customerCount)}</p>
                    </TableCell>
                    <TableCell className="hidden text-right xl:table-cell">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(b.createdAt)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Businesses" />
    </div>
  );
}
