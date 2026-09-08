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
  ClientOrderStatus,
  CreateClientOrderInput,
  Customer,
  StaffMember,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";

const NONE = "__none__";

function staffLabel(member: StaffMember) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.email;
}

function computeTotal(quantity: number, unitPrice: number, discount: number, tax: number) {
  return Math.round(Math.max(0, quantity * unitPrice - discount + tax) * 100) / 100;
}

export interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ClientOrder | null;
  initialCustomerId?: string;
  initialProductId?: string;
  onSaved: (order: ClientOrder) => void;
}

export function OrderFormDialog({
  open,
  onOpenChange,
  order,
  initialCustomerId,
  initialProductId,
  onSaved,
}: OrderFormDialogProps) {
  const { format: fmt } = useCurrency();
  const isEdit = Boolean(order);
  const [saving, setSaving] = React.useState(false);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [products, setProducts] = React.useState<CatalogProduct[]>([]);
  const [staff, setStaff] = React.useState<StaffMember[]>([]);

  const [customerId, setCustomerId] = React.useState("");
  const [productId, setProductId] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [unitPrice, setUnitPrice] = React.useState("");
  const [discount, setDiscount] = React.useState("0");
  const [tax, setTax] = React.useState("0");
  const [status, setStatus] = React.useState<ClientOrderStatus>("PENDING");
  const [paymentStatus, setPaymentStatus] = React.useState<ClientOrderPaymentStatus>("PENDING");
  const [orderDate, setOrderDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [assignedStaffId, setAssignedStaffId] = React.useState(NONE);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function loadOptions() {
      try {
        const [cust, prod, team] = await Promise.all([
          api.listCustomers({ limit: 200 }),
          api.listProducts({ limit: 100, status: "ACTIVE" }),
          api.listStaffMembers({ page: 1, pageSize: 100 }).catch(() => ({ items: [] as StaffMember[] })),
        ]);
        if (cancelled) return;
        setCustomers(cust.items);
        setProducts(prod.items);
        setStaff(team.items);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load order options");
      }
    }
    void loadOptions();
    setCustomerId(order?.customerId ?? initialCustomerId ?? "");
    setProductId(order?.productId ?? initialProductId ?? "");
    setQuantity(order ? String(order.quantity) : "1");
    setUnitPrice(order ? String(order.unitPrice) : "");
    setDiscount(order ? String(order.discount) : "0");
    setTax(order ? String(order.tax) : "0");
    setStatus(order?.status ?? "PENDING");
    setPaymentStatus(order?.paymentStatus ?? "PENDING");
    setOrderDate(
      (order?.orderDate ?? new Date().toISOString()).slice(0, 10),
    );
    setNotes(order?.notes ?? "");
    setAssignedStaffId(order?.assignedStaffId ?? NONE);
    return () => {
      cancelled = true;
    };
  }, [open, order, initialCustomerId, initialProductId]);

  React.useEffect(() => {
    if (!open || order || !productId) return;
    const product = products.find((p) => p.id === productId);
    if (product) setUnitPrice(String(product.price));
  }, [open, order, productId, products]);

  const qty = Math.max(1, Number(quantity) || 1);
  const price = Math.max(0, Number(unitPrice) || 0);
  const disc = Math.max(0, Number(discount) || 0);
  const taxAmt = Math.max(0, Number(tax) || 0);
  const total = computeTotal(qty, price, disc, taxAmt);

  const handleSave = async () => {
    if (!customerId) {
      toast.error("Select a client");
      return;
    }
    if (!productId) {
      toast.error("Select a product or service");
      return;
    }
    const member = staff.find((s) => s.id === assignedStaffId);
    const payload: CreateClientOrderInput = {
      customerId,
      productId,
      quantity: qty,
      unitPrice: price,
      discount: disc,
      tax: taxAmt,
      status,
      paymentStatus,
      orderDate,
      notes,
      assignedStaffId: assignedStaffId === NONE ? null : assignedStaffId,
      assignedStaffName: member ? staffLabel(member) : null,
    };
    try {
      setSaving(true);
      const saved = isEdit && order
        ? await api.updateOrder(order.id, payload)
        : await api.createOrder(payload);
      toast.success(isEdit ? "Order updated" : "Order created");
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Order" : "Create Order"}</DialogTitle>
          <DialogDescription>
            Connect a client with a product or service. Totals update as you change quantity, price, discount, and tax.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client" required className="sm:col-span-2">
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Product / Service" required className="sm:col-span-2">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {fmt(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Quantity" required>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Price" required>
            <Input type="number" min={0} step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </Field>
          <Field label="Discount">
            <Input type="number" min={0} step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </Field>
          <Field label="Tax">
            <Input type="number" min={0} step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
          </Field>
          <Field label="Total Amount" className="sm:col-span-2">
            <Input value={fmt(total)} readOnly />
          </Field>
          <Field label="Order Status">
            <Select value={status} onValueChange={(v) => setStatus(v as ClientOrderStatus)}>
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
          </Field>
          <Field label="Payment Status">
            <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as ClientOrderPaymentStatus)}>
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
          </Field>
          <Field label="Order Date">
            <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
          </Field>
          <Field label="Assigned Staff">
            <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Unassigned</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {staffLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={saving} onClick={() => void handleSave()}>
            {isEdit ? "Save Changes" : "Create Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
