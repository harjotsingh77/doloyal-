"use client";

import * as React from "react";
import { CreditCard, Download, Info, RefreshCcw, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { formatCompact, formatMoney, relativeTime } from "@doloyal/shared";
import type { AdminBillingOverview } from "@doloyal/shared";
import { api } from "@/lib/api";
import { AdminStatCard } from "../_components/admin-utils";

export default function AdminBillingPage() {
  const [data, setData] = React.useState<AdminBillingOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refundOpen, setRefundOpen] = React.useState(false);

  React.useEffect(() => {
    api
      .adminBillingOverview()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Revenue, payments, invoices, and refunds across the platform."
        breadcrumbs={[{ label: "Admin" }, { label: "Billing" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => import("@/lib/api").then((m) => m.api.adminExport("invoices"))}>
              <Download className="h-4 w-4" />
              Invoices CSV
            </Button>
            <Button onClick={() => setRefundOpen(true)}>
              <Undo2 className="h-4 w-4" />
              Issue refund
            </Button>
          </>
        }
      />

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState icon={<Info className="h-10 w-10" />} title="Billing data unavailable" description="The billing overview could not be loaded." />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStatCard label="Gross revenue" value={formatMoney(data.grossRevenue)} tone="primary" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="Net revenue" value={formatMoney(data.netRevenue)} tone="success" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="MRR" value={formatCompact(data.mrr)} tone="accent" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="ARR" value={formatCompact(data.arr)} tone="accent" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="Refunds" value={formatMoney(data.refunds)} tone="danger" icon={<Undo2 className="h-4 w-4" />} />
            <AdminStatCard label="Failed payments (30d)" value={data.failedPayments30d} tone="warning" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="Outstanding" value={formatMoney(data.outstandingAmount)} tone="warning" icon={<CreditCard className="h-4 w-4" />} />
            <AdminStatCard label="Providers" value={data.providers.length} sub={data.providers.map((p) => p.status).join(", ")} />
          </div>

          {Object.keys(data.revenueByPlan ?? {}).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(data.revenueByPlan).map(([plan, amount]) => (
                    <div key={plan} className="flex items-center gap-3 rounded-lg border border-[rgb(var(--color-border))] px-4 py-3">
                      <Badge variant="outline" className="capitalize">
                        {plan}
                      </Badge>
                      <span className="text-lg font-semibold text-[rgb(var(--color-foreground))]">{formatCompact(Number(amount))}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent payments</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.payments.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No payments recorded.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.businessName}</TableCell>
                          <TableCell>
                            <Badge variant={p.status === "REFUNDED" ? "danger" : "success"}>
                              {p.type.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(p.amount)}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            <span className="text-xs text-[rgb(var(--color-muted-foreground))]">{relativeTime(p.createdAt)}</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent invoices</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {data.invoices.length === 0 ? (
                  <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No invoices yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.invoices.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell className="font-mono text-xs text-[rgb(var(--color-primary))]">{i.invoiceNumber}</TableCell>
                          <TableCell className="font-medium">{i.businessName}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(i.total)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">{i.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <RefundDialog open={refundOpen} onClose={() => setRefundOpen(false)} />
    </div>
  );
}

function RefundDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [subscriptionId, setSubscriptionId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const submit = async () => {
    const amountNum = Number(amount);
    if (!subscriptionId.trim() || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Subscription ID and a positive amount are required");
      return;
    }
    setBusy(true);
    try {
      const res = await api.adminIssueRefund({
        subscriptionId: subscriptionId.trim(),
        amount: amountNum,
        reason: reason || undefined,
      });
      toast.success(res.message ?? "Refund recorded");
      setSubscriptionId("");
      setAmount("");
      setReason("");
      onClose();
    } catch {
      toast.error("Could not issue refund");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Issue refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Subscription ID</label>
            <Input placeholder="Subscription id (from Subscriptions page)" value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Amount (INR)</label>
            <Input type="number" placeholder="e.g. 1499" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[rgb(var(--color-muted-foreground))]">Reason</label>
            <Input placeholder="e.g. customer dispute" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} loading={busy}>
            Issue refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
