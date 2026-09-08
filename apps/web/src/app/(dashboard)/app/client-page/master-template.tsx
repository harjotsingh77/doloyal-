"use client";

import * as React from "react";
import { CalendarDays, Gift, Heart, Home, Search, Sparkles, Star, Trophy, UserRound, LogOut } from "lucide-react";
import type { ClientPortal, PublicBusinessInfo, PublicService } from "@doloyal/shared";
import {
  MobileNavButton,
  PortalNavButton,
  firstName,
  previewDocument,
  scrollAnchorIntoView,
  FRIENDLY_TITLES,
  SECTION_ANCHORS,
  type CatalogTab,
  type MasterConfig,
  type PortalChrome,
  type PortalNavKey,
} from "./portal-shared";
import { HeroSection } from "./sections/hero-section";
import { CatalogSection } from "./sections/catalog-section";
import { FeaturedTreatmentsSection } from "./sections/featured-treatments-section";
import {
  AboutSection,
  BookingSection,
  ContactSection,
  HoursSection,
  LoyaltySection,
  MembershipSection,
  ReferralsSection,
  ReviewsModule,
  RewardsSection,
  SimpleInfoSection,
  VisitStrip,
} from "./sections/module-sections";

export type { MasterConfig };

const DEFAULT_VISIBLE = ["services", "featured", "booking", "loyalty", "rewards", "membership", "referrals", "reviews"];

const NAV_TO_SECTION: Record<Exclude<PortalNavKey, "profile">, string> = {
  overview: "portal-hero",
  services: "portal-catalog",
  membership: "portal-membership",
  booking: "portal-booking",
  rewards: "portal-rewards",
  referrals: "portal-referrals",
  reviews: "portal-reviews",
};

