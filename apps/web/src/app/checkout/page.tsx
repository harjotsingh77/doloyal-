"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getPlan } from "@doloyal/shared";
import type { BillingSubscription } from "@doloyal/shared";
import { LogoMark } from "@doloyal/ui";

/* ── Types ─────────────────────────────────────────────────────────────── */

type Cycle = "monthly" | "yearly";

type FlowState = "idle" | "processing" | "success" | "failed" | "cancelled";

interface SuccessResult {
  title: string;
  planName: string;
  status: string;
  transactionId?: string;
  nextBillingDate?: string | null;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (e: unknown) => void) => void };
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

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

const fmtINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
    return (err as Error).message;
  }
  return "Something went wrong. Please try again.";
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
        className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-colors focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/15 ${
          error ? "border-red-400" : "border-black/10"
        }`}
      >
        <span className="w-24 shrink-0 text-sm text-gray-500">{label}</span>
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
  "w-full border-0 bg-transparent p-0 text-sm text-[#282628] outline-none placeholder:text-gray-400";

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" aria-label="Loading checkout" />
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

  /* Plan resolution */
  const normalizedPlanId = rawPlan === "free-trial" ? "free" : rawPlan;
  const plan = getPlan(normalizedPlanId);
  const isFreeTrial = plan?.id === "free";
  const isPaidPlan = !!plan && plan.priceMonthly > 0;
  const planValid = !!plan && (isFreeTrial || isPaidPlan);

  /* State */
  const [cycle, setCycle] = React.useState<Cycle>(initialCycle);
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
  const [result, setResult] = React.useState<SuccessResult | null>(null);
  const inFlight = React.useRef(false);

  /* Prefill email once auth resolves */
  React.useEffect(() => {
    if (user?.email) setEmail((e) => e || user.email);
  }, [user]);

  /* Fetch current subscription — real data only (no mock fallback). */
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await api.getSubscriptionStrict();
        if (!cancelled) setSub(s ?? null);
      } catch {
        // No subscription yet / API unavailable — treat as no subscription.
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

  /* ── Derived views ─────────────────────────────────────────────────── */

  if (!authLoading && !isAuthenticated) {
    return (
      <CenteredState
        icon={<Lock className="h-6 w-6 text-[#2563EB]" />}
        title="Sign in to continue"
        body="You need a Doloyal account before subscribing to a plan."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/sign-in"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#232529] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
          >
            Sign In
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-8 text-sm font-semibold text-[#282628] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
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
          href="/pricing"
          className="inline-flex h-11 items-center justify-center rounded-full bg-[#232529] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
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
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#232529] px-8 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB]"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/app/billing"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 px-8 text-sm font-semibold text-[#282628] transition-colors hover:border-[#2563EB] hover:text-[#2563EB]"
          >
            Manage Billing
          </Link>
        </div>
      </CenteredState>
    );
  }

  /* ── Validation ────────────────────────────────────────────────────── */

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

  /* ── Free trial ────────────────────────────────────────────────────── */

  async function startTrial() {
    if (inFlight.current) return;
    if (!validate()) return;
    inFlight.current = true;
    setFlow("processing");
    setBanner(null);
    try {
      const r = await api.activateFreeTrial();
      setResult({
        title: "Your free trial has started",
        planName: r.planName || plan!.name,
        status: "Trialing",
        nextBillingDate: r.trialEndsAt ?? r.nextBillingDate ?? null,
      });
      setFlow("success");
    } catch (err) {
      setFlow("failed");
      setBanner({ kind: "error", text: errorMessage(err) });
    } finally {
      inFlight.current = false;
    }
  }

  /* ── Paid checkout via Razorpay ────────────────────────────────────── */

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
          country: country || undefined,
          pincode: pincode.trim() || undefined,
          businessName: isBusiness ? businessName.trim() : undefined,
          gstin: isBusiness ? gstin.trim().toUpperCase() : undefined,
        },
        theme: { color: "#2563EB" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verified = await api.verifyCheckoutPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              planId: plan!.id,
              cycle,
            });
            setResult({
              title: "Payment successful",
              planName: verified.planName || plan!.name,
              status: verified.status || "Active",
              transactionId: verified.transactionId,
              nextBillingDate: verified.nextBillingDate,
            });
            setFlow("success");
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
  const ctaLabel = isFreeTrial
    ? "Start Free Trial"
    : `Pay ${fmtINR(amount)}${cycle === "yearly" ? "/yr" : ""}`;

  /* ── Success screen ────────────────────────────────────────────────── */

  if (flow === "success" && result) {
    return (
      <SuccessScreen
        result={result}
        email={email}
        isTrial={isFreeTrial}
      />
    );
  }

  /* ── Main layout ───────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-white text-[#282628] antialiased">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1080px] items-center gap-5 px-5 sm:px-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-gray-500 transition-colors hover:text-[#282628] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="h-5 w-px bg-black/10" aria-hidden />
          <Link href="/" className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md">
            <LogoMark size={26} />
            <span className="text-lg font-bold tracking-tight">Doloyal</span>
          </Link>
        </div>
      </header>

      {!subLoaded ? (
        <div className="mx-auto flex max-w-[1080px] items-center justify-center px-5 py-40">
          <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" aria-label="Loading your subscription" />
        </div>
      ) : (
        <main className="mx-auto grid max-w-[1080px] gap-12 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pt-14">
          {/* ── LEFT: plan summary ─────────────────────────────────────── */}
          <section aria-labelledby="plan-heading">
            <h1 id="plan-heading" className="text-lg font-semibold tracking-tight">
              {isFreeTrial ? "Start your free trial" : `Subscribe to Doloyal ${plan!.name}`}
            </h1>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                {fmtINR(amount)}
              </span>
              <span className="text-sm font-medium text-gray-500">
                {isFreeTrial ? "for 1 month" : cycle === "yearly" ? "per year" : "per month"}
              </span>
            </div>

            {!isFreeTrial && (
              <>
                {/* Billing selector */}
                <fieldset className="mt-7">
                  <legend className="sr-only">Billing cycle</legend>
                  <div className="grid grid-cols-2 gap-3">
                    <CycleOption
                      selected={cycle === "monthly"}
                      onClick={() => setCycle("monthly")}
                      title="Monthly"
                      subtitle={`${fmtINR(plan!.priceMonthly)} / month`}
                      inputProps={{ id: "cycle-monthly" }}
                    />
                    <CycleOption
                      selected={cycle === "yearly"}
                      onClick={() => setCycle("yearly")}
                      title="Annual"
                      subtitle={`${fmtINR(plan!.priceYearly)} / year`}
                      badge={yearlySavings > 0 ? `Save ${fmtINR(yearlySavings)}` : undefined}
                      inputProps={{ id: "cycle-yearly" }}
                    />
                  </div>
                </fieldset>

                {/* Order summary */}
                <div className="mt-8 overflow-hidden rounded-xl border border-black/10">
                  <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-sm font-semibold">{plan!.name}</p>
                      <p className="mt-0.5 text-xs text-gray-500">Billed {cycle}</p>
                    </div>
                    <p className="text-sm font-medium">{fmtINR(amount)}</p>
                  </div>
                  <dl className="divide-y divide-black/5 border-t border-black/5 text-sm">
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <dt className="text-gray-600">Subtotal</dt>
                      <dd className="font-medium">{fmtINR(amount)}</dd>
                    </div>
                    <div className="flex items-center justify-between px-5 py-3.5">
                      <dt className="text-gray-600">Tax</dt>
                      <dd className="text-gray-500">Calculated at payment</dd>
                    </div>
                    <div className="flex items-center justify-between bg-gray-50/60 px-5 py-4">
                      <dt className="font-semibold">Total due today</dt>
                      <dd className="text-base font-bold">{fmtINR(amount)}</dd>
                    </div>
                  </dl>
                </div>

                {cycle === "yearly" && yearlySavings > 0 && (
                  <p className="mt-3 text-xs font-medium text-emerald-700">
                    You save {fmtINR(yearlySavings)} a year with annual billing.
                  </p>
                )}
              </>
            )}

            {isFreeTrial && (
              <ul className="mt-7 space-y-2.5 border-t border-black/5 pt-6">
                {(plan!.features ?? []).slice(0, 4).map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check className="h-4 w-4 shrink-0 stroke-[3] text-[#2563EB]" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ── RIGHT: payment ─────────────────────────────────────────── */}
          <section aria-label="Payment details">
            {/* Express checkout */}
            {!isFreeTrial && (
              <>
                <div>
                  <h2 className="sr-only">Express payment</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <ExpressButton
                      icon={<Smartphone className="h-4 w-4" />}
                      label="UPI"
                      onClick={() => startPayment("upi")}
                      disabled={processing}
                    />
                    <ExpressButton
                      icon={<CreditCard className="h-4 w-4" />}
                      label="Card"
                      onClick={() => startPayment("card")}
                      disabled={processing}
                    />
                  </div>
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-gray-400">
                    Opens Razorpay&apos;s secure payment window
                  </p>
                </div>

                <div className="my-7 flex items-center gap-4" aria-hidden>
                  <span className="h-px flex-1 bg-black/10" />
                  <span className="text-xs font-medium uppercase tracking-wider text-gray-400">or</span>
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
              {/* Contact information */}
              <h2 className="text-base font-semibold">Contact information</h2>
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

              {/* Payment method */}
              <h2 className="mt-9 text-base font-semibold">Payment method</h2>
              <div className="mt-3 rounded-xl border border-black/10">
                <div
                  className="flex items-center gap-3 border-b border-black/5 px-4 py-3.5"
                  aria-hidden
                >
                  <CreditCard className="h-5 w-5 text-[#282628]" />
                  <span className="text-sm font-semibold">Card, UPI, NetBanking &amp; wallets</span>
                  <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-[#2563EB]/5 px-2 py-0.5 text-[11px] font-semibold text-[#2563EB]">
                    <ShieldCheck className="h-3 w-3" /> Secure
                  </span>
                </div>
                <div className="flex items-start gap-3 px-4 py-4">
                  <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <p className="text-xs leading-relaxed text-gray-500">
                    {isFreeTrial
                      ? "No card needed — your trial starts immediately and we'll remind you before it ends."
                      : "You'll enter your card or UPI details in Razorpay's encrypted payment window after clicking the button below. Your details never touch Doloyal's servers."}
                  </p>
                </div>
              </div>

              {/* Billing information */}
              <h2 className="mt-9 text-base font-semibold">Billing information</h2>
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

              {/* Business purchase */}
              <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isBusiness}
                  onChange={(e) => setIsBusiness(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#2563EB]"
                />
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <Building2 className="h-4 w-4 text-gray-400" aria-hidden />
                  I&apos;m purchasing as a business
                </span>
              </label>

              {isBusiness && (
                <div className="mt-3 space-y-3 rounded-xl border border-black/10 bg-gray-50/50 p-4">
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

              {/* CTA */}
              <button
                type="submit"
                disabled={processing}
                className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#1d4fd8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Processing payment…
                  </>
                ) : (
                  <>
                    {!isFreeTrial && <Lock className="h-4 w-4" aria-hidden />}
                    {ctaLabel}
                  </>
                )}
              </button>

              <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-gray-400">
                <Wallet className="h-3 w-3" aria-hidden />
                Payments secured by Razorpay · PCI DSS compliant · 256-bit encryption
              </p>
            </form>
          </section>
        </main>
      )}
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────────── */

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-black/10 bg-gray-50">
        {icon}
      </div>
      <h1 className="mt-5 text-xl font-bold tracking-tight text-[#282628]">{title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">{body}</p>
      {children && <div className="mt-7">{children}</div>}
      <Link
        href="/pricing"
        className="mt-6 text-xs font-medium text-gray-400 underline underline-offset-4 transition-colors hover:text-[#2563EB]"
      >
        ← Back to pricing
      </Link>
    </div>
  );
}

function CycleOption({
  selected,
  onClick,
  title,
  subtitle,
  badge,
  inputProps,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  badge?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`relative rounded-xl border px-4 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
        selected
          ? "border-[#2563EB] bg-[#2563EB]/[0.04] ring-1 ring-[#2563EB]"
          : "border-black/10 bg-white hover:border-black/25"
      }`}
    >
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-0.5 block text-xs text-gray-500">{subtitle}</span>
      {badge && (
        <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          {badge}
        </span>
      )}
      <input type="radio" name="cycle" checked={selected} onChange={onClick} className="sr-only" {...inputProps} />
    </button>
  );
}

function ExpressButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-sm font-semibold text-[#282628] shadow-sm transition-all hover:border-[#2563EB] hover:text-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

function SuccessScreen({ result, email, isTrial }: { result: SuccessResult; email: string; isTrial: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <BadgeCheck className="h-8 w-8 text-emerald-600" aria-hidden />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[#282628]">{result.title}</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Your {result.planName} subscription is now active.
      </p>

      <dl className="mt-8 w-full max-w-sm divide-y divide-black/5 rounded-2xl border border-black/10 px-6 text-left text-sm">
        <div className="flex items-center justify-between py-3.5">
          <dt className="text-gray-500">Plan</dt>
          <dd className="font-semibold">{result.planName}</dd>
        </div>
        <div className="flex items-center justify-between py-3.5">
          <dt className="text-gray-500">Status</dt>
          <dd className="font-semibold capitalize">{result.status.toLowerCase()}</dd>
        </div>
        {result.transactionId && (
          <div className="flex items-center justify-between gap-4 py-3.5">
            <dt className="shrink-0 text-gray-500">Transaction</dt>
            <dd className="truncate font-mono text-xs font-medium text-gray-700">
              {result.transactionId}
            </dd>
          </div>
        )}
        <div className="flex items-center justify-between py-3.5">
          <dt className="text-gray-500">{isTrial ? "Trial ends" : "Next billing date"}</dt>
          <dd className="font-semibold">{fmtDate(result.nextBillingDate)}</dd>
        </div>
      </dl>

      <Link
        href="/app/dashboard"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#232529] px-10 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
