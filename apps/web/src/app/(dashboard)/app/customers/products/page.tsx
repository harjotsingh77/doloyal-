"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  MoreHorizontal,
  Package,
  Search,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
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
import type { CatalogProduct, CatalogProductSummary, ProductCategory, ProductQuery } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { useResource } from "@/lib/use-resource";
import { toast } from "sonner";
import { ProductFormDialog } from "./product-form-dialog";
import { productImageSrc } from "./product-editor";
import { useCommerceLive } from "@/lib/data-sync";

const ALL = "__all__";

type ProductsBoot = {
  products: CatalogProduct[];
  total: number;
  summary: CatalogProductSummary;
  categories: ProductCategory[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadges({ product }: { product: CatalogProduct }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {product.status === "ACTIVE" ? (
        <Badge variant="success" dot>
          Active
        </Badge>
      ) : (
        <Badge variant="outline">Inactive</Badge>
      )}
      {product.stockStatus === "LOW_STOCK" ? (
        <Badge variant="warning">Low Stock</Badge>
      ) : null}
      {product.stockStatus === "OUT_OF_STOCK" ? (
        <Badge variant="danger">Out of Stock</Badge>
      ) : null}
    </div>
  );
}

function ProductThumb({ product }: { product: CatalogProduct }) {
  const src = productImageSrc(product.imageUrl);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-10 w-10 rounded-lg object-cover border border-[rgb(var(--color-border))]"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
      <Package className="h-4 w-4" />
    </span>
  );
}

