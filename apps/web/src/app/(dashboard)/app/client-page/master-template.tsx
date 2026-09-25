"use client";

import * as React from "react";
import type { AuthUser, ClientPortal, PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { resolveBrandPrimary } from "@/lib/branding";
import {
  FRIENDLY_TITLES,
  SECTION_ANCHORS,
  SelectableBlock,
  scrollAnchorIntoView,
  type MasterConfig,
  type PortalChrome,
} from "./portal-shared";
import { siteCopy } from "./website-copy";
import { SiteFooter, SiteMarquee, SiteNav } from "./sections/site-chrome";
import { SiteHero } from "./sections/site-hero";
import {
  AboutStory,
  ContactBooking,
  FaqSection,
  FeaturedGrid,
  FinalCta,
  GallerySection,
  IntroSection,
  MapSection,
  OffersSection,
  SocialProof,
  TestimonialsSection,
  VideoSection,
  WebsiteServices,
  CheckoutSection,
} from "./sections/site-sections";
import {
  BookingSection,
  HoursSection,
  LoyaltySection,
  MembershipSection,
  ReferralsSection,
  ReviewsModule,
  RewardsSection,
} from "./sections/module-sections";

export type { MasterConfig };

const DEFAULT_VISIBLE = [
  "hero",
  "intro",
  "services",
  "featured",
  "about",
  "offers",
  "gallery",
  "testimonials",
  "faq",
  "contact",
  "map",
  "cta",
  "footer",
];

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
  user,
  onLogout,
  onLogin,
  headerAccessory,
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  currency: string;
  config?: MasterConfig;
  onBook: (service?: PublicService) => void;
  onNavigate?: (id: string) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  focusKey?: number;
  portal?: ClientPortal | null;
  user?: AuthUser | null;
  onLogout?: () => void;
  onLogin?: () => void;
  headerAccessory?: React.ReactNode;
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const brandColor = resolveBrandPrimary(config?.brandColor || business.brandColor);
  const visible = new Set(config?.visibleSections ?? DEFAULT_VISIBLE);
  const orderedVisible = config?.visibleSections ?? DEFAULT_VISIBLE;
  const copy = siteCopy(config?.businessType);
  const chrome: PortalChrome = {
    isBuilder: !!onSelect,
    selectedId,
    onSelect,
    titleFor: (id, fallback) => config?.sectionTitles?.[id]?.trim() || FRIENDLY_TITLES[id] || fallback,
  };

  React.useLayoutEffect(() => {
    if (!onSelect || !selectedId) return;
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

  const sequence = orderedVisible.length ? orderedVisible : ["hero", ...DEFAULT_VISIBLE];
  const title = chrome.titleFor;
  const bookLabel = config?.heroButtonLabel?.trim() || copy.book;
  const activeServices = services.filter((service) => service.isActive);

  const renderBlock = (id: string) => {
    if (id === "hero") {
      return (
        <SiteHero
          key={id}
          chrome={chrome}
          config={config}
          business={business}
          onBook={() => onBook()}
          onExplore={() => go(visible.has("featured") ? "portal-services" : "portal-catalog")}
        />
      );
    }
    if (id === "intro") {
      return <IntroSection key={id} chrome={chrome} config={config} business={business} onBook={() => onBook()} />;
    }
    if (id === "services") {
      return (
        <WebsiteServices
          key={id}
          chrome={chrome}
          config={config}
          services={activeServices}
          currency={currency}
          title={title("services", copy.services)}
          onBook={onBook}
        />
      );
    }
    if (id === "featured") {
      return (
        <FeaturedGrid
          key={id}
          chrome={chrome}
          config={config}
          services={activeServices}
          currency={currency}
          title={config?.featuredTitle?.trim() || title("featured", copy.featured)}
          onBook={onBook}
        />
      );
    }
    if (id === "about") {
      return <AboutStory key={id} chrome={chrome} config={config} business={business} title={title("about", FRIENDLY_TITLES.about)} />;
    }
    if (id === "offers") {
      return <OffersSection key={id} chrome={chrome} config={config} title={title("offers", FRIENDLY_TITLES.offers)} />;
    }
    if (id === "gallery") {
      return <GallerySection key={id} chrome={chrome} config={config} business={business} title={title("gallery", FRIENDLY_TITLES.gallery)} />;
    }
    if (id === "video") {
      return <VideoSection key={id} chrome={chrome} config={config} title={title("video", FRIENDLY_TITLES.video)} />;
    }
    if (id === "testimonials") {
      return <TestimonialsSection key={id} chrome={chrome} config={config} title={title("testimonials", FRIENDLY_TITLES.testimonials)} />;
    }
    if (id === "social") {
      return <SocialProof key={id} chrome={chrome} config={config} business={business} />;
    }
    if (id === "faq") {
      return <FaqSection key={id} chrome={chrome} config={config} title={title("faq", FRIENDLY_TITLES.faq)} />;
    }
    if (id === "contact") {
      return (
        <ContactBooking
          key={id}
          chrome={chrome}
          config={config}
          business={business}
          title={title("contact", FRIENDLY_TITLES.contact)}
          onBook={() => onBook()}
          bookLabel={bookLabel}
        />
      );
    }
    if (id === "map") {
      return <MapSection key={id} chrome={chrome} config={config} business={business} title={title("map", FRIENDLY_TITLES.map)} />;
    }
    if (id === "cta") {
      return <FinalCta key={id} chrome={chrome} config={config} business={business} onBook={() => onBook()} onExplore={() => go("portal-services")} />;
    }
    if (id === "checkout") {
      return (
        <CheckoutSection
          key={id}
          chrome={chrome}
          config={config}
          title={title("checkout", FRIENDLY_TITLES.checkout)}
        />
      );
    }
    if (id === "booking") {
      return (
        <BookingSection
          key={id}
          chrome={chrome}
          config={config}
          title={title("booking", FRIENDLY_TITLES.booking)}
          buttonLabel={config?.bookingButtonLabel || bookLabel}
          portal={portal}
          onBook={onBook}
        />
      );
    }
    if (id === "loyalty") {
      return (
        <LoyaltySection
          key={id}
          chrome={chrome}
          config={config}
          title={title("loyalty", FRIENDLY_TITLES.loyalty)}
          brandColor={brandColor}
          businessName={business.brandName || business.name}
          portal={portal}
          onRewards={() => go("portal-rewards")}
        />
      );
    }
    if (id === "rewards") {
      return <RewardsSection key={id} chrome={chrome} config={config} title={title("rewards", FRIENDLY_TITLES.rewards)} portal={portal} />;
    }
    if (id === "membership") {
      return <MembershipSection key={id} chrome={chrome} config={config} title={title("membership", FRIENDLY_TITLES.membership)} portal={portal} onJoin={() => onBook()} />;
    }
    if (id === "referrals") {
      return <ReferralsSection key={id} chrome={chrome} config={config} title={title("referrals", FRIENDLY_TITLES.referrals)} portal={portal} />;
    }
    if (id === "reviews") {
      return (
        <ReviewsModule
          key={id}
          chrome={chrome}
          config={config}
          slug={business.bookingLink?.slug || business.slug}
          brandColor={brandColor}
          title={title("reviews", FRIENDLY_TITLES.reviews)}
        />
      );
    }
    if (id === "hours") {
      return <HoursSection key={id} chrome={chrome} config={config} title={title("hours", FRIENDLY_TITLES.hours)} business={business} />;
    }
    if (id === "footer") return null;
    return null;
  };

  return (
    <div ref={rootRef} className="min-h-screen">
      <SiteMarquee text={config?.marqueeText} enabled={config?.marqueeEnabled === true} />
      <SiteNav
        business={business}
        config={config}
        onBook={() => onBook()}
        onJump={go}
        accessory={headerAccessory}
        onLogout={onLogout}
        onLogin={onLogin}
        portal={portal}
        user={user}
      />
      <div>
        {sequence.map((id) => renderBlock(id))}
      </div>
      <SelectableBlock sid="footer" chrome={chrome}>
        <SiteFooter business={business} config={config} onJump={go} />
      </SelectableBlock>
    </div>
  );
}
