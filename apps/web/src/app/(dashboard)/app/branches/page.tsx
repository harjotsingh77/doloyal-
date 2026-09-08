"use client";

import * as React from "react";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Users,
  AlertCircle,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  PageHeader,
  Badge,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Field,
  KpiCard,
  EmptyState,
} from "@doloyal/ui";
import { useBranch } from "@/lib/branch-context";
import { BranchAvatar } from "@/components/branch-workspace";
import { ArrowRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";

export default function BranchesPage() {
  const router = useRouter();
  const { branches, loading: contextLoading, enterBranchById, refresh: refreshContext } = useBranch();

  const [error, setError] = React.useState<string | null>(null);
  const [retryToken, setRetryToken] = React.useState(0);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newAddress, setNewAddress] = React.useState("");
  const [newCity, setNewCity] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // The context loads branches for the switcher; this page mirrors it and
  // surfaces its own error/retry state.
  React.useEffect(() => {
    if (!contextLoading) setError(null);
  }, [contextLoading]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.createBranch({
        name: newName.trim(),
        phone: newPhone.trim() || undefined,
        address: newAddress.trim() || undefined,
        city: newCity.trim() || undefined,
      });
      await refreshContext();
      toastSuccess("Branch created.");
      setCreateOpen(false);
      setNewName("");
      setNewPhone("");
      setNewAddress("");
      setNewCity("");
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Failed to create branch");
    } finally {
      setCreating(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteBranch(deleteTarget.id);
      await refreshContext();
      toastSuccess(`"${deleteTarget.name}" has been removed.`);
      setDeleteTarget(null);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Failed to delete branch");
    } finally {
      setDeleting(false);
    }
  }

  function openWorkspace(id: string) {
    enterBranchById(id);
    router.push(`/branches/${id}/dashboard`);
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Failed to load branches</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <button
          onClick={() => setRetryToken((t) => t + 1)}
          className="mt-5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (contextLoading && branches.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Branches" description="Manage your business locations." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-[var(--radius)]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Your physical locations. Each branch scopes its team; customers and billing stay unified."
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                New Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create branch</DialogTitle>
                <DialogDescription>Add a location so you can assign a team to it.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <Field label="Branch name" required>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Downtown Flagship" />
                </Field>
                <Field label="Phone">
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+91 …" />
                </Field>
                <Field label="Address">
                  <Input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="Street and area" />
                </Field>
                <Field label="City">
                  <Input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City" />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !newName.trim()}>
                    {creating ? "Creating…" : "Create branch"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Locations" value={branches.length} accent="primary" />
        <KpiCard
          label="Total team assigned"
          value={branches.reduce((s, b) => s + (b.staffCount || 0), 0)}
          accent="accent"
        />
        <KpiCard
          label="Locations with team"
          value={branches.filter((b) => (b.staffCount || 0) > 0).length}
          accent="success"
        />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          title="No branches yet"
          description="Create your first location to start assigning teams to it."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <Card key={b.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <BranchAvatar branch={b} />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{b.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{[b.address, b.city].filter(Boolean).join(", ") || "No address yet"}</span>
                    </p>
                    {b.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                        <Phone className="h-3 w-3 shrink-0" />
                        {b.phone}
                      </p>
                    )}
                  </div>
                  <Badge variant={b.staffCount ? "success" : "outline"}>
                    {b.staffCount || 0} staff
                  </Badge>
                </div>

                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgb(var(--color-border))] pt-3">
                  <Button variant="outline" size="sm" onClick={() => openWorkspace(b.id)}>
                    Open workspace
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={`Delete ${b.name}`}
                    onClick={() => setDeleteTarget({ id: b.id, name: b.name })}
                  >
                    <Trash2 className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</DialogTitle>
            <DialogDescription>
              Team assignments for this branch are removed. Customers, appointments and invoices are
              not deleted — they belong to your business.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* Local toast helpers keep the page dependency-light. */
function toastSuccess(message: string) {
  import("sonner").then(({ toast }) => toast.success(message));
}
function toastError(message: string) {
  import("sonner").then(({ toast }) => toast.error(message));
}
