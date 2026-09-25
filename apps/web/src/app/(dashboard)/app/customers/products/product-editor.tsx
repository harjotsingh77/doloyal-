"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@doloyal/ui";
import { PRODUCT_UNITS } from "@doloyal/shared";
import type { CatalogProduct, CreateProductInput, ProductCategory, Tenant } from "@doloyal/shared";
import { api } from "@/lib/api";
import { getApiBaseUrl } from "@/lib/api-base";
import { suppressAppSyncFocusReload } from "@/lib/data-sync";
import { toast } from "sonner";

export const NONE = "__none__";
export const ADD_CATEGORY = "__add__";
const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
export const PRODUCT_SKU_INPUT_ID = "product-sku-input";

/** Client-side draft SKU so create forms aren't empty/colliding with common values. */
export function suggestProductSku(name?: string) {
  const base = (name?.trim() || "PRD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "PRD";
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
    .toUpperCase()
    .slice(-8);
  return `${base}-${suffix}`.slice(0, 64);
}

export function productImageSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("data:") || url.startsWith("blob:") || /^https?:\/\//i.test(url)) return url;
  const base = getApiBaseUrl();
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function filled(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

export function productFormDefaults(
  product?: CatalogProduct | null,
  tenant?: Tenant | null,
): {
  name: string;
  sku: string;
  categoryId: string;
  description: string;
  price: string;
  originalPrice: string;
  discount: string;
  stockQuantity: string;
  lowStockThreshold: string;
  availability: "IN_STOCK" | "OUT_OF_STOCK";
  unit: string;
  brand: string;
  productCode: string;
  active: boolean;
  imagePreview: string | null;
} {
  return {
    name: product?.name ?? "",
    sku: product?.sku ?? suggestProductSku(),
    categoryId: product?.categoryId ?? NONE,
    description: product?.description ?? "",
    price: product != null ? String(product.price) : "",
    originalPrice: product?.originalPrice != null ? String(product.originalPrice) : "",
    discount: product?.discount != null ? String(product.discount) : "",
    stockQuantity: product != null ? String(product.stockQuantity) : "0",
    lowStockThreshold: product != null ? String(product.lowStockThreshold) : "5",
    availability: product?.availability ?? "IN_STOCK",
    unit: filled(product?.unit) || "Service",
    brand: filled(product?.brand) || filled(tenant?.brandName) || filled(tenant?.name) || "",
    productCode: filled(product?.productCode) || filled(product?.sku) || "",
    active: (product?.status ?? "ACTIVE") === "ACTIVE",
    imagePreview: productImageSrc(product?.imageUrl) ?? null,
  };
}

export function buildProductPayload(
  state: {
    name: string;
    sku: string;
    categoryId: string;
    description: string;
    price: string;
    originalPrice: string;
    discount: string;
    stockQuantity: string;
    lowStockThreshold: string;
    availability: "IN_STOCK" | "OUT_OF_STOCK";
    unit: string;
    brand: string;
    productCode: string;
    active: boolean;
  },
  options?: { requireSku?: boolean },
): CreateProductInput | null {
  if (!state.name.trim()) {
    toast.error("Product name is required");
    return null;
  }
  if (options?.requireSku && !state.sku.trim()) {
    toast.error("SKU is required");
    return null;
  }
  const parsedPrice = Number(state.price);
  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    toast.error("Enter a valid selling price");
    return null;
  }
  const parsedOriginal = state.originalPrice === "" ? null : Number(state.originalPrice);
  if (parsedOriginal != null && (!Number.isFinite(parsedOriginal) || parsedOriginal < 0)) {
    toast.error("Enter a valid original price");
    return null;
  }
  const parsedDiscount = state.discount === "" ? null : Number(state.discount);
  if (parsedDiscount != null && (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)) {
    toast.error("Enter a valid discount");
    return null;
  }
  const parsedStock = Number(state.stockQuantity);
  const parsedThreshold = Number(state.lowStockThreshold);
  if (!Number.isFinite(parsedStock) || parsedStock < 0) {
    toast.error("Enter a valid stock quantity");
    return null;
  }
  if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
    toast.error("Enter a valid low stock threshold");
    return null;
  }
  return {
    name: state.name.trim(),
    sku: state.sku.trim(),
    description: state.description.trim(),
    categoryId: state.categoryId === NONE || state.categoryId === ADD_CATEGORY ? null : state.categoryId,
    price: parsedPrice,
    originalPrice: parsedOriginal,
    discount: parsedDiscount,
    stockQuantity: parsedStock,
    lowStockThreshold: parsedThreshold,
    unit: state.unit.trim(),
    brand: state.brand.trim(),
    productCode: state.productCode.trim(),
    status: state.active ? "ACTIVE" : "INACTIVE",
    availability: state.availability,
  };
}

