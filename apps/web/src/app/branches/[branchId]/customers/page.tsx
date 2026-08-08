"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Search, Users, UserPlus, Sparkles } from "lucide-react";
import {
  PageHeader,
  Input,
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateCustomers } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

const RISK_TONE: Record<string, "success" | "warning" | "accent" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "accent",
  CRITICAL: "danger",
};

export default function BranchCustomersPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("ALL");

  const customers = React.useMemo(() => (branchId ? generateCustomers(branchId) : []), [branchId]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (q && !`${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q)) return false;
      if (status !== "ALL" && c.status !== status) return false;
      return true;
    });
  }, [customers, search, status]);

  if (loading || !selectedBranch) return <PageSkeleton cards={4} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={`Only customers who visit ${selectedBranch.name}. No records from other branches.`}
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Add Customer
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 pl-9"
          />
        </div>
        <div className="flex items-center gap-1">
          {["ALL", "Active", "At Risk", "Inactive"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                status === s
                  ? "bg-[rgb(var(--color-primary))] text-white"
                  : "border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] text-[rgb(var(--color-muted-foreground))] hover:text-[rgb(var(--color-foreground))]"
              }`}
            >
              {s === "ALL" ? "All" : s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-sm text-[rgb(var(--color-muted-foreground))]">
          {filtered.length} customers in this branch
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No customers found"
          description="Try adjusting your search, or add customers who visit this branch."
        />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Visits</TableHead>
                <TableHead>Membership</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Lifetime Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-[rgb(var(--color-muted)/0.5)]">
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{c.phone}</TableCell>
                  <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{c.email}</TableCell>
                  <TableCell className="text-sm">{c.lastVisit}</TableCell>
                  <TableCell className="text-sm">{c.visits}</TableCell>
                  <TableCell>
                    {c.membership ? (
                      <Badge variant="primary">{c.membership}</Badge>
                    ) : (
                      <span className="text-sm text-[rgb(var(--color-muted-foreground))]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-[rgb(var(--color-warning))]" />
                      {c.loyaltyPoints.toLocaleString("en-IN")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-semibold">{fmt(c.lifetimeValue)}</TableCell>
                  <TableCell>
                    <Badge variant={RISK_TONE[c.churnRisk]} className="text-[0.6rem]">{c.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}