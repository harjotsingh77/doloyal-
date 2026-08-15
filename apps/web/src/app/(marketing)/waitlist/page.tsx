"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, ArrowRight, Loader2, ShieldCheck, Gift } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";
import { sendWeb3Form } from "@/lib/web3forms";

export default function WaitlistPage() {
  const [formState, setFormState] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    businessName: "",
    businessType: "Salon / Spa",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email) {
      setFormState("error");
      return;
    }

    setFormState("loading");
    const ok = await sendWeb3Form({
      subject: "New Waitlist Signup — Doloyal Page",
      from_name: "Doloyal Waitlist Page",
      name: formData.name || formData.businessName || formData.email,
      email: formData.email,
      business_name: formData.businessName || "N/A",
      business_type: formData.businessType,
      message: `Waitlist Page Submission:\nName: ${formData.name || "N/A"}\nEmail: ${formData.email}\nBusiness Name: ${formData.businessName || "N/A"}\nBusiness Type: ${formData.businessType}`,
    });

    if (ok) {
      setFormState("success");
    } else {
      setFormState("error");
    }
  };

  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>🚀 Launching Soon — Early Access</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Join the Doloyal Waitlist & Get 1 Month Free
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Be among the first local businesses to get early access to customer retention, loyalty rewards, bookings, and automated follow-ups.
          </p>
        </div>
      </section>

      {/* Form & Benefits */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            
            {/* Left: Form */}
            <div className="lg:col-span-7 rounded-3xl border border-black/5 bg-white p-8 sm:p-10 shadow-sm">
              {formState === "success" ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold text-[#282628]">🎉 You&apos;re On The Waitlist!</h3>
                  <p className="mt-2 text-base text-gray-600">
                    We’ll send you early access credentials & your 1 Month Free trial link as soon as we launch.
                  </p>
                  <button
                    onClick={() => {
                      setFormState("idle");
                      setFormData({ name: "", email: "", businessName: "", businessType: "Salon / Spa" });
                    }}
                    className="mt-8 rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-[#282628] hover:bg-gray-50"
                  >
                    Register Another Business
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your full name"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@business.com"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="Salon, Café, Gym, Spa name"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Business Type
                      </label>
                      <select
                        value={formData.businessType}
                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option>Salon / Spa</option>
                        <option>Café / Restaurant</option>
                        <option>Gym / Fitness Center</option>
                        <option>Clinic / Wellness</option>
                        <option>Retail Store</option>
                        <option>Other Local Business</option>
                      </select>
                    </div>
                  </div>

                  {formState === "error" && (
                    <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                      Please enter a valid work email address.
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formState === "loading"}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#232529] px-8 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#2563EB] shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {formState === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Joining Waitlist...</span>
                      </>
                    ) : (
                      <>
                        <TextRoll>Join Waitlist & Lock 1 Month Free</TextRoll>
                        <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right: Early Bird Perks */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-[#2563EB]/20 bg-[#F0F5FF]/60 p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB] text-white shadow-md mb-6">
                  <Gift className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-extrabold text-[#282628]">Early Access Perks</h3>
                <ul className="mt-5 space-y-4 text-sm text-gray-700 font-medium">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <span><strong>1 Month Free Access</strong> on all features</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <span><strong>Priority Setup & Onboarding</strong> assistance</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <span><strong>Direct Founder Access</strong> for feature requests</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] shrink-0" />
                    <span><strong>Locked-in Early Bird Pricing</strong> for life</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
