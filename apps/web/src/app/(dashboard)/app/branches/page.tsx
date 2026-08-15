"use client";

import * as React from "react";
import {
  Store,
  Plus,
  MapPin,
  Phone,
  Clock,
  Users,
  DollarSign,
  Power,
  PowerOff,
  Map,
} from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { useCurrency } from "@/lib/currency-context";
import { useBranch } from "@/lib/branch-context";
import { BranchAvatar } from "@/components/branch-workspace";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  status: "Active" | "Paused";
  staffCount: number;
  todayAppointments: number;
  todayRevenue: number;
}

const initialBranches: Branch[] = [
  {
    id: "b1",
    name: "Downtown Flagship",
    address: "42 MG Road, Ashok Nagar, Bangalore 560001",
    phone: "+91 98765 43210",
    email: "downtown@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Active",
    staffCount: 12,
    todayAppointments: 18,
    todayRevenue: 48500,
  },
  {
    id: "b2",
    name: "Whitefield Branch",
    address: "25 ITPL Main Road, Whitefield, Bangalore 560066",
    phone: "+91 98765 43211",
    email: "whitefield@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Active",
    staffCount: 8,
    todayAppointments: 11,
    todayRevenue: 32200,
  },
  {
    id: "b3",
    name: "Indiranagar Hub",
    address: "100 Feet Road, Indiranagar, Bangalore 560038",
    phone: "+91 98765 43212",
    email: "indiranagar@doloyal.ai",
    timezone: "Asia/Kolkata",
    status: "Paused",
    staffCount: 5,
    todayAppointments: 0,
    todayRevenue: 0,
  },
];

interface FormState {
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
}

const defaultForm: FormState = {
  name: "",
  address: "",
  phone: "",
  email: "",
  timezone: "Asia/Kolkata",
};

const BRANCH_COLORS = ["#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EC4899", "#EF4444"];

