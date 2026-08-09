"use client";

import * as React from "react";
import { Sparkles, CheckCircle2, ArrowRight, Loader2, CalendarDays, Clock, ShieldCheck } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";

export default function BookDemoPage() {
  const [formState, setFormState] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    businessName: "",
    businessType: "Salon / Spa",
    locations: "1 Location",
    phone: "",
    preferredDate: "",
    preferredTime: "10:00 AM",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.businessName) {
      setFormState("error");
      return;
    }

    setFormState("loading");
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "e1da9865-e94c-4392-a2a1-a1dfc16e0cd1",
          subject: `New Demo Request from ${formData.name} (${formData.businessName})`,
          from_name: "Doloyal Demo Booking",
          name: formData.name,
          email: formData.email,
          phone: formData.phone || "N/A",
          businessName: formData.businessName,
          businessType: formData.businessType,
          locations: formData.locations,
          preferredDate: formData.preferredDate || "N/A",
          preferredTime: formData.preferredTime || "N/A",
          message: `Demo Booking Request:\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || "N/A"}\nBusiness Name: ${formData.businessName}\nBusiness Type: ${formData.businessType}\nLocations: ${formData.locations}\nPreferred Date: ${formData.preferredDate || "N/A"}\nPreferred Time: ${formData.preferredTime || "N/A"}\nMessage: ${formData.message || "N/A"}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormState("success");
      } else {
        setFormState("error");
      }
    } catch {
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
            <span>Book a Demo</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            See How Doloyal Can Help Your Business Grow
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Get a personalized walkthrough of Doloyal and see how customer retention, loyalty, bookings, rewards, and analytics can work together for your business.
          </p>
        </div>
      </section>

      {/* Form & Expectations */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            
            {/* Left: Demo Request Form */}
            <div className="lg:col-span-7 rounded-3xl border border-black/5 bg-white p-8 sm:p-10 shadow-sm">
              {formState === "success" ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold text-[#282628]">Demo Request Received</h3>
                  <p className="mt-2 text-base text-gray-600">
                    We’ll be in touch to confirm your demo.
                  </p>
                  <button
                    onClick={() => {
                      setFormState("idle");
                      setFormData({
                        name: "",
                        email: "",
                        businessName: "",
                        businessType: "Salon / Spa",
                        locations: "1 Location",
                        phone: "",
                        preferredDate: "",
                        preferredTime: "10:00 AM",
                        message: "",
                      });
                    }}
                    className="mt-8 rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-[#282628] hover:bg-gray-50"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        required
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
                        Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="Your Business / Brand name"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
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

                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Number of Locations
                      </label>
                      <select
                        value={formData.locations}
                        onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option>1 Location</option>
                        <option>2–5 Locations</option>
                        <option>6–10 Locations</option>
                        <option>10+ Locations</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Preferred Date
                      </label>
                      <input
                        type="date"
                        value={formData.preferredDate}
                        onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                        Preferred Time
                      </label>
                      <select
                        value={formData.preferredTime}
                        onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                        className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                      >
                        <option>10:00 AM</option>
                        <option>11:30 AM</option>
                        <option>02:00 PM</option>
                        <option>04:00 PM</option>
                        <option>05:30 PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                      Message
                    </label>
                    <textarea
                      rows={3}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tell us what you'd like to see in the demo..."
                      className="w-full rounded-2xl border border-black/10 bg-gray-50/50 px-4 py-3 text-sm outline-none transition-all focus:border-[#2563EB] focus:bg-white focus:ring-2 focus:ring-[#2563EB]/15"
                    />
                  </div>

                  {formState === "error" && (
                    <div className="rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600">
                      Please fill out all required fields (*).
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={formState === "loading"}
                    className="group inline-flex items-center gap-3 rounded-full bg-[#232529] px-7 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-[#2563EB] shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {formState === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Booking...</span>
                      </>
                    ) : (
                      <>
                        <TextRoll>Book My Demo</TextRoll>
                        <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right: What to Expect */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-black/10 bg-[#232123] p-8 text-white shadow-xl">
                <h3 className="text-xl font-extrabold text-white">What Happens Next</h3>
                <ul className="mt-6 space-y-5">
                  <li className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Instant Confirmation</h4>
                      <p className="mt-1 text-xs text-white/70">
                        We'll confirm your demo time via email and WhatsApp.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">1-on-1 Walkthrough</h4>
                      <p className="mt-1 text-xs text-white/70">
                        20 minutes on Google Meet customized for your business category.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-extrabold">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Pre-Loaded Free Trial</h4>
                      <p className="mt-1 text-xs text-white/70">
                        We'll set up your free trial account with your business settings ready.
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm flex items-center gap-4">
                <ShieldCheck className="h-8 w-8 text-[#2563EB] shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-[#282628]">No Sales Pressure</h4>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Just a practical product demo so you can evaluate Doloyal for your business.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}