export async function persistProduct(options: {
  product?: CatalogProduct | null;
  payload: CreateProductInput;
  imageFile: File | null;
}) {
  let saved = options.product
    ? await api.updateProduct(options.product.id, options.payload)
    : await api.createProduct(options.payload);
  if (options.imageFile) {
    saved = await api.uploadProductImage(saved.id, options.imageFile);
  }
  return saved;
}

function ImageFileHitbox({
  label,
  busy,
  className,
  onPick,
  children,
}: {
  label: string;
  busy?: boolean;
  className?: string;
  onPick: (file: File | undefined) => void;
  children: React.ReactNode;
}) {
  return (
    <div className={`relative inline-flex overflow-hidden ${className ?? ""}`.trim()}>
      <div className="pointer-events-none">{children}</div>
      <input
        type="file"
        accept="image/*,.png,.jpg,.jpeg,.webp,.gif,.avif,.heic,.heif"
        disabled={busy}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={label}
        onClick={() => suppressAppSyncFocusReload()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onPick(file);
        }}
      />
    </div>
  );
}

export function ProductEditorFields({
  name, setName,
  sku, setSku,
  categoryId, setCategoryId,
  description, setDescription,
  price, setPrice,
  originalPrice, setOriginalPrice,
  discount, setDiscount,
  stockQuantity, setStockQuantity,
  lowStockThreshold, setLowStockThreshold,
  availability, setAvailability,
  unit, setUnit,
  brand, setBrand,
  productCode, setProductCode,
  active, setActive,
  imagePreview,
  onPickImage,
  onRemoveImage,
  categories,
  onAddCategory,
  imageBusy,
  skuError,
}: {
  name: string; setName: (v: string) => void;
  sku: string; setSku: (v: string) => void;
  categoryId: string; setCategoryId: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  originalPrice: string; setOriginalPrice: (v: string) => void;
  discount: string; setDiscount: (v: string) => void;
  stockQuantity: string; setStockQuantity: (v: string) => void;
  lowStockThreshold: string; setLowStockThreshold: (v: string) => void;
  availability: "IN_STOCK" | "OUT_OF_STOCK"; setAvailability: (v: "IN_STOCK" | "OUT_OF_STOCK") => void;
  unit: string; setUnit: (v: string) => void;
  brand: string; setBrand: (v: string) => void;
  productCode: string; setProductCode: (v: string) => void;
  active: boolean; setActive: (v: boolean) => void;
  imagePreview: string | null;
  onPickImage: (file: File | undefined) => void;
  onRemoveImage?: () => void;
  categories: ProductCategory[];
  onAddCategory: () => void;
  imageBusy?: boolean;
  skuError?: string | null;
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
          Basic Information
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium Hair Spa" />
          </Field>
          <Field
            label="SKU"
            htmlFor={PRODUCT_SKU_INPUT_ID}
            error={skuError || undefined}
            hint={skuError ? undefined : "Unique per catalog. Leave blank to auto-generate."}
          >
            <Input
              id={PRODUCT_SKU_INPUT_ID}
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="Auto if blank"
              aria-invalid={Boolean(skuError)}
            />
          </Field>
          <Field label="Product Code">
            <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} placeholder="Same as SKU if empty" />
          </Field>
          <Field label="Brand">
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Your business name" />
          </Field>
          <Field label="Category">
            <Select
              value={categoryId}
              onValueChange={(value) => {
                if (value === ADD_CATEGORY) {
                  onAddCategory();
                  return;
                }
                setCategoryId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Uncategorized</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem value={ADD_CATEGORY}>+ Add Category</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit">
            <Select value={unit || NONE} onValueChange={(v) => setUnit(v === NONE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {PRODUCT_UNITS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description of this product or service"
            rows={4}
          />
        </Field>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
          Pricing
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Selling Price" required>
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </Field>
          <Field label="Original Price">
            <Input type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
          </Field>
          <Field label="Discount">
            <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
          Inventory
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Stock Quantity">
            <Input type="number" min="0" value={stockQuantity} onChange={(e) => setStockQuantity(e.target.value)} />
          </Field>
          <Field label="Low Stock Threshold">
            <Input type="number" min="0" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
          </Field>
          <Field label="Availability">
            <Select value={availability} onValueChange={(v) => setAvailability(v as "IN_STOCK" | "OUT_OF_STOCK")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
          Product Image
        </p>
        <div
          className="flex items-center gap-4 rounded-[0.625rem] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))]/40 p-3"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            suppressAppSyncFocusReload();
            onPickImage(e.dataTransfer.files?.[0]);
          }}
        >
          <ImageFileHitbox
            label="Product image"
            busy={imageBusy}
            className="h-24 w-24 shrink-0"
            onPick={onPickImage}
          >
            <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[0.625rem] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-background))] text-xs text-[rgb(var(--color-muted-foreground))]">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-full w-full object-cover" />
              ) : (
                "Upload"
              )}
            </span>
          </ImageFileHitbox>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-2">
              <ImageFileHitbox label={imagePreview ? "Change image" : "Choose image"} busy={imageBusy} onPick={onPickImage}>
                <Button type="button" variant="secondary" size="sm" loading={imageBusy} tabIndex={-1}>
                  {imagePreview ? "Change image" : "Choose image"}
                </Button>
              </ImageFileHitbox>
              {imagePreview && onRemoveImage ? (
                <Button type="button" variant="ghost" size="sm" disabled={imageBusy} onClick={onRemoveImage}>
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Click Change image and pick a photo from Finder. PNG, JPEG, WebP or GIF. It uploads as soon as you select it.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between rounded-[0.625rem] border border-[rgb(var(--color-border))] px-3.5 py-3">
        <div>
          <Label>Status</Label>
          <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{active ? "Active" : "Inactive"}</p>
        </div>
        <Switch checked={active} onCheckedChange={setActive} />
      </div>
    </div>
  );
}

