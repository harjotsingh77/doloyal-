"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Check, Copy } from "lucide-react";
import { Button } from "@doloyal/ui";
import { useTenant, useUpdateTenant } from "@/lib/tenant-query";
import { useSettingsChrome } from "../settings-chrome";
import {
  SettingsSection,
  SettingRow,
  ToggleRow,
  SettingsSkeleton,
  SettingsError,
} from "../settings-ui";

export default function BookingSettingsPage() {
  const { data: tenant, isLoading, isError, error, refetch } = useTenant();
  const updateTenant = useUpdateTenant();
  const { setStatus } = useSettingsChrome();
  const [copied, setCopied] = React.useState(false);

  // Toggles are low-risk: useUpdateTenant applies an optimistic cache update
  // immediately and reverts + surfaces a clear error if the save fails.
  const toggle = (key: "onlineBooking" | "walkIns" | "showOnWebsite", value: boolean) => {
    if (!tenant?.businessStatus) return;
    updateTenant.mutate(
      { businessStatus: { ...tenant.businessStatus, [key]: value } },
      {
        onSuccess: () => setStatus("saved"),
        onError: () => setStatus("error"),
      },
    );
  };

  if (isLoading || !tenant) return <SettingsSkeleton />;
  if (isError)
    return (
      <SettingsError
        message={error instanceof Error ? error.message : "Something went wrong."}
        onRetry={() => refetch()}
      />
    );

  const status = tenant.businessStatus ?? {};
  const bookingUrl = tenant.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${tenant.slug}`
    : null;

  const copyUrl = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight md:text-[1.7rem]">Booking</h2>
        <p className="mt-0.5 text-sm text-[rgb(var(--color-muted-foreground))]">
          How customers can book appointments with you.
        </p>
      </div>

      <SettingsSection title="Availability">
        <div className="divide-y divide-[rgb(var(--color-border))]">
          <ToggleRow
            label="Online booking"
            description="Customers can book appointments themselves through your booking page."
            checked={status.onlineBooking !== false}
            onCheckedChange={(v) => toggle("onlineBooking", v)}
          />
          <ToggleRow
            label="Walk-ins"
            description="Accept customers who arrive without an appointment."
            checked={status.walkIns !== false}
            onCheckedChange={(v) => toggle("walkIns", v)}
          />
          <ToggleRow
            label="Show business publicly"
            description="List this business on public Doloyal pages."
            checked={status.showOnWebsite !== false}
            onCheckedChange={(v) => toggle("showOnWebsite", v)}
          />
        </div>
      </SettingsSection>

      <SettingsSection title="Booking page">
        <SettingRow
          label="Public booking link"
          description="Share this link so customers can book online."
          stacked
        >
          {bookingUrl ? (
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-[rgb(var(--color-border))] bg-[rgb(var(--color-muted)/0.4)] px-3 py-2 text-xs">
                {bookingUrl}
              </code>
              <Button variant="secondary" size="sm" onClick={copyUrl} aria-label="Copy booking link">
                {copied ? <Check className="h-3.5 w-3.5 text-[rgb(var(--color-success))]" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <a href={bookingUrl} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </a>
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--color-muted-foreground))]">
              Available after your business is set up.
            </p>
          )}
        </SettingRow>
      </SettingsSection>

      <SettingsSection
        title="Advanced rules"
        description="Slot duration, advance booking windows, cancellation windows and confirmation behavior are configured per booking link."
      >
        <Link href="/app/appointments/booking-links" prefetch>
          <Button variant="secondary" size="sm">
            Configure booking links
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </SettingsSection>
    </div>
  );
}
