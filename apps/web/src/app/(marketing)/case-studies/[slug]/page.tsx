import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { CASE_STUDIES, getCaseStudy } from "@/marketing/data/case-studies";
import { FinalCta } from "@/marketing/components/cta";
import { TestimonialGrid } from "@/marketing/components/testimonials";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return CASE_STUDIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cs = getCaseStudy(params.slug);
  if (!cs) return {};
  return buildMetadata({
    title: cs.business,
    description: cs.summary,
    path: `/case-studies/${cs.slug}`,
  });
}

export default function CaseStudyPage({ params }: { params: { slug: string } }) {
  const cs = getCaseStudy(params.slug);
  if (!cs) notFound();

  return (
    <div className="overflow-hidden pt-32 sm:pt-40">
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <Link
          href="/case-studies"
          className="mb-8 inline-flex items-center gap-2 text-[14px] font-semibold text-[rgb(var(--color-muted-foreground))] transition-colors hover:text-[rgb(var(--color-foreground))]"
        >
          <ArrowLeft className="h-4 w-4" /> All case studies
        </Link>

        <div className={cn("h-1.5 w-24 rounded-full bg-gradient-to-r", cs.gradient)} />
        <p className="mt-6 text-[13px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
          {cs.industry}
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">{cs.business}</h1>
        <p className="mt-5 text-lg leading-relaxed text-[rgb(var(--color-muted-foreground))]">{cs.summary}</p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cs.metrics.map((m) => (
            <div key={m.label} className="rounded-2xl border border-[rgb(var(--color-border))] bg-white p-5">
              <div className={cn("bg-gradient-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent", cs.gradient)} style={{ WebkitBackgroundClip: "text" }}>
                {m.value}
              </div>
              <div className="mt-1 text-[13px] font-semibold">{m.label}</div>
              <div className="text-[12px] text-[rgb(var(--color-subtle))]">{m.delta}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-[2rem] border border-[rgb(var(--color-border))] bg-white p-8 sm:p-12">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#2563EB" opacity="0.2">
            <path d="M10 11H6.5c-.3 0-.5-.2-.5-.5V8c0-2.8 2.2-5 5-5h1v4h-1c-1.1 0-2 .9-2 2v2zm10 0h-3.5c-.3 0-.5-.2-.5-.5V8c0-2.8 2.2-5 5-5H22v4h-1c-1.1 0-2 .9-2 2v2zM4 13h16v2H4zm1 9v-3h14v3z" />
          </svg>
          <blockquote className="mt-4 text-pretty text-xl font-medium leading-relaxed sm:text-2xl">
            “{cs.quote}”
          </blockquote>
          <footer className="mt-6 text-[14px] font-semibold text-[rgb(var(--color-muted-foreground))]">
            {cs.person} · <span className="text-[rgb(var(--color-subtle))]">{cs.role}, {cs.business}</span>
          </footer>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/sign-up"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#0F172A] px-7 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.3),0_12px_32px_-12px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1E293B]"
          >
            Start your own story <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      <section className="pb-20 pt-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <TestimonialGrid />
        </div>
      </section>

      <FinalCta />
    </div>
  );
}