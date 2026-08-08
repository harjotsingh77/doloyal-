"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Send, TrendingUp, Users, Lightbulb } from "lucide-react";
import { Container, Reveal } from "./ui";
import { cn } from "@/lib/utils";

const INSIGHTS = [
  { icon: TrendingUp, t: "Revenue up 18% — repeat rate at all-time high", tint: "text-[#7BD88A]" },
  { icon: Users, t: "23 customers at risk of churn this week", tint: "text-[#FFB266]" },
  { icon: Lightbulb, t: "Best promo window is Fridays 5–8pm in Downtown", tint: "text-[#7EA6FF]" },
];

function Typewriter({ text, onDone }: { text: string; onDone?: () => void }) {
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => {
      setN((prev) => {
        if (prev >= text.length) {
          clearInterval(id);
          return prev;
        }
        return prev + 2;
      });
    }, 18);
    return () => clearInterval(id);
  }, [text]);
  React.useEffect(() => {
    if (onDone && n >= text.length) onDone();
  }, [n, onDone]);
  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="typing-caret" />}
    </span>
  );
}

export function AISection() {
  const [typed, setTyped] = React.useState(false);
  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-36">
      {/* dark backdrop */}
      <div className="absolute inset-0 -z-10 bg-[#0a1229]" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-blob absolute left-1/4 top-0 h-[520px] w-[520px] rounded-full bg-[#1761FD]/30 blur-3xl" />
        <div className="animate-blob absolute bottom-0 right-1/4 h-[520px] w-[520px] rounded-full bg-[#0E4BD8]/35 blur-3xl" style={{ animationDelay: "-8s" }} />
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      </div>

      <Container>
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-16">
          {/* copy */}
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold text-[#7EA6FF] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Intelligent by default
            </span>
            <h2 className="mt-6 text-balance text-[2.1rem] font-bold leading-[1.06] tracking-[-0.035em] text-white sm:text-[2.9rem]">
              Meet the AI that runs
              <br /> your business with you
            </h2>
            <p className="mt-5 max-w-md text-[17px] leading-relaxed text-white/60">
              Ask anything about your business and get instant, actionable answers — churn risks,
              next best actions, campaign ideas, or a full report. No dashboards to dig through.
            </p>
            <ul className="mt-7 space-y-4">
              {INSIGHTS.map((ins, i) => (
                <motion.li
                  key={ins.t}
                  initial={{ opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white/70">
                    <ins.icon className={cn("h-4 w-4", ins.tint)} />
                  </span>
                  <span className="text-[15px] text-white/80">{ins.t}</span>
                </motion.li>
              ))}
            </ul>
          </Reveal>

          {/* chat UI */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-[#1761FD]/40 to-[#0E4BD8]/40 blur-3xl" />
              <div className="rounded-[1.8rem] border border-white/12 bg-white/[0.05] p-2 backdrop-blur-2xl shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)]">
                <div className="flex items-center gap-2 rounded-[1.3rem] bg-white/[0.03] p-4">
                  <span className="gradient-bg flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#3B82F6] to-[#0E4BD8] shadow-lg">
                    <Bot className="h-5 w-5 text-white" />
                  </span>
                  <div>
                    <p className="text-[14px] font-semibold text-white">Doloyal AI</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-white/50">
                      <span className="pulse-ring h-1.5 w-1.5 rounded-full bg-[#7BEF95]" /> Online
                    </p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-4">
                  {!typed && <Sparkles className="h-4 w-4 text-[#7EA6FF]" />}
                  <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-gradient-to-r from-[#1761FD] to-[#3B82F6] px-4 py-2.5 text-[13px] leading-relaxed text-white">
                    Who should I win back this week?
                  </div>

                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/80">
                    <Typewriter
                      text="Based on 60-day engagement, 23 customers are drifting. I prioritized 5 VIPs with high LTV — drafted 5 win-back offers across WhatsApp, email, and SMS, scheduled to send at 14:00."
                      onDone={() => setTyped(true)}
                    />
                  </div>

                  {typed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="max-w-[88%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3 text-[13px] leading-relaxed text-white/80"
                    >
                      Estimated recovered revenue:{" "}
                      <span className="font-semibold text-[#7BEFC8]">+$4,200</span>. Run it?
                    </motion.div>
                  )}

                  {typed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 }}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                        <Send className="h-3.5 w-3.5 text-white/70" />
                      </span>
                      <span className="text-[12.5px] text-white/40">Send it 🚀</span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}