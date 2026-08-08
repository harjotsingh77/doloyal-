"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { Container, Reveal, EASE } from "./ui";

const FAQS = [
  {
    q: "Is my data safe on Doloyal?",
    a: "Absolutely! We have robust encryption, secure servers, and role-based access controls in place to keep your customer data safe and protected.",
  },
  {
    q: "What's the best way to kick things off?",
    a: "Getting started takes under 5 minutes. Simply create your free account, set up your business details, and our AI autopilot handles the rest automatically.",
  },
  {
    q: "Will it play nice with my CRM?",
    a: "Yes! Doloyal seamlessly integrates with your existing CRM, calendars, payment systems, WhatsApp, and 100+ business tools through our clean APIs.",
  },
  {
    q: "Can I keep an eye on my sales goals?",
    a: "Definitely! You get real-time analytics, customer retention tracking, revenue forecasts, and automated multi-location reports on one simple dashboard.",
  },
  {
    q: "Can I use it across multiple locations or branches?",
    a: "Yes! Doloyal natively supports multi-branch operations. You can manage staff schedules, loyalty rewards, and customer profiles across all branches in one place.",
  },
];

export function Faq() {
  const [open, setOpen] = React.useState<number | null>(0);

  return (
    <section id="faq" className="relative py-20 sm:py-28 bg-[#FAFAFC]">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          {/* Left Column: Heading & Subtitle */}
          <Reveal className="lg:col-span-5">
            <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111] leading-[1.15]">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-500 text-[15.5px] sm:text-[16.5px] leading-relaxed mt-4 font-normal">
              Discover the solutions to all your inquiries right here, where clarity and assistance await you!
            </p>
          </Reveal>

          {/* Right Column: Accordions */}
          <Reveal delay={0.1} className="lg:col-span-7">
            <div className="space-y-4">
              {FAQS.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div
                    key={item.q}
                    className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                      isOpen
                        ? "border-slate-200/90 bg-[#F6F6F8] p-6 shadow-sm"
                        : "border-slate-200/60 bg-white p-6 shadow-xs hover:border-slate-300"
                    }`}
                  >
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-4 text-left font-bold text-[#111111] text-[16px] sm:text-[17px] tracking-tight cursor-pointer"
                    >
                      <span>{item.q}</span>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-800">
                        {isOpen ? <Minus className="h-5 w-5 stroke-[2.5]" /> : <Plus className="h-5 w-5 stroke-[2.5]" />}
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        >
                          <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600 font-normal">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}