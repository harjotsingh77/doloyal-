"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  ExternalLink,
  Info,
  RefreshCcw,
  StickyNote,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
} from "@doloyal/ui";
import { formatNumber, relativeTime } from "@doloyal/shared";
import type { AdminBusinessDetail } from "@doloyal/shared";
import { api } from "@/lib/api";
import { BusinessStatusBadge } from "../../_components/admin-utils";

const PLANS = ["free", "starter", "growth", "professional", "enterprise"];
const STATUSES = ["ACTIVE", "PAUSED", "SUSPENDED", "CANCELED"];

export default function AdminBusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = React.useState<AdminBusinessDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.adminGetBusiness(id));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const changePlan = async (plan: string) => {
    if (!data || plan === data.plan) return;
    setBusy(true);
    try {
      await api.adminChangeBusinessPlan(id, plan);
      toast.success(`Plan updated to ${plan}`);
      void load();
    } catch {
      toast.error("Could not change plan");
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (status: string, note?: string) => {
    setBusy(true);
    try {
      await api.adminSetBusinessStatus(id, status, note);
      toast.success(`Status set to ${status}`);
      void load();
    } catch {
      toast.error("Could not update status");
    } finally {
      setBusy(false);
    }
  };

  const impersonate = async () => {
    setBusy(true);
    try {
      const res = await api.adminImpersonate(id);
      if (res?.accessToken) {
        localStorage.setItem("doloyal_token", res.accessToken);
        localStorage.removeItem("doloyal_user");
        window.location.href = "/app/dashboard";
      }
    } catch {
      toast.error("Could not start impersonation");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async (note: string) => {
    if (!note.trim()) return;
    try {
      await api.adminAddBusinessNote(id, note);
      toast.success("Note added");
    } catch {
      toast.error("Could not add note");
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-12">
          <EmptyState icon={<Info className="h-10 w-10" />} title="Business not found" description="This business may have been removed." />
        </CardContent>
      </Card>
    );
  }

  const counts = Object.entries(data.counts ?? {}).filter(([, v]) => typeof v === "number");

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.name}
        description={`${data.category} · ${data.city ?? data.country}`}
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Businesses", href: "/admin/businesses" }, { label: data.name }]}
        actions={
          <>
            <Button variant="outline" onClick={impersonate} loading={busy}>
              <RefreshCcw className="h-4 w-4" />
              View as business
            </Button>
            <Button variant="outline" asChild>
              <a href="/admin/businesses">
                <ArrowLeft className="h-4 w-4" />
                Back
              </a>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <InfoItem label="Email" value={data.email ?? "—"} />
              <InfoItem label="Phone" value={data.phone ?? "—"} />
              <InfoItem label="Website" value={data.website ?? "—"} />
              <InfoItem label="Timezone" value={data.timezone} />
              <InfoItem label="Onboarding" value={data.onboardingComplete ? "Completed" : "Not completed"} />
              <InfoItem label="Last active" value={data.lastActive ? relativeTime(data.lastActive) : "—"} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[rgb(var(--color-border))] p-3">
              <div>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">Current plan</p>
                <p className="text-lg font-semibold capitalize text-[rgb(var(--color-foreground))]">
                  {data.plan === "free" ? "Free Trial" : data.plan}
                </p>
              </div>
              <BusinessStatusBadge status={data.status} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change plan</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={data.plan} onValueChange={changePlan} disabled={busy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p === "free" ? "Free Trial" : p.charAt(0).toUpperCase() + p.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  variant={data.status === s ? "primary" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    if (window.confirm(`Set ${data.name} to ${s}?`)) setStatus(s);
                  }}
                  loading={busy}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {counts.map(([key, value]) => (
              <div key={key} className="rounded-lg border border-[rgb(var(--color-border))] p-3">
                <p className="text-xl font-semibold text-[rgb(var(--color-foreground))]">{formatNumber(Number(value))}</p>
                <p className="mt-0.5 text-[0.62rem] capitalize text-[rgb(var(--color-muted-foreground))]">
                  {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentActivity.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">No activity yet.</p>
            ) : (
              <ul className="divide-y divide-[rgb(var(--color-border))]">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--color-primary))]`} />
                    <p className="min-w-0 flex-1 text-xs text-[rgb(var(--color-foreground))]">{a.message}</p>
                    <span className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">{relativeTime(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <AddNoteCard onAdd={addNote} />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">{label}</p>
      <p className="mt-0.5 font-medium text-[rgb(var(--color-foreground))]">{value}</p>
    </div>
  );
}

function AddNoteCard({ onAdd }: { onAdd: (note: string) => Promise<void> }) {
  const [note, setNote] = React.useState("");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Internal note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea placeholder="Add an internal note visible to the admin team…" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!note.trim()}
            onClick={async () => {
              await onAdd(note);
              setNote("");
            }}
          >
            Add note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
