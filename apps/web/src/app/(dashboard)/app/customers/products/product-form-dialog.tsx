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
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Label,
} from "@doloyal/ui";
import { PRODUCT_UNITS } from "@doloyal/shared";
import type { CatalogProduct, CreateProductInput, ProductCategory } from "@doloyal/shared";
import { api } from "@/lib/api";
import { toast } from "sonner";

const NONE = "__none__";
const ADD_CATEGORY = "__add__";

export interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: CatalogProduct | null;
  categories: ProductCategory[];
  onCategoriesChange: (categories: ProductCategory[]) => void;
  onSaved: (product: CatalogProduct) => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onCategoriesChange,
  onSaved,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [categoryId, setCategoryId] = React.useState(NONE);
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [originalPrice, setOriginalPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("");
  const [stockQuantity, setStockQuantity] = React.useState("0");
  const [lowStockThreshold, setLowStockThreshold] = React.useState("5");
  const [availability, setAvailability] = React.useState<"IN_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
  const [unit, setUnit] = React.useState("");
  const [brand, setBrand] = React.useState("");
  const [productCode, setProductCode] = React.useState("");
  const [active, setActive] = React.useState(true);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [catName, setCatName] = React.useState("");
  const [catDesc, setCatDesc] = React.useState("");
  const [savingCat, setSavingCat] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setSku(product?.sku ?? "");
    setCategoryId(product?.categoryId ?? NONE);
    setDescription(product?.description ?? "");
    setPrice(product ? String(product.price) : "");
    setOriginalPrice(product?.originalPrice != null ? String(product.originalPrice) : "");
    setDiscount(product?.discount != null ? String(product.discount) : "");
    setStockQuantity(product ? String(product.stockQuantity) : "0");
    setLowStockThreshold(product ? String(product.lowStockThreshold) : "5");
    setAvailability(product?.availability ?? "IN_STOCK");
    setUnit(product?.unit ?? "");
    setBrand(product?.brand ?? "");
    setProductCode(product?.productCode ?? "");
    setActive((product?.status ?? "ACTIVE") === "ACTIVE");
    setImagePreview(product?.imageUrl ?? null);
    setImageFile(null);
  }, [open, product]);

  const onPickImage = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast.error("Use a PNG, JPEG or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildPayload = (): CreateProductInput | null => {
    if (!name.trim()) {
      toast.error("Product name is required");
      return null;
    }
    if (!sku.trim()) {
      toast.error("SKU is required");
      return null;
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error("Enter a valid selling price");
      return null;
    }
    const parsedOriginal = originalPrice === "" ? null : Number(originalPrice);
    if (parsedOriginal != null && (!Number.isFinite(parsedOriginal) || parsedOriginal < 0)) {
      toast.error("Enter a valid original price");
      return null;
    }
    const parsedDiscount = discount === "" ? null : Number(discount);
    if (parsedDiscount != null && (!Number.isFinite(parsedDiscount) || parsedDiscount < 0)) {
      toast.error("Enter a valid discount");
      return null;
    }
    const parsedStock = Number(stockQuantity);
    const parsedThreshold = Number(lowStockThreshold);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      toast.error("Enter a valid stock quantity");
      return null;
    }
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0) {
      toast.error("Enter a valid low stock threshold");
      return null;
    }
    return {
      name: name.trim(),
      sku: sku.trim(),
      description: description.trim(),
      categoryId: categoryId === NONE || categoryId === ADD_CATEGORY ? null : categoryId,
      price: parsedPrice,
      originalPrice: parsedOriginal,
      discount: parsedDiscount,
      stockQuantity: parsedStock,
      lowStockThreshold: parsedThreshold,
      unit: unit.trim(),
      brand: brand.trim(),
      productCode: productCode.trim(),
      status: active ? "ACTIVE" : "INACTIVE",
      availability,
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    try {
      setSaving(true);
      let saved = product
        ? await api.updateProduct(product.id, payload)
        : await api.createProduct(payload);
      if (imageFile) {
        saved = await api.uploadProductImage(saved.id, imageFile);
      }
      onSaved(saved);
      onOpenChange(false);
      toast.success(product ? "Product updated successfully." : "Product created successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save product");
    } finally {
      setSaving(false);
    }
  };

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
      onCategoriesChange([...categories, created].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryId(created.id);
      setCategoryOpen(false);
      setCatName("");
      setCatDesc("");
      toast.success("Category created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create category");
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update catalog details used across client engagement and loyalty workflows."
                : "Add a product or service to your catalog."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                Basic Information
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Product Name" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Premium Hair Spa" />
                </Field>
                <Field label="SKU" required>
                  <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="HS-001" />
                </Field>
              </div>
              <Field label="Category">
                <Select
                  value={categoryId}
                  onValueChange={(value) => {
                    if (value === ADD_CATEGORY) {
                      setCategoryOpen(true);
                      return;
                    }
                    setCategoryId(value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={ADD_CATEGORY}>+ Add Category</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
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
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                  />
                </Field>
                <Field label="Discount">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                Inventory
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Stock Quantity">
                  <Input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                  />
                </Field>
                <Field label="Low Stock Threshold">
                  <Input
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                  />
                </Field>
                <Field label="Availability">
                  <Select
                    value={availability}
                    onValueChange={(v) => setAvailability(v as "IN_STOCK" | "OUT_OF_STOCK")}
                  >
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.625rem] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted))] text-xs text-[rgb(var(--color-muted-foreground))]"
                >
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    "Upload"
                  )}
                </button>
                <div className="space-y-1.5">
                  <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                    Choose image
                  </Button>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">PNG, JPEG or WebP. Max 2MB.</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0])}
                />
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]">
                Optional
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Product Code">
                  <Input value={productCode} onChange={(e) => setProductCode(e.target.value)} />
                </Field>
                <Field label="Brand">
                  <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
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
              <div className="flex items-center justify-between rounded-[0.625rem] border border-[rgb(var(--color-border))] px-3.5 py-3">
                <div>
                  <Label>Status</Label>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {active ? "Active" : "Inactive"}
                  </p>
                </div>
                <Switch checked={active} onCheckedChange={setActive} />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {isEdit ? "Save changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
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
            <Button variant="secondary" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button loading={savingCat} onClick={handleCreateCategory}>
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
