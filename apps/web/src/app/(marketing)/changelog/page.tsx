import type { Metadata } from "next";
import { PageHero } from "@/marketing/components/page-hero";
import { Reveal } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Changelog",
  description:
    "Every Doloyal release — new features, improvements, and fixes, shipped weekly to the platform.",
  path: "/changelog",
});

const RELEASES = [
  {
    version: "v2.4.1",
    date: "Jul 29, 2026",
    type: "Improvements",
    items: [
      "WhatsApp win-back templates now auto-localise to 8 Indian languages",
      "Booking calendar loads 40% faster on slower connections",
      "Improved at-risk detection for gift-card-only customers",
    ],
  },
  {
    version: "v2.4.0",
    date: "Jul 22, 2026",
    type: "New",
    items: [
      "Customer surveys on WhatsApp (NPS after every visit)",
      "Website builder: 6 new industry templates (tattoo & pet included)",
      "Multi-branch loyalty: points pool across branches for chains",
    ],
  },
  {
    version: "v2.3.2",
    date: "Jul 15, 2026",
    type: "Fixes",
    items: [
      "Fixed rare double-booking when two customers booked the same slot",
      "Razorpay refunds now sync back to customer wallets automatically",
      "Emails no longer land in spam for @gmail and @outlook domains",
    ],
  },
  {
    version: "v2.3.0",
    date: "Jul 8, 2026",
    type: "New",
    items: [
      "AI retention engine GA — win-back flows in one click",
      "Deposit-backed bookings with Stripe & Razorpay",
      "API v1 public: customers, bookings, and loyalty endpoints",
    ],
  },
  {
    version: "v2.2.0",
    date: "Jun 30, 2026",
    type: "New",
    items: [
      "Birthday automation for every membership tier",
      "Google Calendar two-way sync",
      "Re-designed analytics: retention curve & channel revenue",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Changelog"
        title={
          <>
            Shipping <em className="font-[var(--font-instrument)] italic">weekly</em>, documenting everything
          </>
        }
        lead="Every release, every improvement, every fix — transparent and boringly well organised."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="relative space-y-8 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-[rgb(var(--color-border))]">
            {RELEASES.map((r, i) => (
              <Reveal key={r.version} delay={i * 0.05}>
                <div className="relative pl-8">
                  <span className="absolute left-0 top-1.5 h-[13px] w-[13px] rounded-full border-2 border-[#2563EB] bg-white" />
                  <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-white p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-[15px] font-bold">{r.version}</h2>
                      <span className="rounded-full bg-[#2563EB]/10 px-2.5 py-0.5 text-[10.5px] font-bold text-[#1D4ED8]">
                        {r.type}
                      </span>
                      <span className="ml-auto text-[12.5px] text-[rgb(var(--color-subtle))]">{r.date}</span>
                    </div>
                    <ul className="mt-4 space-y-2">
                      {r.items.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                          <svg width="8" height="8" viewBox="0 0 8 8" className="mt-[7px] shrink-0">
                            <circle cx="4" cy="4" r="4" fill="#2563EB" opacity="0.4" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-center text-[13px] text-[rgb(var(--color-subtle))]">
            Full release notes with screenshots are available in the app under Help → Changelog.
          </p>
        </div>
      </section>

      <FinalCta title={<>Try the <em className="font-[var(--font-instrument)] italic">latest</em></>} lead="Every new release is included in your free trial. Start today." />
    </div>
  );
}