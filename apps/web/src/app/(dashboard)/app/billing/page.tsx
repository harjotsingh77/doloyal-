"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  Globe2,
  IdCard,
  Lock,
  Megaphone,
  PartyPopper,
  Receipt,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  Field,
  Input,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@doloyal/ui";
import {
  PLANS,
  type BillingHistoryEntry,
  type BillingStatus,
  type BillingSubscription,
  type Plan,
  type SubscriptionPaymentMethod,
  type Tenant,
} from "@doloyal/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { convertAmount, formatCurrency } from "@/lib/currency";

/* ─── Presentation helpers ─────────────────────────────────────────────── */

const TRIAL_DAYS = 14;

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function formatShortDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function makeFormatAmount(currency: string) {
  return (amountInINR: number): string => {
    if (amountInINR < 0) return "Custom";
    if (amountInINR === 0) return "Free";
    return formatCurrency(amountInINR, currency && currency !== "USD" ? currency : "INR");
  };
}

function trialDaysRemaining(trialEndsAt?: string | null): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function normalizePlanName(id?: string | null): string {
  if (!id) return "—";
  if (id.toLowerCase() === "professional") return "Growth";
  const plan = PLANS.find((p) => p.id === id.toLowerCase());
  return plan ? plan.name : id.charAt(0).toUpperCase() + id.slice(1);
}

const STATUS_META: Record<
  BillingStatus,
  { label: string; variant: "default" | "primary" | "accent" | "success" | "warning" | "danger" | "outline" }
> = {
  TRIAL: { label: "Trial", variant: "primary" },
  ACTIVE: { label: "Active", variant: "success" },
  PAST_DUE: { label: "Past Due", variant: "warning" },
  PAYMENT_FAILED: { label: "Payment Failed", variant: "danger" },
  CANCELING: { label: "Canceling", variant: "warning" },
  CANCELED: { label: "Canceled", variant: "outline" },
  PAUSED: { label: "Paused", variant: "accent" },
};

const HISTORY_STATUS_META: Record<string, { label: string; variant: "success" | "warning" | "danger" | "primary" | "outline" }> = {
  PAID: { label: "Paid", variant: "success" },
  PENDING: { label: "Pending", variant: "warning" },
  FAILED: { label: "Failed", variant: "danger" },
  REFUNDED: { label: "Refunded", variant: "outline" },
  VOID: { label: "Void", variant: "outline" },
};

function historyStatusFor(event: BillingHistoryEntry): { label: string; variant: "success" | "warning" | "danger" | "primary" | "outline" } {
  if (event.type === "PAYMENT_SUCCEEDED") return HISTORY_STATUS_META.PAID;
  if (event.type === "PAYMENT_FAILED") return HISTORY_STATUS_META.FAILED;
  if (event.type === "PLAN_CHANGED") return { label: "Plan change", variant: "primary" };
  if (event.type === "SUBSCRIPTION_CANCELED") return { label: "Canceled", variant: "outline" };
  if (event.type === "SUBSCRIPTION_RESTARTED") return { label: "Restarted", variant: "success" };
  if (event.type === "PAYMENT_METHOD_UPDATED") return { label: "Payment updated", variant: "outline" };
  if (event.type === "TRIAL_STARTED") return { label: "Trial", variant: "primary" };
  return { label: event.status ?? event.type, variant: "outline" };
}

function eventDescription(event: BillingHistoryEntry): string {
  return event.description ?? event.type.replace(/_/g, " ").toLowerCase();
}

function paymentExpiry(pm?: SubscriptionPaymentMethod | null): string {
  if (!pm?.expMonth || !pm?.expYear) return "";
  const yy = pm.expYear.length === 4 ? pm.expYear.slice(-2) : pm.expYear;
  return `${pm.expMonth}/${yy}`;
}

function detectBrand(number: string): string {
  const n = number.replace(/\s+/g, "");
  if (/^4/.test(n)) return "Visa";
  if (/^5[1-5]/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  if (/^6(?:011|5)/.test(n)) return "Discover";
  return "Card";
}

interface UsageItem {
  key: "customers" | "aiQueries" | "branches" | "staff" | "campaigns";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const USAGE_ITEMS: UsageItem[] = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "aiQueries", label: "AI Assistant", icon: Bot },
  { key: "branches", label: "Branches", icon: Store },
  { key: "staff", label: "Staff", icon: IdCard },
  { key: "campaigns", label: "Campaigns", icon: Megaphone },
];

