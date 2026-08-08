"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles, Mail, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";

export default function ContactPage() {
  const [formState, setFormState] = React.useState<"idle" | "loading" | "success" | "error">("idle");
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    businessName: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setFormState("error");
      return;
    }

    setFormState("loading");
    setTimeout(() => {
      setFormState("success");
    }, 1000);
  };

  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Contact Doloyal</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Let’s Talk About Your Business
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Have a question, need help getting started, or want to see how Doloyal can work for your business? We’d love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact Form & Information */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-start">
            
            {/* Left: Contact Form */}
            <div className="lg:col-span-7 rounded-3xl border border-black/5 bg-white p-8 sm:p-10 shadow-sm">
              {formState === "success" ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 text-2xl font-extrabold text-[#282628]">Message Sent</h3>
                  <p className="mt-2 text-base text-gray-600">
                    Thanks for reaching out. We’ll get back to you soon.
                  </p>
                  <button
                    onClick={() => {
                      setFormState("idle");
                      setFormData({ name: "", email: "", businessName: "", phone: "", message: "" });
                    }}
                    className="mt-8 rounded-full border border-black/10 px-6 py-2.5 text-sm font-semibold text-[#282628] hover:bg-gray-50"
                  >
                    Send Another Message
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
                        Email *
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
                        placeholder="Salon, Cafe, Gym name"
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

                  <div>
                    <label className="block text-xs font-bold text-[#282628] uppercase tracking-wider mb-2">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help your business grow?"
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
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <TextRoll>Send Message</TextRoll>
                        <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Right: Direct Info */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2563EB]/10 text-[#2563EB]">
                  <Mail className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#282628]">Email Us Directly</h3>
                <p className="mt-1 text-sm text-gray-500">We reply to every email within 2 hours.</p>
                <a
                  href="mailto:hello@doloyal.com"
                  className="mt-4 inline-block text-lg font-extrabold text-[#2563EB] hover:underline"
                >
                  hello@doloyal.com
                </a>
              </div>

              <div className="rounded-3xl border border-[#2563EB]/20 bg-[#F0F5FF]/60 p-8">
                <h4 className="text-lg font-extrabold text-[#282628]">Want a Live Walkthrough?</h4>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  Book a 1-on-1 personalized demo to see how Doloyal boosts customer retention for your business.
                </p>
                <Link
                  href="/book-demo"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105"
                >
                  <span>Book a Demo</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}