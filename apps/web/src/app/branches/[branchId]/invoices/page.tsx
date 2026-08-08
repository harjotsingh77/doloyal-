"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { FileText, Plus, DollarSign, Wallet, AlertCircle, Clock3 } from "lucide-react";
import {
  PageHeader,
  Button,
  KpiCard,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@doloyal/ui";
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { generateInvoices } from "@/lib/branches";
import { PageSkeleton, usePageLoading } from "@/components/branch-ui";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "accent"> = {
  Paid: "success",
  Partial: "warning",
  Unpaid: "accent",
  Overdue: "danger",
};

export default function BranchInvoicesPage() {
  const params = useParams<{ branchId: string }>();
  const branchId = params.branchId;
  const { selectedBranch } = useBranch();
  const { format: fmt } = useCurrency();
  const loading = usePageLoading(420);

  const invoices = React.useMemo(() => (branchId ? generateInvoices(branchId) : []), [branchId]);

  const stats = React.useMemo(() => {
    const paid = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
    const unpaid = invoices.filter((i) => i.status === "Unpaid" || i.status === "Partial" || i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
    return { total: invoices.length, paid, unpaid, outstanding: invoices.filter((i) => i.status === "Unpaid" || i.status === "Overdue").length };
  }, [invoices]);

  if (loading || !selectedBranch) return <PageSkeleton cards={3} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description={`Invoices issued at ${selectedBranch.name}.`}
        actions={<Button><Plus className="h-4 w-4" /> Create Invoice</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Invoices" value={stats.total} icon={<FileText className="h-5 w-5" />} accent="primary" />
        <KpiCard label="Paid" value={stats.paid} format={(v) => fmt(v)} icon={<DollarSign className="h-5 w-5" />} accent="success" />
        <KpiCard label="Unpaid" value={stats.unpaid} format={(v) => fmt(v)} icon={<Wallet className="h-5 w-5" />} accent="danger" />
        <KpiCard label="Overdue / Unpaid" value={stats.outstanding} icon={<AlertCircle className="h-5 w-5" />} accent="warning" />
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.id}</TableCell>
                <TableCell className="text-sm">{i.customer}</TableCell>
                <TableCell className="text-sm">{i.items}</TableCell>
                <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">{i.date}</TableCell>
                <TableCell className="text-sm">
                  <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-[rgb(var(--color-muted-foreground))]" />{i.method}</span>
                </TableCell>
                <TableCell className="text-sm font-semibold">{fmt(i.amount)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_TONE[i.status] ?? "outline"} className="text-[0.6rem]">{i.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}