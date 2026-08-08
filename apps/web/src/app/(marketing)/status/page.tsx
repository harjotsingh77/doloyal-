import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { PageHero } from "@/marketing/components/page-hero";
import { Reveal } from "@/marketing/components/ui";
import { buildMetadata } from "@/marketing/lib/seo";
import { cn } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Status",
  description:
    "Live system status for Doloyal — API, dashboard, WhatsApp, SMS, email, and payment processing.",
  path: "/status",
});

const SERVICES = [
  { name: "Dashboard & website builder", uptime: "99.99%", status: "Operational", tone: "green" },
  { name: "API (v1)", uptime: "99.98%", status: "Operational", tone: "green" },
  { name: "WhatsApp Business Platform", uptime: "99.97%", status: "Operational", tone: "green" },
  { name: "SMS delivery", uptime: "99.95%", status: "Operational", tone: "green" },
  { name: "Email delivery", uptime: "99.99%", status: "Operational", tone: "green" },
  { name: "Payments (Stripe · Razorpay)", uptime: "99.99%", status: "Operational", tone: "green" },
  { name: "Media uploads (Cloudinary)", uptime: "99.98%", status: "Operational", tone: "green" },
];

const INCIDENTS = [
  { date: "Jul 19, 2026", title: "SMS provider latency", desc: "Brief delivery delays for 35 minutes. Resolved.", resolved: true },
  { date: "Jun 28, 2026", title: "Dashboard slow under load", desc: "Search was 2× slower for 20 minutes. Resolved.", resolved: true },
];

export default function StatusPage() {
  return (
    <div className="overflow-hidden">
      <PageHero
        eyebrow="System status"
        title={
          <>
            All systems <em className="font-[var(--font-instrument)] italic">operational</em>
          </>
        }
        lead="Real-time uptime for every service that keeps your business running."
      >
        <div className="mt-2 flex items-center gap-3 rounded-full border border-[rgb(var(--color-border))] bg-white px-5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[13.5px] font-bold">All services operational</span>
          <span className="text-[13px] text-[rgb(var(--color-subtle))]">· updated just now</span>
        </div>
      </PageHero>

      <section className="pb-20 sm:pb-28">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-[rgb(var(--color-border))] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {SERVICES.map((s, i) => (
              <div
                key={s.name}
                className={cn(
                  "flex items-center justify-between gap-4 px-6 py-4.5",
                  i !== 0 && "border-t border-[rgb(var(--color-border))]",
                )}
                style={{ paddingBlock: "1.125rem" }}
              >
                <div className="min-w-0">
                  <div className="text-[14.5px] font-semibold">{s.name}</div>
                  <div className="text-[12px] text-[rgb(var(--color-subtle))]">Uptime · last 90 days</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-bold">{s.uptime}</span>
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11.5px] font-bold text-emerald-600">
                    <CircleCheck className="h-3.5 w-3.5" /> {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <h2 className="mb-6 text-xl font-bold tracking-[-0.01em]">Recent incidents</h2>
            <div className="space-y-4">
              {INCIDENTS.map((inc) => (
                <Reveal key={inc.title}>
                  <div className="rounded-2xl border border-[rgb(var(--color-border))] bg-white p-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[13px] font-bold text-[rgb(var(--color-muted-foreground))]">{inc.date}</span>
                      <span className={cn("h-1.5 w-1.5 rounded-full", inc.resolved ? "bg-emerald-500" : "bg-amber-400")} />
                      <span className="text-[14.5px] font-bold">{inc.title}</span>
                    </div>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">{inc.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <div className="mt-12 rounded-2xl bg-[#0F172A] p-7 text-white">
            <div className="text-[15px] font-bold">Want incident alerts?</div>
            <p className="mt-1 text-[13px] leading-relaxed text-white/55">
              Subscribe to status updates on WhatsApp or email — we only message when something actually happens.
            </p>
            <a
              href="/contact"
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-[13px] font-semibold text-[#0F172A] transition-all hover:-translate-y-0.5"
            >
              Subscribe for updates
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}