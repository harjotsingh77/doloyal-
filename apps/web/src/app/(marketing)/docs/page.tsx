"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, Rocket, FileCode2, Puzzle, Webhook, HelpCircle, ExternalLink, ArrowRight, Check } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { FinalCta } from "@/marketing/components/cta";
import { cn } from "@/lib/utils";

const DOCS = [
  {
    id: "overview",
    icon: BookOpen,
    title: "Overview",
    body: {
      lead: "Doloyal is a retention operating system for local businesses. Everything your team needs to run loyalty, bookings, websites, and AI campaigns — in one dashboard.",
      blocks: [
        {
          h: "Core concepts",
          ul: [
            "Business (tenant) — your brand, branches, and staff",
            "Customers — everyone who visits, with a live churn score",
            "Loyalty — points, tiers, and rewards rules",
            "Bookings — services, staff availability, and deposits",
            "Campaigns — automated messages across WhatsApp, SMS, and email",
          ],
        },
        {
          h: "Quick start",
          p: "Sign up, import your customers (CSV or from an existing tool), turn on your first loyalty flow, and create a booking link. Most businesses are fully live in under 5 minutes.",
        },
      ],
    },
  },
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started",
    body: {
      lead: "Five steps from sign-up to your first automated win-back.",
      blocks: [
        {
          h: "1 · Create your business",
          p: "Add your name, logo, services, and staff. You can invite your team with role-based permissions.",
        },
        {
          h: "2 · Import customers",
          p: "Upload a CSV or connect an existing tool. The AI scores every customer within minutes of import.",
        },
        {
          h: "3 · Launch loyalty",
          p: "Pick a template (points, visits, or spend-based) and customize rules. Customers join via WhatsApp or QR.",
        },
        {
          h: "4 · Go live with booking",
          p: "Your booking page is created automatically. Share the link on Google Business, Instagram, and your website.",
        },
        {
          h: "5 · Turn on AI retention",
          p: "Enable the retention engine. Doloyal now predicts churn and sends win-backs on your behalf.",
        },
      ],
    },
  },
  {
    id: "api-reference",
    icon: FileCode2,
    title: "API reference",
    body: {
      lead: "REST API for plans with API access. Every endpoint returns JSON and supports cursor-based pagination.",
      blocks: [
        { h: "Authentication", p: "Send your API key in the Authorization header as a bearer token. Keys are issued per business from Settings → API." },
        {
          h: "Example — list customers",
          code: `curl https://api.doloyal.ai/v1/customers \\
  -H "Authorization: Bearer dl_sk_live_..." \\
  -H "Content-Type: application/json"`,
        },
        {
          h: "Example — trigger win-back",
          code: `curl -X POST https://api.doloyal.ai/v1/customers/win-back \\
  -H "Authorization: Bearer dl_sk_live_..." \\
  -d '{"customer_id": "cus_2941", "offer": {"type": "discount", "value_percent": 10}}'`,
        },
        {
          h: "Rate limits",
          p: "10 requests/second per business by default. Webhooks deliver events like booking.confirmed and loyalty.points_earned.",
        },
      ],
    },
  },
  {
    id: "sdks",
    icon: Puzzle,
    title: "SDKs & plugins",
    body: {
      lead: "Ship faster with our SDKs and one-line integrations.",
      blocks: [
        {
          h: "JavaScript",
          code: `import { Doloyal } from "@doloyal/sdk";

const client = new Doloyal({ apiKey: "dl_sk_live_..." });
const customer = await client.customers.get("cus_2941");`,
        },
        {
          h: "WordPress",
          p: "The official plugin adds booking and loyalty widgets to any page in two clicks — no code required.",
        },
        {
          h: "WhatsApp & webhooks",
          p: "Every event streams to your own systems via webhooks, with retries and a signature header for verification.",
        },
      ],
    },
  },
  {
    id: "webhooks",
    icon: Webhook,
    title: "Webhooks",
    body: {
      lead: "Real-time events, delivered to your endpoint.",
      blocks: [
        { h: "Event types", ul: ["booking.created", "booking.confirmed", "booking.completed", "customer.created", "loyalty.points_earned", "campaign.sent", "payment.succeeded"] },
        { h: "Delivery", p: "Events are delivered within seconds, with automatic retries (3 attempts, exponential backoff). Verify requests using the X-Doloyal-Signature header." },
        { h: "Example payload", code: `{
  "event": "loyalty.points_earned",
  "data": {
    "customer_id": "cus_2941",
    "points": 125,
    "balance": 12480,
    "reason": "visit_5"
  }
}` },
      ],
    },
  },
  {
    id: "faq",
    icon: HelpCircle,
    title: "Help & FAQ",
    body: {
      lead: "Frequent questions from teams on this plan.",
      blocks: [
        { h: "How do I get an API key?", p: "Settings → API → Create key. Keys are shown once — keep them secure and rotate them regularly." },
        { h: "What plans include API access?", p: "API access ships with Professional and Enterprise. Growth customers can request access for a trial." },
        { h: "How is customer data protected?", p: "Encrypted at rest and in transit, with role-based access, audit logs, and region-based hosting. See the security page." },
      ],
    },
  },
];

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[rgb(var(--color-border))] bg-[#0F172A]">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-[10.5px] text-white/40">
        <span className="h-2 w-2 rounded-full bg-[#F87171]" />
        <span className="h-2 w-2 rounded-full bg-[#FBBF24]" />
        <span className="h-2 w-2 rounded-full bg-[#34D399]" />
        <span className="ml-2 font-mono">terminal</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[12px] leading-relaxed text-[#E2E8F0]">{code}</pre>
    </div>
  );
}

