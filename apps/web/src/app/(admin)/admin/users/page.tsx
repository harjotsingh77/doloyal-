"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Users as UsersIcon } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
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
import { avatarColor, initials, relativeTime } from "@doloyal/shared";
import type { AdminUserItem } from "@doloyal/shared";
import { api } from "@/lib/api";
import { ExportCsvButton, Pagination } from "../_components/admin-utils";

const ROLES = ["OWNER", "MANAGER", "RECEPTIONIST", "STAFF"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<AdminUserItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [role, setRole] = React.useState("");
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
      const res = await api.adminListUsers({
        role: role || undefined,
        status: status || undefined,
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
  }, [role, status, debounced, page, pageSize]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    setPage(1);
  }, [role, status, debounced]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="All platform accounts and their business memberships."
        breadcrumbs={[{ label: "Admin" }, { label: "Users" }]}
        actions={<ExportCsvButton entity="users" />}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
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
                icon={<UsersIcon className="h-10 w-10" />}
                title="No users found"
                description={search || role || status ? "Try adjusting your filters." : "Users appear here as they sign up."}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Businesses</TableHead>
                  <TableHead className="hidden sm:table-cell">Admin</TableHead>
                  <TableHead className="hidden xl:table-cell">Last login</TableHead>
                  <TableHead className="text-right">Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((u) => (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback style={{ backgroundColor: avatarColor(u.email) }}>
                            {initials(`${u.firstName} ${u.lastName}`.trim() || u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[rgb(var(--color-foreground))]">
                            {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                          </p>
                          <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "SUSPENDED" ? "danger" : "success"}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm text-[rgb(var(--color-foreground))]">{u.businessCount}</p>
                      <p className="truncate text-xs text-[rgb(var(--color-muted-foreground))]">{u.primaryBusiness ?? "—"}</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {u.isAdmin ? (
                        <Badge variant="primary">{u.adminRole?.replace(/_/g, " ") ?? "Admin"}</Badge>
                      ) : (
                        <span className="text-xs text-[rgb(var(--color-muted-foreground))]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{u.lastLogin ? relativeTime(u.lastLogin) : "Never"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(u.createdAt)}</p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={Math.max(1, Math.ceil(total / pageSize))} total={total} pageSize={pageSize} onChange={setPage} label="Users" />
    </div>
  );
}
