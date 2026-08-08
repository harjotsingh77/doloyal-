"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Container, EASE, TextRoll } from "./ui";
import { useWaitlistModal } from "../components/waitlist-modal";

interface FinalCtaProps {
  title?: React.ReactNode;
  lead?: string;
}

export function FinalCta({
  title = "Turn More Customers Into Loyal Regulars",
  lead = "Grow your local business with customer retention, loyalty rewards, online bookings, memberships, and automated follow-ups — all from one simple platform.",
}: FinalCtaProps) {
  const { openWaitlistModal } = useWaitlistModal();

  return (
    <section className="relative py-20 sm:py-24 overflow-hidden bg-[#FAFAFC]">
      {/* Background grid lines pattern with mask gradient fade */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(17,24,39,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,24,39,0.07)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_25%,black_75%,transparent_100%)]" />

      {/* Smooth top gradient fade overlay for seamless blending with upper section */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#FAFAFC] via-[#FAFAFC]/80 to-transparent z-10" />

      {/* Smooth bottom gradient fade overlay for seamless blending with footer */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#FAFAFC] via-[#FAFAFC]/80 to-transparent z-10" />

      <Container className="relative z-10">
        <div className="mx-auto max-w-4xl text-center py-4">
          {/* Main Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE }}
            className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-[#1F242B] leading-[1.12]"
          >
            {title}
          </motion.h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-600 font-normal"
          >
            {lead}
          </motion.p>

          {/* Button with Dashboard-style Ambient Glow & Clean Drop Shadow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
            className="relative mt-10 inline-block"
          >
            {/* Soft Ambient Blue/Cyan Glow matching Hero Dashboard Preview */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] sm:w-[500px] h-28 bg-gradient-to-r from-[#2563EB] via-[#3B82F6] to-[#06B6D4] opacity-35 blur-3xl rounded-full" />

            <button
              onClick={openWaitlistModal}
              className="group relative z-10 inline-flex items-center gap-3.5 rounded-full bg-[#232529] pl-7 pr-2.5 py-3 text-[15px] font-semibold text-white shadow-[0_16px_40px_-12px_rgba(37,99,235,0.45)] transition-all duration-300 hover:bg-[#2563EB] hover:shadow-[0_22px_48px_-10px_rgba(37,99,235,0.65)] hover:-translate-y-0.5"
            >
              <TextRoll>Start 1 Month Free</TextRoll>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#232529] group-hover:text-[#2563EB] shadow-sm transition-transform duration-300 group-hover:rotate-45 group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </button>
          </motion.div>

          {/* Small text below button */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.3 }}
            className="mt-6 text-[13.5px] font-medium text-slate-500"
          >
            Set up in minutes · Cancel anytime
          </motion.p>
        </div>
      </Container>
    </section>
  );
}
