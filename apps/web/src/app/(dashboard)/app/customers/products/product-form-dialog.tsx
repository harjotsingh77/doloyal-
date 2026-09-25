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
} from "@doloyal/ui";
import { api } from "@/lib/api";
import type { CatalogProduct, ProductCategory } from "@doloyal/shared";
import { toast } from "sonner";
import { useTenant } from "@/lib/tenant-query";
import {
  CategoryCreateDialog,
  ProductEditorFields,
  PRODUCT_SKU_INPUT_ID,
  buildProductPayload,
  persistProduct,
  pickProductImage,
  productFormDefaults,
  productImageSrc,
} from "./product-editor";

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
  const { data: tenant } = useTenant();
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState(() => productFormDefaults(product, tenant));
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [imageBusy, setImageBusy] = React.useState(false);
  const [skuError, setSkuError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setForm(productFormDefaults(product, tenant));
    setImageFile(null);
    setSkuError(null);
    // Ensure Name/SKU stay visible — dialog body scrolls and users often miss them.
    requestAnimationFrame(() => {
      const sku = document.getElementById(PRODUCT_SKU_INPUT_ID);
      sku?.closest('[role="dialog"]')?.scrollTo?.({ top: 0 });
    });
  }, [open, product, tenant]);

  const patch = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === "sku") setSkuError(null);
  };

  const focusSkuField = () => {
    requestAnimationFrame(() => {
      const el = document.getElementById(PRODUCT_SKU_INPUT_ID) as HTMLInputElement | null;
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
      el?.focus();
      el?.select();
    });
  };

  const handleSave = async () => {
    const payload = buildProductPayload(form, { requireSku: isEdit });
    if (!payload) return;
    try {
      setSaving(true);
      setSkuError(null);
      const saved = await persistProduct({ product, payload, imageFile });
      onSaved(saved);
      onOpenChange(false);
      toast.success(product ? "Product updated successfully." : "Product created successfully.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save product";
      if (/sku/i.test(message)) {
        setSkuError(message);
        focusSkuField();
      }
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Create Product"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Update catalog details used across client engagement and loyalty workflows."
                : "Add a product or service to your catalog. A unique SKU is suggested automatically."}
            </DialogDescription>
          </DialogHeader>

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
            skuError={skuError}
            onPickImage={(file) =>
              void pickProductImage(file, async (next, preview) => {
                setImageFile(next);
                patch("imagePreview", preview);
                if (!product) return;
                try {
                  setImageBusy(true);
                  const saved = await api.uploadProductImage(product.id, next);
                  setImageFile(null);
                  patch("imagePreview", productImageSrc(saved.imageUrl));
                  onSaved(saved);
                  toast.success("Product image uploaded");
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not upload image");
                } finally {
                  setImageBusy(false);
                }
              })
            }
            onRemoveImage={
              product
                ? () => {
                    void (async () => {
                      try {
                        setImageBusy(true);
                        const saved = await api.deleteProductImage(product.id);
                        setImageFile(null);
                        patch("imagePreview", null);
                        onSaved(saved);
                        toast.success("Product image removed");
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Could not remove image");
                      } finally {
                        setImageBusy(false);
                      }
                    })();
                  }
                : () => {
                    setImageFile(null);
                    patch("imagePreview", null);
                  }
            }
            imageBusy={imageBusy}
            categories={categories}
            onAddCategory={() => setCategoryOpen(true)}
          />

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              {isEdit ? "Save changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryCreateDialog
        open={categoryOpen}
        onOpenChange={setCategoryOpen}
        categories={categories}
        onCreated={(next, selectedId) => {
          onCategoriesChange(next);
          patch("categoryId", selectedId);
        }}
      />
    </>
  );
}
