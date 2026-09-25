"use client";

import * as React from "react";
import { Instagram, Facebook, Menu, X, Phone } from "lucide-react";
import type { AuthUser, ClientPortal, PublicBusinessInfo } from "@doloyal/shared";
import { clientPageBrand } from "../client-page-brand";
import { firstName, previewDocument, sectionUi, type MasterConfig } from "../portal-shared";
import { siteCopy } from "../website-copy";

function profileName(user?: AuthUser | null, portal?: ClientPortal | null) {
  const fromPortal = portal?.customer?.name?.trim();
  if (fromPortal) return fromPortal;
  const fromUser = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return fromUser || user?.email || "Profile";
}

function profileInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return letters || "P";
}

function ProfileButton({
  user,
  portal,
  frosted,
  onJump,
  onLogout,
}: {
  user: AuthUser;
  portal?: ClientPortal | null;
  frosted: boolean;
  onJump: (id: string) => void;
  onLogout?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const name = profileName(user, portal);
  const email = portal?.customer?.email || user.email;
  const points = portal?.pointsBalance ?? 0;
  const clientId = portal?.customer?.clientNumber?.trim() || null;

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3 text-sm font-semibold ${frosted ? "border border-white/30 text-white" : "border border-black/[0.12] text-[color:var(--site-ink)]"}`}
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: "var(--site-accent)" }}
        >
          {profileInitials(name)}
        </span>
        <span className="max-w-[7.5rem] truncate">{firstName(name)}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl bg-white text-[color:var(--site-ink)] shadow-[0_18px_40px_rgba(17,17,17,.16)]"
        >
          <div className="border-b border-black/[0.06] px-4 py-3">
            <p className="truncate text-sm font-semibold">{name}</p>
            {clientId ? <p className="mt-0.5 truncate text-xs tabular-nums text-black/45">ID: {clientId}</p> : null}
            {email ? <p className="mt-0.5 truncate text-xs text-black/45">{email}</p> : null}
            <p className="mt-2 text-xs font-medium text-black/55">{points.toLocaleString("en-IN")} pts</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
              onClick={() => {
                setOpen(false);
                onJump("portal-booking");
              }}
            >
              Your visits
            </button>
            {(portal?.orders?.length ?? 0) > 0 ? (
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
                onClick={() => {
                  setOpen(false);
                  onJump("portal-orders");
                }}
              >
                Your orders
              </button>
            ) : null}
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-black/[0.04]"
              onClick={() => {
                setOpen(false);
                onJump("portal-rewards");
              }}
            >
              Rewards
            </button>
            {onLogout ? (
              <button
                type="button"
                role="menuitem"
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-black/55 hover:bg-black/[0.04]"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteMarquee({ text, enabled }: { text?: string; enabled?: boolean }) {
  if (!enabled) return null;
  const line = (text?.trim() || "New this week  ·  Walk-ins welcome  ·  Book online anytime  ·  ").repeat(4);
  return (
    <div className="site-marquee overflow-hidden border-b border-black/[0.06] bg-[color:var(--site-ink)] text-white" role="marquee">
      <div className="site-marquee-track flex w-max gap-10 py-2.5 text-[11px] font-medium tracking-[0.14em] uppercase">
        <span>{line}</span>
        <span aria-hidden>{line}</span>
      </div>
    </div>
  );
}

export function SiteNav({
  business,
  config,
  onBook,
  onJump,
  accessory,
  portal,
  user,
  onLogout,
  onLogin,
}: {
  business: PublicBusinessInfo;
  config?: MasterConfig;
  onBook: () => void;
  onJump: (id: string) => void;
  accessory?: React.ReactNode;
  portal?: ClientPortal | null;
  user?: AuthUser | null;
  onLogout?: () => void;
  onLogin?: () => void;
}) {
  const brand = clientPageBrand(business);
  const copy = siteCopy(config?.businessType || "custom");
  const pin = config?.pinChrome !== false;
  const style = config?.navStyle || "blur";
  const [open, setOpen] = React.useState(false);
  const [solid, setSolid] = React.useState(style === "solid");
  const visible = new Set(config?.visibleSections ?? []);
  const navRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (style === "solid") {
      setSolid(true);
      return;
    }
    const doc = previewDocument(navRef.current);
    const hero = doc.getElementById("portal-hero");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSolid(!entry.isIntersecting),
      { threshold: 0.18 },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, [style]);

  const links = [
    { label: "Home", id: "portal-hero" },
    visible.has("intro") || visible.has("about") ? { label: "About", id: visible.has("intro") ? "portal-intro" : "portal-about" } : null,
    visible.has("services") || visible.has("featured") ? { label: copy.services, id: visible.has("featured") ? "portal-services" : "portal-catalog" } : null,
    visible.has("gallery") ? { label: "Gallery", id: "portal-gallery" } : null,
    visible.has("offers") ? { label: "Offers", id: "portal-offers" } : null,
    visible.has("reviews") || visible.has("testimonials") ? { label: "Reviews", id: visible.has("reviews") ? "portal-reviews" : "portal-testimonials" } : null,
    visible.has("contact") || visible.has("booking") ? { label: "Contact", id: visible.has("contact") ? "portal-contact" : "portal-booking" } : null,
  ].filter(Boolean) as Array<{ label: string; id: string }>;

  const book = config?.heroButtonLabel?.trim() || copy.book;
  const frosted = style !== "solid" && !solid;
  const points = portal?.pointsBalance ?? 0;
  const pointsTarget = visible.has("rewards") ? "portal-rewards" : "portal-loyalty";
  const signedIn = !!user;
  const accountName = profileName(user, portal);
  const accountClientId = portal?.customer?.clientNumber?.trim() || null;
  const signInHref = `/book/${business.bookingLink?.slug || business.slug}/sign-in`;
  const loginClass = `hidden h-10 items-center rounded-full px-4 text-sm font-semibold sm:inline-flex ${frosted ? "border border-white/30 text-white" : "border border-black/[0.12] text-[color:var(--site-ink)]"}`;
  const goSignIn = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onLogin) return;
    event.preventDefault();
    onLogin();
  };

  return (
    <header ref={navRef} className={`${pin ? "sticky top-0 z-40" : "relative z-40"}`}>
      <div className={`transition duration-500 ${frosted ? "bg-white/10 text-white backdrop-blur-xl" : "bg-[color:var(--site-bg)]/92 text-[color:var(--site-ink)] shadow-[0_10px_30px_rgba(17,17,17,.06)] backdrop-blur-xl"}`}>
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8 lg:px-10">
          <button type="button" onClick={() => onJump("portal-hero")} className="flex min-w-0 items-center gap-3">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: "var(--site-accent)" }}>
                {brand.initials}
              </span>
            )}
            <span className="truncate text-sm font-semibold tracking-[-0.02em]">{brand.displayName}</span>
          </button>
          <nav className="hidden items-center gap-7 text-[13px] font-medium lg:flex">
            {links.map((link) => (
              <button key={link.id} type="button" onClick={() => onJump(link.id)} className="opacity-80 transition hover:opacity-100">
                {link.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump(pointsTarget)}
              aria-label={`${points.toLocaleString("en-IN")} loyalty points`}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold tabular-nums ${frosted ? "bg-white/12 text-white" : "bg-black/[0.05] text-[color:var(--site-ink)]"}`}
            >
              {points.toLocaleString("en-IN")}
              <span className={`text-[11px] font-medium ${frosted ? "text-white/70" : "text-[color:var(--site-ink)]/45"}`}>pts</span>
            </button>
            {accessory}
            {signedIn && user ? (
              <ProfileButton user={user} portal={portal} frosted={frosted} onJump={onJump} onLogout={onLogout} />
            ) : (
              <a href={signInHref} onClick={goSignIn} className={loginClass}>
                Login
              </a>
            )}
            <button
              type="button"
              onClick={onBook}
              className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-white sm:inline-flex"
              style={{ backgroundColor: "var(--site-accent)" }}
            >
              {book}
            </button>
            <button type="button" className="grid h-10 w-10 place-items-center rounded-full lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 bg-[color:var(--site-ink)]/92 p-6 text-white backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{brand.displayName}</p>
            <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { onJump(pointsTarget); setOpen(false); }}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold"
          >
            <span className="tabular-nums">{points.toLocaleString("en-IN")}</span>
            <span className="text-white/60">pts</span>
          </button>
          <div className="mt-10 grid gap-2">
            {links.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => { onJump(link.id); setOpen(false); }}
                className="rounded-2xl px-3 py-3 text-left text-2xl font-semibold tracking-[-0.03em]"
              >
                {link.label}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { onBook(); setOpen(false); }} className="mt-8 h-12 w-full rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "var(--site-accent)" }}>
            {book}
          </button>
          {signedIn ? (
            <>
              <div className="mt-8 rounded-2xl bg-white/10 px-4 py-3">
                <p className="text-sm font-semibold">{accountName}</p>
                {accountClientId ? (
                  <p className="mt-0.5 text-xs tabular-nums text-white/55">ID: {accountClientId}</p>
                ) : null}
                <p className="mt-1 text-xs text-white/55">{(portal?.pointsBalance ?? 0).toLocaleString("en-IN")} pts</p>
              </div>
              <button type="button" onClick={() => { onJump("portal-booking"); setOpen(false); }} className="mt-3 w-full py-2 text-left text-sm text-white/80">
                Your visits
              </button>
              {(portal?.orders?.length ?? 0) > 0 ? (
                <button type="button" onClick={() => { onJump("portal-orders"); setOpen(false); }} className="mt-1 w-full py-2 text-left text-sm text-white/80">
                  Your orders
                </button>
              ) : null}
              {onLogout ? (
                <button type="button" onClick={() => { onLogout(); setOpen(false); }} className="mt-1 w-full py-2 text-left text-sm text-white/55">
                  Sign out
                </button>
              ) : null}
            </>
          ) : (
            <a
              href={signInHref}
              onClick={(event) => {
                if (onLogin) event.preventDefault();
                onLogin?.();
                setOpen(false);
              }}
              className="mt-3 block w-full py-2 text-center text-sm text-white/55"
            >
              Login
            </a>
          )}
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter({
  business,
  config,
  onJump,
}: {
  business: PublicBusinessInfo;
  config?: MasterConfig;
  onJump: (id: string) => void;
}) {
  const brand = clientPageBrand(business);
  const year = new Date().getFullYear();
  const ui = sectionUi(config, "footer");
  const social = [
    (ui.instagram || business.instagram) ? { href: (ui.instagram || business.instagram || "").startsWith("http") ? (ui.instagram || business.instagram)! : `https://instagram.com/${(ui.instagram || business.instagram || "").replace(/^@/, "")}`, icon: Instagram, label: "Instagram" } : null,
    (ui.facebook || business.facebook) ? { href: (ui.facebook || business.facebook || "").startsWith("http") ? (ui.facebook || business.facebook)! : `https://facebook.com/${ui.facebook || business.facebook}`, icon: Facebook, label: "Facebook" } : null,
    (ui.whatsapp || business.whatsapp) ? { href: `https://wa.me/${String(ui.whatsapp || business.whatsapp).replace(/\D/g, "")}`, icon: Phone, label: "WhatsApp" } : null,
  ].filter(Boolean) as Array<{ href: string; icon: typeof Instagram; label: string }>;
  const animate = config?.socialAnimations !== false && (config?.hoverEffects ?? true);

  return (
    <footer id="portal-footer" className="border-t border-black/[0.06] bg-white px-5 py-14 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-[1280px] gap-10 md:grid-cols-4">
        <div>
          <p className="text-sm font-semibold">{brand.displayName}</p>
          <p className="mt-3 max-w-[28ch] text-sm leading-6 text-[color:var(--site-ink)]/55">{ui.body?.trim() || brand.tagline || brand.description}</p>
        </div>
        <div>
          <p className="text-sm font-semibold">Explore</p>
          <div className="mt-3 grid gap-2 text-sm text-[color:var(--site-ink)]/60">
            <button type="button" className="text-left hover:text-[color:var(--site-ink)]" onClick={() => onJump("portal-hero")}>Home</button>
            <button type="button" className="text-left hover:text-[color:var(--site-ink)]" onClick={() => onJump("portal-services")}>Services</button>
            <button type="button" className="text-left hover:text-[color:var(--site-ink)]" onClick={() => onJump("portal-gallery")}>Gallery</button>
          </div>
        </div>
        {ui.showPhone !== false ? (
        <div>
          <p className="text-sm font-semibold">Visit</p>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[color:var(--site-ink)]/60">
            {business.address ? <p>{business.address}</p> : null}
            {business.phone ? <a href={`tel:${business.phone.replace(/\s/g, "")}`}>{business.phone}</a> : null}
            {business.email ? <a href={`mailto:${business.email}`}>{business.email}</a> : null}
          </div>
        </div>
        ) : <div />}
        {ui.showSocial !== false ? (
        <div>
          <p className="text-sm font-semibold">Follow</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {social.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={item.label}
                  className={`grid h-10 w-10 place-items-center rounded-full bg-[color:var(--site-ink)] text-white ${animate ? "transition duration-500 hover:scale-105" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
            {!social.length ? <p className="text-sm text-[color:var(--site-ink)]/50">Add social links in Brand settings.</p> : null}
          </div>
        </div>
        ) : <div />}
      </div>
      <div className="mx-auto mt-12 flex max-w-[1280px] flex-wrap justify-between gap-3 border-t border-black/[0.06] pt-6 text-xs text-[color:var(--site-ink)]/45">
        <p>© {year} {brand.displayName}</p>
        <p>{ui.overlayText?.trim() || "Privacy · Terms"}</p>
      </div>
    </footer>
  );
}