export function CategoryCreateDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ProductCategory[];
  onCreated: (categories: ProductCategory[], selectedId: string) => void;
}) {
  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");
  const [savingCat, setSavingCat] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setCatName("");
      setCatDesc("");
    }
  }, [open]);

  const handleCreateCategory = async () => {
    if (!catName.trim()) {
      toast.error("Category name is required");
      return;
    }
    try {
      setSavingCat(true);
      const created = await api.createProductCategory({
        name: catName.trim(),
        description: catDesc.trim(),
      });
      onCreated([...categories, created].sort((a, b) => a.name.localeCompare(b.name)), created.id);
      onOpenChange(false);
      toast.success("Category created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create category");
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Organize products with a new catalog category.</DialogDescription>
        </DialogHeader>
        <Field label="Category Name" required>
          <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Hair Care" />
        </Field>
        <Field label="Description">
          <Textarea value={catDesc} onChange={(e) => setCatDesc(e.target.value)} rows={3} />
        </Field>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={savingCat} onClick={() => void handleCreateCategory()}>
            Create Category
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function isProductImageFile(file: File) {
  const type = (file.type || "").toLowerCase();
  const name = file.name || "";
  if (/^image\/(png|jpe?g|jpg|pjpeg|webp|gif|avif|heic|heif)$/i.test(type)) return true;
  if (type.startsWith("image/") && type !== "image/svg+xml" && type !== "image/svg") return true;
  return /\.(png|jpe?g|webp|gif|avif|heic|heif)$/i.test(name);
}

function isHeicLike(file: File) {
  return /heic|heif/i.test(file.type || "") || /\.(heic|heif)$/i.test(file.name || "");
}

export async function compressProductImage(file: File): Promise<File> {
  if (/gif$/i.test(file.type) || /\.gif$/i.test(file.name)) return file;
  if (!isHeicLike(file) && file.size <= 400 * 1024) return file;
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), "image/jpeg", 0.84);
    });
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export async function pickProductImage(
  file: File | undefined,
  onOk: (file: File, preview: string) => void | Promise<void>,
) {
  if (!file) return;
  if (!isProductImageFile(file) && !isHeicLike(file)) {
    toast.error("Use a PNG, JPEG, WebP or GIF image");
    return;
  }
  if (file.size > IMAGE_MAX_BYTES) {
    toast.error("Image must be under 12MB");
    return;
  }
  const prepared = await compressProductImage(file);
  if (isHeicLike(prepared)) {
    toast.error("This iPhone photo format isn't supported. In Finder export it as JPEG or PNG, then choose it again.");
    return;
  }
  onOk(prepared, URL.createObjectURL(prepared));
}
