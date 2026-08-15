import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Doloyal Integrations | Connect Your Business Tools",
  description:
    "Bring your customer data, bookings, communication, payments, and business workflows together with Doloyal.",
  path: "/integrations",
});

const INTEGRATION_CATEGORIES = [
  {
    category: "Payments",
    items: [
      { name: "Stripe", desc: "Connect payments and customer transactions.", status: "Coming Soon" },
      { name: "Razorpay", desc: "Process local Indian UPI & card transactions.", status: "Available" },
      { name: "UPI AutoPay", desc: "Recurring membership subscriptions via UPI.", status: "Coming Soon" },
    ],
  },
  {
    category: "Communication",
    items: [
      { name: "WhatsApp Business API", desc: "Engage customers through official messaging.", status: "Available" },
      { name: "Email Marketing", desc: "Send customer campaigns and automated receipts.", status: "Available" },
    ],
  },
  {
    category: "Calendar & Schedule",
    items: [
      { name: "Google Calendar", desc: "Sync appointments and staff availability.", status: "Available" },
      { name: "Outlook Calendar", desc: "Bi-directional calendar sync for staff schedules.", status: "Coming Soon" },
    ],
  },
  {
    category: "Customer Data",
    items: [
      { name: "CSV / Excel Import", desc: "Bulk import your existing customer contact database.", status: "Available" },
      { name: "HubSpot / Zoho", desc: "Sync customer leads and visit history.", status: "Coming Soon" },
    ],
  },
  {
    category: "Website & Ecommerce",
    items: [
      { name: "Website Widget", desc: "Embed booking & loyalty widgets directly into your site.", status: "Available" },
      { name: "WordPress / Shopify", desc: "Connect online booking & store customer accounts.", status: "Available" },
    ],
  },
  {
    category: "Automation & API",
    items: [
      { name: "Webhooks", desc: "Real-time event webhooks for custom backend builds.", status: "Available" },
      { name: "Zapier", desc: "Connect Doloyal to 5,000+ app workflows.", status: "Coming Soon" },
    ],
  },
];

export default function IntegrationsPage() {
  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Integrations</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Connect Doloyal With the Tools You Already Use
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Bring your customer data, bookings, communication, payments, and business workflows together.
          </p>
        </div>
      </section>

      {/* Integration Categories Grid */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 space-y-16">
          {INTEGRATION_CATEGORIES.map((cat, idx) => (
            <div key={idx}>
              <h2 className="text-2xl font-extrabold text-[#282628] mb-6 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                {cat.category}
              </h2>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cat.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#282628]">{item.name}</h3>
                        <span
                          className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                            item.status === "Available"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">{item.desc}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#2563EB]">
                      <span>{item.status === "Available" ? "Connectable" : "In Development"}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <FinalCta />
    </div>
  );
}