export default function ProductsPage() {
  const router = useRouter();
  const { format: fmt } = useCurrency();
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(ALL);
  const [status, setStatus] = React.useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [stock, setStock] = React.useState<"ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [sort, setSort] = React.useState<NonNullable<ProductQuery["sort"]>>("updatedAt");
  const [order, setOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const pageSize = 20;

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CatalogProduct | null>(null);
  const [deleting, setDeleting] = React.useState<CatalogProduct | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const bootQuery = useResource<ProductsBoot>({
    queryKey: ["products-page", debouncedSearch, categoryId, status, stock, sort, order, page],
    queryFn: async () => {
      const query: ProductQuery = {
        search: debouncedSearch || undefined,
        categoryId: categoryId === ALL ? undefined : categoryId,
        status,
        stock,
        sort,
        order,
        page,
        limit: pageSize,
      };
      const [list, stats, cats] = await Promise.all([
        api.listProducts(query),
        api.getProductSummary(),
        api.listProductCategories(),
      ]);
      return {
        products: list.items,
        total: list.total,
        summary: stats,
        categories: cats,
      };
    },
    scopes: ["products", "orders", "dashboard"],
    keepPrevious: true,
  });

  const products = bootQuery.data?.products ?? [];
  const total = bootQuery.data?.total ?? 0;
  const summary = bootQuery.data?.summary ?? null;
  const categories = bootQuery.data?.categories ?? [];
  const loading = bootQuery.isLoading && !bootQuery.data;
  const error = bootQuery.error && !bootQuery.data
    ? bootQuery.error instanceof Error
      ? bootQuery.error.message
      : "Failed to load products"
    : null;

  const load = React.useCallback(async (_opts?: { silent?: boolean }) => {
    await bootQuery.refetch();
  }, [bootQuery]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, status, stock, sort, order]);

  useCommerceLive(["products", "orders"], () => void load({ silent: true }));

  const toggleSort = (key: NonNullable<ProductQuery["sort"]>) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder(key === "name" || key === "sku" || key === "category" ? "asc" : "desc");
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDuplicate = async (product: CatalogProduct) => {
    try {
      const copy = await api.duplicateProduct(product.id);
      toast.success("Product duplicated");
      router.push(`/app/customers/products/${copy.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate product");
    }
  };

  const handleStatus = async (product: CatalogProduct) => {
    try {
      await api.changeProductStatus(product.id);
      toast.success(product.status === "ACTIVE" ? "Product deactivated" : "Product activated");
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      setBusy(true);
      await api.deleteProduct(deleting.id);
      toast.success("Product deleted");
      setDeleting(null);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete product");
    } finally {
      setBusy(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const emptyCatalog = !loading && !error && total === 0 && !debouncedSearch && categoryId === ALL && status === "ALL" && stock === "ALL";

  const filters = (
    <>
      <Select value={categoryId} onValueChange={setCategoryId}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All Categories</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
        <SelectTrigger className="w-full sm:w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="INACTIVE">Inactive</SelectItem>
        </SelectContent>
      </Select>
      <Select value={stock} onValueChange={(v) => setStock(v as typeof stock)}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="Stock" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="IN_STOCK">In Stock</SelectItem>
          <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
          <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
        </SelectContent>
      </Select>
    </>
  );

  const rowMenu = (product: CatalogProduct) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Product actions" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => router.push(`/app/customers/products/${product.id}`)}>View</DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setEditing(product);
            setFormOpen(true);
          }}
        >
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleDuplicate(product)}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void handleStatus(product)}>Change Status</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => setDeleting(product)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your products and services, keep pricing and product information organized, and use them across client engagement and loyalty workflows."
        actions={
          <Button onClick={openCreate}>Add Product</Button>
        }
      />

      {error ? (
        <EmptyState
          title="Products could not be loaded"
          description={error}
          action={<Button onClick={() => void load()}>Try again</Button>}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {loading && !summary ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[4.75rem] rounded-lg" />)
            ) : (
              <>
                <KpiCard
                  label="Total Products"
                  value={summary?.total ?? 0}
                  accent="primary"
                />
                <KpiCard
                  label="Active Products"
                  value={summary?.active ?? 0}
                  accent="success"
                />
                <KpiCard
                  label="Low Stock"
                  value={summary?.lowStock ?? 0}
                  accent="warning"
                  onClick={() => setStock("LOW_STOCK")}
                />
                <KpiCard
                  label="Out of Stock"
                  value={summary?.outOfStock ?? 0}
                  accent="danger"
                  onClick={() => setStock("OUT_OF_STOCK")}
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
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
            <div className="hidden items-center gap-2 lg:flex">{filters}</div>
            <Button
              variant="secondary"
              className="lg:hidden"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              Filters
            </Button>
          </div>
          {filtersOpen ? <div className="grid gap-2 sm:grid-cols-3 lg:hidden">{filters}</div> : null}

          {emptyCatalog ? (
            <EmptyState
              title="No products yet"
              description="Add your first product to start managing your catalog and using products across your client engagement workflows."
              action={
                <Button onClick={openCreate}>
                  Add Product
                </Button>
              }
            />
          ) : loading && products.length === 0 ? (
            <Skeleton className="h-72 rounded-xl" />
          ) : products.length === 0 ? (
            <EmptyState
              title="No matching products"
              description="Try a different search or clear the filters."
            />
          ) : (
            <>
              <div className="hidden md:block overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {(
                        [
                          ["name", "Product"],
                          ["sku", "SKU"],
                          ["category", "Category"],
                          ["price", "Price"],
                          ["stock", "Stock"],
                          ["status", "Status"],
                          ["updatedAt", "Updated"],
                        ] as const
                      ).map(([key, label]) => (
                        <TableHead key={key}>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 hover:text-[rgb(var(--color-foreground))]"
                            onClick={() => toggleSort(key)}
                          >
                            {label}
                            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                          </button>
                        </TableHead>
                      ))}
                      <TableHead className="w-12">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/app/customers/products/${product.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProductThumb product={product} />
                            <span className="font-medium text-[rgb(var(--color-foreground))]">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>{product.categoryName || "—"}</TableCell>
                        <TableCell>{fmt(product.price)}</TableCell>
                        <TableCell>{product.stockQuantity}</TableCell>
                        <TableCell>
                          <StatusBadges product={product} />
                        </TableCell>
                        <TableCell className="text-[rgb(var(--color-muted-foreground))]">
                          {formatDate(product.updatedAt)}
                        </TableCell>
                        <TableCell>{rowMenu(product)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:hidden">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer p-4"
                    onClick={() => router.push(`/app/customers/products/${product.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductThumb product={product} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="font-mono text-xs text-[rgb(var(--color-muted-foreground))]">{product.sku}</p>
                        </div>
                      </div>
                      {rowMenu(product)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                      <span>{product.categoryName || "Uncategorized"}</span>
                      <span>{fmt(product.price)}</span>
                      <span>Stock {product.stockQuantity}</span>
                      <span>{formatDate(product.updatedAt)}</span>
                    </div>
                    <div className="mt-2">
                      <StatusBadges product={product} />
                    </div>
                  </Card>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-[rgb(var(--color-muted-foreground))]">
                <span>
                  Page {page} of {totalPages} · {total} products
                </span>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
        onCategoriesChange={() => {
          void load();
        }}
        onSaved={() => void load()}
      />

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product?</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
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
