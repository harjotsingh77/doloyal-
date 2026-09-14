"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type LegalTocItem = {
  id: string;
  label: string;
};

function useActiveSection(items: LegalTocItem[]) {
  const [activeId, setActiveId] = React.useState(items[0]?.id ?? "");

  React.useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-112px 0px -62% 0px", threshold: [0, 1] },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  return { activeId, setActiveId };
}

function TocLinks({
  items,
  activeId,
  onNavigate,
}: {
  items: LegalTocItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => {
        const isActive = activeId === item.id;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={isActive ? "location" : undefined}
              onClick={(event) => {
                onNavigate(item.id);
                const heading = document.getElementById(item.id);
                if (!heading) return;
                event.preventDefault();
                const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
                window.history.replaceState(null, "", `#${item.id}`);
              }}
              className={cn(
                "block rounded-md border-l-2 py-1.5 pl-3 pr-2 text-[13px] leading-snug transition-colors",
                isActive
                  ? "border-[#2563EB] bg-[#2563EB]/[0.06] font-medium text-[#2563EB]"
                  : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-[#282628]",
              )}
            >
              {item.label}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function LegalDocument({
  title,
  effectiveDate,
  lastUpdated,
  intro,
  toc,
  children,
}: {
  title: string;
  effectiveDate?: string;
  lastUpdated: string;
  intro: React.ReactNode;
  toc: LegalTocItem[];
  children: React.ReactNode;
}) {
  const { activeId, setActiveId } = useActiveSection(toc);
  const [open, setOpen] = React.useState(false);

  function handleNavigate(id: string) {
    setActiveId(id);
    setOpen(false);
  }

  return (
    <div className="bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      <div className="mx-auto max-w-[1120px] px-5 pt-32 pb-20 sm:px-8 sm:pt-36 sm:pb-28">
        <header className="max-w-[42rem]">
          <h1 className="text-3xl font-bold tracking-tight text-[#282628] sm:text-4xl">
            {title}
          </h1>
          {effectiveDate ? (
            <p className="mt-4 text-sm font-medium text-slate-500">
              Effective Date: {effectiveDate}
            </p>
          ) : null}
          <p className={effectiveDate ? "mt-1 text-sm font-medium text-slate-500" : "mt-4 text-sm font-medium text-slate-500"}>
            Last Updated: {lastUpdated}
          </p>
          <div className="mt-8 text-[15.5px] leading-[1.75] text-slate-600">
            {intro}
          </div>
        </header>

        <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-12 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-16">
          <div>
            <div className="lg:hidden">
              <details
                open={open}
                onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
                className="rounded-xl border border-black/[0.06] bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#282628] [&::-webkit-details-marker]:hidden">
                  On this page
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
                    aria-hidden="true"
                  />
                </summary>
                <nav aria-label="On this page" className="max-h-[min(60vh,24rem)] overflow-y-auto border-t border-black/[0.06] px-2 py-2">
                  <TocLinks items={toc} activeId={activeId} onNavigate={handleNavigate} />
                </nav>
              </details>
            </div>

            <nav
              aria-label="On this page"
              className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1 lg:block"
            >
              <p className="mb-3 text-[13px] font-semibold text-[#282628]">On this page</p>
              <TocLinks items={toc} activeId={activeId} onNavigate={handleNavigate} />
            </nav>
          </div>

          <article className="mt-10 min-w-0 max-w-[42rem] text-[15.5px] leading-[1.75] text-slate-600 lg:mt-0">
            {children}
          </article>
        </div>
      </div>
    </div>
  );
}
