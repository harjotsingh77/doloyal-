"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "./ui";

const PLANS_DATA = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For single-location businesses getting started with customer retention.",
    monthly: 1499,
    yearly: 1249,
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
    cta: "Choose Starter →",
    href: "/sign-up",
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "For growing businesses that need automation and deeper customer retention.",
    monthly: 3499,
    yearly: 2916,
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
    cta: "Choose Growth →",
    href: "/sign-up",
    highlighted: true,
  },
];

export function PricingCards() {
  const [yearly, setYearly] = React.useState(true);

  return (
    <div>
      <Reveal className="mb-12 flex items-center justify-center gap-4">
        <span className={cn("text-sm font-semibold transition-colors", !yearly ? "text-[#111]" : "text-[#666]")}>
          Monthly
        </span>
        <button
          onClick={() => setYearly(!yearly)}
          role="switch"
          aria-checked={yearly}
          aria-label="Toggle yearly billing"
          className={cn(
            "relative h-8 w-14 rounded-full border transition-colors duration-300",
            yearly ? "border-[#2563EB] bg-[#2563EB]" : "border-black/10 bg-slate-100",
          )}
        >
          <span
            className={cn(
              "absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300",
              yearly ? "left-7" : "left-1",
            )}
          />
        </button>
        <span className={cn("text-sm font-semibold transition-colors", yearly ? "text-[#111]" : "text-[#666]")}>
          Yearly
        </span>
        <span className="rounded-full bg-[#2563EB]/10 px-3 py-1 text-[12px] font-bold text-[#2563EB]">
          Save ~20%
        </span>
      </Reveal>

      <div className="grid gap-6 sm:grid-cols-2 lg:max-w-4xl lg:mx-auto">
        {PLANS_DATA.map((plan, i) => {
          const price = yearly ? plan.yearly : plan.monthly;
          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
              className="h-full"
            >
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border p-7 sm:p-8 transition-all duration-300",
                  plan.highlighted
                    ? "border-transparent bg-[#2563EB] text-white shadow-2xl shadow-blue-500/30"
                    : "border-black/10 bg-white text-[#282628] shadow-sm hover:shadow-xl",
                )}
              >
                {plan.highlighted && (
                  <span className="absolute right-6 top-6 flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold backdrop-blur text-white">
                    <Zap className="h-3 w-3" /> Most popular
                  </span>
                )}

                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className={cn("mt-1.5 text-xs sm:text-sm leading-relaxed", plan.highlighted ? "text-white/80" : "text-gray-500")}>
                  {plan.tagline}
                </p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tracking-tight">
                    ₹{price.toLocaleString("en-IN")}
                  </span>
                  <span className={cn("text-xs font-semibold", plan.highlighted ? "text-white/70" : "text-gray-500")}>
                    /month
                  </span>
                </div>
                <p className={cn("mt-0.5 text-xs font-medium", plan.highlighted ? "text-white/60" : "text-gray-400")}>
                  {yearly ? "billed yearly" : "billed monthly"}
                </p>

                <Link
                  href={plan.href}
                  className={cn(
                    "group mt-6 flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-md",
                    plan.highlighted
                      ? "bg-white text-[#2563EB] hover:bg-slate-50"
                      : "bg-[#232529] text-white hover:bg-[#2563EB]",
                  )}
                >
                  <span>{plan.cta}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <ul className={cn("mt-8 space-y-3 text-xs sm:text-sm font-medium border-t pt-6", plan.highlighted ? "border-white/15 text-white/90" : "border-gray-100 text-gray-700")}>
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check className={cn("mt-0.5 h-4 w-4 shrink-0 stroke-[2.5]", plan.highlighted ? "text-white" : "text-[#2563EB]")} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}