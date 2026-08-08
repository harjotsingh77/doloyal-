"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Container, Section, SectionHead, Stagger, StaggerItem } from "./ui";

const ROW = [
  "Slack", "Stripe", "Google", "WhatsApp", "Meta", "Shopify",
  "Zapier", "QuickBooks", "HubSpot", "Zoom", "LinkedIn", "Instagram",
];

function LogoCell({ name }: { name: string }) {
  return (
    <div className="flex h-20 items-center justify-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#1761FD]/25 hover:shadow-[0_16px_32px_-16px_rgba(23,97,253,0.5)]">
      <span className="h-6 w-6 rounded-md bg-gradient-to-br from-[#1761FD]/15 to-[#3B82F6]/15" />
      <span className="text-[15px] font-semibold text-[#555]">{name}</span>
    </div>
  );
}

export function Integrations() {
  return (
    <Section className="overflow-hidden">
      <Container>
        <SectionHead
          eyebrow="Integrations"
          title={
            <>
              Lives where your business <span className="gradient-text">already does</span>
            </>
          }
          lead="Connect your payments, messaging, and calendars in a couple of clicks. Sync once, automate forever."
        />
        <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ROW.map((n) => (
            <StaggerItem key={n}>
              <LogoCell name={n} />
            </StaggerItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}