export default function DocsPage() {
  const [active, setActive] = React.useState("overview");
  const [query, setQuery] = React.useState("");
  const doc = DOCS.find((d) => d.id === active)!;
  const filtered = DOCS.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="Documentation"
        title={
          <>
            Everything you need to <em className="font-[var(--font-instrument)] italic">launch</em>
          </>
        }
        lead="Guides, API references, and SDKs — written for owners and developers alike."
      />

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-5 sm:px-8 lg:grid-cols-[280px_1fr]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="mb-4 flex h-10 items-center gap-2.5 rounded-xl border border-[rgb(var(--color-border))] bg-white px-3.5">
              <Search className="h-4 w-4 text-[rgb(var(--color-subtle))]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs…"
                className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[rgb(var(--color-subtle))]"
              />
            </div>
            <nav className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
              {filtered.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActive(d.id)}
                  className={cn(
                    "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-all duration-200",
                    active === d.id
                      ? "bg-[#0F172A] text-white shadow-[0_4px_16px_-6px_rgba(15,23,42,0.4)]"
                      : "text-[rgb(var(--color-muted-foreground))] hover:bg-[rgb(var(--color-muted))] hover:text-[rgb(var(--color-foreground))]",
                  )}
                >
                  <d.icon className="h-4 w-4" />
                  {d.title}
                </button>
              ))}
            </nav>
            <div className="mt-5 hidden rounded-2xl border border-[rgb(var(--color-border))] bg-white p-5 lg:block">
              <div className="text-[13px] font-bold">Need a hand?</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
                Our team replies within hours — free onboarding on every plan.
              </p>
              <a href="/contact" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#2563EB]">
                Contact support <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1 className="text-3xl font-bold tracking-[-0.02em]">{doc.title}</h1>
                <p className="mt-3 text-[15.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{doc.body.lead}</p>
                <div className="mt-8 space-y-6">
                  {doc.body.blocks.map((b, i) => (
                    <div key={i} className="rounded-2xl border border-[rgb(var(--color-border))] bg-white p-6 sm:p-7">
                      {b.h ? <h2 className="mb-2.5 text-[17px] font-bold tracking-[-0.01em]">{b.h}</h2> : null}
                      {b.p ? <p className="text-[14.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{b.p}</p> : null}
                      {b.ul ? (
                        <ul className="space-y-2.5">
                          {b.ul.map((li) => (
                            <li key={li} className="flex items-start gap-2.5 text-[14px] text-[rgb(var(--color-muted-foreground))]">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                              <span className="font-mono text-[13px]">{li}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {b.code ? <CodeBlock code={b.code} /> : null}
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between rounded-2xl bg-[#0F172A] p-6 text-white">
              <div>
                <div className="text-[15px] font-bold">Ready to build on Doloyal?</div>
                <div className="mt-0.5 text-[13px] text-white/55">Create an API key in Settings — live in seconds.</div>
              </div>
              <a href="/api" className="group inline-flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-white">
                API overview <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}