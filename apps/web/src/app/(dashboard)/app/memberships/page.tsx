"use client";

import * as React from "react";
import { Crown, Plus } from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog,
  DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
  DialogTrigger, EmptyState, Field, Input, PageHeader, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@doloyal/ui";
import type { CreateMembershipTierInput, MembershipTier } from "@doloyal/shared";
import { api } from "@/lib/api";
import { useCurrency } from "@/lib/currency-context";
import { toast } from "sonner";

export default function MembershipsPage() {
  const { format } = useCurrency();
  const [tiers, setTiers] = React.useState<MembershipTier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState<"SILVER" | "GOLD" | "PLATINUM">("SILVER");
  const [price, setPrice] = React.useState("0");
  const [benefits, setBenefits] = React.useState("");

  const load = React.useCallback(async () => {
    try { setLoading(true); setTiers(await api.getTiers()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not load membership tiers"); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const createTier = async () => {
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) { toast.error("Enter a valid membership price"); return; }
    try {
      setSaving(true);
      const input: CreateMembershipTierInput = {
        name, price: parsedPrice, validityDays: 365, discountPercent: 0,
        bonusPointsPercent: 0, priorityBooking: false,
        benefits: benefits.split(",").map((item) => item.trim()).filter(Boolean),
      };
      await api.createTier(input);
      setOpen(false); setName("SILVER"); setPrice("0"); setBenefits("");
      await load(); toast.success("Membership tier created");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create membership tier"); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6">
    <PageHeader title="Memberships" description="Create and manage customer membership tiers" actions={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4" />Add Tier</Button></DialogTrigger>
        <DialogContent><DialogHeader><DialogTitle>Add membership tier</DialogTitle><DialogDescription>Set the price and benefits customers receive.</DialogDescription></DialogHeader>
          <div className="space-y-4"><Field label="Tier" required><Select value={name} onValueChange={(value) => setName(value as typeof name)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["SILVER", "GOLD", "PLATINUM"].map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}</SelectContent></Select></Field>
          <Field label="Price" required><Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} /></Field>
          <Field label="Benefits (comma-separated)"><Input value={benefits} onChange={(event) => setBenefits(event.target.value)} placeholder="Priority booking, 10% off services" /></Field></div>
          <DialogFooter><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button loading={saving} onClick={createTier}>Create Tier</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    } />
    {loading ? <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-48" />)}</div> : tiers.length === 0 ?
      <EmptyState icon={<Crown className="h-6 w-6" />} title="No membership tiers" description="Create a tier to begin enrolling customers." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Add Tier</Button>} /> :
      <div className="grid gap-4 md:grid-cols-3">{tiers.map((tier) => <Card key={tier.id}><CardHeader><div className="flex items-center justify-between"><CardTitle>{tier.name}</CardTitle><Badge variant="primary">Active</Badge></div></CardHeader><CardContent><p className="text-2xl font-semibold">{format(tier.price)}</p><p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{tier.validityDays} days validity</p>{tier.benefits.length > 0 && <ul className="mt-4 space-y-1 text-sm text-[rgb(var(--color-muted-foreground))]">{tier.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}</ul>}</CardContent></Card>)}</div>}
  </div>;
}
