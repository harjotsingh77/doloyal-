import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, Stagger, StaggerItem, SerifWord, CheckItem, Reveal } from "@/marketing/components/ui";
import { FaqList } from "@/marketing/components/faq";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Partner Program",
  description:
    "Agencies, consultants, and software vendors — become a Doloyal partner with revenue share, white-label options, and dedicated support.",
  path: "/partner",
});

const TIERS = [
  {
    name: "Agency",
    desc: "For agencies managing local business clients.",
    perks: ["20% revenue share on managed plans", "Co-branded onboarding", "Partner dashboard & tracking", "Priority support"],
    cta: "Become an agency partner",
    featured: false,
  },
  {
    name: "Grow",
    desc: "For SaaS vendors adding retention to their stack.",
    perks: ["25% revenue share", "API-first integration support", "White-label webhooks", "Joint go-to-market"],
    cta: "Talk to partnerships",
    featured: true,
  },
  {
    name: "Enterprise",
    desc: "For chains, franchises, and integrators.",
    perks: ["Custom terms", "Full white-label option", "Dedicated success manager", "Co-development roadmap"],
    cta: "Contact sales",
    featured: false,
  },
];

export default function PartnerPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Partner program"
        title={
          <>
            Grow your clients, <em className="font-[var(--font-instrument)] italic">grow your revenue</em>
          </>
        }
        lead="Agencies, consultants, and vendors — add the retention layer to every client engagement, with real revenue share."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Stagger className="grid gap-5 lg:grid-cols-3">
            {TIERS.map((t) => (
              <StaggerItem key={t.name} className="h-full">
                <div
                  className={`flex h-full flex-col rounded-3xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                    t.featured
                      ? "border-transparent bg-[#0F172A] text-white shadow-[0_1px_2px_rgba(15,23,42,0.4),0_32px_64px_-24px_rgba(15,23,42,0.55)]"
                      : "border-[rgb(var(--color-border))] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-[-0.01em]">{t.name}</h2>
                    {t.featured ? (
                      <span className="rounded-full bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-3 py-1 text-[11px] font-bold text-white">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-2 text-[14px] leading-relaxed ${t.featured ? "text-white/60" : "text-[rgb(var(--color-muted-foreground))]"}`}>
                    {t.desc}
                  </p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {t.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2.5 text-[14px]">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
                          <circle cx="8" cy="8" r="7" stroke={t.featured ? "#A78BFA" : "#2563EB"} strokeWidth="1.2" />
                          <path d="M5 8.2L7 10.2L11 5.8" stroke={t.featured ? "#A78BFA" : "#2563EB"} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className={t.featured ? "text-white/80" : "text-[rgb(var(--color-muted-foreground))]"}>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="/book-demo"
                    className={`group mt-7 inline-flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-all duration-300 ${
                      t.featured
                        ? "bg-white text-[#0F172A] hover:bg-[#F1F5F9]"
                        : "border border-[rgb(var(--color-border))] text-[rgb(var(--color-foreground))] hover:border-[#0F172A]/25"
                    }`}
                  >
                    {t.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </a>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-10 rounded-[2.5rem] border border-[rgb(var(--color-border))] bg-white p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Why partners choose Doloyal</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                Your clients already need loyalty, booking, and websites. Instead of stitching five tools together, hand
                them one platform with an API that fits your stack — and get paid for the value you create.
              </p>
            </div>
            <div className="space-y-4">
              {[
                "Whitelabel-ready — your brand on top of our platform",
                "Revenue share that rewards retention, not just signups",
                "Dedicated partner manager from day one",
                "Co-marketing, case studies, and referral kits included",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))] p-4">
                  <CheckItem>{item}</CheckItem>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <SectionHeading eyebrow="FAQ" title="Partnership questions" />
          <FaqList
            items={[
              { q: "Do I need to be a developer?", a: "No. Many partners are agencies and consultants running multi-brand businesses on Doloyal with no code at all." },
              { q: "Can I white-label Doloyal?", a: "Yes — the Enterprise tier offers full white-label branding, including emails, booking pages, and customer portals." },
              { q: "How do we integrate with our existing platform?", a: "Via the REST API and webhooks. Our team provides integration support and documentation access on approval." },
            ]}
          />
        </div>
      </section>

      <FinalCta title={<>Let&apos;s build <em className="font-[var(--font-instrument)] italic">together</em></>} lead="Tell us about your agency or platform — we&apos;ll reply within one business day." />
    </div>
  );
}