"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";

export function ForgotPasswordScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [email, setEmail] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetDone, setResetDone] = React.useState(false);

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      // Always show success — the backend never reveals whether the account exists.
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(resetToken!, newPassword);
      setResetDone(true);
      setTimeout(() => router.push("/sign-in"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClasses =
    "h-12 w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 text-[14px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15";
  const buttonClasses =
    "group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] text-[14.5px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_12px_32px_-12px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-24">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="rounded-[2rem] border border-[rgb(var(--color-border))] bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)] sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-symbol.png" alt="Doloyal" width={40} height={40} className="h-10 w-10 object-contain" />

          {resetToken ? (
            resetDone ? (
              <div className="mt-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
                <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em]">Password updated</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
            ) : (
              <>
                <h1 className="mt-6 text-2xl font-bold tracking-[-0.02em]">Choose a new password</h1>
                <p className="mt-2 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                  Enter a strong new password for your Doloyal account.
                </p>
                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                  </div>
                )}
                <form onSubmit={handleReset} className="mt-6" noValidate>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-semibold">New password</label>
                      <input
                        id="new-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className={inputClasses}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="confirm-password" className="mb-1.5 block text-[13px] font-semibold">Confirm password</label>
                      <input
                        id="confirm-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Repeat your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputClasses}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className={buttonClasses}>
                    {submitting ? "Updating…" : "Update password"}
                    {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                  </button>
                </form>
              </>
            )
          ) : sent ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <h1 className="mt-4 text-2xl font-bold tracking-[-0.02em]">Check your inbox</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                If an account exists for <span className="font-semibold">{email}</span>, a secure reset
                link is on its way. The link expires in 30 minutes.
              </p>
              <button
                onClick={() => { setEmail(""); setSent(false); }}
                className="mt-5 text-sm font-medium text-[#2563EB] hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h1 className="mt-6 text-2xl font-bold tracking-[-0.02em]">Reset your password</h1>
              <p className="mt-2 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                Enter the email you use to sign in. We&apos;ll send you a secure reset link within a minute.
              </p>
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[13px] font-medium text-red-700">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}
              <form onSubmit={handleRequestReset} className="mt-6" noValidate>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClasses}
                  required
                />
                <button type="submit" disabled={submitting} className={buttonClasses}>
                  {submitting ? "Sending…" : "Send reset link"}
                  {!submitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
              </form>
            </>
          )}

          {!resetToken && !sent && (
            <p className="mt-5 text-center text-[13.5px] text-[rgb(var(--color-muted-foreground))]">
              Remembered it?{" "}
              <Link href="/sign-in" className="font-semibold text-[#2563EB] hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