function usagePercent(used: number, limit: number | null): number {
  if (limit == null || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function usageBarClass(pct: number): string {
  if (pct >= 100) return "bg-[rgb(var(--color-danger))]";
  if (pct >= 80) return "bg-[rgb(var(--color-warning))]";
  return "bg-[rgb(var(--color-primary))]";
}

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function isUnlimited(limit: number | null): boolean {
  return limit == null || limit < 0;
}

/* ─── Billing page ─────────────────────────────────────────────────────── */

export default function BillingPage() {
  const { user } = useAuth();
  const isOwner = user?.activeRole === "OWNER";

  const [tenant, setTenant] = React.useState<Tenant | null>(null);
  const [sub, setSub] = React.useState<BillingSubscription | null>(null);
  const [history, setHistory] = React.useState<BillingHistoryEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [changeOpen, setChangeOpen] = React.useState(false);
  const [targetPlanId, setTargetPlanId] = React.useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [paymentOpen, setPaymentOpen] = React.useState(false);
  const [receiptEvent, setReceiptEvent] = React.useState<BillingHistoryEntry | null>(null);
  const [saving, setSaving] = React.useState(false);

  const historyRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [nextSub, nextTenant, nextHistory] = await Promise.all([
        api.getSubscription().catch(() => null),
        api.getTenant(),
        api.getBillingHistory().catch(() => []),
      ]);
      if (!nextSub) {
        setError("No active subscription was found for this account. Please contact support.");
        return;
      }
      setSub(nextSub);
      setTenant(nextTenant);
      setHistory(nextHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const run = React.useCallback(
    async (action: () => Promise<unknown>, successMessage: string) => {
      if (!isOwner) {
        toast.error("Only the account owner can manage billing");
        return;
      }
      try {
        setSaving(true);
        await action();
        toast.success(successMessage);
        await load();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSaving(false);
      }
    },
    [isOwner, load],
  );

  const scrollToHistory = () => historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const effectivePlanId = sub?.plan?.toLowerCase() === "professional" ? "growth" : sub?.plan;
  const currentPlan = sub ? (PLANS.find((p) => p.id === effectivePlanId) ?? PLANS.find((p) => p.id === "growth")) : undefined;
  const targetPlan = targetPlanId ? PLANS.find((p) => p.id === targetPlanId) : undefined;
  const formatAmount = React.useMemo(
    () => makeFormatAmount(tenant?.currency ?? "INR"),
    [tenant?.currency],
  );
  const currencyCode = tenant?.currency ?? "INR";

  const trialRemaining = trialDaysRemaining(sub?.trialEndsAt);
  const isTrial = sub?.status === "TRIAL";
  const isCanceling = sub?.status === "CANCELING";

  /* ── Loading skeleton ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (error || !sub || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--color-border))] py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-[rgb(var(--color-warning))]" />
        <h3 className="mt-4 text-lg font-semibold">Couldn’t load billing</h3>
        <p className="mt-1 max-w-md text-sm text-[rgb(var(--color-muted-foreground))]">
          {error ?? "Billing information is temporarily unavailable. Please try again."}
        </p>
        <Button variant="secondary" className="mt-5" onClick={load}>
          Retry
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[sub.status] ?? STATUS_META.ACTIVE;

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Billing"
        description="Manage your plan, payments, invoices, and subscription."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setChangeOpen(true)} disabled={!isOwner}>
              Manage Plan
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setPaymentOpen(true)} disabled={!isOwner}>
              Update Payment
            </Button>
            <Button variant="ghost" size="sm" onClick={scrollToHistory}>
              View Invoices
            </Button>
          </>
        }
      />

      {/* Alert banners */}
      {sub.hasPaymentFailed ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--color-warning)/0.35)] bg-[rgb(var(--color-warning)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--color-warning))]" />
            <div>
              <p className="text-sm font-semibold">Your latest payment failed</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                Update your payment method to keep your Doloyal subscription active.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setPaymentOpen(true)} disabled={!isOwner}>
            Update Payment Method →
          </Button>
        </div>
      ) : null}

      {isTrial ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--color-primary)/0.3)] bg-[rgb(var(--color-primary)/0.06)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--color-primary))]" />
            <div>
              <p className="text-sm font-semibold">You’re on your {TRIAL_DAYS}-day free trial</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                {trialRemaining > 0 ? `${trialRemaining} day${trialRemaining === 1 ? "" : "s"} remaining.` : "Your trial has ended."}{" "}
                Choose a plan to keep full access.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setChangeOpen(true)} disabled={!isOwner}>
              Choose a Plan
            </Button>
            <Button size="sm" variant="ghost" onClick={scrollToHistory}>
              View Plans
            </Button>
          </div>
        </div>
      ) : null}

      {isCanceling ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[rgb(var(--color-warning)/0.35)] bg-[rgb(var(--color-warning)/0.08)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(var(--color-warning))]" />
            <div>
              <p className="text-sm font-semibold">Subscription scheduled to cancel</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                You’ll keep access until {formatDate(sub.currentPeriodEnd ?? sub.nextBillingDate)}.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="success"
            loading={saving}
            disabled={!isOwner}
            onClick={() => run(() => api.restartSubscription(), "Your subscription has been restarted")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Keep My Subscription
          </Button>
        </div>
      ) : null}

      {!isOwner ? (
        <p className="rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 py-2.5 text-xs text-[rgb(var(--color-muted-foreground))]">
          <Lock className="mr-1.5 inline h-3.5 w-3.5" />
          Only the account owner can change plans, cancel, or update payment details. You can view billing information.
        </p>
      ) : null}

      {/* Current plan + payment method */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-[rgb(var(--color-primary)/0.07)] blur-3xl" />
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                  <Wallet className="h-4 w-4" />
                </div>
                <CardTitle>Current Plan</CardTitle>
              </div>
              <Badge variant={statusMeta.variant} className="uppercase tracking-wider">
                {statusMeta.label}
              </Badge>
            </div>
            <CardDescription>Your subscription and billing cycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold tracking-tight">{currentPlan?.name ?? normalizePlanName(sub.plan)}</h3>
                  {currentPlan?.highlighted ? (
                    <Badge variant="primary" className="text-[0.55rem] uppercase tracking-widest">
                      Most Popular
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-2xl font-bold">
                    {formatAmount(
                      sub.billingCycle === "yearly" && currentPlan?.priceYearly
                        ? Math.round(currentPlan.priceYearly / 12)
                        : (currentPlan?.priceMonthly ?? 0),
                    )}
                  </span>
                  <span className="text-sm text-[rgb(var(--color-muted-foreground))]">
                    /month
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
                  Billed {sub.billingCycle === "yearly" ? "yearly" : "monthly"}
                </p>

                <dl className="mt-4 grid max-w-md gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Next renewal</dt>
                    <dd className="mt-0.5 font-medium">{formatDate(sub.nextBillingDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Started</dt>
                    <dd className="mt-0.5 font-medium">{formatDate(sub.createdAt)}</dd>
                  </div>
                  {isTrial ? (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Trial ends</dt>
                      <dd className="mt-0.5 font-medium">{formatDate(sub.trialEndsAt)}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Billing cycle</dt>
                    <dd className="mt-0.5 font-medium capitalize">{sub.billingCycle}</dd>
                  </div>
                </dl>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button onClick={() => setChangeOpen(true)} disabled={!isOwner}>
                  {isTrial ? "Choose a Plan" : "Change Plan"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" disabled={!isOwner}>
                      Manage Subscription
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuItem onClick={() => setChangeOpen(true)}>
                      <ArrowRight className="h-4 w-4" />
                      Change plan
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPaymentOpen(true)}>
                      <CreditCard className="h-4 w-4" />
                      Update payment method
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {isCanceling ? (
                      <DropdownMenuItem
                        onClick={() => run(() => api.restartSubscription(), "Your subscription has been restarted")}
                      >
                        <CheckCircle2 className="h-4 w-4 text-[rgb(var(--color-success))]" />
                        Keep my subscription
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem className="text-[rgb(var(--color-danger))]" onClick={() => setCancelOpen(true)}>
                        <AlertTriangle className="h-4 w-4" />
                        Cancel subscription
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]">
                <CreditCard className="h-4 w-4" />
              </div>
              <CardTitle>Payment Method</CardTitle>
            </div>
            <CardDescription>Default method used for billing.</CardDescription>
          </CardHeader>
          <CardContent>
            {sub.paymentMethod ? (
              <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sub.paymentMethod.brand ?? "Card"} •••• {sub.paymentMethod.last4 ?? "••••"}
                  </p>
                  <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                    {paymentExpiry(sub.paymentMethod)
                      ? `Expires ${paymentExpiry(sub.paymentMethod)}`
                      : "No expiry on file"}
                  </p>
                </div>
                <Badge variant="success" className="shrink-0">
                  Default
                </Badge>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 py-6 text-center">
                <p className="text-sm font-medium">No payment method added</p>
                <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))]">
                  Add a card to keep billing active.
                </p>
              </div>
            )}
            <Button variant="secondary" className="mt-3 w-full" onClick={() => setPaymentOpen(true)} disabled={!isOwner}>
              <CreditCard className="h-4 w-4" />
              {sub.paymentMethod ? "Update Payment Method" : "Add Payment Method"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plan usage */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <CardTitle>Plan Usage</CardTitle>
                <CardDescription>Current usage against your {currentPlan?.name ?? "plan"} limits.</CardDescription>
              </div>
            </div>
            {approachingLimit(sub) ? (
              <Button size="sm" onClick={() => setChangeOpen(true)} disabled={!isOwner}>
                Upgrade Plan
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
            {USAGE_ITEMS.map(({ key, label, icon: Icon }) => {
              const metric = sub.usage?.[key];
              if (!metric) return null;
              const unlimited = isUnlimited(metric.limit);
              const pct = usagePercent(metric.used, metric.limit);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium">
                      <Icon className="h-4 w-4 text-[rgb(var(--color-muted-foreground))]" />
                      {label}
                    </span>
                    <span className="text-[rgb(var(--color-muted-foreground))]">
                      {formatCount(metric.used)}
                      {unlimited ? "" : ` / ${formatCount(metric.limit ?? 0)}`}
                    </span>
                  </div>
                  {unlimited ? (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div className="h-full w-full rounded-full bg-[rgb(var(--color-success)/0.6)]" />
                    </div>
                  ) : (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgb(var(--color-muted))]">
                      <div className={cn("h-full rounded-full transition-all", usageBarClass(pct))} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                  {!unlimited && pct >= 80 ? (
                    <p className="mt-1.5 text-xs text-[rgb(var(--color-warning))]">
                      {pct >= 100
                        ? "Limit reached — upgrade to avoid interruptions."
                        : "You’re approaching your plan limit."}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Available plans */}
      <section>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">Available Plans</h2>
          <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
            Compare plans and choose what fits your business. Upgrade or downgrade anytime.
          </p>
        </div>

        {sub.plan === "free" ? (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                <PartyPopper className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Free Trial — {TRIAL_DAYS} days</p>
                  <Badge variant="primary" className="uppercase">Current Plan</Badge>
                </div>
                <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
                  {isTrial
                    ? `Explore every feature until ${formatDate(sub.trialEndsAt)}.`
                    : "Trial access. Choose a paid plan to keep using Doloyal."}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setChangeOpen(true)} disabled={!isOwner}>
              Choose a Plan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.filter((p) => p.id !== "free").map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currency={currencyCode}
              isCurrent={plan.id === sub.plan}
              disabled={!isOwner}
              formatAmount={formatAmount}
              onChoose={() => {
                if (plan.id === "enterprise") return;
                setTargetPlanId(plan.id);
                setChangeOpen(true);
              }}
            />
          ))}
        </div>
      </section>

      {/* Billing information */}
      <BillingDetailsCard tenant={tenant} onSaved={(nextTenant) => setTenant(nextTenant)} disabled={!isOwner} />

      {/* Billing history */}
      <div ref={historyRef} className="scroll-mt-24">
        <BillingHistory
          history={history}
          sub={sub}
          formatAmount={formatAmount}
          onViewReceipt={setReceiptEvent}
        />
      </div>

      {/* Cancellation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-danger)/0.1)] text-[rgb(var(--color-danger))]">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <CardTitle>Subscription Management</CardTitle>
          </div>
          <CardDescription>Cancel or restart your Doloyal subscription.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                {isCanceling ? "Subscription scheduled to cancel" : "Cancel your subscription"}
              </p>
              <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
                {isCanceling
                  ? `Access ends on ${formatDate(sub.currentPeriodEnd ?? sub.nextBillingDate)}. Restart anytime to keep it.`
                  : "You’ll keep access until the end of your current billing period."}
              </p>
            </div>
            {isCanceling ? (
              <Button
                variant="success"
                loading={saving}
                disabled={!isOwner}
                onClick={() => run(() => api.restartSubscription(), "Your subscription has been restarted")}
              >
                <CheckCircle2 className="h-4 w-4" />
                Keep My Subscription
              </Button>
            ) : (
              <Button variant="danger" disabled={!isOwner || sub.status === "CANCELED"} onClick={() => setCancelOpen(true)}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change plan dialog */}
      <ChangePlanDialog
        open={changeOpen}
        onOpenChange={setChangeOpen}
        sub={sub}
        currency={currencyCode}
        formatAmount={formatAmount}
        targetPlanId={targetPlanId}
        setTargetPlanId={setTargetPlanId}
        saving={saving}
        disabled={!isOwner}
        onConfirm={(planId) =>
          run(async () => {
            await api.changePlan(planId);
            setChangeOpen(false);
          }, "Your plan has been updated")
        }
      />

      {/* Cancel dialog */}
      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        sub={sub}
        formatAmount={formatAmount}
        saving={saving}
        disabled={!isOwner}
        onConfirm={() =>
          run(async () => {
            await api.cancelSubscription();
            setCancelOpen(false);
          }, "Your subscription is scheduled to cancel")
        }
      />

      {/* Payment method dialog */}
      <PaymentMethodDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        existing={sub.paymentMethod}
        saving={saving}
        disabled={!isOwner}
        onSave={(pm) =>
          run(async () => {
            await api.updatePaymentMethod(pm);
            setPaymentOpen(false);
          }, "Payment method updated")
        }
      />

      {/* Receipt dialog */}
      <ReceiptDialog
        event={receiptEvent}
        onOpenChange={(open) => {
          if (!open) setReceiptEvent(null);
        }}
        formatAmount={formatAmount}
      />
    </div>
  );
}

/* ─── Helpers used in render ───────────────────────────────────────────── */

function approachingLimit(sub: BillingSubscription | null): boolean {
  if (!sub?.usage) return false;
  return USAGE_ITEMS.some(({ key }) => {
    const m = sub.usage?.[key];
    if (!m || isUnlimited(m.limit)) return false;
    return m.used / (m.limit ?? 1) >= 0.8;
  });
}

/* ─── Plan card ────────────────────────────────────────────────────────── */

function PlanCard({
  plan,
  currency,
  isCurrent,
  disabled,
  formatAmount,
  onChoose,
}: {
  plan: Plan;
  currency: string;
  isCurrent: boolean;
  disabled: boolean;
  formatAmount: (inr: number) => string;
  onChoose: () => void;
}) {
  const isEnterprise = plan.id === "enterprise";
  return (
    <Card
      className={cn(
        "relative flex flex-col",
        isCurrent && "border-[rgb(var(--color-primary)/0.5)] ring-1 ring-[rgb(var(--color-primary)/0.2)]",
      )}
    >
      {plan.highlighted && !isCurrent ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" className="text-[0.55rem] uppercase tracking-widest shadow-sm">
            Most Popular
          </Badge>
        </div>
      ) : null}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrent ? (
            <Badge variant="accent" className="uppercase">
              Current
            </Badge>
          ) : null}
        </div>
        <div className="mt-1.5">
          <span className="text-2xl font-bold tracking-tight">
            {isEnterprise ? "Custom" : formatAmount(plan.priceYearly > 0 ? Math.round(plan.priceYearly / 12) : plan.priceMonthly)}
          </span>
          {!isEnterprise ? (
            <span className="ml-1 text-sm text-[rgb(var(--color-muted-foreground))]">/month</span>
          ) : null}
          {!isEnterprise && plan.priceYearly > 0 ? (
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              or {formatAmount(plan.priceMonthly)}/month billed monthly
            </p>
          ) : isEnterprise ? (
            <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
              Tailored for chains & franchises
            </p>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-[0.8125rem] leading-snug">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-success))]" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardContent className="border-t border-[rgb(var(--color-border))] pt-4">
        {isCurrent ? (
          <Button variant="secondary" className="w-full" disabled>
            <Check className="h-4 w-4" />
            Current Plan
          </Button>
        ) : isEnterprise ? (
          <Button asChild variant={plan.highlighted ? "primary" : "secondary"} className="w-full">
            <Link href="/book-demo" target="_blank">
              Contact Sales
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            variant={plan.highlighted ? "primary" : "secondary"}
            className="w-full"
            disabled={disabled}
            onClick={onChoose}
          >
            {plan.priceMonthly > 0 ? "Choose Plan" : "Start Free Trial"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Billing details ──────────────────────────────────────────────────── */

function BillingDetailsCard({
  tenant,
  onSaved,
  disabled,
}: {
  tenant: Tenant;
  onSaved: (t: Tenant) => void;
  disabled: boolean;
}) {
  const [form, setForm] = React.useState({
    name: tenant.name ?? "",
    email: tenant.email ?? "",
    address: tenant.address ?? "",
    city: (tenant as any).city ?? "",
    state: (tenant as any).state ?? "",
    zip: (tenant as any).zip ?? "",
    country: (tenant as any).country ?? "",
    gst: tenant.gst ?? "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setForm({
      name: tenant.name ?? "",
      email: tenant.email ?? "",
      address: tenant.address ?? "",
      city: (tenant as any).city ?? "",
      state: (tenant as any).state ?? "",
      zip: (tenant as any).zip ?? "",
      country: (tenant as any).country ?? "",
      gst: tenant.gst ?? "",
    });
  }, [tenant]);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await api.updateTenantSettings({
        name: form.name,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        country: form.country,
        gst: form.gst,
      });
      onSaved(updated);
      toast.success("Billing details saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save billing details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
            <Globe2 className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>This information is used on your invoices and receipts.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Name" htmlFor="billing-name">
            <Input
              id="billing-name"
              value={form.name}
              disabled={disabled}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Your business name"
            />
          </Field>
          <Field label="Billing Email" htmlFor="billing-email">
            <Input
              id="billing-email"
              type="email"
              value={form.email}
              disabled={disabled}
              onChange={(e) => update("email", e.target.value)}
              placeholder="billing@yourbusiness.com"
            />
          </Field>
          <Field label="Address" htmlFor="billing-address" className="sm:col-span-2">
            <Input
              id="billing-address"
              value={form.address}
              disabled={disabled}
              onChange={(e) => update("address", e.target.value)}
              placeholder="Street address"
            />
          </Field>
          <Field label="City" htmlFor="billing-city">
            <Input id="billing-city" value={form.city} disabled={disabled} onChange={(e) => update("city", e.target.value)} placeholder="City" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="State" htmlFor="billing-state">
              <Input id="billing-state" value={form.state} disabled={disabled} onChange={(e) => update("state", e.target.value)} placeholder="State" />
            </Field>
            <Field label="Postal Code" htmlFor="billing-zip">
              <Input id="billing-zip" value={form.zip} disabled={disabled} onChange={(e) => update("zip", e.target.value)} placeholder="Postal code" />
            </Field>
          </div>
          <Field label="Country" htmlFor="billing-country">
            <Input id="billing-country" value={form.country} disabled={disabled} onChange={(e) => update("country", e.target.value)} placeholder="Country" />
          </Field>
          <Field label="Tax / GST Number" htmlFor="billing-gst" hint="Tax details are used for billing and invoices.">
            <Input id="billing-gst" value={form.gst} disabled={disabled} onChange={(e) => update("gst", e.target.value)} placeholder="GSTIN / Tax ID" />
          </Field>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Stored securely and used only for billing.
          </p>
          <Button onClick={handleSave} loading={saving} disabled={disabled}>
            Save Billing Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Billing history ──────────────────────────────────────────────────── */

function BillingHistory({
  history,
  sub,
  formatAmount,
  onViewReceipt,
}: {
  history: BillingHistoryEntry[];
  sub: BillingSubscription;
  formatAmount: (inr: number) => string;
  onViewReceipt: (e: BillingHistoryEntry) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your invoices and subscription activity.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {history.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<Receipt className="h-7 w-7" />}
              title="No billing history yet"
              description="Payments and plan changes will appear here once your subscription starts."
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Billing Period</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((e) => {
                    const meta = historyStatusFor(e);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="whitespace-nowrap text-sm text-[rgb(var(--color-muted-foreground))]">
                          {formatShortDate(e.createdAt)}
                        </TableCell>
                        <TableCell className="font-medium">{eventDescription(e)}</TableCell>
                        <TableCell className="text-sm">{normalizePlanName(e.plan)}</TableCell>
                        <TableCell className="text-sm capitalize">{e.type === "PAYMENT_SUCCEEDED" ? sub.billingCycle : "—"}</TableCell>
                        <TableCell className="text-right font-medium">{e.amount != null ? formatAmount(e.amount) : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={meta.variant} className="uppercase">
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {e.amount != null ? (
                            <Button variant="ghost" size="sm" onClick={() => onViewReceipt(e)}>
                              <Receipt className="h-4 w-4" />
                              View
                            </Button>
                          ) : (
                            <span className="text-sm text-[rgb(var(--color-subtle))]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[rgb(var(--color-border))] md:hidden">
              {history.map((e) => {
                const meta = historyStatusFor(e);
                return (
                  <div key={e.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{eventDescription(e)}</p>
                      <Badge variant={meta.variant} className="shrink-0 uppercase">
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                      <div>
                        <span className="block text-[0.6875rem] uppercase tracking-wide">Date</span>
                        <span className="font-medium text-[rgb(var(--color-foreground))]">{formatShortDate(e.createdAt)}</span>
                      </div>
                      <div>
                        <span className="block text-[0.6875rem] uppercase tracking-wide">Plan</span>
                        <span className="font-medium text-[rgb(var(--color-foreground))]">{normalizePlanName(e.plan)}</span>
                      </div>
                      {e.amount != null ? (
                        <div>
                          <span className="block text-[0.6875rem] uppercase tracking-wide">Amount</span>
                          <span className="font-medium text-[rgb(var(--color-foreground))]">{formatAmount(e.amount)}</span>
                        </div>
                      ) : null}
                      {e.type === "PAYMENT_SUCCEEDED" ? (
                        <div>
                          <span className="block text-[0.6875rem] uppercase tracking-wide">Period</span>
                          <span className="font-medium capitalize text-[rgb(var(--color-foreground))]">{sub.billingCycle}</span>
                        </div>
                      ) : null}
                    </div>
                    {e.amount != null ? (
                      <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => onViewReceipt(e)}>
                        <Receipt className="h-4 w-4" />
                        View receipt
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Change plan dialog ───────────────────────────────────────────────── */

function ChangePlanDialog({
  open,
  onOpenChange,
  sub,
  currency,
  formatAmount,
  targetPlanId,
  setTargetPlanId,
  saving,
  disabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sub: BillingSubscription;
  currency: string;
  formatAmount: (inr: number) => string;
  targetPlanId: string | null;
  setTargetPlanId: (id: string | null) => void;
  saving: boolean;
  disabled: boolean;
  onConfirm: (planId: string) => void;
}) {
  const currentPlan = PLANS.find((p) => p.id === sub.plan) ?? PLANS.find((p) => p.id === "starter")!;
  const targetPlan = targetPlanId ? PLANS.find((p) => p.id === targetPlanId) : undefined;

  React.useEffect(() => {
    if (open && !targetPlanId) setTargetPlanId(PLANS.find((p) => p.id !== sub.plan && p.id !== "free" && p.id !== "enterprise")?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectable = PLANS.filter((p) => p.id !== "free" && p.id !== "enterprise");
  const isDowngrade = !!targetPlan && targetPlan.priceMonthly < currentPlan.priceMonthly;
  const isUpgrade = !!targetPlan && targetPlan.priceMonthly > currentPlan.priceMonthly;

  const gained = targetPlan ? targetPlan.features.filter((f) => !currentPlan.features.includes(f)) : [];
  const lost = targetPlan ? currentPlan.features.filter((f) => !targetPlan.features.includes(f)) : [];

  const overLimitItems = React.useMemo(() => {
    if (!targetPlan || !sub.usage) return [];
    const items: string[] = [];
    const checks: { label: string; used: number; limit: number }[] = [
      { label: "customers", used: sub.usage.customers.used, limit: targetPlan.limits.customers },
      { label: "branches", used: sub.usage.branches.used, limit: targetPlan.limits.branches },
      { label: "staff", used: sub.usage.staff.used, limit: targetPlan.limits.staff },
      { label: "AI queries", used: sub.usage.aiQueries.used, limit: targetPlan.limits.aiQueries },
    ];
    for (const c of checks) {
      if (c.limit < 0) continue;
      if (c.used > c.limit) items.push(`${c.label}: ${c.used.toLocaleString("en-IN")} used, ${c.limit.toLocaleString("en-IN")} allowed`);
    }
    return items;
  }, [targetPlan, sub.usage]);

  const priceDiff =
    targetPlan && currentPlan.priceMonthly >= 0 && targetPlan.priceMonthly >= 0
      ? targetPlan.priceMonthly - currentPlan.priceMonthly
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{targetPlan && isDowngrade ? `Downgrade to ${targetPlan.name}?` : targetPlan ? `Switch to ${targetPlan.name}` : "Change Plan"}</DialogTitle>
          <DialogDescription>
            {targetPlan ? (
              <>
                {formatAmount(targetPlan.priceMonthly)} /month ·{" "}
                {targetPlan.priceYearly > 0 ? `${formatAmount(targetPlan.priceYearly)}/year` : "Custom pricing"}
              </>
            ) : (
              "Select a new plan for your subscription."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5">
          {selectable.map((plan) => {
            const isSelected = targetPlanId === plan.id;
            const isActive = plan.id === sub.plan;
            return (
              <button
                key={plan.id}
                type="button"
                disabled={disabled || isActive}
                onClick={() => setTargetPlanId(plan.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                  isSelected
                    ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.05)]"
                    : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-muted-foreground))]",
                  isActive && "opacity-70",
                )}
              >
                <div
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]" : "border-[rgb(var(--color-border))]",
                  )}
                >
                  {isSelected ? <Check className="h-3 w-3 text-white" /> : null}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{plan.name}</span>
                    {plan.highlighted ? (
                      <Badge variant="primary" className="text-[0.55rem] uppercase tracking-widest">
                        Most Popular
                      </Badge>
                    ) : null}
                    {isActive ? (
                      <Badge variant="accent" className="text-[0.55rem] uppercase tracking-widest">
                        Current
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                    {formatAmount(plan.priceMonthly)}/month
                    {plan.priceYearly > 0 ? ` · ${formatAmount(plan.priceYearly)}/year` : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {targetPlan ? (
          <div className="rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Current plan</p>
                <p className="mt-0.5 font-medium">{currentPlan.name} · {formatAmount(currentPlan.priceMonthly)}/mo</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">New plan</p>
                <p className="mt-0.5 font-medium">{targetPlan.name} · {formatAmount(targetPlan.priceMonthly)}/mo</p>
              </div>
              {priceDiff != null ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Price difference</p>
                  <p className={cn("mt-0.5 font-medium", priceDiff > 0 ? "text-[rgb(var(--color-foreground))]" : "text-[rgb(var(--color-success))]")}>
                    {priceDiff >= 0 ? "+" : "−"}
                    {formatAmount(Math.abs(priceDiff))}/mo
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs uppercase tracking-wide text-[rgb(var(--color-muted-foreground))]">Effective</p>
                <p className="mt-0.5 font-medium">Immediately</p>
              </div>
            </div>
            <p className="mt-3 border-t border-[rgb(var(--color-border))] pt-3 text-xs text-[rgb(var(--color-muted-foreground))]">
              New pricing is billed from your next renewal on {formatDate(sub.nextBillingDate)}.
            </p>
          </div>
        ) : null}

        {targetPlan ? (
          <div className="space-y-2.5 text-sm">
            {gained.length > 0 && !isDowngrade ? (
              <div>
                <p className="mb-1.5 font-medium">You will gain:</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {gained.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-[rgb(var(--color-muted-foreground))]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[rgb(var(--color-success))]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {isDowngrade && lost.length > 0 ? (
              <div>
                <p className="mb-1.5 font-medium">You’ll lose access to:</p>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {lost.slice(0, 6).map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[0.8125rem] text-[rgb(var(--color-muted-foreground))]">
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-[rgb(var(--color-muted-foreground))]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {isDowngrade && overLimitItems.length > 0 ? (
              <div className="rounded-lg border border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.06)] p-3">
                <p className="text-sm font-medium text-[rgb(var(--color-danger))]">
                  Your current usage is above this plan’s limits.
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-[rgb(var(--color-danger))]">
                  {overLimitItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                  Reduce usage or choose a higher plan before downgrading.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            {isDowngrade ? "Keep Current Plan" : "Cancel"}
          </Button>
          <Button
            variant={isDowngrade ? "danger" : "primary"}
            loading={saving}
            disabled={!targetPlan || targetPlan.id === sub.plan || disabled}
            onClick={() => targetPlan && onConfirm(targetPlan.id)}
          >
            {targetPlan && targetPlan.id === sub.plan
              ? "Current Plan"
              : isDowngrade
                ? "Confirm Downgrade →"
                : "Confirm Upgrade →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Cancel dialog ────────────────────────────────────────────────────── */

function CancelDialog({
  open,
  onOpenChange,
  sub,
  formatAmount,
  saving,
  disabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sub: BillingSubscription;
  formatAmount: (inr: number) => string;
  saving: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure you want to cancel?</DialogTitle>
          <DialogDescription>
            Your Doloyal subscription will remain active until {formatDate(sub.currentPeriodEnd ?? sub.nextBillingDate)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4 text-sm">
          <p className="flex gap-2.5">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
            <span>
              Subscription stays active until <span className="font-medium">{formatDate(sub.currentPeriodEnd ?? sub.nextBillingDate)}</span>. No charges after that date.
            </span>
          </p>
          <p className="flex gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
            <span>
              You’ll lose access to <span className="font-medium">{PLANS.find((p) => p.id === sub.plan)?.name ?? "your"} plan features</span> and paid usage after cancellation.
            </span>
          </p>
          <p className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
            <span>
              Your data is retained, and you can restart your subscription at any time.
            </span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Keep Subscription
          </Button>
          <Button variant="danger" loading={saving} disabled={disabled} onClick={onConfirm}>
            Cancel Subscription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Payment method dialog ────────────────────────────────────────────── */

function PaymentMethodDialog({
  open,
  onOpenChange,
  existing,
  saving,
  disabled,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: SubscriptionPaymentMethod | null;
  saving: boolean;
  disabled: boolean;
  onSave: (pm: SubscriptionPaymentMethod) => void;
}) {
  const [number, setNumber] = React.useState("");
  const [expMonth, setExpMonth] = React.useState("");
  const [expYear, setExpYear] = React.useState("");
  const [name, setName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setNumber("");
      setExpMonth("");
      setExpYear("");
      setName("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    const digits = number.replace(/\s+/g, "");
    if (digits.length < 12 || digits.length > 19) {
      setError("Enter a valid card number.");
      return;
    }
    if (!/^(0[1-9]|1[0-2])$/.test(expMonth)) {
      setError("Expiry month must be MM (01–12).");
      return;
    }
    const normalizedYear = expYear.length === 4 ? expYear.slice(-2) : expYear;
    if (!/^\d{2}$/.test(normalizedYear)) {
      setError("Expiry year must be 2 or 4 digits (e.g. 28 or 2028).");
      return;
    }
    setError(null);
    onSave({
      brand: detectBrand(number),
      last4: digits.slice(-4),
      expMonth,
      expYear: normalizedYear,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Update Payment Method" : "Add Payment Method"}</DialogTitle>
          <DialogDescription>
            Card details are stored securely with the payment provider. We only save the last 4 digits in your account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <Field label="Name on card" htmlFor="pm-name">
            <Input id="pm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="cc-name" />
          </Field>
          <Field label="Card number" htmlFor="pm-number">
            <Input
              id="pm-number"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="•••• •••• •••• ••••"
              autoComplete="cc-number"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Expiry month" htmlFor="pm-month">
              <Input
                id="pm-month"
                inputMode="numeric"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                placeholder="MM"
                maxLength={2}
              />
            </Field>
            <Field label="Expiry year" htmlFor="pm-year">
              <Input
                id="pm-year"
                inputMode="numeric"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                placeholder="YY"
                maxLength={2}
              />
            </Field>
          </div>
          {error ? (
            <p className="rounded-lg border border-[rgb(var(--color-danger)/0.35)] bg-[rgb(var(--color-danger)/0.06)] px-3 py-2 text-xs text-[rgb(var(--color-danger))]">
              {error}
            </p>
          ) : null}
          {existing ? (
            <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
              Current: {existing.brand ?? "Card"} •••• {existing.last4 ?? "••••"}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button loading={saving} disabled={disabled} onClick={handleSubmit}>
            <CreditCard className="h-4 w-4" />
            Save Payment Method
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Receipt dialog ───────────────────────────────────────────────────── */

function ReceiptDialog({
  event,
  onOpenChange,
  formatAmount,
}: {
  event: BillingHistoryEntry | null;
  onOpenChange: (open: boolean) => void;
  formatAmount: (inr: number) => string;
}) {
  const handleDownload = () => {
    if (!event) return;
    const currency = event.currency ?? "INR";
    const amount = event.amount != null ? formatAmount(event.amount) : "—";
    const lines = [
      "DOLOYAL — RECEIPT",
      "────────────────────",
      `Date:        ${formatDate(event.createdAt)}`,
      `Description: ${eventDescription(event)}`,
      `Plan:        ${normalizePlanName(event.plan)}`,
      `Amount:      ${amount} (${currency})`,
      `Status:      ${historyStatusFor(event).label}`,
      `Reference:   ${event.id.slice(0, 8).toUpperCase()}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doloyal-receipt-${event.id.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!event} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>Billing record from your subscription.</DialogDescription>
        </DialogHeader>
        {event ? (
          <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))]">
            <div className="flex items-center justify-between bg-[rgb(var(--color-surface-2))] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--color-primary)/0.1)] text-[rgb(var(--color-primary))]">
                  <Receipt className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Doloyal</span>
              </div>
              <span className="text-xs text-[rgb(var(--color-muted-foreground))]">
                Ref {event.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div className="divide-y divide-[rgb(var(--color-border))] px-4 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[rgb(var(--color-muted-foreground))]">Date</span>
                <span className="font-medium">{formatDate(event.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[rgb(var(--color-muted-foreground))]">Description</span>
                <span className="max-w-[60%] text-right font-medium">{eventDescription(event)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[rgb(var(--color-muted-foreground))]">Plan</span>
                <span className="font-medium">{normalizePlanName(event.plan)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[rgb(var(--color-muted-foreground))]">Status</span>
                <Badge variant={historyStatusFor(event).variant} className="uppercase">
                  {historyStatusFor(event).label}
                </Badge>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-semibold">Amount</span>
                <span className="text-lg font-bold">{event.amount != null ? formatAmount(event.amount) : "—"}</span>
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="secondary" onClick={handleDownload} disabled={!event}>
            <Download className="h-4 w-4" />
            Download Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
