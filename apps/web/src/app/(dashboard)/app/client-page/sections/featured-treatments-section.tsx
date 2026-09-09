"use client";

import { ArrowUpRight, Clock3 } from "lucide-react";
import type { PublicService } from "@doloyal/shared";
import { LoungeButton, SelectableBlock, SectionEyebrow, SectionTitle, artFor, catalogImageSrc, formatPrice, type PortalChrome } from "../portal-shared";

export function FeaturedTreatmentsSection({
  chrome,
  sid = "featured",
  title,
  selectedCategory,
  services,
  currency,
  onBook,
}: {
  chrome: PortalChrome;
  sid?: string;
  title: string;
  selectedCategory: string;
  services: PublicService[];
  currency: string;
  onBook: (service?: PublicService) => void;
}) {
  return (
    <SelectableBlock sid={sid} chrome={chrome}>
      <section id="portal-services" className="scroll-mt-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow>{selectedCategory === "All services" ? "All treatments" : selectedCategory}</SectionEyebrow>
            <SectionTitle>{title}</SectionTitle>
          </div>
          <button type="button" onClick={() => onBook()} className="text-sm font-semibold text-[#8a5a32] hover:text-[#1c1410]">
            Book any time
          </button>
        </div>
        {services.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {services.map((service, index) => (
              <article key={service.id} className="group overflow-hidden rounded-[28px] bg-white/80 ring-1 ring-[rgba(28,20,16,.08)] transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_22px_40px_rgba(28,20,16,.08)]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={catalogImageSrc(service.imageUrl, artFor(service.category || service.name, index))} alt="" className="h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#f6efe4]/92 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1c1410]">
                    {service.category}
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-[family-name:var(--font-lounge-display)] text-[1.35rem] leading-tight tracking-[-0.03em]">{service.name}</h4>
                    <span className="shrink-0 text-sm font-semibold">{formatPrice(service.price, currency)}</span>
                  </div>
                  {service.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#1c1410]/55">{service.description}</p>
                  ) : null}
                  <div className="mt-5 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#1c1410]/50">
                      <Clock3 className="h-3.5 w-3.5 stroke-[1.5]" />
                      {service.durationMinutes} min
                    </span>
                    <LoungeButton onClick={() => onBook(service)} className="px-4 py-2 text-xs">
                      Book this
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-white/20">
                        <ArrowUpRight className="h-3 w-3" />
                      </span>
                    </LoungeButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] bg-white/70 px-6 py-16 text-center ring-1 ring-[rgba(28,20,16,.08)]">
            <h4 className="font-[family-name:var(--font-lounge-display)] text-2xl">Nothing matches that yet</h4>
            <p className="mt-2 text-sm text-[#1c1410]/55">Try another category, or book a visit and we’ll help you choose.</p>
            <LoungeButton onClick={() => onBook()} className="mt-5">Book a visit</LoungeButton>
          </div>
        )}
      </section>
    </SelectableBlock>
  );
}
