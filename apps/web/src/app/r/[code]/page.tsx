"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Field, Skeleton } from "@doloyal/ui";
import { api } from "@/lib/api";

export default function PublicReferralLandingPage() {
  const params = useParams();
  const code = String(params?.code || "");
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [claiming, setClaiming] = React.useState(false);
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  React.useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        setLoading(true);
        const res = await api.validateReferralCode(code, {
          landingPage: typeof window !== "undefined" ? window.location.href : undefined,
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          referrerUrl: typeof document !== "undefined" ? document.referrer : undefined,
          channel: new URLSearchParams(window.location.search).get("src") || undefined,
          utmSource: new URLSearchParams(window.location.search).get("utm_source") || undefined,
          utmMedium: new URLSearchParams(window.location.search).get("utm_medium") || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get("utm_campaign") || undefined,
        });
        setData(res);
      } catch (e: any) {
        setError(e?.message || "This referral link is invalid or expired.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const claim = async () => {
    try {
      setClaiming(true);
      const res = await api.claimReferral({
        code,
        ...form,
        sessionId: data?.sessionId,
      });
      if (res.status === "REJECTED") {
        toast.error("This referral cannot be claimed (existing customer or fraud rules).");
        return;
      }
      toast.success("Offer claimed! You can book an appointment now.");
      if (data?.bookingUrl) window.location.href = data.bookingUrl;
    } catch (e: any) {
      toast.error(e?.message || "Claim failed");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-16">
        <Skeleton className="h-16 w-16 rounded-2xl" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Link unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  const brand = data.brandColor || "#2563eb";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div
        className="h-2 w-full"
        style={{ background: `linear-gradient(90deg, ${brand}, ${brand}99)` }}
      />
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_8px_30px_rgba(15,23,42,0.06)] sm:p-8">
          <div className="flex items-center gap-3">
            {data.businessLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.businessLogo}
                alt=""
                className="h-14 w-14 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-bold text-white"
                style={{ background: brand }}
              >
                {(data.businessName || "D").slice(0, 1)}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{data.businessName}</h1>
              <p className="text-sm text-slate-500">Invited by {data.referrerName}</p>
            </div>
          </div>

          {data.campaign ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
                Referral offer
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">{data.campaign.name}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {data.campaign.description ||
                  `Get ${data.campaign.friendRewardValue} ${data.campaign.friendRewardType?.toLowerCase()} when you join.`}
              </p>
              <p className="mt-3 text-sm font-medium text-slate-800">
                Your reward: {data.campaign.friendRewardValue} {data.campaign.friendRewardType}
              </p>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                You&apos;ve been invited to join {data.businessName}. Claim your offer below.
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First name">
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </Field>
              <Field label="Last name">
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Button className="w-full" disabled={claiming} onClick={claim}>
              {claiming ? "Claiming…" : "Claim Offer"}
            </Button>
            {data.bookingUrl ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => (window.location.href = data.bookingUrl)}
              >
                Book Appointment
              </Button>
            ) : null}
          </div>

          {data.campaign?.terms ? (
            <p className="mt-6 text-xs leading-relaxed text-slate-400">{data.campaign.terms}</p>
          ) : (
            <p className="mt-6 text-xs text-slate-400">
              Offer subject to business terms. Existing customers are not eligible.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
