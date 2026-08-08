import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, FileCode2, LifeBuoy, LineChart, Milestone, History, Users2, GraduationCap } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, GradientWord, Stagger, StaggerItem } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { BLOG_POSTS } from "@/marketing/data/blog";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Resources",
  description:
    "Blog, documentation, API reference, help center, roadmap, and changelog — everything you need to grow retention with Doloyal.",
  path: "/resources",
});

const HUBS = [
  { icon: BookOpen, title: "Blog", desc: "Retention playbooks and growth tactics for local businesses.", href: "/blog", tag: "8 posts" },
  { icon: Users2, title: "Case studies", desc: "Real numbers from salons, gyms, clinics, and cafés.", href: "/case-studies", tag: "4 studies" },
  { icon: FileCode2, title: "Documentation", desc: "Guides, API reference, and everything your team needs.", href: "/docs", tag: "In-depth" },
  { icon: FileCode2, title: "API Reference", desc: "REST endpoints, webhooks, and SDK quickstarts.", href: "/api", tag: "REST v1" },
  { icon: LifeBuoy, title: "Help Center", desc: "Answers to common questions, step by step.", href: "/help", tag: "Guides" },
  { icon: Milestone, title: "Roadmap", desc: "What we're building next — and what you voted for.", href: "/roadmap", tag: "Up next" },
  { icon: History, title: "Changelog", desc: "Every release, ship note, and improvement.", href: "/changelog", tag: "All releases" },
  { icon: GraduationCap, title: "Onboarding", desc: "Get live in five minutes with our guides and templates.", href: "/docs?tab=get-started", tag: "5 min" },
];

export default function ResourcesPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Resources"
        title={
          <>
            Learn, launch, and <GradientWord>grow</GradientWord>
          </>
        }
        lead="Guides, documentation, and the latest from Doloyal — everything you need to turn retention into revenue."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HUBS.map((h) => (
              <StaggerItem key={h.title} className="h-full">
                <Link
                  href={h.href}
                  className="group flex h-full flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F172A] text-white transition-transform duration-300 group-hover:scale-110">
                    <h.icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-[15px] font-bold">{h.title}</h2>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                    {h.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563EB]">
                    {h.tag} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading
            eyebrow="Latest from the blog"
            title="Fresh from the blog"
            lead="Hands-on tactics, not generic advice."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.slice(0, 3).map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.22)]"
              >
                <div className={`mb-4 h-1.5 w-12 rounded-full bg-gradient-to-r ${p.gradient}`} />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">{p.category}</span>
                <h2 className="mt-2 text-[16px] font-bold leading-snug tracking-[-0.01em]">{p.title}</h2>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                  {p.excerpt}
                </p>
                <div className="mt-4 flex items-center justify-between text-[12px] text-[rgb(var(--color-subtle))]">
                  <span>{p.readTime}</span>
                  <span className="font-semibold text-[#2563EB] opacity-80 transition-opacity group-hover:opacity-100">Read →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}