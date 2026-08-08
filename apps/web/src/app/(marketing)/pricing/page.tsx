import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, Check, ArrowRight } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Doloyal Pricing | Start 1 Month Free",
  description:
    "Get everything you need to build stronger customer relationships and grow repeat business. Transparent pricing for local businesses.",
  path: "/pricing",
});

const PRICING_PLANS = [
  {
    badge: "FREE / TRIAL",
    name: "Free Trial",
    price: "₹0",
    period: "1 Month Free",
    desc: "Try all features with full access to test Doloyal for your business.",
    cta: "Start 1 Month Free",
    href: "/sign-up",
    popular: false,
    features: [
      "Full platform access (1 Month Free)",
      "Up to 100 customer profiles",
      "Digital loyalty points & 3 rewards",
      "Online booking widget",
      "Basic customer analytics",
      "Doloyal AI Assistant (50 queries)",
    ],
  },
  {
    badge: "STARTER",
    name: "Starter Plan",
    price: "₹1,249",
    period: "/month, billed yearly",
    desc: "For single-location businesses getting started with customer retention.",
    cta: "Choose Starter",
    href: "/sign-up",
    popular: false,
    features: [
      "Up to 500 customers",
      "Loyalty Program + up to 10 rewards",
      "2 Membership Plans",
      "Manual Campaigns",
      "Online Booking & Booking Links",
      "Customer Management & Profiles",
      "Basic Analytics & Reports",
      "Doloyal AI Assistant",
      "Chat Support",
      "2 Business Location",
      "Basic Website/Booking Page",
    ],
  },
  {
    badge: "GROWTH",
    name: "Growth Plan",
    price: "₹2,916",
    period: "/month, billed yearly",
    desc: "For growing businesses that need automation and deeper customer retention.",
    cta: "Choose Growth",
    href: "/sign-up",
    popular: true,
    features: [
      "Everything in Starter",
      "Up to 5,000 customers",
      "Unlimited Loyalty Rewards",
      "Up to 3 Membership Plans",
      "Automated Campaigns — Birthday, Win-back & Follow-ups",
      "AI Customer Retention Insights",
      "AI Retention Engine",
      "Doloyal AI Assistant",
      "Email Campaigns",
      "Advanced Analytics & Retention Reports",
      "Automated Booking Follow-ups",
      "Multi-Branch Support",
      "Priority Support",
    ],
  },
];

const FAQS = [
  {
    q: "Is the free trial really free?",
    a: "Yes — 14 days, every feature unlocked, no credit card required. You keep your data and your progress if you upgrade.",
  },
  {
    q: "Can I switch plans later?",
    a: "Anytime, in one click. Upgrades take effect immediately and you can scale your plan as your customer base grows.",
  },
  {
    q: "Is there a discount for annual billing?",
    a: "Yes! Choose annual billing at checkout to save up to 20% on all plans.",
  },
  {
    q: "Need help migrating customer data?",
    a: "Our onboarding team will help you import your existing customer list and booking records for free.",
  },
];

export default function PricingPage() {
  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Simple Pricing</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Start Free. Grow When You’re Ready.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Get everything you need to build stronger customer relationships and grow repeat business.
          </p>
        </div>
      </section>

      {/* 3 Plans Grid */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_PLANS.map((plan, idx) => (
              <div
                key={idx}
                className={`relative flex flex-col justify-between rounded-3xl border p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${
                  plan.popular
                    ? "border-[#2563EB] bg-[#2563EB] text-white shadow-2xl shadow-blue-500/30"
                    : "border-black/5 bg-white text-[#282628]"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-bold text-[#2563EB] shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <span className={`text-xs font-extrabold tracking-wider uppercase ${plan.popular ? "text-white/80" : "text-[#2563EB]"}`}>
                    {plan.badge}
                  </span>
                  <h3 className={`mt-2 text-2xl font-extrabold ${plan.popular ? "text-white" : "text-[#282628]"}`}>{plan.name}</h3>
                  <p className={`mt-2 text-sm min-h-[40px] ${plan.popular ? "text-white/80" : "text-gray-500"}`}>{plan.desc}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className={`text-4xl font-extrabold tracking-tight ${plan.popular ? "text-white" : "text-[#282628]"}`}>
                      {plan.price}
                    </span>
                    <span className={`text-xs font-semibold ${plan.popular ? "text-white/70" : "text-gray-500"}`}>{plan.period}</span>
                  </div>

                  <ul className={`mt-8 space-y-3.5 border-t pt-6 ${plan.popular ? "border-white/15" : "border-gray-100"}`}>
                    {plan.features.map((f, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-3 text-sm">
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full ${plan.popular ? "bg-white/20 text-white" : "bg-[#2563EB]/10 text-[#2563EB]"}`}>
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                        <span className={plan.popular ? "text-white/90" : "text-gray-700"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <Link
                    href={plan.href}
                    className={`group flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all duration-300 ${
                      plan.popular
                        ? "bg-white text-[#2563EB] hover:bg-slate-50 shadow-md"
                        : "bg-[#232529] text-white hover:bg-[#2563EB]"
                    }`}
                  >
                    <TextRoll>{plan.cta}</TextRoll>
                    <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-24 sm:pb-32 bg-[#F9F6F4]/50 border-t border-black/5 py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-[#282628] sm:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-gray-600">
              Got questions about Doloyal pricing? We’re here to help.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            {FAQS.map((faq, fIdx) => (
              <div key={fIdx} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-bold text-[#282628]">{faq.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}