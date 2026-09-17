"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CURRENCY_MAP } from "@/lib/currency";
import { getPlan } from "@doloyal/shared";
import type { BillingSubscription } from "@doloyal/shared";
import { LogoMark } from "@doloyal/ui";

/* ── Types ─────────────────────────────────────────────────────────────── */

type Cycle = "monthly" | "yearly";
type DisplayCurrency = "INR" | "USD";
type FlowState = "idle" | "processing" | "success" | "failed" | "cancelled";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (e: unknown) => void) => void };
  }
}

/* ── Money ─────────────────────────────────────────────────────────────── */

const GST_RATE = 0.18;
const CONVERSION_FEE = 0.04;
const INR_PER_USD = CURRENCY_MAP.get("INR")?.rate ?? 83.5;
const DISPLAY_INR_PER_USD = INR_PER_USD * (1 + CONVERSION_FEE);

function toDisplay(amountInr: number, currency: DisplayCurrency) {
  if (currency === "USD") return amountInr / DISPLAY_INR_PER_USD;
  return amountInr;
}

function fmtMoney(amountInr: number, currency: DisplayCurrency, compact = false) {
  const value = toDisplay(amountInr, currency);
  const whole = Math.abs(value - Math.round(value)) < 0.005;
  return new Intl.NumberFormat(currency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: compact && whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function gstBreakdown(amountInr: number) {
  const exclusive = amountInr / (1 + GST_RATE);
  return {
    subtotal: exclusive,
    gst: amountInr - exclusive,
    total: amountInr,
  };
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as Error).message === "string") {
    return (err as Error).message;
  }
  return "Something went wrong. Please try again.";
}

