import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Forgot password",
  description: "Reset your Doloyal password.",
  path: "/forgot-password",
  robots: { index: false, follow: false },
});

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-5 py-24">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
        <div className="rounded-[2rem] border border-[rgb(var(--color-border))] bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_48px_-24px_rgba(15,23,42,0.18)] sm:p-10">
          <img src="/logo-symbol.png" alt="Doloyal" className="h-10 w-10 object-contain" />
          <h1 className="mt-6 text-2xl font-bold tracking-[-0.02em]">Reset your password</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
            Enter the email you use to sign in. We&apos;ll send you a secure reset link within a minute.
          </p>
          <div className="mt-6">
            <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold">Email</label>
            <input
              id="email"
              type="email"
              placeholder="you@business.com"
              className="h-12 w-full rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] px-4 text-[14px] outline-none transition-all focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
            />
          </div>
          <button className="group mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0F172A] text-[14.5px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_12px_32px_-12px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E293B]">
            Send reset link <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-5 text-center text-[13.5px] text-[rgb(var(--color-muted-foreground))]">
            Remembered it?{" "}
            <Link href="/sign-in" className="font-semibold text-[#2563EB] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}