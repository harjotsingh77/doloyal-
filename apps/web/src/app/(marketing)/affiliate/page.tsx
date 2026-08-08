import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, Stagger, StaggerItem, SerifWord, CheckItem, Reveal } from "@/marketing/components/ui";
import { FaqList } from "@/marketing/components/faq";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Affiliate Program",
  description:
    "Earn 25% recurring commission for every business you introduce to Doloyal. Zero setup, real-time dashboard, monthly payouts.",
  path: "/affiliate",
});

export default function AffiliatePage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Affiliate program"
        title={
          <>
            Earn <em className="font-[var(--font-instrument)] italic">25% recurring</em> on every plan you refer
          </>
        }
        lead="If you help salons, gyms, or cafés grow, you should get paid for it — every month, for as long as they stay."
      >
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <a
            href="mailto:affiliates@doloyal.ai?subject=Affiliate%20sign-up"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#0F172A] px-7 text-[14.5px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_12px_32px_-12px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E293B]"
          >
            Apply to join <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <a href="#how" className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]">
            See how it works
          </a>
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { v: "25%", l: "recurring commission", d: "every month, not just once" },
              { v: "60-day", l: "cookie window", d: "credit for the full sales cycle" },
              { v: "₹0", l: "setup or fees", d: "free dashboard, free everything" },
              { v: "Monthly", l: "payouts", d: "via bank or Razorpay" },
            ].map((s) => (
              <div key={s.l} className="rounded-3xl border border-[rgb(var(--color-border))] bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-clip-text text-3xl font-bold text-transparent">
                  {s.v}
                </div>
                <div className="mt-1 text-[14px] font-bold">{s.l}</div>
                <div className="text-[12.5px] text-[rgb(var(--color-subtle))]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading eyebrow="How it works" title="Three steps to your first payout" />
          <Stagger className="grid gap-5 md:grid-cols-3">
            {[
              { n: "01", t: "Apply", d: "Tell us who you are. Bloggers, agencies, coaches, owners — all welcome." },
              { n: "02", t: "Share", d: "Get a dedicated link and promotion kit. Share it where your audience lives." },
              { n: "03", t: "Earn monthly", d: "Every payment from a referral earns you 25% — automatically, every month." },
            ].map((s) => (
              <StaggerItem key={s.n}>
                <div className="h-full rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <span className="bg-gradient-to-r from-[#2563EB] to-[#7C3AED] bg-clip-text text-3xl font-bold text-transparent">{s.n}</span>
                  <h2 className="mt-3 text-lg font-bold tracking-[-0.01em]">{s.t}</h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{s.d}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionHeading eyebrow="FAQ" title="Affiliate questions" />
          <FaqList
            items={[
              { q: "Who can join?", a: "Anyone with an audience that includes local business owners — bloggers, influencers, agencies, consultants, and happy customers." },
              { q: "Is the commission really recurring?", a: "Yes. Earn 25% of every payment from each referred business for as long as they're a customer. No one-time cap." },
              { q: "How do I get paid?", a: "Payouts run monthly via bank transfer. You'll track referrals, conversions, and earnings live in a real-time dashboard." },
              { q: "Can agencies promote Doloyal?", a: "Absolutely — agencies love Doloyal. See the partner program for even deeper collaboration and white-glove support." },
            ]}
          />
        </div>
      </section>

      <FinalCta title={<>Start earning <em className="font-[var(--font-instrument)] italic">today</em></>} lead="Apply in two minutes, promote with our kit, and earn 25% recurring on every referral." />
    </div>
  );
}