export default function BranchesPage() {
  const { format: fmt } = useCurrency();
  const router = useRouter();
  const { enterBranchById } = useBranch();
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(defaultForm);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem("doloyal_branches");
        if (stored) {
          setBranches(JSON.parse(stored));
        } else {
          setBranches(initialBranches);
        }
      } catch {
        setError("Failed to load branches");
      } finally {
        setLoading(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const persist = React.useCallback((updated: Branch[]) => {
    setBranches(updated);
    localStorage.setItem("doloyal_branches", JSON.stringify(updated));
    window.dispatchEvent(new Event("doloyal:branches-updated"));
  }, []);

  const handleToggleStatus = (id: string) => {
    persist(
      branches.map((b) =>
        b.id === id
          ? { ...b, status: b.status === "Active" ? "Paused" as const : "Active" as const }
          : b,
      ),
    );
  };

  const handleAddBranch = () => {
    if (!form.name || !form.address || !form.phone || !form.email) return;
    const newBranch: Branch = {
      id: `b${Date.now()}`,
      name: form.name,
      address: form.address,
      phone: form.phone,
      email: form.email,
      timezone: form.timezone,
      status: "Active",
      staffCount: 0,
      todayAppointments: 0,
      todayRevenue: 0,
    };
    persist([...branches, newBranch]);
    setDialogOpen(false);
    setForm(defaultForm);
  };

  const kpis = React.useMemo(() => {
    const total = branches.length;
    const activeStaff = branches.reduce((s, b) => s + b.staffCount, 0);
    const totalCustomers = branches.reduce((s, b) => s + b.todayAppointments, 0);
    const todayRevenue = branches.reduce((s, b) => s + b.todayRevenue, 0);
    return { total, activeStaff, totalCustomers, todayRevenue };
  }, [branches]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
          <Store className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Failed to load branches</h3>
        <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 text-sm font-medium text-[rgb(var(--color-primary))] hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (loading) {
    return <BranchesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branches"
        description="Manage your business locations"
        actions={
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Branch</DialogTitle>
                <DialogDescription>
                  Add a new business location to your network.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Branch name" required>
                  <Input
                    placeholder="e.g. Downtown Flagship"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Field>
                <Field label="Address" required>
                  <Input
                    placeholder="Full address"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Field>
                <Field label="Phone" required>
                  <Input
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Email" required>
                  <Input
                    type="email"
                    placeholder="branch@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Timezone">
                  <Input
                    placeholder="Asia/Kolkata"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                  />
                </Field>
              </div>
              <DialogFooter>
                <Button variant="secondary" onClick={() => { setDialogOpen(false); setForm(defaultForm); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddBranch} loading={saving}>
                  Add Branch
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Branches"
          value={kpis.total}
          icon={<Store className="h-5 w-5" />}
          accent="primary"
        />
        <KpiCard
          label="Active Staff"
          value={kpis.activeStaff}
          icon={<Users className="h-5 w-5" />}
          accent="accent"
        />
        <KpiCard
          label="Total Customers"
          value={kpis.totalCustomers}
          icon={<Clock className="h-5 w-5" />}
          accent="success"
        />
        <KpiCard
          label="Today's Revenue"
          value={kpis.todayRevenue}
          format={(v) => fmt(v)}
          icon={<DollarSign className="h-5 w-5" />}
          accent="warning"
        />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title="No branches yet"
          description="Add your first branch to start managing locations."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Branch
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((branch, idx) => (
            <div
              key={branch.id}
              onClick={() => {
                enterBranchById(branch.id);
                router.push(`/branches/${branch.id}/dashboard`);
              }}
              className="group cursor-pointer rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[rgb(var(--color-primary)/0.4)] hover:shadow-[var(--shadow-lifted)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BranchAvatar
                    branch={{ ...branch, accent: BRANCH_COLORS[idx % BRANCH_COLORS.length] }}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[rgb(var(--color-foreground))]">
                      {branch.name}
                    </p>
                    <Badge
                      variant={branch.status === "Active" ? "success" : "outline"}
                      className="mt-1 text-[0.6rem] uppercase tracking-wider"
                    >
                      {branch.status === "Active" ? (
                        <Power className="mr-0.5 h-3 w-3" />
                      ) : (
                        <PowerOff className="mr-0.5 h-3 w-3" />
                      )}
                      {branch.status}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleStatus(branch.id);
                  }}
                  className={`flex h-7 w-14 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-semibold uppercase tracking-wider transition-colors ${
                    branch.status === "Active"
                      ? "bg-[rgb(var(--color-success)/0.12)] text-[rgb(var(--color-success))]"
                      : "bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]"
                  }`}
                >
                  {branch.status === "Active" ? "Pause" : "Activate"}
                </button>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-[rgb(var(--color-muted-foreground))]">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{branch.address}</span>
                </div>
                <div className="flex items-center gap-2 text-[rgb(var(--color-muted-foreground))]">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{branch.phone}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[rgb(var(--color-border))] pt-4">
                <div className="text-center">
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Staff</p>
                  <p className="mt-0.5 text-sm font-semibold">{branch.staffCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Appts</p>
                  <p className="mt-0.5 text-sm font-semibold">{branch.todayAppointments}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Revenue</p>
                  <p className="mt-0.5 text-sm font-semibold">
                    {fmt(branch.todayRevenue)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-2 rounded-[0.625rem] bg-[rgb(var(--color-primary))] py-2 text-sm font-semibold text-white shadow-sm transition-all group-hover:bg-[rgb(var(--color-primary)/0.9)]">
                View Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-[rgb(var(--color-primary))]" />
              Map View
            </div>
          </CardTitle>
          <CardDescription>Visual overview of your branch locations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgb(var(--color-muted))] text-[rgb(var(--color-muted-foreground))]">
              <Map className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-[rgb(var(--color-foreground))]">Map view coming soon</h3>
            <p className="mt-1.5 max-w-sm text-sm text-[rgb(var(--color-muted-foreground))]">
              Pin all your branches on an interactive map for a bird&apos;s-eye view of your
              operations.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BranchesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[0.625rem]" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-[0.625rem]" />
              <div className="flex-1">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-1.5 h-4 w-16" />
              </div>
            </div>
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-40" />
            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[rgb(var(--color-border))] pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-3 w-56" />
        <Skeleton className="mt-6 h-[200px] w-full rounded-[var(--radius)]" />
      </div>
    </div>
  );
}
