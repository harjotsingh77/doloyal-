"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Package, Pencil, Power, Trash2 } from "lucide-react";
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
import type { CatalogProduct, ClientOrder, ProductCategory } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";
import { ProductFormDialog } from "../product-form-dialog";
import { OrderFormDialog } from "../../orders/order-form-dialog";
import { useAppSync } from "@/lib/data-sync";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { format: fmt } = useCurrency();
  const [product, setProduct] = React.useState<CatalogProduct | null>(null);
  const [categories, setCategories] = React.useState<ProductCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [orderFormOpen, setOrderFormOpen] = React.useState(false);
  const [orders, setOrders] = React.useState<ClientOrder[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [row, cats, related] = await Promise.all([
        api.getProduct(params.id),
        api.listProductCategories(),
        api.listOrders({ productId: params.id, limit: 50 }).catch(() => ({ items: [] as ClientOrder[] })),
      ]);
      setProduct(row);
      setCategories(cats);
      setOrders(related.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  useAppSync(["products", "orders"], () => void load());

  const handleDuplicate = async () => {
    if (!product) return;
    try {
      const copy = await api.duplicateProduct(product.id);
      toast.success("Product duplicated");
      router.push(`/app/customers/products/${copy.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate product");
    }
  };

  const handleStatus = async () => {
    if (!product) return;
    try {
      const next = await api.changeProductStatus(product.id);
      setProduct(next);
      toast.success(next.status === "ACTIVE" ? "Product activated" : "Product deactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status");
    }
  };

  const handleDelete = async () => {
    if (!product) return;
    try {
      setBusy(true);
      await api.deleteProduct(product.id);
      toast.success("Product deleted");
      router.push("/app/customers/products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete product");
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

  if (error || !product) {
    return (
      <EmptyState
        title="Product not found"
        description={error || "This product is no longer in your catalog."}
        action={
          <Button variant="secondary" onClick={() => router.push("/app/customers/products")}>
            Back to products
          </Button>
        }
      />
    );
  }

  const info = [
    { label: "Created date", value: formatDate(product.createdAt) },
    { label: "Last updated", value: formatDate(product.updatedAt) },
    { label: "Category", value: product.categoryName || "—" },
    { label: "Brand", value: product.brand || "—" },
    { label: "Product code", value: product.productCode || "—" },
    { label: "Unit", value: product.unit || "—" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Client", href: "/app/customers" },
          { label: "Products", href: "/app/customers/products" },
          { label: product.name },
        ]}
        title={product.name}
        description={`SKU ${product.sku}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/app/customers/products")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit Product
            </Button>
            <Button variant="secondary" onClick={() => void handleDuplicate()}>
              <Copy className="h-4 w-4" />
              Duplicate Product
            </Button>
            <Button variant="secondary" onClick={() => void handleStatus()}>
              <Power className="h-4 w-4" />
              {product.status === "ACTIVE" ? "Deactivate Product" : "Activate Product"}
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Delete Product
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Product Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-[rgb(var(--color-muted-foreground))]" />
                )}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  {product.status === "ACTIVE" ? (
                    <Badge variant="success" dot>
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                  {product.stockStatus === "LOW_STOCK" ? <Badge variant="warning">Low Stock</Badge> : null}
                  {product.stockStatus === "OUT_OF_STOCK" ? <Badge variant="danger">Out of Stock</Badge> : null}
                </div>
                <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                  {product.categoryName || "Uncategorized"}
                </p>
                <p className="text-2xl font-semibold">{fmt(product.price)}</p>
                {product.originalPrice != null ? (
                  <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                    Original {fmt(product.originalPrice)}
                    {product.discount != null ? ` · Discount ${fmt(product.discount)}` : ""}
                  </p>
                ) : null}
                <p className="text-sm">Stock quantity: {product.stockQuantity}</p>
              </div>
            </div>
            {product.description ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                {product.description}
              </p>
            ) : (
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No description yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-3">
              {info.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[rgb(var(--color-border))] pb-2 last:border-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    {row.label}
                  </dt>
                  <dd className="text-sm font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Related Orders</CardTitle>
          <Button size="sm" onClick={() => setOrderFormOpen(true)}>
            Create Order
          </Button>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">No orders for this product yet.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-[0.625rem] border border-[rgb(var(--color-border))] px-3 py-2 text-left"
                  onClick={() => router.push(`/app/customers/orders/${row.id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">{row.orderNumber}</p>
                    <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                      {row.customerName} · Qty {row.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">{fmt(row.total)}</p>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={product}
        categories={categories}
        onCategoriesChange={setCategories}
        onSaved={(saved) => setProduct(saved)}
      />

      <OrderFormDialog
        open={orderFormOpen}
        onOpenChange={setOrderFormOpen}
        initialProductId={product.id}
        onSaved={(saved) => setOrders((prev) => [saved, ...prev.filter((o) => o.id !== saved.id)])}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void handleDelete()}>
              Delete Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
