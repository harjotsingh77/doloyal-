"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Card,
  CardContent,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@doloyal/ui";
import { avatarColor, formatCompact, initials, relativeTime } from "@doloyal/shared";
import type { AdminCustomerItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { ExportCsvButton, Pagination } from "../_components/admin-utils";

export default function AdminCustomersPage() {
  const [items, setItems] = React.useState<AdminCustomerItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
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
      const res = await api.adminListCustomers({ search: debounced || undefined, page, pageSize });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [debounced]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="End consumers across every business on the platform."
        breadcrumbs={[{ label: "Admin" }, { label: "Customers" }]}
        actions={<ExportCsvButton entity="customers" />}
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
        <Input placeholder="Search by name, email, or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="No customers found"
                description={search ? "Try a different search term." : "Customers appear here once businesses add them."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Points</TableHead>
                  <TableHead className="hidden sm:table-cell">Tier</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Last visit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: avatarColor(c.email ?? c.phone) }} className="text-[0.6rem]">
                            {initials(`${c.firstName} ${c.lastName}`.trim())}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-[rgb(var(--color-foreground))]">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="max-w-52 truncate text-xs text-[rgb(var(--color-muted-foreground))]">{c.email ?? c.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{c.businessName}</TableCell>
                    <TableCell className="text-right text-sm">{c.totalVisits}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCompact(c.totalSpent)}</TableCell>
                    <TableCell className="hidden text-right text-sm sm:table-cell">{c.pointsBalance}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c.membershipTier ? <Badge variant="outline">{c.membershipTier}</Badge> : <span className="text-xs text-[rgb(var(--color-muted-foreground))]">—</span>}
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-[rgb(var(--color-muted-foreground))] md:table-cell">
                      {c.lastVisitAt ? relativeTime(c.lastVisitAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Customers" />
    </div>
  );
}