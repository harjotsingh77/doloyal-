"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  KpiCard,
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
import {
  CLIENT_ORDER_PAYMENT_LABELS,
  CLIENT_ORDER_PAYMENT_STATUSES,
  CLIENT_ORDER_STATUS_LABELS,
  CLIENT_ORDER_STATUSES,
} from "@doloyal/shared";
import type {
  CatalogProduct,
  ClientOrder,
  ClientOrderPaymentStatus,
  ClientOrderQuery,
  ClientOrderStatus,
  ClientOrderSummary,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useResource } from "@/lib/use-resource";
import { toast } from "sonner";
import { OrderFormDialog } from "./order-form-dialog";
import { useCommerceLive } from "@/lib/data-sync";

const ALL = "__all__";

type OrdersBoot = {
  orders: ClientOrder[];
  total: number;
  summary: ClientOrderSummary;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function statusVariant(status: ClientOrderStatus): "warning" | "primary" | "accent" | "success" | "danger" {
  if (status === "PENDING") return "warning";
  if (status === "CONFIRMED") return "primary";
  if (status === "PROCESSING") return "accent";
  if (status === "COMPLETED") return "success";
  return "danger";
}

function paymentVariant(status: ClientOrderPaymentStatus): "success" | "warning" | "accent" | "outline" {
  if (status === "PAID") return "success";
  if (status === "PENDING") return "warning";
  if (status === "PARTIALLY_PAID") return "accent";
  return "outline";
}

export default function OrdersPage() {
  const router = useRouter();
  const { format: fmt } = useCurrency();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [productId, setProductId] = React.useState(ALL);
  const [status, setStatus] = React.useState<"ALL" | ClientOrderStatus>("ALL");
  const [paymentStatus, setPaymentStatus] = React.useState<"ALL" | ClientOrderPaymentStatus>("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const pageSize = 20;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ClientOrder | null>(null);
  const [deleting, setDeleting] = React.useState<ClientOrder | null>(null);
  const [statusTarget, setStatusTarget] = React.useState<ClientOrder | null>(null);
  const [paymentTarget, setPaymentTarget] = React.useState<ClientOrder | null>(null);
  const [nextStatus, setNextStatus] = React.useState<ClientOrderStatus>("PENDING");
  const [nextPayment, setNextPayment] = React.useState<ClientOrderPaymentStatus>("PENDING");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const bootQuery = useResource<OrdersBoot>({
    queryKey: ["orders-page", debouncedSearch, productId, status, paymentStatus, from, to, page],
    queryFn: async () => {
      const query: ClientOrderQuery = {
        search: debouncedSearch || undefined,
        productId: productId === ALL ? undefined : productId,
        status,
        paymentStatus,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: pageSize,
      };
      const [list, stats] = await Promise.all([
        api.listOrders(query),
        api.getOrderSummary(),
      ]);
      return {
        orders: list.items,
        total: list.total,
        summary: stats,
      };
    },
    scopes: ["orders", "customers", "dashboard"],
    keepPrevious: true,
  });

  const productQuery = useResource<{ items: CatalogProduct[] }>({
    queryKey: ["orders-product-filter"],
    queryFn: () => api.listProducts({ limit: 100, sort: "name", order: "asc" }),
    scopes: ["products"],
  });

  const orders = bootQuery.data?.orders ?? [];
  const total = bootQuery.data?.total ?? 0;
  const summary = bootQuery.data?.summary ?? null;
  const products = productQuery.data?.items ?? [];
  const loading = bootQuery.isLoading && !bootQuery.data;
  const error = bootQuery.error && !bootQuery.data
    ? bootQuery.error instanceof Error
      ? bootQuery.error.message
      : "Failed to load orders"
    : null;

  const load = React.useCallback(async (_opts?: { silent?: boolean }) => {
    await bootQuery.refetch();
  }, [bootQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, productId, status, paymentStatus, from, to]);

  useCommerceLive(["orders", "customers", "products"], () => void load({ silent: true }));

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      await api.deleteOrder(deleting.id);
      toast.success("Order deleted");
      setDeleting(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete order");
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async () => {
    if (!statusTarget) return;
    try {
      setBusy(true);
      await api.updateOrder(statusTarget.id, { status: nextStatus });
      toast.success("Order status updated");
      setStatusTarget(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  };

  const handlePayment = async () => {
    if (!paymentTarget) return;
    try {
      setBusy(true);
      await api.updateOrder(paymentTarget.id, { paymentStatus: nextPayment });
      toast.success("Payment status updated");
      setPaymentTarget(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update payment");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const emptyList =
    !loading &&
    !error &&
    total === 0 &&
    !debouncedSearch &&
    productId === ALL &&
    status === "ALL" &&
    paymentStatus === "ALL" &&
    !from &&
    !to;

  const filters = (
    <>
      <Select value={productId} onValueChange={setProductId}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Products</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Order status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Statuses</SelectItem>
          {CLIENT_ORDER_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {CLIENT_ORDER_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Payments</SelectItem>
          {CLIENT_ORDER_PAYMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {CLIENT_ORDER_PAYMENT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-36" />
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-36" />
    </>
  );

  const rowMenu = (row: ClientOrder) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Order actions" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => router.push(`/app/customers/orders/${row.id}`)}>View Order</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setEditing(row);
            setFormOpen(true);
          }}
        >
          Edit Order
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setNextStatus(row.status);
            setStatusTarget(row);
          }}
        >
          Update Status
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setNextPayment(row.paymentStatus);
            setPaymentTarget(row);
          }}
        >
          Update Payment Status
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/app/customers/${row.customerId}`)}>View Client</DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/app/customers/products/${row.productId}`)}>
          View Product
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => setDeleting(row)}>
          Delete / Cancel Order
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Create and manage client orders that connect customers with products and services."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !summary ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[4.75rem] rounded-lg" />)
        ) : (
          <>
            <KpiCard
              label="Total Orders"
              value={summary?.total ?? 0}
              accent="primary"
            />
            <KpiCard
              label="Pending"
              value={summary?.pending ?? 0}
              accent="warning"
              onClick={() => setStatus("PENDING")}
            />
            <KpiCard
              label="Completed"
              value={summary?.completed ?? 0}
              accent="success"
              onClick={() => setStatus("COMPLETED")}
            />
            <KpiCard
              label="Cancelled"
              value={summary?.cancelled ?? 0}
              accent="danger"
              onClick={() => setStatus("CANCELLED")}
            />
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgb(var(--color-muted-foreground))]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID or client name..."
            className="pl-9"
          />
        </div>
        <div className="hidden flex-wrap items-center gap-2 lg:flex">{filters}</div>
        <Button variant="secondary" className="lg:hidden" onClick={() => setFiltersOpen((v) => !v)}>
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </Button>
      </div>
      {filtersOpen ? <div className="grid gap-2 sm:grid-cols-2 lg:hidden">{filters}</div> : null}

      {error ? (
        <EmptyState title="Could not load orders" description={error} />
      ) : emptyList ? (
        <EmptyState
          title="No orders yet"
          description="Orders will appear here once a client is connected with a product or service."
        />
      ) : loading ? (
        <Skeleton className="h-80 w-full" />
      ) : orders.length === 0 ? (
        <EmptyState title="No matching orders" description="Try a different search or clear the filters." />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Client Contact</TableHead>
                  <TableHead>Product/Service</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/app/customers/orders/${row.id}`)}
                  >
                    <TableCell className="font-medium">{row.orderNumber}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="text-sm text-[rgb(var(--color-muted-foreground))]">
                      {row.customerPhone}
                      {row.customerEmail ? <div>{row.customerEmail}</div> : null}
                    </TableCell>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.quantity}</TableCell>
                    <TableCell>{formatDate(row.orderDate)}</TableCell>
                    <TableCell className="font-medium">{fmt(row.total)}</TableCell>
                    <TableCell>
                      <Badge variant={paymentVariant(row.paymentStatus)}>{CLIENT_ORDER_PAYMENT_LABELS[row.paymentStatus]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(row.status)}>{CLIENT_ORDER_STATUS_LABELS[row.status]}</Badge>
                    </TableCell>
                    <TableCell>{row.assignedStaffName || "—"}</TableCell>
                    <TableCell>{rowMenu(row)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-3 md:hidden">
            {orders.map((row) => (
              <button
                key={row.id}
                type="button"
                className="w-full rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 text-left"
                onClick={() => router.push(`/app/customers/orders/${row.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{row.orderNumber}</p>
                    <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{row.customerName}</p>
                    <p className="mt-1 text-sm">{row.productName} · Qty {row.quantity}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>{rowMenu(row)}</div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(row.status)}>{CLIENT_ORDER_STATUS_LABELS[row.status]}</Badge>
                  <Badge variant={paymentVariant(row.paymentStatus)}>{CLIENT_ORDER_PAYMENT_LABELS[row.paymentStatus]}</Badge>
                  <span className="ml-auto text-sm font-semibold">{fmt(row.total)}</span>
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between text-sm">
              <p className="text-[rgb(var(--color-muted-foreground))]">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <OrderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        order={editing}
        onSaved={() => void load()}
      />

      <Dialog open={Boolean(statusTarget)} onOpenChange={(open) => !open && setStatusTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
            <DialogDescription>Change the fulfillment status for {statusTarget?.orderNumber}.</DialogDescription>
          </DialogHeader>
          <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ClientOrderStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CLIENT_ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setStatusTarget(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void handleStatus()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(paymentTarget)} onOpenChange={(open) => !open && setPaymentTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Payment Status</DialogTitle>
            <DialogDescription>Change payment for {paymentTarget?.orderNumber}.</DialogDescription>
          </DialogHeader>
          <Select value={nextPayment} onValueChange={(v) => setNextPayment(v as ClientOrderPaymentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_ORDER_PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {CLIENT_ORDER_PAYMENT_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPaymentTarget(null)}>
              Cancel
            </Button>
            <Button loading={busy} onClick={() => void handlePayment()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order?</DialogTitle>
            <DialogDescription>
              This removes {deleting?.orderNumber} and restores product stock if the order was still active.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep Order
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
