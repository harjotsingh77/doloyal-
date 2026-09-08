"use client";

import { ArrowUpRight, CalendarDays, Search, Sparkles } from "lucide-react";
import type { ClientPortal, PublicBusinessInfo } from "@doloyal/shared";
import { clientPageBrand, heroBadgeFromBrand, heroDescriptionFromBrand, heroHeadingFromBrand } from "../client-page-brand";
import {
  LoungeButton,
  SelectableBlock,
  firstName,
  formatVisit,
  nextAppointment,
  type MasterConfig,
  type PortalChrome,
} from "../portal-shared";

export function HeroSection({
  chrome,
  config,
  business,
  portal,
  query,
  onQueryChange,
  onBook,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  portal?: ClientPortal | null;
  query: string;
  onQueryChange: (value: string) => void;
  onBook: () => void;
}) {
  const brand = clientPageBrand(business);
  const heroHeading = heroHeadingFromBrand(business, config?.heroHeading);
  const heroDescription = heroDescriptionFromBrand(business, config?.heroDescription);
  const heroBadge = heroBadgeFromBrand(business, config?.heroBadge);
  const bookLabel = config?.heroButtonLabel?.trim() || "Book a visit";
  const showSearch = config?.showSearch ?? true;
  const upcoming = nextAppointment(portal);
  const greeting = portal ? `Welcome back, ${firstName(portal.customer.name)}.` : `Welcome to ${brand.displayName}.`;
  const missingCopy = chrome.isBuilder && !heroDescription;

  return (
    <SelectableBlock sid="hero" chrome={chrome}>
      <section id="portal-hero" className="scroll-mt-8 space-y-5">
        <div
          className="relative overflow-hidden rounded-[32px]"
          style={{
            background: brand.coverUrl ? brand.ink : brand.background,
            color: brand.coverUrl ? "#f6efe4" : brand.ink,
          }}
        >
          {brand.coverUrl ? (
            <>
              <img src={brand.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />
              <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--lounge-ink)] via-[color:var(--lounge-ink)]/78 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[color:var(--lounge-bg)]" />
          )}
          <div className="relative grid gap-10 px-6 py-10 sm:px-10 sm:py-12 lg:min-h-[340px] lg:grid-cols-[minmax(0,1.1fr)_18rem] lg:items-end lg:px-12 lg:py-14">
            <div className="max-w-xl">
              {heroBadge ? (
                <p className={`mb-5 inline-flex rounded-full px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${brand.coverUrl ? "bg-white/10 text-[#f6efe4]/90" : "bg-black/[0.04] text-[color:var(--lounge-ink)]/70"}`}>
                  {heroBadge}
                </p>
              ) : null}
              <p className={`text-sm ${brand.coverUrl ? "text-[#f6efe4]/70" : "text-[color:var(--lounge-ink)]/55"}`}>{greeting}</p>
              <h2 className="mt-2 font-[family-name:var(--font-lounge-display)] text-4xl font-medium leading-[0.95] tracking-[-0.05em] sm:text-5xl lg:text-[3.6rem]">
                {heroHeading}
              </h2>
              {heroDescription ? (
                <p className={`mt-5 max-w-md text-[15px] leading-relaxed ${brand.coverUrl ? "text-[#f6efe4]/72" : "text-[color:var(--lounge-ink)]/60"}`}>
                  {heroDescription}
                </p>
              ) : missingCopy ? (
                <p className="mt-5 max-w-md text-[15px] leading-relaxed text-amber-800">
                  Add a description in Brand settings so customers know who you are.
                </p>
              ) : null}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <LoungeButton onClick={onBook}>
                  {bookLabel}
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                    <ArrowUpRight className="h-3.5 w-3.5 transition duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </LoungeButton>
                {showSearch && (
                  <label className={`flex h-12 min-w-[16rem] flex-1 items-center gap-3 rounded-full px-4 ring-1 transition ${brand.coverUrl ? "bg-white/10 text-[#f6efe4]/70 ring-white/10 focus-within:bg-white/14 focus-within:ring-white/30" : "bg-black/[0.04] text-[color:var(--lounge-ink)]/55 ring-black/10 focus-within:bg-black/[0.06] focus-within:ring-black/20"}`}>
                    <Search className="h-4 w-4 shrink-0 stroke-[1.5]" />
                    <input
                      value={query}
                      onChange={(event) => onQueryChange(event.target.value)}
                      placeholder="Search a treatment"
                      className={`w-full bg-transparent text-sm outline-none ${brand.coverUrl ? "text-[#f6efe4] placeholder:text-[#f6efe4]/50" : "text-[color:var(--lounge-ink)] placeholder:text-[color:var(--lounge-ink)]/40"}`}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="rounded-[26px] bg-white p-5 text-[color:var(--lounge-ink)] shadow-[0_24px_50px_rgba(0,0,0,.08)] ring-1 ring-black/[0.06]">
              {upcoming ? (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--lounge-accent)]">Next visit</p>
                  <p className="mt-3 font-[family-name:var(--font-lounge-display)] text-2xl leading-tight">{upcoming.serviceName || "Appointment"}</p>
                  <p className="mt-2 text-sm text-[color:var(--lounge-ink)]/60">{formatVisit(upcoming.startTime)}</p>
                  {upcoming.staffName ? <p className="mt-1 text-xs text-[color:var(--lounge-ink)]/45">with {upcoming.staffName}</p> : null}
                  <LoungeButton onClick={onBook} className="mt-5 w-full justify-center" tone="ghost">
                    Change time
                  </LoungeButton>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 stroke-[1.5] text-[color:var(--lounge-accent)]" />
                  <p className="mt-3 font-[family-name:var(--font-lounge-display)] text-2xl leading-tight">Your next hour is open.</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--lounge-ink)]/60">Pick a treatment and we’ll find a time that fits.</p>
                  <LoungeButton onClick={onBook} className="mt-5 w-full justify-center">
                    <CalendarDays className="h-4 w-4 stroke-[1.5]" />
                    Find a time
                  </LoungeButton>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </SelectableBlock>
  );
}
