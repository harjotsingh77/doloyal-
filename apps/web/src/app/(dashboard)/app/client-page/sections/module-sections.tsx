"use client";

import * as React from "react";
import { ArrowUpRight, Copy, Gift, MapPin, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";
import type { ClientPortal, PublicBusinessInfo, PublicService } from "@doloyal/shared";
import { LeaveReviewSection } from "../leave-review-section";
import {
  LoungeButton,
  SelectableBlock,
  SectionEyebrow,
  firstName,
  formatVisit,
  nextAppointment,
  type PortalChrome,
} from "../portal-shared";

function wrap(chrome: PortalChrome, sid: string, content: React.ReactNode) {
  return chrome.isBuilder ? <SelectableBlock sid={sid} chrome={chrome}>{content}</SelectableBlock> : <>{content}</>;
}

function Shell({
  id,
  eyebrow,
  title,
  action,
  children,
  dark = false,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-8 rounded-[28px] p-6 sm:p-8 ${dark ? "bg-[#1c1410] text-[#f6efe4]" : "bg-white/80 ring-1 ring-[rgba(28,20,16,.08)]"}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? <SectionEyebrow>{eyebrow}</SectionEyebrow> : null}
          <h3 className={`mt-2 font-[family-name:var(--font-lounge-display)] text-3xl tracking-[-0.04em] ${dark ? "text-[#f6efe4]" : "text-[#1c1410]"}`}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BookingSection({
  chrome,
  title,
  buttonLabel,
  portal,
  onBook,
}: {
  chrome: PortalChrome;
  title: string;
  buttonLabel?: string;
  portal?: ClientPortal | null;
  onBook: (service?: PublicService) => void;
}) {
  const upcoming = (portal?.appointments ?? []).filter((apt) => new Date(apt.startTime).getTime() >= Date.now()).slice(0, 4);
  const next = nextAppointment(portal);
  return wrap(
    chrome,
    "booking",
    <Shell id="portal-booking" eyebrow="Your visits" title={title} action={<LoungeButton onClick={() => onBook()}>{buttonLabel || "Book a time"}</LoungeButton>}>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#1c1410]/55">
        {next
          ? `You’re next in for ${next.serviceName || "a visit"} on ${formatVisit(next.startTime)}.`
          : "Choose a treatment, pick a time, and we’ll have your chair ready."}
      </p>
      {upcoming.length ? (
        <div className="mt-6 grid gap-3">
          {upcoming.map((apt) => (
            <div key={apt.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#f6efe4] px-4 py-4">
              <div>
                <p className="font-semibold">{apt.serviceName || "Visit"}</p>
                <p className="mt-1 text-xs text-[#1c1410]/50">{formatVisit(apt.startTime)}{apt.staffName ? ` · ${apt.staffName}` : ""}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a5a32]">{apt.status}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-[#f6efe4] px-5 py-6">
          <p className="font-[family-name:var(--font-lounge-display)] text-xl">No visits on the calendar yet.</p>
          <p className="mt-1 text-sm text-[#1c1410]/55">It takes about a minute to book your next one.</p>
        </div>
      )}
    </Shell>,
  );
}

export function LoyaltySection({
  chrome,
  title,
  brandColor,
  businessName,
  portal,
}: {
  chrome: PortalChrome;
  title: string;
  brandColor: string;
  businessName: string;
  portal?: ClientPortal | null;
}) {
  const points = portal?.pointsBalance ?? 0;
  const toward = Math.min(1000, (points % 1000) || (points > 0 ? 1000 : 0));
  const stamps = Math.round((toward / 1000) * 8);
  return wrap(
    chrome,
    "loyalty",
    <Shell id="portal-loyalty" eyebrow="Your wallet" title={title}>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#1c1410]/55">
        {portal
          ? `${firstName(portal.customer.name)}, you have ${points.toLocaleString("en-IN")} points at ${businessName}.`
          : `Collect points every time you visit ${businessName}. Redeem them for treats below.`}
      </p>
      <div className="mt-6 overflow-hidden rounded-[24px] bg-[#1c1410] p-6 text-[#f6efe4]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#e2c49a]">Balance</p>
        <p className="mt-2 font-[family-name:var(--font-lounge-display)] text-5xl tracking-[-0.04em]">{points.toLocaleString("en-IN")}</p>
        <p className="mt-1 text-sm text-[#f6efe4]/55">{1000 - toward} points to your next reward punch</p>
        <div className="mt-5 flex gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="h-3 flex-1 rounded-full" style={{ backgroundColor: i < stamps ? brandColor : "rgba(246,239,228,.16)" }} />
          ))}
        </div>
      </div>
    </Shell>,
  );
}

export function RewardsSection({
  chrome,
  title,
  portal,
}: {
  chrome: PortalChrome;
  title: string;
  portal?: ClientPortal | null;
}) {
  const rewards = portal?.rewards ?? [];
  const points = portal?.pointsBalance ?? 0;
  return wrap(
    chrome,
    "rewards",
    <Shell id="portal-rewards" eyebrow="Treat yourself" title={title}>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#1c1410]/55">
        {points ? `You have ${points.toLocaleString("en-IN")} points ready to use.` : "Earn points on visits, then tap a reward when you’re ready."}
      </p>
      {rewards.length ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {rewards.slice(0, 6).map((reward) => {
            const ready = points >= reward.pointsCost;
            return (
              <div key={reward.id} className={`rounded-[24px] p-5 ${ready ? "bg-[#1c1410] text-[#f6efe4]" : "bg-[#f6efe4]"}`}>
                <Gift className="h-5 w-5 stroke-[1.5]" />
                <p className="mt-4 font-[family-name:var(--font-lounge-display)] text-xl leading-tight">{reward.name}</p>
                {reward.description ? <p className={`mt-2 line-clamp-2 text-sm ${ready ? "text-[#f6efe4]/60" : "text-[#1c1410]/50"}`}>{reward.description}</p> : null}
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em]">{reward.pointsCost} points{ready ? " · yours today" : ""}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-[24px] bg-[#f6efe4] px-5 py-8 text-sm text-[#1c1410]/55">Rewards will show here as soon as they’re ready for you.</p>
      )}
    </Shell>,
  );
}

export function MembershipSection({
  chrome,
  title,
  portal,
}: {
  chrome: PortalChrome;
  title: string;
  portal?: ClientPortal | null;
}) {
  return wrap(
    chrome,
    "membership",
    <Shell id="portal-membership" eyebrow="Members club" title={title} dark>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#f6efe4]/65">
        {portal?.membership
          ? `You’re on ${portal.membership.name}. Perks apply automatically when you book.`
          : "Ask at the desk to join. Members get first pick of times and a little extra on every visit."}
      </p>
      <div className="mt-6 max-w-md rounded-[24px] bg-gradient-to-br from-[#3a2a1c] to-[#1c1410] p-6 ring-1 ring-white/10">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#e2c49a]">Member card</p>
        <p className="mt-4 font-[family-name:var(--font-lounge-display)] text-3xl">{portal?.membership?.name || "Guest"}</p>
        <p className="mt-2 text-sm text-[#f6efe4]/55">{portal ? firstName(portal.customer.name) : "Join to get yours"}</p>
      </div>
    </Shell>,
  );
}

export function ReferralsSection({
  chrome,
  title,
  portal,
}: {
  chrome: PortalChrome;
  title: string;
  portal?: ClientPortal | null;
}) {
  const code = portal?.referralCode;
  const copyCode = async () => {
    if (!code) {
      toast.message("Your invite code appears after you sign in.");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Invite code copied");
    } catch {
      toast.error("Could not copy the code.");
    }
  };
  const share = async () => {
    const text = code ? `Use my code ${code} when you book.` : "Come book with me.";
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join me", text });
        return;
      } catch {
        /* fall through */
      }
    }
    await copyCode();
  };

  return wrap(
    chrome,
    "referrals",
    <Shell id="portal-referrals" eyebrow="Bring a friend" title={title}>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[#1c1410]/55">Share your code. When they book, you both get something back.</p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="rounded-[24px] bg-[#f6efe4] px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8a5a32]">Your code</p>
          <p className="mt-1 font-[family-name:var(--font-lounge-display)] text-3xl tracking-[0.08em]">{code || "———"}</p>
        </div>
        <LoungeButton onClick={() => void copyCode()} tone="ghost">
          <Copy className="h-4 w-4 stroke-[1.5]" /> Copy
        </LoungeButton>
        <LoungeButton onClick={() => void share()}>
          <Share2 className="h-4 w-4 stroke-[1.5]" /> Share invite
        </LoungeButton>
      </div>
    </Shell>,
  );
}

export function ReviewsModule({
  chrome,
  slug,
  brandColor,
  title,
}: {
  chrome: PortalChrome;
  slug: string;
  brandColor: string;
  title: string;
}) {
  return wrap(
    chrome,
    "reviews",
    <LeaveReviewSection
      slug={slug}
      brandColor={brandColor}
      title={title}
      mode={chrome.isBuilder ? "preview" : "published"}
    />,
  );
}

export function AboutSection({ chrome, title, business }: { chrome: PortalChrome; title: string; business: PublicBusinessInfo }) {
  return wrap(
    chrome,
    "about",
    <Shell id="portal-about" eyebrow="Our story" title={title}>
      <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#1c1410]/65">
        {business.about?.trim()
          || business.tagline?.trim()
          || (chrome.isBuilder ? "Add a description in Brand settings so this story is yours." : "")}
      </p>
    </Shell>,
  );
}

export function ContactSection({ chrome, title, business }: { chrome: PortalChrome; title: string; business: PublicBusinessInfo }) {
  const phone = business.phone?.replace(/\s/g, "") || "";
  const maps = business.mapsUrl || (business.address ? `https://maps.google.com/?q=${encodeURIComponent(business.address)}` : null);
  const wa = business.whatsapp || phone;
  return wrap(
    chrome,
    "contact",
    <Shell id="portal-contact" eyebrow="Find us" title={title}>
      {business.address ? <p className="mt-3 max-w-lg text-sm leading-6 text-[#1c1410]/65">{business.address}</p> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        {phone ? (
          <a href={`tel:${phone}`} className="inline-flex items-center gap-2 rounded-full bg-[#f6efe4] px-4 py-2 text-sm font-semibold">
            <Phone className="h-4 w-4 stroke-[1.5]" /> Call
          </a>
        ) : null}
        {wa ? (
          <a href={`https://wa.me/${wa.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-[#f6efe4] px-4 py-2 text-sm font-semibold">
            WhatsApp
          </a>
        ) : null}
        {maps ? (
          <a href={maps} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#f6efe4]">
            <MapPin className="h-4 w-4 stroke-[1.5]" /> Directions
          </a>
        ) : null}
        {business.email ? (
          <a href={`mailto:${business.email}`} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-[rgba(28,20,16,.12)]">
            Email
          </a>
        ) : null}
      </div>
    </Shell>,
  );
}

export function HoursSection({ chrome, title, business }: { chrome: PortalChrome; title: string; business: PublicBusinessInfo }) {
  const hours = business.businessHours;
  const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
  const labels: Record<string, string> = { monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun" };
  const today = dayOrder[(new Date().getDay() + 6) % 7];
  return wrap(
    chrome,
    "hours",
    <Shell id="portal-hours" eyebrow="The week" title={title}>
      {hours ? (
        <div className="mt-5 grid gap-1.5">
          {dayOrder.map((day) => {
            const h = hours[day];
            const isToday = day === today;
            return (
              <div key={day} className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm ${isToday ? "bg-[#f6efe4] font-semibold" : ""}`}>
                <span className="text-[#1c1410]/55">{labels[day]}{isToday ? " · today" : ""}</span>
                <span>{h ? `${h.open.slice(0, 5)} – ${h.close.slice(0, 5)}` : "Closed"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#1c1410]/55">Hours will appear here once they’re posted.</p>
      )}
    </Shell>,
  );
}

export function SimpleInfoSection({
  chrome,
  sid,
  id,
  title,
  body,
}: {
  chrome: PortalChrome;
  sid: string;
  id: string;
  title: string;
  body: string;
}) {
  return wrap(
    chrome,
    sid,
    <Shell id={id} title={title}>
      <p className="mt-3 text-sm leading-6 text-[#1c1410]/55">{body}</p>
    </Shell>,
  );
}

export function VisitStrip({ business }: { business: PublicBusinessInfo }) {
  const todayKey = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][new Date().getDay()] as string;
  const today = business.businessHours?.[todayKey];
  return (
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#1c1410] px-6 py-5 text-[#f6efe4]">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e2c49a]">Today</p>
        <p className="mt-1 font-[family-name:var(--font-lounge-display)] text-xl">
          {today ? `Open ${today.open.slice(0, 5)} – ${today.close.slice(0, 5)}` : business.address || "We’ll see you soon"}
        </p>
      </div>
      {business.phone ? (
        <a href={`tel:${business.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full bg-[#f6efe4] px-4 py-2 text-sm font-semibold text-[#1c1410]">
          Call the desk <ArrowUpRight className="h-4 w-4" />
        </a>
      ) : null}
    </section>
  );
}
