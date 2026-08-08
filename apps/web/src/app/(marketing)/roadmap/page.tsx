import type { Metadata } from "next";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading } from "@/marketing/components/ui";
import { Reveal, SerifWord } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Roadmap",
  description:
    "What we're building next at Doloyal — from customer surveys to multi-location analytics. Public, transparent, customer-driven.",
  path: "/roadmap",
});

const ROADMAP = [
  {
    status: "Building",
    tone: "blue" as const,
    items: [
      { title: "Customer surveys via WhatsApp", desc: "NPS and rebooking intent captured after every visit, automatically." },
      { title: "Instagram direct booking", desc: "Turn your Instagram profile into a booking channel with click-to-book." },
      { title: "Offline POS sync", desc: "Native connectors for leading salon and retail POS systems." },
      { title: "Dynamic loyalty pricing", desc: "Tiers that price themselves per customer, powered by the AI engine." },
    ],
  },
  {
    status: "In research",
    tone: "violet" as const,
    items: [
      { title: "Multi-location analytics", desc: "Roll-up dashboards and branch benchmarking for chains and franchises." },
      { title: "Voice & phone assistant", desc: "Customers book and check balances by simply talking." },
      { title: "AI appointment scheduler", desc: "The engine proposes the optimum daily schedule for your staff." },
    ],
  },
  {
    status: "Planned",
    tone: "green" as const,
    items: [
      { title: "Membership marketplace", desc: "Shared perks across partner businesses in your city." },
      { title: "Gift cards, 2.0", desc: "Sell, schedule, and redeem e-gift cards across every channel." },
      { title: "Public API v2", desc: "GraphQL, streaming webhooks, and a full SDK suite." },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Roadmap"
        title={
          <>
            Building what you <em className="font-[var(--font-instrument)] italic">vote</em> for
          </>
        }
        lead="Our roadmap is shaped by owners on the platform — ship fast, listen closer, repeat."
      >
        <div className="mt-4 rounded-full border border-[rgb(var(--color-border))] bg-white px-5 py-2.5 text-[13px] font-semibold text-[rgb(var(--color-muted-foreground))] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          💬 Want to suggest a feature? Write to{" "}
          <a href="mailto:roadmap@doloyal.ai" className="text-[#2563EB]">roadmap@doloyal.ai</a>
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="grid gap-5 lg:grid-cols-3">
            {ROADMAP.map((col, ci) => (
              <Reveal key={col.status} delay={ci * 0.08}>
                <div className="h-full rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="mb-5 flex items-center gap-2.5">
                    <span
                      className={cn(
                        "h-2.5 w-2.5 rounded-full",
                        col.tone === "blue" && "bg-[#2563EB]",
                        col.tone === "violet" && "bg-[#7C3AED]",
                        col.tone === "green" && "bg-[#10B981]",
                      )}
                    />
                    <h2 className="text-[15px] font-bold uppercase tracking-wider text-[rgb(var(--color-subtle))]">
                      {col.status}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {col.items.map((item) => (
                      <div key={item.title} className="rounded-2xl bg-[rgb(var(--color-surface-2))] p-4 transition-all duration-200 hover:bg-[rgb(var(--color-muted))]">
                        <div className="text-[14px] font-bold">{item.title}</div>
                        <div className="mt-1 text-[12.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FinalCta title={<>Come build it <em className="font-[var(--font-instrument)] italic">with us</em></>} lead="The best way to shape the roadmap is to be on it. Start free — your votes count." />
    </div>
  );
}