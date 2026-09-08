"use client";

import * as React from "react";
import { Search, Sparkles } from "lucide-react";
import type { PublicService } from "@doloyal/shared";
import { SelectableBlock, SectionEyebrow, SectionTitle, artFor, type CatalogTab, type PortalChrome } from "../portal-shared";

const TABS: { id: CatalogTab; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "treatments", label: "Treatments" },
  { id: "members", label: "Members" },
];

export function CatalogSection({
  chrome,
  services,
  selectedCategory,
  catalogTab,
  heading,
  onSelectCategory,
  onTabChange,
  onJoinMembers,
}: {
  chrome: PortalChrome;
  services: PublicService[];
  selectedCategory: string;
  catalogTab: CatalogTab;
  heading?: string;
  onSelectCategory: (name: string) => void;
  onTabChange: (tab: CatalogTab) => void;
  onJoinMembers: () => void;
}) {
  const categories = React.useMemo(() => {
    const totals = new Map<string, number>();
    services.forEach((service) => {
      const name = service.category || "Services";
      totals.set(name, (totals.get(name) || 0) + 1);
    });
    return [{ name: "All", count: services.length }, ...Array.from(totals, ([name, count]) => ({ name, count }))];
  }, [services]);

  return (
    <SelectableBlock sid="services" chrome={chrome}>
      <section id="portal-catalog" aria-label="Browse services" className="scroll-mt-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow>The menu</SectionEyebrow>
            <SectionTitle>{heading || "What are you in the mood for?"}</SectionTitle>
          </div>
          <div className="flex w-fit max-w-full overflow-x-auto rounded-full bg-white/70 p-1 ring-1 ring-[rgba(28,20,16,.08)]">
            {TABS.map((tab) => {
              const active = catalogTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${active ? "bg-[#1c1410] text-[#f6efe4]" : "text-[#1c1410]/50 hover:text-[#1c1410]"}`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {catalogTab === "members" ? (
          <button
            type="button"
            onClick={onJoinMembers}
            className="flex w-full items-center justify-between overflow-hidden rounded-[28px] bg-[#1c1410] px-6 py-6 text-left text-[#f6efe4] sm:px-8"
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e2c49a]">Members club</p>
              <p className="mt-2 font-[family-name:var(--font-lounge-display)] text-2xl">Skip the wait. Keep the glow.</p>
              <p className="mt-2 max-w-md text-sm text-[#f6efe4]/65">Members get first pick of times, birthday treats, and extra points on every visit.</p>
            </div>
            <span className="hidden rounded-full bg-[#f6efe4] px-4 py-2 text-sm font-semibold text-[#1c1410] sm:inline-flex">See perks</span>
          </button>
        ) : (
          <div className="flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {categories.map((category, index) => {
              const active = selectedCategory === category.name || (category.name === "All" && selectedCategory === "All services");
              const photo = category.name === "All" ? artFor("spa", 0) : artFor(category.name, index);
              return (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => onSelectCategory(category.name === "All" ? "All services" : category.name)}
                  className="group relative h-36 w-32 shrink-0 snap-start overflow-hidden rounded-[24px] sm:h-40 sm:w-36"
                >
                  <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105" />
                  <span className={`absolute inset-0 ${active ? "bg-[#1c1410]/35" : "bg-[#1c1410]/55"}`} />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-left text-white">
                    <span className="flex items-center gap-1 text-[13px] font-semibold">
                      {category.name === "All" ? <Search className="h-3.5 w-3.5 stroke-[1.5]" /> : null}
                      {category.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-white/70">
                      {category.count} {category.count === 1 ? "treatment" : "treatments"}
                    </span>
                  </span>
                  {active ? <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[#f6efe4]" /> : null}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onJoinMembers}
              className="flex h-36 w-32 shrink-0 flex-col justify-between rounded-[24px] bg-[#e8d5b5] p-4 text-left text-[#5a3d1b] sm:h-40 sm:w-36"
            >
              <Sparkles className="h-5 w-5 stroke-[1.5]" />
              <span>
                <span className="block text-[13px] font-semibold">Members</span>
                <span className="mt-0.5 block text-[11px] text-[#5a3d1b]/70">Unlock perks</span>
              </span>
            </button>
          </div>
        )}
      </section>
    </SelectableBlock>
  );
}
