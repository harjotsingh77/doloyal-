"use client";

import * as React from "react";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Star,
  Instagram,
  Facebook,
  Globe,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import type {
  PublicBusinessInfo,
  PublicService,
  PublicStaff,
  BookingPageSectionId,
} from "@doloyal/shared";

function formatPrice(amount: number, currency = "INR"): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${Math.round(amount).toLocaleString("en-IN")}`;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function sectionEnabled(
  business: PublicBusinessInfo,
  id: BookingPageSectionId,
): boolean {
  const sections = business.pageConfig?.sections ?? business.bookingLink?.pageConfig?.sections;
  if (!sections?.length) return true;
  const found = sections.find((s) => s.id === id);
  return found ? found.enabled : true;
}

function orderedSections(business: PublicBusinessInfo): BookingPageSectionId[] {
  const sections = business.pageConfig?.sections ?? business.bookingLink?.pageConfig?.sections;
  if (!sections?.length) {
    return [
      "hero",
      "about",
      "services",
      "staff",
      "testimonials",
      "booking",
      "faq",
      "contact",
      "map",
      "footer",
    ];
  }
  return sections.filter((s) => s.enabled).map((s) => s.id);
}

export function BookingLanding({
  business,
  services,
  staff,
  currency,
  onBook,
}: {
  business: PublicBusinessInfo;
  services: PublicService[];
  staff: PublicStaff[];
  currency: string;
  onBook: () => void;
}) {
  const brand = business.brandColor || "#2563EB";
  const page = business.pageConfig ?? business.bookingLink?.pageConfig;
  const branding = business.bookingLink?.branding;
  const tagline = business.tagline || page?.tagline || "Book your next appointment online";
  const about = business.about || page?.about || business.bookingLink?.description;
  const cta = page?.heroCta || "Book Now";
  const faqs = page?.faqs ?? [];
  const testimonials = page?.testimonials ?? [];
  const gallery = page?.gallery ?? [];
  const policies = page?.policies;
  const order = orderedSections(business);

  const hours = business.businessHours as
    | Record<string, { open?: string; close?: string; start?: string; end?: string; isAvailable?: boolean } | null>
    | null;

  const whatsapp = business.whatsapp || business.phone;

  return (
    <div
      className="space-y-10 pb-16"
      style={
        {
          ["--book-brand" as string]: brand,
          ["--book-radius" as string]: branding?.borderRadius || "0.625rem",
          fontFamily: branding?.fontFamily || undefined,
          backgroundColor: branding?.backgroundColor || undefined,
          backgroundImage: branding?.backgroundImage
            ? `url(${branding.backgroundImage})`
            : undefined,
        } as React.CSSProperties
      }
    >
      {branding?.customCss ? <style dangerouslySetInnerHTML={{ __html: branding.customCss }} /> : null}

      {order.map((id) => {
        if (id === "hero" && sectionEnabled(business, "hero")) {
          return (
            <section key="hero" className="relative overflow-hidden rounded-[var(--book-radius,0.625rem)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]">
              {business.coverBannerUrl ? (
                <div className="h-40 w-full md:h-56">
                  <img src={business.coverBannerUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="h-28 w-full md:h-36" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}99)` }} />
              )}
              <div className="relative px-5 pb-6 pt-0 md:px-8">
                <div className="-mt-10 mb-4 flex items-end gap-4">
                  {business.logoUrl ? (
                    <img
                      src={business.logoUrl}
                      alt={business.name}
                      className="h-20 w-20 rounded-xl border-4 border-[rgb(var(--color-surface))] object-cover shadow-sm"
                    />
                  ) : (
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-[rgb(var(--color-surface))] text-2xl font-bold text-white shadow-sm"
                      style={{ backgroundColor: brand }}
                    >
                      {getInitials(business.name)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 pb-1">
                    <h1 className="truncate text-2xl font-bold">{business.name}</h1>
                    <p className="text-sm text-[rgb(var(--color-muted-foreground))]">{tagline}</p>
                    {branding?.showRating !== false && business.rating != null && (
                      <div className="mt-1 flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium">{business.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBook}
                  className="inline-flex h-11 w-full items-center justify-center rounded-[var(--book-radius,0.625rem)] px-6 text-sm font-medium text-white transition hover:opacity-95 md:w-auto"
                  style={{ backgroundColor: brand }}
                >
                  {cta}
                </button>
              </div>
            </section>
          );
        }

        if (id === "about" && sectionEnabled(business, "about") && about) {
          return (
            <section key="about" className="space-y-2">
              <h2 className="text-lg font-semibold">About</h2>
              <p className="text-sm leading-relaxed text-[rgb(var(--color-muted-foreground))]">{about}</p>
              {policies && (
                <p className="mt-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.35)] p-3 text-xs text-[rgb(var(--color-muted-foreground))]">
                  <span className="font-medium text-[rgb(var(--color-foreground))]">Policies: </span>
                  {policies}
                </p>
              )}
            </section>
          );
        }

        if (id === "services" && sectionEnabled(business, "services")) {
          return (
            <section key="services" className="space-y-3">
              <h2 className="text-lg font-semibold">Services</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {services.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{s.name}</p>
                        {s.description && (
                          <p className="mt-1 text-xs text-[rgb(var(--color-muted-foreground))] line-clamp-2">
                            {s.description}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-semibold" style={{ color: brand }}>
                        {s.price > 0 ? formatPrice(s.price, currency) : "Free"}
                      </p>
                    </div>
                    <p className="mt-2 text-[0.65rem] text-[rgb(var(--color-muted-foreground))]">
                      {s.durationMinutes} min · {s.category}
                    </p>
                  </div>
                ))}
                {services.length === 0 && (
                  <p className="text-sm text-[rgb(var(--color-muted-foreground))]">Services will appear here.</p>
                )}
              </div>
            </section>
          );
        }

        if (id === "staff" && sectionEnabled(business, "staff")) {
          return (
            <section key="staff" className="space-y-3">
              <h2 className="text-lg font-semibold">Our Team</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {staff.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
                  >
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.name} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: brand }}
                      >
                        {getInitials(m.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-[rgb(var(--color-muted-foreground))]">
                        {m.roleTitle || "Staff"}{(m as unknown as { isAvailable?: boolean }).isAvailable === false ? " · Busy" : " · Available"}
                      </p>
                    </div>
                  </div>
                ))}
                {staff.length === 0 && (
                  <p className="text-sm text-[rgb(var(--color-muted-foreground))]">Any available staff can take your booking.</p>
                )}
              </div>
            </section>
          );
        }

        if (id === "gallery" && sectionEnabled(business, "gallery") && gallery.length > 0) {
          return (
            <section key="gallery" className="space-y-3">
              <h2 className="text-lg font-semibold">Gallery</h2>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {gallery.map((g, i) => (
                  <img
                    key={i}
                    src={g.url}
                    alt={g.caption || "Gallery"}
                    className="aspect-square w-full rounded-[var(--radius)] object-cover"
                  />
                ))}
              </div>
            </section>
          );
        }

        if (id === "testimonials" && sectionEnabled(business, "testimonials") && testimonials.length > 0) {
          return (
            <section key="testimonials" className="space-y-3">
              <h2 className="text-lg font-semibold">Reviews</h2>
              <div className="grid gap-3">
                {testimonials.map((t, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4"
                  >
                    <div className="mb-1 flex items-center gap-1">
                      {Array.from({ length: Math.max(1, Math.min(5, t.rating || 5)) }).map((_, si) => (
                        <Star key={si} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-sm text-[rgb(var(--color-foreground))]">&ldquo;{t.text}&rdquo;</p>
                    <p className="mt-2 text-xs font-medium text-[rgb(var(--color-muted-foreground))]">— {t.name}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        }

        if (id === "membership" && sectionEnabled(business, "membership") && page?.membershipBlurb) {
          return (
            <section key="membership" className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-4">
              <h2 className="text-lg font-semibold">Membership</h2>
              <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{page.membershipBlurb}</p>
            </section>
          );
        }

        if (id === "loyalty" && sectionEnabled(business, "loyalty") && page?.loyaltyBlurb) {
          return (
            <section key="loyalty" className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] p-4">
              <h2 className="text-lg font-semibold">Loyalty Rewards</h2>
              <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">{page.loyaltyBlurb}</p>
            </section>
          );
        }

        if (id === "booking" && sectionEnabled(business, "booking")) {
          return (
            <section key="booking" className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-5 text-center">
              <h2 className="text-lg font-semibold">Ready to book?</h2>
              <p className="mt-1 text-sm text-[rgb(var(--color-muted-foreground))]">
                Pick a service, staff, and time — confirmation is instant.
              </p>
              <button
                type="button"
                onClick={onBook}
                className="mt-4 inline-flex h-11 items-center justify-center rounded-[var(--book-radius,0.625rem)] px-8 text-sm font-medium text-white"
                style={{ backgroundColor: brand }}
              >
                {cta}
              </button>
            </section>
          );
        }

        if (id === "faq" && sectionEnabled(business, "faq") && faqs.length > 0) {
          return (
            <section key="faq" className="space-y-3">
              <h2 className="text-lg font-semibold">FAQs</h2>
              <div className="space-y-2">
                {faqs.map((f, i) => (
                  <details
                    key={i}
                    className="rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-3"
                  >
                    <summary className="cursor-pointer text-sm font-medium">{f.question}</summary>
                    <p className="mt-2 text-sm text-[rgb(var(--color-muted-foreground))]">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          );
        }

        if (id === "contact" && sectionEnabled(business, "contact")) {
          return (
            <section key="contact" className="space-y-3">
              <h2 className="text-lg font-semibold">Contact</h2>
              <div className="space-y-2 rounded-[var(--radius)] border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))] p-4 text-sm">
                {business.address && (
                  <div className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" /><span>{business.address}</span></div>
                )}
                {business.phone && (
                  <a className="flex gap-2 hover:underline" href={`tel:${business.phone}`}><Phone className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" /><span>{business.phone}</span></a>
                )}
                {business.email && (
                  <a className="flex gap-2 hover:underline" href={`mailto:${business.email}`}><Mail className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" /><span>{business.email}</span></a>
                )}
                {branding?.showWhatsApp !== false && whatsapp && (
                  <a className="flex gap-2 hover:underline" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" /><span>WhatsApp</span>
                  </a>
                )}
                {branding?.showSocial !== false && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {business.instagram && (
                      <a href={business.instagram.startsWith("http") ? business.instagram : `https://instagram.com/${business.instagram}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline">
                        <Instagram className="h-3.5 w-3.5" /> Instagram
                      </a>
                    )}
                    {business.facebook && (
                      <a href={business.facebook.startsWith("http") ? business.facebook : `https://facebook.com/${business.facebook}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline">
                        <Facebook className="h-3.5 w-3.5" /> Facebook
                      </a>
                    )}
                    {business.website && (
                      <a href={business.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline">
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                  </div>
                )}
                {hours && (
                  <div className="flex gap-2 pt-2 border-t border-[rgb(var(--color-border))]">
                    <Clock className="h-4 w-4 shrink-0 text-[rgb(var(--color-muted-foreground))]" />
                    <div className="grid w-full grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      {Object.entries(hours).map(([day, val]) => {
                        if (!val) return null;
                        const open = (val as any).open || (val as any).start;
                        const close = (val as any).close || (val as any).end;
                        if (!open || !close) return null;
                        return (
                          <React.Fragment key={day}>
                            <span className="capitalize text-[rgb(var(--color-muted-foreground))]">{day.slice(0, 3)}</span>
                            <span>{open} – {close}</span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (id === "map" && sectionEnabled(business, "map") && branding?.showMap !== false && (business.mapsUrl || business.address)) {
          const mapSrc = business.mapsUrl?.includes("embed")
            ? business.mapsUrl
            : `https://maps.google.com/maps?q=${encodeURIComponent(business.address || business.name)}&output=embed`;
          return (
            <section key="map" className="space-y-3">
              <h2 className="text-lg font-semibold">Location</h2>
              <div className="overflow-hidden rounded-[var(--radius)] border border-[rgb(var(--color-border))]">
                <iframe title="Map" src={mapSrc} className="h-56 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
              {business.mapsUrl && !business.mapsUrl.includes("embed") && (
                <a href={business.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: brand }}>
                  Open in Google Maps <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </section>
          );
        }

        if (id === "footer" && sectionEnabled(business, "footer")) {
          return (
            <footer key="footer" className="border-t border-[rgb(var(--color-border))] pt-6 text-center text-xs text-[rgb(var(--color-muted-foreground))]">
              <p>© {new Date().getFullYear()} {business.name}</p>
              <p className="mt-1">Powered by Doloyal</p>
            </footer>
          );
        }

        return null;
      })}
    </div>
  );
}
