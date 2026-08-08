import type { Metadata } from "next";
import Link from "next/link";
import {
  Users,
  Award,
  Calendar,
  CreditCard,
  Sparkles,
  Megaphone,
  Bot,
  BarChart3,
  Building2,
  Globe,
  ArrowRight,
} from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { TextRoll } from "@/marketing/landing/ui";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Doloyal Features | Loyalty, Bookings & Customer Retention",
  description:
    "Manage customer relationships, loyalty, bookings, rewards, memberships, campaigns, and retention from one simple platform.",
  path: "/features",
});

const FEATURE_CATEGORIES = [
  {
    title: "Customer Management",
    desc: "Keep every customer profile, visit, preference, and activity organized in one place.",
    icon: Users,
    color: "bg-[#2563EB]/10 text-[#2563EB]",
  },
  {
    title: "Loyalty & Rewards",
    desc: "Create loyalty programs, points, rewards, and incentives that encourage customers to return.",
    icon: Award,
    color: "bg-[#3B82F6]/10 text-[#3B82F6]",
  },
  {
    title: "Online Bookings",
    desc: "Let customers discover available services, choose a time, and book appointments online.",
    icon: Calendar,
    color: "bg-[#0284C7]/10 text-[#0284C7]",
  },
  {
    title: "Memberships",
    desc: "Create recurring membership plans and manage member activity, benefits, and payments.",
    icon: CreditCard,
    color: "bg-[#7C3AED]/10 text-[#7C3AED]",
  },
  {
    title: "Customer Retention",
    desc: "Identify inactive and at-risk customers and take action to bring them back.",
    icon: Sparkles,
    color: "bg-[#D946EF]/10 text-[#D946EF]",
  },
  {
    title: "Campaigns",
    desc: "Create targeted customer campaigns and follow-ups to increase repeat visits.",
    icon: Megaphone,
    color: "bg-[#F59E0B]/10 text-[#F59E0B]",
  },
  {
    title: "AI Assistant",
    desc: "Use AI-powered insights to understand customer behavior and discover opportunities to improve retention.",
    icon: Bot,
    color: "bg-[#10B981]/10 text-[#10B981]",
  },
  {
    title: "Analytics",
    desc: "Track revenue, customers, repeat visits, bookings, loyalty activity, and business performance.",
    icon: BarChart3,
    color: "bg-[#2563EB]/10 text-[#2563EB]",
  },
  {
    title: "Staff & Branches",
    desc: "Manage your team, permissions, and multiple business locations from one platform.",
    icon: Building2,
    color: "bg-[#0284C7]/10 text-[#0284C7]",
  },
  {
    title: "Website & Booking Pages",
    desc: "Create branded customer-facing pages and booking experiences connected directly to Doloyal.",
    icon: Globe,
    color: "bg-[#7C3AED]/10 text-[#7C3AED]",
  },
];

export default function FeaturesPage() {
  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-20 sm:pt-44 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Doloyal Features</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl lg:text-[4.5rem] lg:leading-[1.1] max-w-4xl mx-auto">
            Everything You Need to Keep Customers Coming Back
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-gray-600 font-normal">
            Manage customer relationships, loyalty, bookings, rewards, memberships, campaigns, and retention from one simple platform.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/sign-up"
              className="group flex items-center gap-3.5 rounded-full bg-[#232529] pl-6 pr-2.5 py-3 text-[15px] font-semibold text-white shadow-xl transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_20px_40px_-10px_rgba(37,99,235,0.45)] hover:-translate-y-0.5"
            >
              <TextRoll>Start 1 Month Free</TextRoll>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#232529] group-hover:text-[#2563EB] shadow-sm transition-transform duration-300 group-hover:rotate-45 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </Link>

            <Link
              href="/book-demo"
              className="group flex items-center gap-2 px-3 py-3 text-[15px] font-semibold text-[#1F242B] hover:text-[#2563EB] transition-colors"
            >
              <TextRoll>Book a Demo</TextRoll>
              <ArrowRight className="h-4 w-4 stroke-[2.5] transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* 10 Feature Categories Grid */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_CATEGORIES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="group rounded-3xl border border-black/5 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feat.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold text-[#282628] group-hover:text-[#2563EB] transition-colors">
                      {feat.title}
                    </h3>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-gray-600">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-[#2563EB]">
                    <span>Doloyal Core Feature</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}