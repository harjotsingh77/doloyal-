import type { Metadata } from "next";
import Link from "next/link";
import { Search, MessageCircle, FileText, Rocket, ArrowRight, ChevronRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { Stagger, StaggerItem } from "@/marketing/components/ui";
import { FaqList } from "@/marketing/components/faq";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Help Center",
  description:
    "Guides, step-by-step walkthroughs, and answers for every Doloyal feature — loyalty, booking, websites, campaigns, and billing.",
  path: "/help",
});

const TOPICS = [
  { icon: Rocket, title: "Getting started", desc: "Set up your business, import customers, and go live.", href: "/docs" },
  { icon: Search, title: "Loyalty & rewards", desc: "Points, tiers, redemptions, and member apps.", href: "/loyalty" },
  { icon: Search, title: "Booking & no-shows", desc: "Booking links, reminders, deposits, and calendars.", href: "/booking" },
  { icon: Search, title: "Websites", desc: "Templates, blocks, domains, and SEO settings.", href: "/website-builder" },
  { icon: FileText, title: "Campaigns & AI", desc: "Win-backs, birthdays, and the retention engine.", href: "/ai-retention" },
  { icon: Search, title: "Billing & plans", desc: "Invoices, upgrades, downgrades, and refunds.", href: "/pricing" },
];

const QUICK_ANSWERS = [
  { q: "How do I import my customers?", a: "Go to Customers → Import. Upload a CSV with names, phones, and spend history — the AI scores everyone automatically. You can also connect an existing tool through the integrations page." },
  { q: "How do deposits work?", a: "In Booking settings, require a deposit for selected services. Customers pay online (Stripe or Razorpay), and no-shows drop by a third on average." },
  { q: "Can I change my business name or logo?", a: "Yes — Settings → Branding. Changes appear across your booking page, website, and customer messages instantly." },
  { q: "Where can I get more WhatsApp templates approved?", a: "Send template requests from Campaigns → Templates. Our team handles approval on the official WhatsApp Business Platform for you." },
  { q: "What happens after my trial ends?", a: "You choose a plan from Settings → Billing — or export your data and walk away. Your trial data is never deleted silently." },
];

export default function HelpPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Help Center"
        title={
          <>
            How can we <em className="font-[var(--font-instrument)] italic">help</em> you today?
          </>
        }
        lead="Step-by-step guides and instant answers for every feature."
      >
        <div className="mx-auto mt-4 flex h-13 w-full max-w-xl items-center gap-3 rounded-full border border-[rgb(var(--color-border))] bg-white px-5 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-16px_rgba(15,23,42,0.14)]" style={{ minHeight: 52 }}>
          <Search className="h-4.5 w-4.5 shrink-0 text-[rgb(var(--color-subtle))]" />
          <input
            placeholder="Search help articles…"
            className="w-full bg-transparent text-[14.5px] outline-none placeholder:text-[rgb(var(--color-subtle))]"
          />
        </div>
      </PageHero>

      <section className="pb-16 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((t) => (
              <StaggerItem key={t.title} className="h-full">
                <Link
                  href={t.href}
                  className="group flex h-full flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F172A] text-white transition-transform duration-300 group-hover:scale-110">
                    <t.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-[15px] font-bold">{t.title}</h2>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                    {t.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#2563EB]">
                    Open guides <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="mb-8 text-center text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
            Popular questions
          </h2>
          <FaqList items={QUICK_ANSWERS} />
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-5 rounded-[2.5rem] bg-[#0F172A] p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Still stuck? Talk to a human</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/60">
                Every plan includes real support from people who run local businesses. Average first reply: under 2 hours.
              </p>
            </div>
            <div className="flex flex-col items-start justify-center gap-4 lg:items-end">
              <Link
                href="/contact"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[14.5px] font-semibold text-[#0F172A] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#F1F5F9]"
              >
                <MessageCircle className="h-4 w-4" /> Contact support
              </Link>
              <Link href="/contact" className="text-[13px] font-medium text-white/50 transition-colors hover:text-white">
                <ChevronRight className="mr-0.5 inline h-3.5 w-3.5" /> Or book a call with onboarding
              </Link>
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}