import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, Webhook, Package, PlugZap } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { SectionHeading, GradientWord, SerifWord, Reveal, ButtonPrimary, ButtonGhost, Stagger, StaggerItem } from "@/marketing/components/ui";
import { FinalCta } from "@/marketing/components/cta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "API",
  description:
    "The Doloyal REST API and webhooks — customers, loyalty, bookings, and campaigns with clean JSON endpoints, SDKs, and cursor pagination.",
  path: "/api",
});

const ENDPOINTS = [
  { method: "GET", path: "/v1/customers", desc: "List customers with churn scores" },
  { method: "POST", path: "/v1/customers", desc: "Create a customer" },
  { method: "POST", path: "/v1/customers/win-back", desc: "Trigger a win-back campaign" },
  { method: "GET", path: "/v1/bookings", desc: "List and filter bookings" },
  { method: "POST", path: "/v1/bookings", desc: "Create a booking" },
  { method: "GET", path: "/v1/loyalty/balances", desc: "Point balances per customer" },
  { method: "POST", path: "/v1/loyalty/points", desc: "Award or adjust points" },
  { method: "POST", path: "/v1/campaigns", desc: "Launch a campaign" },
];

const PILLARS = [
  { icon: Zap, title: "Fast & reliable", desc: "99.9% uptime, sub-100ms median latency, cursor pagination on every list endpoint." },
  { icon: Webhook, title: "Webhooks built-in", desc: "Real-time events with retries, signatures, and replay from a live console." },
  { icon: ShieldCheck, title: "Secure by default", desc: "Scoped API keys, TLS everywhere, audit logs, and full data ownership." },
  { icon: Package, title: "SDKs & plugins", desc: "TypeScript, WordPress, and a growing ecosystem — plus an embeddable widget." },
];

export default function ApiPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="API · REST v1"
        title={
          <>
            Every customer, <GradientWord>programmable</GradientWord>
          </>
        }
        lead="Customers, loyalty, bookings, and campaigns — exposed through a clean, typed REST API. From one win-back call to a full custom stack."
      >
        <div className="mt-2 flex flex-col items-center gap-4 sm:flex-row">
          <ButtonPrimary href="/docs">Read the docs</ButtonPrimary>
          <ButtonGhost href="/docs?tab=sdks">See the SDKs</ButtonGhost>
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-[#0F172A] text-[13px] text-white shadow-[0_1px_2px_rgba(15,23,42,0.4),0_32px_64px_-24px_rgba(15,23,42,0.5)]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-[11px] text-white/50">
                <span className="h-2 w-2 rounded-full bg-[#F87171]" />
                <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
                <span className="h-2 w-2 rounded-full bg-[#34D399]" />
                <span className="ml-2 font-mono">POST /v1/customers/win-back</span>
              </div>
              <pre className="overflow-x-auto p-5 text-[12.5px] leading-relaxed text-[#E2E8F0]">
{`{
  "customer_id": "cus_SanaK_2941",
  "reason": "churn_score_82",
  "channel": "whatsapp",
  "offer": {
    "type": "discount",
    "value_percent": 10,
    "expires_in_days": 7
  }
}

// 200 OK
{
  "status": "queued",
  "campaign_id": "cam_2026_08_4471",
  "eta_ms": 2400,
  "audience_size": 1
}`}
              </pre>
            </div>
          </Reveal>
          <div>
            <SectionHeading
              align="left"
              eyebrow="Why the API"
              title={
                <>
                  Built for businesses that <SerifWord>outgrow</SerifWord> templates
                </>
              }
              lead="Deep integrations, custom loyalty logic, POS sync, or a bespoke member portal — if it runs a local business, it runs on the Doloyal API."
            />
            <Stagger className="grid gap-4 sm:grid-cols-2">
              {PILLARS.map((p) => (
                <StaggerItem key={p.title}>
                  <div className="h-full rounded-2xl border border-[rgb(var(--color-border))] bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-16px_rgba(15,23,42,0.2)]">
                    <p.icon className="mb-3 h-5 w-5 text-[#2563EB]" />
                    <div className="text-[14px] font-bold">{p.title}</div>
                    <div className="mt-1 text-[13px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{p.desc}</div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <SectionHeading eyebrow="Endpoints" title="A small, powerful surface" lead="Eight endpoints cover 90% of what local businesses need. Everything else is configuration." />
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-[rgb(var(--color-border))] bg-white">
              {ENDPOINTS.map((e, i) => (
                <div
                  key={e.path}
                  className={`flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6 ${i !== 0 ? "border-t border-[rgb(var(--color-border))]" : ""}`}
                >
                  <span
                    className={`w-14 shrink-0 rounded-md px-2 py-1 text-center text-[10.5px] font-bold ${e.method === "GET" ? "bg-[#2563EB]/10 text-[#1D4ED8]" : e.method === "POST" ? "bg-[#7C3AED]/10 text-[#6D28D9]" : "bg-[#10B981]/10 text-emerald-700"}`}
                  >
                    {e.method}
                  </span>
                  <code className="font-mono text-[13px] font-semibold">{e.path}</code>
                  <span className="text-[13px] text-[rgb(var(--color-subtle))] sm:ml-auto">{e.desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1} className="mt-6 text-center">
            <Link href="/docs" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
              Full API reference in the docs <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}