function loadRazorpaySdk(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(!!window.Razorpay);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/* ── Small building blocks ─────────────────────────────────────────────── */

function FieldShell({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={`flex items-center gap-3 rounded-[10px] bg-[#F6F8FA] px-3.5 py-[13px] transition-colors focus-within:bg-white focus-within:ring-2 focus-within:ring-[#105EF6]/25 ${
          error ? "ring-2 ring-red-400" : "ring-1 ring-black/[0.06]"
        }`}
      >
        <span className="w-[4.5rem] shrink-0 text-[13px] text-[#6B7280]">{label}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      {error ? (
        <p role="alert" className="mt-1.5 pl-1 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full border-0 bg-transparent p-0 text-[14px] text-[#111111] outline-none placeholder:text-[#9CA3AF]";

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#105EF6]" aria-label="Loading checkout" />
        </div>
      }
    >
      <CheckoutInner />
    </React.Suspense>
  );
}

function CheckoutInner() {
  const searchParams = useSearchParams();
  const rawPlan = (searchParams.get("plan") || "").toLowerCase();
  const initialCycle = searchParams.get("cycle") === "yearly" ? "yearly" : "monthly";

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const normalizedPlanId = rawPlan === "free-trial" ? "free" : rawPlan;
  const plan = getPlan(normalizedPlanId);
  const isFreeTrial = plan?.id === "free";
  const isPaidPlan = !!plan && plan.priceMonthly > 0;
  const planValid = !!plan && (isFreeTrial || isPaidPlan);

  const [cycle, setCycle] = React.useState<Cycle>(initialCycle);
  const [currency, setCurrency] = React.useState<DisplayCurrency>("INR");
  const [sub, setSub] = React.useState<BillingSubscription | null>(null);
  const [subLoaded, setSubLoaded] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [country, setCountry] = React.useState("India");
  const [pincode, setPincode] = React.useState("");
  const [isBusiness, setIsBusiness] = React.useState(false);
  const [businessName, setBusinessName] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [address, setAddress] = React.useState("");

  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [banner, setBanner] = React.useState<{ kind: "error" | "warning"; text: string } | null>(null);
  const [flow, setFlow] = React.useState<FlowState>("idle");
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email);
  }, [user]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getSubscriptionStrict();
        if (!cancelled) setSub(s ?? null);
      } catch {
        if (!cancelled) setSub(null);
      } finally {
        if (!cancelled) setSubLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const amount = !plan || isFreeTrial ? 0 : cycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
  const fullYearCost = plan ? plan.priceMonthly * 12 : 0;
  const yearlySavings = plan && plan.priceYearly > 0 ? Math.max(0, fullYearCost - plan.priceYearly) : 0;
  const yearlyMonthly = plan && plan.priceYearly > 0 ? plan.priceYearly / 12 : 0;
  const totals = gstBreakdown(amount);

  if (!authLoading && !isAuthenticated) {
    return (
      <CenteredState
        icon={<Lock className="h-6 w-6 text-[#105EF6]" />}
        title="Sign in to continue"
        body="You need a Doloyal account before subscribing to a plan."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#111111] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#105EF6]"
          >
            Sign In
          </Link>
          <Link
            href="/#pricing"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 px-8 text-sm font-semibold text-[#111111] transition-colors hover:border-[#105EF6] hover:text-[#105EF6]"
          >
            View Plans
          </Link>
        </div>
      </CenteredState>
    );
  }

  if (!planValid) {
    return (
      <CenteredState
        icon={<XCircle className="h-6 w-6 text-red-500" />}
        title="Plan not found"
        body={
          rawPlan
            ? "We couldn't find that plan. Please select a plan to continue."
            : "Please select a plan to continue."
        }
      >
        <Link
          href="/#pricing"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-[#111111] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#105EF6]"
        >
          View Plans
        </Link>
      </CenteredState>
    );
  }

  const sameActivePlan =
    sub &&
    ((sub.plan === plan.id) ||
      (plan.id === "free" && sub.status === "TRIAL")) &&
    ["ACTIVE", "TRIALING", "TRIAL"].includes(sub.status);

  if (sameActivePlan) {
    return (
      <CenteredState
        icon={<BadgeCheck className="h-6 w-6 text-emerald-600" />}
        title="You already have an active subscription"
        body={`Your current plan is ${getPlan(sub.plan)?.name ?? sub.plan}.`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/app/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-[#111111] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#105EF6]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/app/billing"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-black/10 px-8 text-sm font-semibold text-[#111111] transition-colors hover:border-[#105EF6] hover:text-[#105EF6]"
          >
            Manage Billing
          </Link>
        </div>
      </CenteredState>
    );
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      e.email = "Enter a valid email address.";
    if (pincode.trim() && !/^\d{5,6}$/.test(pincode.trim()))
      e.pincode = "Enter a valid PIN / postal code.";
    if (isBusiness) {
      if (!businessName.trim()) e.businessName = "Business name is required.";
      if (gstin.trim() && !/^[0-9A-Za-z]{15}$/.test(gstin.trim()))
        e.gstin = "GSTIN must be exactly 15 characters.";
      if (!address.trim()) e.address = "Billing address is required.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  async function startTrial() {
    if (inFlight.current) return;
    if (!validate()) return;
    inFlight.current = true;
    setFlow("processing");
    setBanner(null);
    try {
      await api.activateFreeTrial();
      setFlow("success");
      window.location.assign("/app/dashboard");
    } catch (err) {
      setFlow("failed");
      setBanner({ kind: "error", text: errorMessage(err) });
    } finally {
      inFlight.current = false;
    }
  }

  async function startPayment(methodHint?: "card" | "upi" | "netbanking" | "wallet") {
    if (inFlight.current) return;
    if (!validate()) return;
    inFlight.current = true;
    setFlow("processing");
    setBanner(null);

    try {
      const session = await api.createCheckoutSession(plan!.id, cycle);

      const sdkReady = await loadRazorpaySdk();
      if (!sdkReady || !session.keyId) {
        throw new Error("Payments are temporarily unavailable. Please try again shortly.");
      }

      const rzp = new window.Razorpay!({
        key: session.keyId,
        amount: Math.round(session.amount * 100),
        currency: session.currency || "INR",
        name: "Doloyal",
        description: `${plan!.name} · billed ${cycle}`,
        order_id: session.orderId,
        prefill: {
          email: email.trim(),
          name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || undefined,
          method: methodHint,
        },
        notes: {
          plan: plan!.id,
          cycle,
          displayCurrency: currency,
          country: country || undefined,
          pincode: pincode.trim() || undefined,
          businessName: isBusiness ? businessName.trim() : undefined,
          gstin: isBusiness ? gstin.trim().toUpperCase() : undefined,
        },
        theme: { color: "#105EF6" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.verifyCheckoutPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan!.id,
              cycle,
            });
            setFlow("success");
            window.location.assign("/app/dashboard");
          } catch (verifyErr) {
            setFlow("failed");
            setBanner({
              kind: "error",
              text:
                errorMessage(verifyErr) ||
                "Payment received but could not be verified. Please contact support before retrying.",
            });
          } finally {
            inFlight.current = false;
          }
        },
        modal: {
          ondismiss: () => {
            setFlow("cancelled");
            inFlight.current = false;
          },
        },
      });

      rzp.on("payment.failed", () => {
        setFlow("failed");
        setBanner({
          kind: "error",
          text: "We couldn't complete your payment. Please check your payment details and try again.",
        });
        inFlight.current = false;
      });

      rzp.open();
    } catch (err) {
      setFlow("idle");
      inFlight.current = false;
      const msg = errorMessage(err);
      if (/already have an active/i.test(msg)) {
        try {
          const s = await api.getSubscriptionStrict();
          setSub(s ?? null);
        } catch {
          /* keep current state */
        }
      }
      setBanner({ kind: "error", text: msg });
    }
  }

  const processing = flow === "processing";
  const ctaLabel = isFreeTrial ? "Start Free Trial" : "Subscribe";

  if (flow === "success") {
    return <OpeningDashboard />;
  }

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-inter)] text-[#111111] antialiased lg:grid lg:grid-cols-2">
      {/* ── LEFT: primary-blue summary ──────────────────────────────────── */}
      <aside className="relative flex bg-[#105EF6] text-white lg:justify-end">
        <div className="flex w-full max-w-[420px] flex-col px-6 py-8 sm:px-10 lg:min-h-screen lg:px-8 lg:py-12 xl:mr-10 xl:px-4">
          <Link
            href="/"
            className="inline-flex w-fit items-center gap-1.5 rounded-md text-[14px] font-medium text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <ArrowLeft className="h-4 w-4" />
            Doloyal
          </Link>

          {!subLoaded ? (
            <div className="flex flex-1 items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-white" aria-label="Loading your subscription" />
            </div>
          ) : (
            <>
              <h1 className="mt-12 text-[22px] font-semibold tracking-tight sm:mt-16">
                {isFreeTrial ? "Start your free trial" : `Subscribe to Doloyal ${plan!.name}`}
              </h1>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[42px] font-semibold leading-none tracking-tight sm:text-[48px]">
                  {fmtMoney(totals.total, currency)}
                </span>
                <span className="text-[15px] font-medium text-white/75">
                  {isFreeTrial ? "for 1 month" : cycle === "yearly" ? "per year" : "per month"}
                </span>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Display currency">
                <CurrencyChip
                  selected={currency === "INR"}
                  onClick={() => setCurrency("INR")}
                  flag="🇮🇳"
                  label="INR"
                />
                <CurrencyChip
                  selected={currency === "USD"}
                  onClick={() => setCurrency("USD")}
                  flag="🇺🇸"
                  label="USD"
                />
              </div>
              <p className="mt-2.5 max-w-[340px] text-[11px] leading-relaxed text-white/65">
                1 USD = {DISPLAY_INR_PER_USD.toFixed(2)} INR (includes 4% conversion fee). Charges can
                vary based on exchange rates.
              </p>

              <div className="mt-7 rounded-xl bg-black/15 px-4 py-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white">
                    <LogoMark size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-semibold">Doloyal {plan!.name}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/70">
                          {plan!.tagline}
                        </p>
                      </div>
                      <p className="shrink-0 text-[14px] font-medium">
                        {fmtMoney(totals.subtotal, currency)}
                      </p>
                    </div>
                    <p className="mt-2 text-[12px] text-white/55">
                      {isFreeTrial ? "1 month free, no card required" : `Billed ${cycle}`}
                    </p>
                  </div>
                </div>
              </div>

              {!isFreeTrial && yearlySavings > 0 && (
                <button
                  type="button"
                  aria-pressed={cycle === "yearly"}
                  onClick={() => setCycle(cycle === "yearly" ? "monthly" : "yearly")}
                  className="mt-4 flex w-full items-center gap-2.5 rounded-full bg-black/25 px-2.5 py-2 text-left transition-colors hover:bg-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  <span
                    className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors ${
                      cycle === "yearly" ? "bg-emerald-400" : "bg-black/35"
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform ${
                        cycle === "yearly" ? "translate-x-[18px]" : "translate-x-[3px]"
                      }`}
                    />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px]">
                    <span className="font-semibold text-emerald-300">
                      Save {fmtMoney(yearlySavings, currency, true)}
                    </span>
                    <span className="text-white/85"> with annual billing</span>
                  </span>
                  <span className="hidden shrink-0 text-[13px] text-white/80 sm:inline">
                    {fmtMoney(yearlyMonthly, currency, true)}/mo
                  </span>
                </button>
              )}

              <dl className="mt-8 space-y-3.5 text-[14px]">
                <div className="flex items-center justify-between">
                  <dt className="text-white/80">Subtotal</dt>
                  <dd className="font-medium">{fmtMoney(totals.subtotal, currency)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-1.5 text-white/80">
                    GST (18%)
                    <span
                      title="GST is included in the total charged today. Payment is collected in INR."
                      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white/45 text-[9px] font-semibold leading-none text-white/70"
                    >
                      i
                    </span>
                  </dt>
                  <dd className="font-medium">{fmtMoney(totals.gst, currency)}</dd>
                </div>
                <div className="border-t border-white/20 pt-4">
                  <div className="flex items-center justify-between">
                    <dt className="font-medium">Total due today</dt>
                    <dd className="text-[16px] font-semibold">{fmtMoney(totals.total, currency)}</dd>
                  </div>
                </div>
              </dl>
            </>
          )}
        </div>
      </aside>

      {/* ── RIGHT: payment ──────────────────────────────────────────────── */}
      <section className="flex bg-white lg:justify-start" aria-label="Payment details">
        <div className="flex w-full max-w-[420px] flex-col px-6 py-10 sm:px-10 lg:min-h-screen lg:justify-center lg:px-8 lg:py-12 xl:ml-10 xl:px-4">
          {!subLoaded ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-[#105EF6]" aria-label="Loading checkout" />
            </div>
          ) : (
            <>
              {!isFreeTrial && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <ExpressButton
                      tone="dark"
                      icon={<Smartphone className="h-4 w-4" />}
                      label="UPI"
                      onClick={() => startPayment("upi")}
                      disabled={processing}
                    />
                    <ExpressButton
                      tone="green"
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Card"
                      onClick={() => startPayment("card")}
                      disabled={processing}
                    />
                  </div>
                  <div className="my-7 flex items-center gap-4" aria-hidden>
                    <span className="h-px flex-1 bg-black/10" />
                    <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#9CA3AF]">
                      or
                    </span>
                    <span className="h-px flex-1 bg-black/10" />
                  </div>
                </>
              )}

              {banner && (
                <div
                  role="alert"
                  className={`mb-6 rounded-xl border px-4 py-3.5 text-sm ${
                    banner.kind === "error"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {banner.kind === "error" && (
                    <p className="font-semibold">Payment unsuccessful</p>
                  )}
                  <p>{banner.text}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setBanner(null);
                      setFlow("idle");
                    }}
                    className="mt-2 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {flow === "cancelled" && !banner && (
                <div
                  role="status"
                  className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900"
                >
                  <p className="font-semibold">Payment cancelled</p>
                  <p>Your subscription has not been activated.</p>
                  <button
                    type="button"
                    onClick={() => setFlow("idle")}
                    className="mt-2 text-xs font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
                  >
                    Try Again
                  </button>
                </div>
              )}

              <form
                onSubmit={(ev) => {
                  ev.preventDefault();
                  if (isFreeTrial) void startTrial();
                  else void startPayment();
                }}
                noValidate
              >
                <h2 className="text-[15px] font-semibold">Contact information</h2>
                <div className="mt-3">
                  <FieldShell id="email" label="Email" error={errors.email}>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={!!errors.email}
                      className={inputClass}
                    />
                  </FieldShell>
                </div>

                <h2 className="mt-8 text-[15px] font-semibold">Payment method</h2>
                <div className="mt-3 rounded-[10px] ring-1 ring-black/[0.08]">
                  <div className="flex items-center gap-3 px-4 py-3.5">
                    <CreditCard className="h-4 w-4 text-[#111111]" />
                    <span className="text-[14px] font-medium">
                      {isFreeTrial ? "No card needed" : "Card, UPI, NetBanking & wallets"}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#6B7280]">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#105EF6]" />
                      Secure
                    </span>
                  </div>
                  <div className="flex items-start gap-3 border-t border-black/[0.06] px-4 py-3.5">
                    <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-[#9CA3AF]" />
                    <p className="text-[12px] leading-relaxed text-[#6B7280]">
                      {isFreeTrial
                        ? "Your trial starts immediately and we’ll remind you before it ends."
                        : "You’ll enter card or UPI details in Razorpay’s encrypted window. Your details never touch Doloyal’s servers."}
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 border-t border-black/[0.06] px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={isBusiness}
                      onChange={(e) => setIsBusiness(e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-[#105EF6]"
                    />
                    <span className="flex items-center gap-2 text-[13px] text-[#374151]">
                      <Building2 className="h-4 w-4 text-[#9CA3AF]" aria-hidden />
                      I&apos;m purchasing as a business
                    </span>
                  </label>
                </div>

                {isBusiness && (
                  <div className="mt-3 space-y-3">
                    <FieldShell id="business-name" label="Business" error={errors.businessName}>
                      <input
                        id="business-name"
                        autoComplete="organization"
                        placeholder="Legal business name"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        aria-invalid={!!errors.businessName}
                        className={inputClass}
                      />
                    </FieldShell>
                    <FieldShell id="gstin" label="GSTIN" error={errors.gstin}>
                      <input
                        id="gstin"
                        placeholder="Optional — for GST input credit"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        aria-invalid={!!errors.gstin}
                        className={inputClass}
                      />
                    </FieldShell>
                    <FieldShell id="billing-address" label="Address" error={errors.address}>
                      <input
                        id="billing-address"
                        autoComplete="street-address"
                        placeholder="Registered billing address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        aria-invalid={!!errors.address}
                        className={inputClass}
                      />
                    </FieldShell>
                  </div>
                )}

                <h2 className="mt-8 text-[15px] font-semibold">Billing information</h2>
                <div className="mt-3 space-y-3">
                  <FieldShell id="country" label="Country">
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={`${inputClass} appearance-none pr-6`}
                    >
                      {["India", "United States", "United Kingdom", "United Arab Emirates", "Singapore", "Australia"].map(
                        (c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ),
                      )}
                    </select>
                  </FieldShell>
                  <FieldShell id="pincode" label="PIN code" error={errors.pincode}>
                    <input
                      id="pincode"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      placeholder="6-digit PIN"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/[^\d]/g, ""))}
                      aria-invalid={!!errors.pincode}
                      className={inputClass}
                    />
                  </FieldShell>
                </div>

                <button
                  type="submit"
                  disabled={processing}
                  className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#111111] text-[15px] font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#105EF6] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Processing…
                    </>
                  ) : (
                    ctaLabel
                  )}
                </button>

                <p className="mt-4 text-center text-[11px] leading-relaxed text-[#9CA3AF]">
                  {isFreeTrial
                    ? "Start now — no charge today. We’ll remind you before your trial ends."
                    : `By subscribing, you authorise Doloyal to charge you in INR at the displayed exchange rate at the time of billing, according to the terms until you cancel.`}
                </p>
                <p className="mt-4 flex items-center justify-center gap-2 text-center text-[11px] text-[#9CA3AF]">
                  Powered by Razorpay
                  <span aria-hidden>|</span>
                  <Link href="/terms" className="hover:text-[#111111]">
                    Terms
                  </Link>
                  <span aria-hidden>|</span>
                  <Link href="/privacy" className="hover:text-[#111111]">
                    Privacy
                  </Link>
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

function CurrencyChip({
  selected,
  onClick,
  flag,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  flag: string;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
        selected
          ? "bg-white text-[#111111] shadow-sm"
          : "bg-white/10 text-white hover:bg-white/15"
      }`}
    >
      <span aria-hidden className="text-base leading-none">
        {flag}
      </span>
      {label}
    </button>
  );
}

function CenteredState({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center font-[family-name:var(--font-inter)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-gray-50">
        {icon}
      </div>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-[#111111]">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{body}</p>
      {children && <div className="mt-7">{children}</div>}
      <Link
        href="/#hero"
        className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-[#111111] px-8 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#105EF6] focus-visible:ring-offset-2"
      >
        Back to home
      </Link>
    </div>
  );
}

function ExpressButton({
  icon,
  label,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: "dark" | "green";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] text-[14px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#105EF6] disabled:cursor-not-allowed disabled:opacity-60 ${
        tone === "dark"
          ? "bg-[#111111] text-white hover:bg-black"
          : "bg-[#00D66F] text-white hover:bg-[#00C265]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function OpeningDashboard() {
  React.useEffect(() => {
    window.location.replace("/app/dashboard");
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-center font-[family-name:var(--font-inter)]">
      <Loader2 className="h-6 w-6 animate-spin text-[#105EF6]" aria-hidden />
      <h1 className="mt-5 text-xl font-bold tracking-tight text-[#111111]">Opening your dashboard…</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        Payment is complete. You can continue if this page does not move automatically.
      </p>
      <Link
        href="/app/dashboard"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-[#111111] px-10 text-sm font-semibold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#105EF6] focus-visible:ring-offset-2"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
