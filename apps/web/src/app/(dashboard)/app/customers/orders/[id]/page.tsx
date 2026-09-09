"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@doloyal/ui";
import {
  CLIENT_ORDER_PAYMENT_LABELS,
  CLIENT_ORDER_STATUS_LABELS,
} from "@doloyal/shared";
import type { ClientOrder } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";
import { OrderFormDialog } from "../order-form-dialog";
import { useCommerceLive } from "@/lib/data-sync";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { format: fmt } = useCurrency();
  const [order, setOrder] = React.useState<ClientOrder | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      setOrder(await api.getOrder(params.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useCommerceLive(["orders"], () => void load({ silent: true }));

  const handleDelete = async () => {
    if (!order) return;
    try {
      setBusy(true);
      await api.deleteOrder(order.id);
      toast.success("Order deleted");
      router.push("/app/customers/orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        title="Order not found"
        description={error || "This order is no longer available."}
        action={
          <Button variant="secondary" onClick={() => router.push("/app/customers/orders")}>
            Back to orders
          </Button>
        }
      />
    );
  }

  const rows = [
    { label: "Order ID", value: order.orderNumber },
    { label: "Order date", value: formatDate(order.orderDate) },
    { label: "Quantity", value: String(order.quantity) },
    { label: "Unit price", value: fmt(order.unitPrice) },
    { label: "Discount", value: fmt(order.discount) },
    { label: "Tax", value: fmt(order.tax) },
    { label: "Total", value: fmt(order.total) },
    { label: "Assigned staff", value: order.assignedStaffName || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Client", href: "/app/customers" },
          { label: "Orders", href: "/app/customers/orders" },
          { label: order.orderNumber },
        ]}
        title={order.orderNumber}
        description={`${order.customerName} · ${order.productName}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/app/customers/orders")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit Order
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Order
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant={order.status === "COMPLETED" ? "success" : order.status === "CANCELLED" ? "danger" : "warning"}>
          {CLIENT_ORDER_STATUS_LABELS[order.status]}
        </Badge>
        <Badge variant={order.paymentStatus === "PAID" ? "success" : "outline"}>
          {CLIENT_ORDER_PAYMENT_LABELS[order.paymentStatus]}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{order.customerName}</p>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{order.customerPhone}</p>
            {order.customerEmail ? (
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{order.customerEmail}</p>
            ) : null}
            <Button variant="secondary" onClick={() => router.push(`/app/customers/${order.customerId}`)}>
              View Client
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Product / Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{order.productName}</p>
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">SKU {order.productSku}</p>
            <Button variant="secondary" onClick={() => router.push(`/app/customers/products/${order.productId}`)}>
              View Product
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[rgb(var(--color-border))] pb-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                  {row.label}
                </dt>
                <dd className="text-sm font-medium">{row.value}</dd>
              </div>
            ))}
          </dl>
          {order.notes ? (
            <p className="mt-4 whitespace-pre-wrap text-sm text-[rgb(var(--color-muted-foreground))]">{order.notes}</p>
          ) : null}
        </CardContent>
      </Card>

      <OrderFormDialog open={formOpen} onOpenChange={setFormOpen} order={order} onSaved={setOrder} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void handleDelete()}>
              Delete Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