export function MasterClientTemplate({
  business,
  services,
  currency,
  config,
  onBook,
  onNavigate,
  selectedId,
  onSelect,
  focusKey = 0,
  portal,
  onLogout,
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  currency: string;
  config?: MasterConfig;
  onBook: (service?: PublicService) => void;
  onNavigate?: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  /** Builder only: increment to re-scroll the preview to the selected section. */
  focusKey?: number;
  portal?: ClientPortal | null;
  onLogout?: () => void;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [query, setQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("All services");
  const [catalogTab, setCatalogTab] = React.useState<CatalogTab>("browse");
  const [activeNav, setActiveNav] = React.useState<PortalNavKey>("overview");

  const pinChrome = config?.pinChrome === true;
  const brandColor = config?.brandColor || business.brandColor || "#111111";
  const visible = new Set(config?.visibleSections ?? DEFAULT_VISIBLE);
  const orderedVisible = config?.visibleSections ?? DEFAULT_VISIBLE;
  const chrome: PortalChrome = {
    isBuilder: !!onSelect,
    selectedId,
    onSelect,
    titleFor: (id, fallback) => config?.sectionTitles?.[id]?.trim() || FRIENDLY_TITLES[id] || fallback,
  };

  React.useLayoutEffect(() => {
    if (!onSelect || !selectedId) return;
    const nav: Partial<Record<string, PortalNavKey>> = {
      hero: "overview",
      services: "services",
      featured: "services",
      membership: "membership",
      booking: "booking",
      rewards: "rewards",
      referrals: "referrals",
      reviews: "reviews",
    };
    const next = nav[selectedId];
    if (next) setActiveNav(next);
    const anchor = SECTION_ANCHORS[selectedId] || `portal-${selectedId}`;
    let cancelled = false;
    let frames = 0;
    const jump = () => {
      if (cancelled) return;
      const root = rootRef.current;
      if (!root && frames < 12) {
        frames += 1;
        requestAnimationFrame(jump);
        return;
      }
      scrollAnchorIntoView(anchor, root);
    };
    const frame = requestAnimationFrame(jump);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [selectedId, focusKey, onSelect]);

  const go = (id: string, from?: HTMLElement | null) => {
    const origin = from ?? rootRef.current;
    if (onNavigate) onNavigate(id);
    const jump = () => scrollAnchorIntoView(id, origin);
    jump();
    requestAnimationFrame(() => requestAnimationFrame(jump));
  };

  const navTarget = (key: PortalNavKey) => {
    if (key === "profile" || key === "overview") return "portal-hero";
    if (key === "services") {
      if (visible.has("featured") || visible.has("services")) return "portal-services";
      return "portal-catalog";
    }
    if (key === "membership") {
      if (visible.has("membership")) return "portal-membership";
      if (visible.has("loyalty")) return "portal-loyalty";
      return "portal-catalog";
    }
    if (key === "booking") return visible.has("booking") ? "portal-booking" : "portal-hero";
    if (key === "rewards") return visible.has("rewards") ? "portal-rewards" : visible.has("loyalty") ? "portal-loyalty" : "portal-hero";
    if (key === "referrals") return visible.has("referrals") ? "portal-referrals" : "portal-hero";
    if (key === "reviews") return visible.has("reviews") ? "portal-reviews" : "portal-hero";
    return NAV_TO_SECTION[key];
  };

  const setNav = (key: PortalNavKey, from?: HTMLElement | null) => {
    setActiveNav(key);
    if (key === "services") {
      setCatalogTab("treatments");
      setSelectedCategory("All services");
    }
    if (key === "membership") setCatalogTab("members");
    go(navTarget(key), from);
  };

  const onTabChange = (tab: CatalogTab) => {
    setCatalogTab(tab);
    if (tab === "browse") {
      setSelectedCategory("All services");
      setActiveNav("services");
      go("portal-catalog");
      return;
    }
    if (tab === "members") {
      setActiveNav("membership");
      go(visible.has("membership") ? "portal-membership" : "portal-catalog");
      return;
    }
    setActiveNav("services");
    setSelectedCategory("All services");
    go(visible.has("featured") || visible.has("services") ? "portal-services" : "portal-catalog");
  };

  const filtered = services.filter((service) => {
    if (!service.isActive) return false;
    const matchesCategory =
      catalogTab === "treatments" || selectedCategory === "All services" || service.category === selectedCategory;
    const text = `${service.name} ${service.description || ""} ${service.category}`.toLowerCase();
    return matchesCategory && text.includes(query.toLowerCase());
  });

  React.useEffect(() => {
    if (chrome.isBuilder) return;
    const map: Record<string, PortalNavKey> = {
      "portal-hero": "overview",
      "portal-catalog": "services",
      "portal-services": "services",
      "portal-membership": "membership",
      "portal-booking": "booking",
      "portal-rewards": "rewards",
      "portal-referrals": "referrals",
      "portal-reviews": "reviews",
    };
    const doc = previewDocument(rootRef.current);
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const next = hit?.target.id ? map[hit.target.id] : undefined;
        if (next) setActiveNav(next);
      },
      { root: doc.scrollingElement instanceof Element ? doc.scrollingElement : null, rootMargin: "-18% 0px -62% 0px", threshold: [0.12, 0.35] },
    );
    Object.keys(map).forEach((id) => {
      const el = doc.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [chrome.isBuilder, orderedVisible.join("|")]);

  const slug = business.bookingLink?.slug || business.slug;
  const sequence = orderedVisible.length ? orderedVisible : ["hero", ...DEFAULT_VISIBLE];
  const showTreatments = visible.has("featured") || visible.has("services");
  const points = portal?.pointsBalance ?? 0;
  const title = chrome.titleFor;
  const showNav = {
    services: visible.has("featured") || visible.has("services"),
    booking: visible.has("booking"),
    membership: visible.has("membership") || visible.has("loyalty"),
    rewards: visible.has("rewards") || visible.has("loyalty"),
    referrals: visible.has("referrals"),
    reviews: visible.has("reviews"),
  };

  const catalog = (
    <CatalogSection
      chrome={chrome}
      services={services.filter((s) => s.isActive)}
      selectedCategory={selectedCategory}
      catalogTab={catalogTab}
      heading={title("services", FRIENDLY_TITLES.services)}
      onSelectCategory={(name) => {
        setCatalogTab("browse");
        setSelectedCategory(name);
        setActiveNav("services");
        if (showTreatments) go("portal-services");
      }}
      onTabChange={onTabChange}
      onJoinMembers={() => {
        setCatalogTab("members");
        setActiveNav("membership");
        go(visible.has("membership") ? "portal-membership" : "portal-catalog");
      }}
    />
  );

  const treatments = (
    <FeaturedTreatmentsSection
      chrome={chrome}
      title={config?.featuredTitle?.trim() || title("featured", FRIENDLY_TITLES.featured)}
      sid={visible.has("featured") ? "featured" : "services"}
      selectedCategory={catalogTab === "treatments" ? "Treatments" : selectedCategory}
      services={filtered}
      currency={currency}
      onBook={onBook}
    />
  );

  const renderBlock = (id: string) => {
    if (id === "hero") {
      return (
        <HeroSection
          key={id}
          chrome={chrome}
          config={config}
          business={business}
          portal={portal}
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            if (value.trim()) {
              setCatalogTab("treatments");
              setSelectedCategory("All services");
            }
          }}
          onBook={() => onBook()}
        />
      );
    }
    if (id === "services") {
      return (
        <React.Fragment key={id}>
          {catalog}
          {!visible.has("featured") ? treatments : null}
        </React.Fragment>
      );
    }
    if (id === "featured") return <React.Fragment key={id}>{treatments}</React.Fragment>;
    if (id === "booking") return <BookingSection key={id} chrome={chrome} title={title("booking", FRIENDLY_TITLES.booking)} buttonLabel={config?.bookingButtonLabel} portal={portal} onBook={onBook} />;
    if (id === "loyalty") return <LoyaltySection key={id} chrome={chrome} title={title("loyalty", FRIENDLY_TITLES.loyalty)} brandColor={brandColor} businessName={business.brandName || business.name} portal={portal} />;
    if (id === "rewards") return <RewardsSection key={id} chrome={chrome} title={title("rewards", FRIENDLY_TITLES.rewards)} portal={portal} />;
    if (id === "membership") return <MembershipSection key={id} chrome={chrome} title={title("membership", FRIENDLY_TITLES.membership)} portal={portal} />;
    if (id === "referrals") return <ReferralsSection key={id} chrome={chrome} title={title("referrals", FRIENDLY_TITLES.referrals)} portal={portal} />;
    if (id === "reviews") return <ReviewsModule key={id} chrome={chrome} slug={slug} brandColor={brandColor} title={title("reviews", FRIENDLY_TITLES.reviews)} />;
    if (id === "about") return <AboutSection key={id} chrome={chrome} title={title("about", FRIENDLY_TITLES.about)} business={business} />;
    if (id === "contact") return <ContactSection key={id} chrome={chrome} title={title("contact", FRIENDLY_TITLES.contact)} business={business} />;
    if (id === "hours") return <HoursSection key={id} chrome={chrome} title={title("hours", FRIENDLY_TITLES.hours)} business={business} />;
    if (id === "gallery") return <SimpleInfoSection key={id} chrome={chrome} sid="gallery" id="portal-gallery" title={title("gallery", FRIENDLY_TITLES.gallery)} body="Photos of the room and work will live here." />;
    if (id === "offers") return <SimpleInfoSection key={id} chrome={chrome} sid="offers" id="portal-offers" title={title("offers", FRIENDLY_TITLES.offers)} body="Seasonal offers will appear here when they’re on." />;
    if (id === "faq") return <SimpleInfoSection key={id} chrome={chrome} sid="faq" id="portal-faq" title={title("faq", FRIENDLY_TITLES.faq)} body="Cancellation, running late, and first-visit notes will be listed here." />;
    if (id === "testimonials") return <SimpleInfoSection key={id} chrome={chrome} sid="testimonials" id="portal-testimonials" title={title("testimonials", FRIENDLY_TITLES.testimonials)} body="Stories from other guests show with the reviews below." />;
    if (id === "footer") return <SimpleInfoSection key={id} chrome={chrome} sid="footer" id="portal-footer" title={title("footer", business.brandName || business.name)} body={[business.phone, business.email].filter(Boolean).join(" · ")} />;
    return null;
  };

  return (
    <div ref={rootRef} className="grid gap-8 pb-24 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-12 lg:pb-8">
      <aside className="hidden lg:block">
        <div className={pinChrome ? "fixed top-[var(--lounge-header-h,5.25rem)] bottom-6 z-30 flex w-[15.5rem] flex-col" : "flex w-full flex-col"}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] bg-white/90 p-4 ring-1 ring-black/[0.08] backdrop-blur-xl">
            <button type="button" onClick={(event) => setNav("overview", event.currentTarget)} className="mb-4 w-full shrink-0 rounded-[22px] bg-[#1c1410] px-4 py-4 text-left text-[#f6efe4]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e2c49a]">{portal ? "Guest" : "Welcome"}</p>
              <p className="mt-1 font-[family-name:var(--font-lounge-display)] text-xl leading-tight">
                {portal ? firstName(portal.customer.name) : "Sign in to continue"}
              </p>
              <p className="mt-2 text-xs text-[#f6efe4]/55">
                {portal
                  ? `${points.toLocaleString("en-IN")} pts${portal.membership ? ` · ${portal.membership.name}` : ""}`
                  : "Your visits, points, and rewards show here after sign-in."}
              </p>
            </button>
            <p className="mb-2 shrink-0 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1c1410]/35">For you</p>
            <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              <PortalNavButton icon={<Home />} label="Home" active={activeNav === "overview"} onClick={(event) => setNav("overview", event.currentTarget)} />
              {showNav.services ? <PortalNavButton icon={<Search />} label="Treatments" active={activeNav === "services"} onClick={(event) => setNav("services", event.currentTarget)} /> : null}
              {showNav.booking ? <PortalNavButton icon={<CalendarDays />} label="Your visits" active={activeNav === "booking"} onClick={(event) => setNav("booking", event.currentTarget)} /> : null}
              {showNav.membership ? <PortalNavButton icon={<Trophy />} label="Club" active={activeNav === "membership"} onClick={(event) => setNav("membership", event.currentTarget)} /> : null}
              {showNav.rewards ? <PortalNavButton icon={<Gift />} label="Rewards" active={activeNav === "rewards"} onClick={(event) => setNav("rewards", event.currentTarget)} /> : null}
              {showNav.referrals ? <PortalNavButton icon={<Heart />} label="Invite" active={activeNav === "referrals"} onClick={(event) => setNav("referrals", event.currentTarget)} /> : null}
              {showNav.reviews ? <PortalNavButton icon={<Star />} label="Reviews" active={activeNav === "reviews"} onClick={(event) => setNav("reviews", event.currentTarget)} /> : null}
            </nav>
            <div className="mt-3 shrink-0 space-y-1 border-t border-black/[0.06] pt-3">
              <PortalNavButton icon={<UserRound />} label="Profile" active={activeNav === "profile"} onClick={(event) => setNav("profile", event.currentTarget)} />
              <PortalNavButton danger icon={<LogOut />} label="Log out" onClick={() => onLogout?.()} />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 space-y-8 pb-4">
        {sequence.map((id) => renderBlock(id))}
        <VisitStrip business={business} />
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-10 grid grid-cols-5 rounded-[28px] bg-[#1c1410]/95 px-1 pb-[max(.2rem,env(safe-area-inset-bottom))] pt-2 text-[#f6efe4] shadow-[0_18px_40px_rgba(28,20,16,.28)] backdrop-blur-xl lg:hidden">
        <MobileNavButton icon={<Home />} label="Home" active={activeNav === "overview"} onClick={(event) => setNav("overview", event.currentTarget)} />
        <MobileNavButton icon={<Sparkles />} label="Menu" active={activeNav === "services"} onClick={(event) => setNav("services", event.currentTarget)} />
        <MobileNavButton icon={<CalendarDays />} label="Book" active={activeNav === "booking"} onClick={(event) => setNav("booking", event.currentTarget)} />
        <MobileNavButton icon={<Gift />} label="Rewards" active={activeNav === "rewards"} onClick={(event) => setNav("rewards", event.currentTarget)} />
        <MobileNavButton icon={<Heart />} label="Invite" active={activeNav === "referrals"} onClick={(event) => setNav("referrals", event.currentTarget)} />
      </nav>
    </div>
  );
}
