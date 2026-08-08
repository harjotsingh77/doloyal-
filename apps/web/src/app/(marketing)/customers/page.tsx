import type { Metadata } from "next";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, GradientWord, SerifWord, Stagger, StaggerItem } from "@/marketing/components/ui";
import { TestimonialGrid } from "@/marketing/components/testimonials";
import { FinalCta } from "@/marketing/components/cta";
import { CASE_STUDIES } from "@/marketing/data/case-studies";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Customers",
  description:
    "4,800+ salons, gyms, clinics, cafés, and local businesses grow customer retention with Doloyal. See their results and stories.",
  path: "/customers",
});

export default function CustomersPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Customers"
        title={
          <>
            4,800+ local businesses <GradientWord>grow here</GradientWord>
          </>
        }
        lead="From single-chair salons to multi-location chains — here's what happens when retention runs on autopilot."
      >
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {[
            { v: "4,800+", l: "businesses" },
            { v: "2.4M+", l: "customers tracked" },
            { v: "38%", l: "avg. retention lift" },
          ].map((s, i) => (
            <span
              key={s.l}
              className="flex items-center gap-2 rounded-full border border-[rgb(var(--color-border))] bg-white px-4 py-1.5 text-[13px]"
            >
              <span className="font-bold">{s.v}</span>
              <span className="text-[rgb(var(--color-subtle))]">{s.l}</span>
            </span>
          ))}
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            eyebrow="Stories"
            title={
              <>
                Loved by owners, <SerifWord>trusted</SerifWord> by their teams
              </>
            }
          />
          <TestimonialGrid />
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            eyebrow="Case studies"
            title={
              <>
                Real businesses. <SerifWord>Real</SerifWord> numbers.
              </>
            }
            lead="Short reads, honest metrics — how owners switched and what changed."
          />
          <Stagger className="grid gap-5 sm:grid-cols-2">
            {CASE_STUDIES.map((c) => (
              <StaggerItem key={c.slug} className="h-full">
                <a
                  href={`/case-studies/${c.slug}`}
                  className="group flex h-full flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
                >
                  <span className="text-[12px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
                    {c.industry}
                  </span>
                  <h2 className="mt-1 text-xl font-bold tracking-[-0.01em]">{c.business}</h2>
                  <p className="mt-3 flex-1 text-[14.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                    {c.summary}
                  </p>
                  <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[rgb(var(--color-border))] pt-6">
                    {c.metrics.map((m) => (
                      <div key={m.label}>
                        <div className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-clip-text text-xl font-bold tracking-tight text-transparent">
                          {m.value}
                        </div>
                        <div className="mt-0.5 text-[11.5px] font-medium text-[rgb(var(--color-subtle))]">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <FinalCta
        title={
          <>
            Your story could be <em className="font-[var(--font-instrument)] italic">next</em>
          </>
        }
        lead="Join the owners who stopped losing customers. Free for 14 days — no credit card."
      />
    </div>
  );
}