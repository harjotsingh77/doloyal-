"use client";

import * as React from "react";
import { BadgeCheck, Info, Rocket } from "lucide-react";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  PageHeader,
  Skeleton,
} from "@doloyal/ui";
import { formatMoney } from "@doloyal/shared";
import type { AdminPlanInfo, AdminEnterpriseContract } from "@doloyal/shared";
import { api } from "@/lib/api";

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<AdminPlanInfo[] | null>(null);
  const [contracts, setContracts] = React.useState<AdminEnterpriseContract[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([api.adminListPlans(), api.adminListEnterpriseContracts()])
      .then(([p, c]) => {
        setPlans(p);
        setContracts(c);
      })
      .catch(() => setPlans(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Plans & Pricing"
        description="Standard pricing and live per-plan entitlements overrides."
        breadcrumbs={[{ label: "Admin" }, { label: "Plans" }]}
      />

      {loading && !plans ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : !plans ? (
        <Card>
          <CardContent className="p-12">
            <EmptyState icon={<Info className="h-10 w-10" />} title="Plans unavailable" description="The plans endpoint could not be loaded." />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {plans.map((p) => (
              <PlanCard key={p.id} plan={p} onSave={() => {}} />
            ))}
          </div>

          <div>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[rgb(var(--color-foreground))]">
              <BadgeCheck className="h-5 w-5 text-[rgb(var(--color-primary))]" />
              Enterprise contracts
            </h2>
            {contracts.length === 0 ? (
              <Card>
                <CardContent className="p-8">
                  <EmptyState
                    icon={<Rocket className="h-10 w-10" />}
                    title="No enterprise contracts"
                    description="Custom contracts for enterprise businesses appear here."
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {contracts.map((c) => (
                  <Card key={c.id}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[rgb(var(--color-foreground))]">{c.businessName}</p>
                        <Badge variant={c.status === "ACTIVE" ? "success" : "outline"}>{c.status}</Badge>
                      </div>
                      <p className="mt-2 text-xl font-semibold text-[rgb(var(--color-primary))]">{formatMoney(c.contractPrice)}</p>
                      <p className="text-[0.62rem] text-[rgb(var(--color-muted-foreground))]">
                        {c.billingCycle.replace(/_/g, " ")} · renews {c.renewalDate ? new Date(c.renewalDate).toLocaleDateString() : "—"}
                      </p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-[rgb(var(--color-muted))] py-2">
                          <p className="text-sm font-semibold">{c.customerLimit === -1 ? "∞" : c.customerLimit}</p>
                          <p className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))]">Customers</p>
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--color-muted))] py-2">
                          <p className="text-sm font-semibold">{c.branchLimit === -1 ? "∞" : c.branchLimit}</p>
                          <p className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))]">Branches</p>
                        </div>
                        <div className="rounded-lg bg-[rgb(var(--color-muted))] py-2">
                          <p className="text-sm font-semibold">{c.seats}</p>
                          <p className="text-[0.55rem] text-[rgb(var(--color-muted-foreground))]">Seats</p>
                        </div>
                      </div>
                      {c.sla ? <p className="mt-3 text-xs text-[rgb(var(--color-muted-foreground))]">SLA: {c.sla}</p> : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: AdminPlanInfo; onSave: () => void }) {
  const [configText, setConfigText] = React.useState(JSON.stringify(plan.config ?? {}, null, 2));
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(configText || "{}");
    } catch {
      toast.error("Config must be valid JSON");
      return;
    }
    setBusy(true);
    try {
      await api.adminUpdatePlanConfig(plan.id, parsed);
      toast.success(`${plan.name} entitlements updated`);
    } catch {
      toast.error("Could not save plan config");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-[rgb(var(--color-foreground))]">{plan.name}</p>
          {plan.highlighted ? <Badge variant="primary">Popular</Badge> : null}
          {plan.overridden ? <Badge variant="warning">Overridden</Badge> : null}
        </div>
        <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">{plan.tagline}</p>
        <p className="mt-3 text-2xl font-semibold text-[rgb(var(--color-foreground))]">
          {formatMoney(plan.priceMonthly)}
          <span className="text-xs font-normal text-[rgb(var(--color-muted-foreground))]">/mo</span>
        </p>
        <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
          or {formatMoney(plan.priceYearly)}/yr
        </p>

        <div className="mt-4 flex-1 space-y-1">
          {Object.entries(plan.limits ?? {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="capitalize text-[rgb(var(--color-muted-foreground))]">{k.replace(/([A-Z])/g, " $1")}</span>
              <span className="font-medium text-[rgb(var(--color-foreground))]">{String(v)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">
            Entitlement overrides (JSON)
          </p>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            spellCheck={false}
            className="h-24 w-full resize-none rounded-md border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.3)] p-2 font-mono text-[0.65rem] text-[rgb(var(--color-foreground))] focus:border-[rgb(var(--color-primary))] focus:outline-none"
          />
          <Button size="sm" variant="outline" className="w-full" onClick={save} loading={busy}>
            Save overrides
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
