import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, Stagger, StaggerItem, SerifWord } from "@/marketing/components/ui";
import { Reveal } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Careers",
  description:
    "Join Doloyal and build the retention OS for local businesses. Product, engineering, design, and growth roles — remote-first from Bengaluru.",
  path: "/careers",
});

const ROLES = [
  { title: "Senior Product Engineer", team: "Engineering", loc: "Bengaluru / Remote", tag: "Full-time" },
  { title: "Product Designer", team: "Design", loc: "Bengaluru", tag: "Full-time" },
  { title: "Growth Lead — Local Business", team: "Growth", loc: "Remote (India)", tag: "Full-time" },
  { title: "Customer Success Manager", team: "Experience", loc: "Bengaluru / Remote", tag: "Full-time" },
  { title: "Content & SEO Marketer", team: "Marketing", loc: "Remote (India)", tag: "Full-time" },
];

const PERKS = [
  "Competitive salary + meaningful equity",
  "Remote-first, async-friendly culture",
  "Real ownership from day one",
  "Health cover for you and your family",
  "Annual offsite that's actually fun",
  "Budget for tools, books, and learning",
];

export default function CareersPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Careers"
        title={
          <>
            Build the OS for <em className="font-[var(--font-instrument)] italic">4,800+</em> local businesses
          </>
        }
        lead="We're a small team doing big work — giving neighborhood businesses the retention power of a chain. Come move the needle."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: "40+", l: "people", d: "Product, eng, design & growth" },
              { v: "$2M+", l: "ARR", d: "growing fast, profitable path" },
              { v: "4,800+", l: "businesses", d: "who depend on us daily" },
              { v: "2.4M+", l: "customers", d: "retained through the platform" },
            ].map((s) => (
              <div key={s.l} className="rounded-3xl border border-[rgb(var(--color-border))] bg-white p-6">
                <div className="bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D946EF] bg-clip-text text-3xl font-bold tracking-tight text-transparent">
                  {s.v}
                </div>
                <div className="mt-1 text-[15px] font-bold">{s.l}</div>
                <div className="mt-0.5 text-[13px] text-[rgb(var(--color-subtle))]">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading eyebrow="Open roles" title={<>Where you could <SerifWord>fit</SerifWord></>} lead="Don't see your role? Email us anyway — great people don't fit org charts." />
          <div className="space-y-4">
            {ROLES.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.05}>
                <a
                  href="mailto:careers@doloyal.ai"
                  className="group flex flex-col gap-3 rounded-2xl border border-[rgb(var(--color-border))] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#0F172A]/15 hover:shadow-[0_20px_44px_-20px_rgba(15,23,42,0.22)] sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">{r.team}</span>
                      <span className="rounded-full bg-[rgb(var(--color-surface-2))] px-2 py-0.5 text-[10.5px] font-semibold text-[rgb(var(--color-subtle))]">{r.tag}</span>
                    </div>
                    <h2 className="mt-1.5 text-lg font-bold tracking-[-0.01em]">{r.title}</h2>
                    <div className="mt-1 text-[13px] text-[rgb(var(--color-muted-foreground))]">{r.loc}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] transition-all duration-300 group-hover:gap-2.5">
                    Apply <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-10 rounded-[2.5rem] bg-[#0F172A] p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Work that ships, not sprints</h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/60">
                Small teams, clear ownership, weekly releases. We value honest feedback over heroic hours and celebrate
                retention numbers over vanity metrics.
              </p>
            </div>
            <Stagger className="grid gap-3 sm:grid-cols-2">
              {PERKS.map((p) => (
                <StaggerItem key={p}>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/8 p-4 text-[14px] font-medium backdrop-blur">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#A78BFA]/25">
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {p}
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      <div className="pb-24 sm:pb-32">
        <FinalCta title={<>Not hiring? <em className="font-[var(--font-instrument)] italic">Not yet</em></>} lead="Try Doloyal on your own business while you're here — free for 14 days." />
      </div>
    </div>
  );
}