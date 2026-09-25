"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Power, Trash2 } from "lucide-react";
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
import { useTenant } from "@/lib/tenant-query";
import { toast } from "sonner";
import { OrderFormDialog } from "../../orders/order-form-dialog";
import { useCommerceLive } from "@/lib/data-sync";
import {
  CategoryCreateDialog,
  ProductEditorFields,
  buildProductPayload,
  persistProduct,
  pickProductImage,
  productFormDefaults,
  productImageSrc,
} from "../product-editor";

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
  const { data: tenant } = useTenant();
  const [product, setProduct] = React.useState<CatalogProduct | null>(null);
  const [categories, setCategories] = React.useState<ProductCategory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [orderFormOpen, setOrderFormOpen] = React.useState(false);
  const [orders, setOrders] = React.useState<ClientOrder[]>([]);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(() => productFormDefaults(null, null));
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [imageBusy, setImageBusy] = React.useState(false);
  const savingRef = React.useRef(false);
  const imageFileRef = React.useRef<File | null>(null);
  const imageBusyRef = React.useRef(false);
  const hasLoadedRef = React.useRef(false);
  imageFileRef.current = imageFile;
  imageBusyRef.current = imageBusy;

  const load = React.useCallback(async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      const [row, cats, related] = await Promise.all([
        api.getProduct(params.id),
        api.listProductCategories(),
        api.listOrders({ productId: params.id, limit: 50 }).catch(() => ({ items: [] as ClientOrder[] })),
      ]);
      setProduct(row);
      setCategories(cats);
      setOrders(related.items);
      hasLoadedRef.current = true;
      if (!imageFileRef.current && !savingRef.current && !imageBusyRef.current) {
        setImageFile(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!product) return;
    setForm(productFormDefaults(product, tenant));
  }, [product?.id, tenant]);

  useCommerceLive(["products", "orders"], () => {
    if (savingRef.current || imageFileRef.current || imageBusyRef.current) return;
    void load();
  });

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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
      setForm(productFormDefaults(next, tenant));
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

  const applySaved = (saved: CatalogProduct) => {
    setProduct(saved);
    setForm(productFormDefaults(saved, tenant));
    setImageFile(null);
  };

  const applyImageSaved = (saved: CatalogProduct) => {
    setProduct(saved);
    patch("imagePreview", productImageSrc(saved.imageUrl));
    setImageFile(null);
  };

  const handleSave = async () => {
    if (!product) return;
    const payload = buildProductPayload(form, { requireSku: true });
    if (!payload) return;
    try {
      setSaving(true);
      savingRef.current = true;
      const saved = await persistProduct({ product, payload, imageFile });
      applySaved(saved);
      toast.success("Product settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handlePickImage = (file: File | undefined) => {
    void pickProductImage(file, async (next, preview) => {
      setImageFile(next);
      patch("imagePreview", preview);
      if (!product) return;
      try {
        setImageBusy(true);
        imageBusyRef.current = true;
        const saved = await api.uploadProductImage(product.id, next);
        applyImageSaved(saved);
        toast.success("Product image uploaded");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not upload image");
      } finally {
        imageBusyRef.current = false;
        setImageBusy(false);
      }
    });
  };

  const handleRemoveImage = async () => {
    if (!product) return;
    try {
      setImageBusy(true);
      imageBusyRef.current = true;
      const saved = await api.deleteProductImage(product.id);
      applyImageSaved(saved);
      toast.success("Product image removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove image");
    } finally {
      imageBusyRef.current = false;
      setImageBusy(false);
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
    { label: "SKU", value: product.sku },
    { label: "Product code", value: form.productCode || product.sku },
    { label: "Category", value: categories.find((c) => c.id === form.categoryId)?.name || "Uncategorized" },
    { label: "Brand", value: form.brand || "—" },
    { label: "Unit", value: form.unit || "—" },
    { label: "Selling price", value: fmt(Number(form.price) || product.price) },
    { label: "Original price", value: form.originalPrice ? fmt(Number(form.originalPrice)) : "—" },
    { label: "Discount", value: form.discount ? fmt(Number(form.discount)) : "—" },
    { label: "Stock quantity", value: form.stockQuantity },
    { label: "Low stock at", value: form.lowStockThreshold },
    { label: "Availability", value: form.availability === "IN_STOCK" ? "In stock" : "Out of stock" },
    { label: "Status", value: form.active ? "Active" : "Inactive" },
    { label: "Created date", value: formatDate(product.createdAt) },
    { label: "Last updated", value: formatDate(product.updatedAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: "Client", href: "/app/customers" },
          { label: "Products", href: "/app/customers/products" },
          { label: product.name },
        ]}
        title={form.name || product.name}
        description={`SKU ${form.sku || product.sku}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => router.push("/app/customers/products")}>
              <ArrowLeft className="h-4 w-4" />
              Back
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
            <Button loading={saving} onClick={() => void handleSave()}>
              Save settings
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Product settings</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductEditorFields
              name={form.name}
              setName={(v) => patch("name", v)}
              sku={form.sku}
              setSku={(v) => patch("sku", v)}
              categoryId={form.categoryId}
              setCategoryId={(v) => patch("categoryId", v)}
              description={form.description}
              setDescription={(v) => patch("description", v)}
              price={form.price}
              setPrice={(v) => patch("price", v)}
              originalPrice={form.originalPrice}
              setOriginalPrice={(v) => patch("originalPrice", v)}
              discount={form.discount}
              setDiscount={(v) => patch("discount", v)}
              stockQuantity={form.stockQuantity}
              setStockQuantity={(v) => patch("stockQuantity", v)}
              lowStockThreshold={form.lowStockThreshold}
              setLowStockThreshold={(v) => patch("lowStockThreshold", v)}
              availability={form.availability}
              setAvailability={(v) => patch("availability", v)}
              unit={form.unit}
              setUnit={(v) => patch("unit", v)}
              brand={form.brand}
              setBrand={(v) => patch("brand", v)}
              productCode={form.productCode}
              setProductCode={(v) => patch("productCode", v)}
              active={form.active}
              setActive={(v) => patch("active", v)}
              imagePreview={form.imagePreview}
              onPickImage={handlePickImage}
              onRemoveImage={() => void handleRemoveImage()}
              imageBusy={imageBusy}
              categories={categories}
              onAddCategory={() => setCategoryOpen(true)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            {form.imagePreview ? (
              <div className="mb-4 overflow-hidden rounded-[0.625rem] border border-[rgb(var(--color-border))]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imagePreview} alt="" className="h-48 w-full object-cover" />
              </div>
            ) : null}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {form.active ? (
                <Badge variant="success" dot>
                  Active
                </Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
              {product.stockStatus === "LOW_STOCK" ? <Badge variant="warning">Low Stock</Badge> : null}
              {product.stockStatus === "OUT_OF_STOCK" ? <Badge variant="danger">Out of Stock</Badge> : null}
            </div>
            <dl className="grid grid-cols-1 gap-3">
              {info.map((row) => (
                <div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-[rgb(var(--color-border))] pb-2 last:border-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                    {row.label}
                  </dt>
                  <dd className="text-right text-sm font-medium">{row.value}</dd>
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

      <CategoryCreateDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        categories={categories}
        onCreated={(next, selectedId) => {
          setCategories(next);
          patch("categoryId", selectedId);
        }}
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
