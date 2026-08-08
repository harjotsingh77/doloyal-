import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Quote } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, GradientWord, SerifWord, CheckItem } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { CASE_STUDIES } from "@/marketing/data/case-studies";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Case Studies",
  description:
    "How salons, gyms, clinics, and cafés cut churn, raised retention, and saved hours every week with Doloyal. Full numbers, no fluff.",
  path: "/case-studies",
});

export default function CaseStudiesPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Case Studies"
        title={
          <>
            From five tools to <GradientWord>one platform</GradientWord>
          </>
        }
        lead="Four businesses. Four different industries. The same result: customers that come back — automatically."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-5 md:grid-cols-2">
            {CASE_STUDIES.map((c, i) => (
              <div
                key={c.slug}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-[rgb(var(--color-border))] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_64px_-28px_rgba(15,23,42,0.3)]"
              >
                <div className={cn("h-1.5 w-full bg-gradient-to-r", c.gradient)} />
                <div className="flex flex-1 flex-col p-8 sm:p-10">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
                      {c.industry}
                    </span>
                    <span
                      className={cn(
                        "rounded-full bg-gradient-to-r bg-clip-text px-3 py-1 text-[13px] font-bold text-transparent",
                        c.gradient,
                      )}
                      style={{ WebkitBackgroundClip: "text" }}
                    >
                      {i + 1}. {c.business}
                    </span>
                  </div>
                  <blockquote className="flex-1">
                    <Quote className="mb-4 h-6 w-6 text-[#2563EB]/30" />
                    <p className="text-pretty text-[17px] font-medium leading-relaxed text-[rgb(var(--color-foreground))]">
                      {c.quote}
                    </p>
                    <footer className="mt-4 text-[13.5px] font-semibold text-[rgb(var(--color-muted-foreground))]">
                      — {c.person}, <span className="text-[rgb(var(--color-subtle))]">{c.role}</span>
                    </footer>
                  </blockquote>
                  <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[rgb(var(--color-border))] pt-7">
                    {c.metrics.map((m) => (
                      <div key={m.label}>
                        <div className="text-2xl font-bold tracking-tight">{m.value}</div>
                        <div className="mt-0.5 text-[12px] font-medium leading-snug text-[rgb(var(--color-subtle))]">
                          {m.label}
                          <span className="block text-[11px]">{m.delta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-10 rounded-[2.5rem] bg-[#0F172A] p-8 text-white sm:p-14 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
                The pattern behind every win
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-white/60">
                Different industries, same playbook. Here's what every successful switch has in common.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Import real customers on day one — never start empty",
                "Turn on one automated flow that pays for itself immediately",
                "Let the AI engine learn for a week, then act on its scores",
                "Measure retention weekly, not annually",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-[15px] text-white/85">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A78BFA]/25">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}