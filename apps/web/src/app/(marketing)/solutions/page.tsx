import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, Stagger, StaggerItem, GradientWord, SerifWord } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { INDUSTRIES } from "@/marketing/data/industries";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Solutions",
  description:
    "Retention software built for salons, spas, gyms, clinics, restaurants, cafés, beauty studios, tattoo studios, and pet groomers.",
  path: "/solutions",
});

export default function SolutionsPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Solutions"
        title={
          <>
            Retention software that <GradientWord>fits your business</GradientWord>
          </>
        }
        lead="Every industry has its own rhythm. Doloyal adapts — the platform is the same, the playbooks are yours."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INDUSTRIES.map((ind) => (
              <StaggerItem key={ind.slug} className="h-full">
                <Link
                  href={`/solutions/${ind.slug}`}
                  className="group flex h-full flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-[#0F172A]/15 hover:shadow-[0_32px_64px_-28px_rgba(15,23,42,0.28)]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_1px_2px_rgba(15,23,42,0.2),0_8px_24px_-8px_rgba(124,58,237,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3",
                        ind.gradient,
                      )}
                    >
                      <ind.icon style={{ width: 22, height: 22 }} />
                    </span>
                    <span
                      className={cn(
                        "bg-gradient-to-r bg-clip-text text-2xl font-bold tracking-tight text-transparent",
                        ind.gradient,
                      )}
                    >
                      {ind.heroStat.value}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold tracking-[-0.01em]">{ind.name}</h2>
                  <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                    {ind.tagline}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] opacity-80 transition-all duration-300 group-hover:gap-2.5 group-hover:opacity-100">
                    See the playbook <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}