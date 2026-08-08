"use client";

import * as React from "react";
import {
  CreditCard,
  Check,
  ArrowRight,
  Download,
  FileText,
  Calendar,
  CircleDollarSign,
  RotateCcw,
  Shield,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  Badge,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@doloyal/ui";
import {
  PLANS,
  formatPrice,
  type Plan,
} from "@doloyal/shared";

const BILLING_HISTORY = [
  { date: "Jun 1, 2026", description: "Growth Plan - Monthly", amount: 3499, status: "paid" as const, invoice: "INV-2026-0601" },
  { date: "May 1, 2026", description: "Growth Plan - Monthly", amount: 3499, status: "paid" as const, invoice: "INV-2026-0501" },
  { date: "Apr 1, 2026", description: "Growth Plan - Monthly", amount: 3499, status: "paid" as const, invoice: "INV-2026-0401" },
  { date: "Mar 1, 2026", description: "Starter Plan - Monthly", amount: 1499, status: "paid" as const, invoice: "INV-2026-0301" },
  { date: "Feb 1, 2026", description: "Starter Plan - Monthly", amount: 1499, status: "paid" as const, invoice: "INV-2026-0201" },
  { date: "Jan 15, 2026", description: "Trial Conversion - Pro-rated", amount: 534, status: "paid" as const, invoice: "INV-2026-0115" },
];

const PAYMENT_METHOD = {
  brand: "Visa",
  last4: "4242",
  expiry: "12/28",
};

const ACTIVE_PLAN_ID = "growth";

export default function BillingPage() {
  const [changeOpen, setChangeOpen] = React.useState(false);
  const [selectedPlanId, setSelectedPlanId] = React.useState(ACTIVE_PLAN_ID);
  const [changing, setChanging] = React.useState(false);

  const currentPlan = PLANS.find((p) => p.id === ACTIVE_PLAN_ID)!;
  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId)!;

  const handleChangePlan = async () => {
    setChanging(true);
    await new Promise((r) => setTimeout(r, 1200));
    setChanging(false);
    setChangeOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your subscription, payment methods, and invoices."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-[rgb(var(--color-primary)/0.3)] bg-[rgb(var(--color-surface))] lg:col-span-2">
          <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[rgb(var(--color-primary)/0.08)] blur-3xl" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-5 w-5 text-[rgb(var(--color-primary))]" />
                <CardTitle>Current Plan</CardTitle>
              </div>
              <Badge variant="primary" className="uppercase tracking-wider">
                Active
              </Badge>
            </div>
            <CardDescription>
              Your subscription renews on July 1, 2026.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold">{currentPlan.name}</h3>
                <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
                  {currentPlan.tagline}
                </p>
                <p className="mt-2 text-sm">
                  <span className="text-2xl font-bold text-[rgb(var(--color-foreground))]">
                    {formatPrice(currentPlan.priceMonthly)}
                  </span>
                  <span className="text-[rgb(var(--color-muted-foreground))]">
                    /month
                  </span>
                </p>
              </div>
              <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <RotateCcw className="h-4 w-4" />
                    Change Plan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Plan</DialogTitle>
                    <DialogDescription>
                      Select a new plan. Changes take effect immediately and are
                      billed pro-rated.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-4">
                    {PLANS.filter((p) => p.id !== "free" && p.id !== "enterprise").map((plan) => {
                      const isActive = plan.id === ACTIVE_PLAN_ID;
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary)/0.05)]"
                              : "border-[rgb(var(--color-border))] hover:border-[rgb(var(--color-muted-foreground))]"
                          }`}
                        >
                          <div
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                              isSelected
                                ? "border-[rgb(var(--color-primary))] bg-[rgb(var(--color-primary))]"
                                : "border-[rgb(var(--color-border))]"
                            }`}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{plan.name}</span>
                              {plan.highlighted && (
                                <Badge variant="primary" className="text-[0.55rem] uppercase tracking-widest">
                                  Popular
                                </Badge>
                              )}
                              {isActive && (
                                <Badge variant="accent" className="text-[0.55rem] uppercase tracking-widest">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                              {formatPrice(plan.priceMonthly)}/month
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setChangeOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      loading={changing}
                      disabled={selectedPlanId === ACTIVE_PLAN_ID}
                      onClick={handleChangePlan}
                    >
                      {selectedPlanId === ACTIVE_PLAN_ID
                        ? "Current Plan"
                        : `Switch to ${selectedPlan.name}`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-[rgb(var(--color-accent))]" />
              <CardTitle>Payment Method</CardTitle>
            </div>
            <CardDescription>
              Default payment method for billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgb(var(--color-accent)/0.1)] text-[rgb(var(--color-accent))]">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {PAYMENT_METHOD.brand} ending in {PAYMENT_METHOD.last4}
                </p>
                <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                  Expires {PAYMENT_METHOD.expiry}
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-full">
              <CreditCard className="h-4 w-4" />
              Update Payment Method
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[rgb(var(--color-primary))]" />
            <CardTitle>Billing History</CardTitle>
          </div>
          <CardDescription>Recent invoices and payments.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {BILLING_HISTORY.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{row.date}</TableCell>
                  <TableCell className="font-medium">{row.description}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(row.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={row.status === "paid" ? "success" : "warning"}
                      className="uppercase"
                    >
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href="#" onClick={(e) => e.preventDefault()}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANS.filter((p) => p.id !== "enterprise").map((plan) => {
          const isCurrent = plan.id === ACTIVE_PLAN_ID;
          return (
            <Card
              key={plan.id}
              interactive
              className={`relative flex flex-col ${
                isCurrent
                  ? "border-[rgb(var(--color-primary)/0.5)] ring-1 ring-[rgb(var(--color-primary)/0.2)]"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" className="text-[0.55rem] uppercase tracking-widest shadow-sm">
                    Most Popular
                  </Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute right-3 top-3">
                  <Badge variant="accent">Current</Badge>
                </div>
              )}
              <CardHeader className="pb-4">
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.tagline}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    {plan.priceMonthly === 0
                      ? "Free"
                      : formatPrice(plan.priceMonthly)}
                  </span>
                  {plan.priceMonthly > 0 && (
                    <span className="ml-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                      /month
                    </span>
                  )}
                  {plan.priceYearly > 0 && (
                    <p className="mt-0.5 text-xs text-[rgb(var(--color-muted-foreground))]">
                      {formatPrice(plan.priceYearly)}/year
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--color-success))]" />
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
                ) : (
                  <Button
                    variant={plan.highlighted ? "primary" : "secondary"}
                    className="w-full"
                    onClick={() => {
                      setSelectedPlanId(plan.id);
                      setChangeOpen(true);
                    }}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[rgb(var(--color-muted-foreground))]" />
            <CardTitle>Billing Details</CardTitle>
          </div>
          <CardDescription>
            Your billing information and tax details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Business Name</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                Your Business
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Billing Email</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                billing@example.com
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Tax ID</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                GSTIN-XXXXXXXXXXXX
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Billing Cycle</p>
              <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
                Monthly (1st of each month)
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" size="sm">
              <FileText className="h-4 w-4" />
              Tax Certificate
            </Button>
            <Button variant="secondary" size="sm">
              <FileText className="h-4 w-4" />
              Invoice History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
