import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { FaqList } from "@/marketing/components/faq";
import { FinalCta } from "@/marketing/components/cta";
import { FAQS } from "@/marketing/data/faq";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "FAQ",
  description:
    "Answers to the most common questions about Doloyal — loyalty, rewards, memberships, online booking, the AI retention engine, pricing, and getting started.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="FAQ"
        title={
          <>
            Frequently asked <em className="font-[var(--font-instrument)] italic">questions</em>
          </>
        }
        lead="Everything you need to know about Doloyal — loyalty, booking, AI retention, pricing, and getting started."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <FaqList items={FAQS} />
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-5 rounded-[2.5rem] bg-[#0F172A] p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Still have questions?</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                Our team responds quickly — or read the full docs and help center at your own pace.
              </p>
            </div>
            <div className="flex flex-col items-start justify-center gap-4 lg:items-end">
              <Link
                href="/contact"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[14.5px] font-semibold text-[#0F172A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#F1F5F9]"
              >
                <MessageCircle className="h-4 w-4" /> Contact us
              </Link>
              <Link href="/help" className="text-[13px] font-medium text-white/50 transition-colors hover:text-white">
                <ChevronRight className="mr-0.5 inline h-3.5 w-3.5" /> Browse the help center
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}