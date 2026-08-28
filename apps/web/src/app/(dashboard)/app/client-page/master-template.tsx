"use client";

import * as React from "react";
import { CalendarDays, ChevronRight, Gift, Heart, LayoutDashboard, Search, Sparkles, Trophy, UserRound, LogOut } from "lucide-react";
import type { PublicBusinessInfo, PublicService } from "@doloyal/shared";

function formatPrice(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

const CATEGORY_ART = [
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
];

export type MasterConfig = {
  heroHeading?: string;
  heroDescription?: string;
  heroBadge?: string;
  heroButtonLabel?: string;
  showSearch?: boolean;
  featuredTitle?: string;
  featuredSubtitle?: string;
  visibleSections?: string[];
  /** Per-section headings edited in the builder, keyed by section id. */
  sectionTitles?: Record<string, string>;
  brandColor?: string;
};

/**
 * Selection chrome is drawn in screen space: `--preview-scale` is published by
 * the builder's preview viewport, so outlines and labels keep a constant
 * on-screen size no matter how far the virtual viewport is scaled down.
 */
function screenPx(value: number) {
  return `calc(${value}px / var(--preview-scale, 1))`;
}

export function MasterClientTemplate({
  business,
  services,
  currency,
  config,
  onBook,
  onNavigate,
  selectedId,
  onSelect,
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  currency: string;
  config?: MasterConfig;
  onBook: () => void;
  onNavigate?: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All services");
  const heroHeading = config?.heroHeading ?? "Find Your Glow Up.";
  const heroDescription = config?.heroDescription ?? "Browse our curated services and treatments, designed around the way you want to feel.";
  const heroBadge = config?.heroBadge ?? "PREMIUM TREATMENTS";
  const showSearch = config?.showSearch ?? true;
  const featuredTitle = config?.featuredTitle ?? "Featured treatments";
  const brandColor = config?.brandColor || business.brandColor || "#176b5c";

  const categories = React.useMemo(() => {
    const totals = new Map<string, number>();
    services.forEach((service) => totals.set(service.category || "Services", (totals.get(service.category || "Services") || 0) + 1));
    return [{ name: "All services", count: services.length }, ...Array.from(totals, ([name, count]) => ({ name, count }))];
  }, [services]);

  const filtered = services.filter((service) => {
    const matchesCategory = selectedCategory === "All services" || service.category === selectedCategory;
    const text = `${service.name} ${service.description || ""} ${service.category}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });

  const scrollTo = (id: string) => {
    if (onNavigate) onNavigate(id);
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const visible = new Set(config?.visibleSections ?? ["services", "featured", "booking", "loyalty", "rewards", "membership", "referrals"]);
  const orderedVisible = config?.visibleSections ?? ["services", "featured", "booking", "loyalty", "rewards", "membership", "referrals"];
  const isBuilder = !!onSelect;
  const titleFor = (id: string, fallback: string) => config?.sectionTitles?.[id]?.trim() || fallback;

  const Selectable = ({ sid, children }: { sid: string; children: React.ReactNode }) => {
    const isSelected = isBuilder && selectedId === sid;
    if (!isBuilder) return <>{children}</>;
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(sid);
        }}
        className={`relative cursor-pointer rounded-[28px] transition ${isSelected ? "outline outline-[color:#176b5c]" : "outline outline-[color:transparent] hover:outline-[color:rgba(23,107,92,.45)]"}`}
        style={{ outlineWidth: screenPx(isSelected ? 2 : 1), outlineOffset: screenPx(2) }}
      >
        {isSelected && (
          <span
            className="absolute z-10 whitespace-nowrap bg-[#176b5c] font-semibold leading-none text-white"
            style={{
              left: screenPx(12),
              top: screenPx(12),
              fontSize: screenPx(10),
              padding: `${screenPx(5)} ${screenPx(8)}`,
              borderRadius: screenPx(5),
            }}
          >
            {sid === "hero" ? "Home / Hero" : titleFor(sid, sid)}
          </span>
        )}
        {children}
      </div>
    );
  };

  return (
    <div className="grid gap-8 bg-[#f8fafb] pb-20 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10 lg:pb-0">
      <aside className="hidden lg:flex lg:min-h-[420px] lg:flex-col lg:border-r lg:border-black/[0.08] lg:pr-6">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">Navigation</p>
        <nav className="space-y-1">
          <MasterNav icon={<LayoutDashboard />} label="Overview" onClick={() => scrollTo("portal-hero")} />
          <MasterNav active icon={<Search />} label="Services" onClick={() => scrollTo("portal-services")} />
          <MasterNav icon={<Trophy />} label="Membership" onClick={() => scrollTo("portal-membership")} />
          <MasterNav icon={<CalendarDays />} label="Booking" onClick={onBook} />
          <MasterNav icon={<Gift />} label="Rewards" onClick={() => scrollTo("portal-rewards")} />
          <MasterNav icon={<Heart />} label="Referrals" onClick={() => scrollTo("portal-referrals")} />
        </nav>
        <div className="mt-auto border-t border-black/[0.08] pt-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">Account</p>
          <MasterNav icon={<UserRound />} label="Profile" onClick={() => scrollTo("portal-hero")} />
          <MasterNav danger icon={<LogOut />} label="Log out" onClick={() => undefined} />
        </div>
      </aside>

      <div className="min-w-0 space-y-10 pb-6">
        <Selectable sid="hero">
          <section id="portal-hero" className="relative overflow-hidden rounded-[28px] bg-[#090909] px-6 py-8 text-white sm:px-10 sm:py-11 lg:min-h-[318px] lg:px-14 lg:py-14">
            <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 90% 0%, #3a3a3a 0, transparent 34%), linear-gradient(120deg, transparent 35%, rgba(255,255,255,.06), transparent 64%)" }} />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_25rem] lg:items-end">
              <div className="max-w-2xl">
                <p className="mb-5 inline-flex rounded-full bg-white/[0.14] px-4 py-2 text-[11px] font-semibold tracking-[0.09em] text-white/90">{heroBadge}</p>
                <h2 className="max-w-xl text-4xl font-bold tracking-[-0.065em] sm:text-5xl lg:text-6xl">{heroHeading}</h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 sm:text-lg">{heroDescription}</p>
              </div>
              {showSearch && (
                <label className="flex h-14 items-center gap-3 rounded-2xl border border-white/[0.12] bg-white/[0.1] px-5 text-white/70 transition focus-within:border-white/40 focus-within:bg-white/[0.14]">
                  <Search className="h-5 w-5 shrink-0" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services..." className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/55" />
                </label>
              )}
            </div>
          </section>
        </Selectable>

        {visible.has("services") && (
          <Selectable sid="services">
            <section aria-label="Browse services" className="space-y-7">
              <div className="mx-auto flex w-fit max-w-full overflow-x-auto rounded-2xl border border-black/[0.14] bg-white p-1.5 shadow-[0_8px_30px_rgba(0,0,0,.04)]">
                {["Browse", "Members", "Treatments"].map((tab, index) => (
                  <button key={tab} type="button" onClick={() => (index === 0 ? setSelectedCategory("All services") : scrollTo("portal-membership"))} className={index === 0 ? "min-w-[9rem] rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white" : "min-w-[9rem] px-5 py-3 text-sm font-semibold text-black/50 transition hover:text-black"}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
                {categories.map((category) => {
                  const active = selectedCategory === category.name;
                  return (
                    <button key={category.name} type="button" onClick={() => setSelectedCategory(category.name)} className={`group min-h-36 w-40 shrink-0 snap-start rounded-[22px] border p-5 text-left transition sm:w-44 ${active ? "border-black bg-black text-white shadow-lg" : "border-black/[0.1] bg-white text-black hover:-translate-y-0.5 hover:border-black/30"}`}>
                      <span className={`mb-8 flex h-9 w-9 items-center justify-center rounded-full text-lg font-bold ${active ? "bg-white/[0.13]" : "bg-black/[0.04]"}`}>{category.name === "All services" ? <Search className="h-4 w-4" /> : category.name.charAt(0)}</span>
                      <span className="block text-xs font-semibold uppercase leading-tight tracking-[-0.02em]">{category.name}</span>
                      <span className={`mt-2 block text-[11px] ${active ? "text-white/55" : "text-black/40"}`}>{category.count} {category.count === 1 ? "service" : "services"}</span>
                    </button>
                  );
                })}
                <button id="portal-membership" type="button" onClick={onBook} className="min-h-36 w-40 shrink-0 rounded-[22px] border border-[#eecf8f] bg-[#fff4d8] p-5 text-left text-[#6f4910] transition hover:-translate-y-0.5 sm:w-44">
                  <Trophy className="mb-8 h-5 w-5 text-[#c38617]" />
                  <span className="block text-xs font-bold uppercase leading-tight">Join members</span>
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#bd7c12]">Get perks <ChevronRight className="h-3.5 w-3.5" /></span>
                </button>
              </div>
            </section>
          </Selectable>
        )}

        {visible.has("featured") && (
          <Selectable sid="featured">
            <section id="portal-services" className="scroll-mt-8">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/40">{selectedCategory}</p>
                  <h3 className="mt-2 text-3xl font-bold tracking-[-0.05em]">{featuredTitle}</h3>
                </div>
                <button type="button" onClick={onBook} className="hidden items-center gap-2 text-sm font-semibold text-black/65 hover:text-black sm:inline-flex">Book an appointment <ChevronRight className="h-4 w-4" /></button>
              </div>
              {filtered.length ? (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((service, index) => (
                    <article key={service.id} className="group overflow-hidden rounded-[22px] border border-black/[0.1] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,.08)]">
                      <div className="relative aspect-[1.35/1] overflow-hidden bg-black">
                        <img src={CATEGORY_ART[index % CATEGORY_ART.length]} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                        <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-black">{service.category}</span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="text-lg font-bold tracking-[-0.035em]">{service.name}</h4>
                          <span className="shrink-0 text-sm font-bold">{formatPrice(service.price, currency)}</span>
                        </div>
                        {service.description && <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-relaxed text-black/55">{service.description}</p>}
                        <div className="mt-5 flex items-center justify-between border-t border-black/[0.08] pt-4">
                          <span className="text-xs font-medium text-black/55">{service.durationMinutes} min</span>
                          <button type="button" onClick={onBook} className="rounded-lg bg-black px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-black/75" style={brandColor !== "#000000" ? { backgroundColor: brandColor } : undefined}>Book treatment</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-black/[0.16] bg-white px-6 py-16 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-black/35" />
                  <h4 className="mt-3 font-semibold">No services found</h4>
                  <p className="mt-1 text-sm text-black/50">Try another category or search term.</p>
                </div>
              )}
            </section>
          </Selectable>
        )}

        {orderedVisible
          .filter((id) => ["booking", "loyalty", "rewards", "membership", "referrals", "about", "contact"].includes(id))
          .map((id) => {
            const content =
              id === "booking" ? (
                <section id="portal-booking" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("booking", "Booking")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">Let customers discover availability and book appointments in a few taps. Connected to your Doloyal booking module.</p>
                  <button onClick={onBook} className="mt-5 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>View availability</button>
                </section>
              ) : id === "loyalty" ? (
                <section id="portal-loyalty" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("loyalty", "Loyalty")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">Customers can track points and unlock benefits. Connected to your loyalty program.</p>
                  <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-black/[0.06]"><div className="h-full w-[62%] rounded-full" style={{ backgroundColor: brandColor }} /></div>
                  <p className="mt-2 text-xs text-black/45">1,240 points · Gold tier</p>
                </section>
              ) : id === "rewards" ? (
                <section id="portal-rewards" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("rewards", "Rewards")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">Show rewards customers can redeem with their points. Connected to your rewards catalog.</p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((i) => (<div key={i} className="rounded-2xl border border-black/[0.08] bg-[#f8fafb] p-4"><Gift className="h-5 w-5" style={{ color: brandColor }} /><p className="mt-3 text-sm font-semibold">Reward {i}</p><p className="mt-1 text-xs text-black/50">250 points</p></div>))}</div>
                </section>
              ) : id === "membership" ? (
                <section id="portal-membership-section" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("membership", "Membership")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">Present member perks and plans. Connected to your memberships.</p>
                  <button className="mt-5 rounded-xl border border-black px-5 py-3 text-sm font-semibold">View plans</button>
                </section>
              ) : id === "referrals" ? (
                <section id="portal-referrals" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("referrals", "Referrals")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">Help customers share your business and earn rewards together.</p>
                  <button className="mt-5 rounded-xl px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: brandColor }}>Invite friends</button>
                </section>
              ) : id === "about" ? (
                <section id="portal-about" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("about", "About")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{business.about?.trim() || "Discover our story and what makes us different."}</p>
                </section>
              ) : id === "contact" ? (
                <section id="portal-contact" className="rounded-[22px] border border-black/[0.08] bg-white p-6 sm:p-8">
                  <h3 className="text-xl font-bold tracking-[-0.03em]">{titleFor("contact", "Contact")}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{[business.phone, business.email, business.address].filter(Boolean).join(" · ") || "Reach us anytime — phone, email, or visit us in-store."}</p>
                </section>
              ) : null;
            if (!content) return null;
            return isBuilder ? <Selectable key={id} sid={id}>{content}</Selectable> : <React.Fragment key={id}>{content}</React.Fragment>;
          })}
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-6 border-t border-black/[0.08] bg-white/95 px-1 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_28px_rgba(0,0,0,.06)] backdrop-blur lg:hidden">
        <MobileNav icon={<LayoutDashboard />} label="Home" onClick={() => scrollTo("portal-hero")} />
        <MobileNav active icon={<Search />} label="Services" />
        <MobileNav icon={<Trophy />} label="Members" />
        <MobileNav icon={<CalendarDays />} label="Book" onClick={onBook} />
        <MobileNav icon={<Gift />} label="Rewards" />
        <MobileNav icon={<Heart />} label="Refer" />
      </nav>
    </div>
  );
}

function MasterNav({ icon, label, active, danger, onClick }: { icon: React.ReactNode; label: string; active?: boolean; danger?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${active ? "border border-black/55 bg-white text-black shadow-[0_3px_12px_rgba(0,0,0,.06)]" : danger ? "text-[#c94b40] hover:bg-[#fff1ee]" : "text-black/55 hover:bg-black/[0.04] hover:text-black"}`}>
      <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span>{label}
    </button>
  );
}
function MobileNav({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition ${active ? "text-black" : "text-black/45 hover:bg-black/[0.04] hover:text-black"}`}>
      <span className="[&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span><span>{label}</span>
    </button>
  );
}
