"use client";

import * as React from "react";
import { CalendarDays, Store, X } from "lucide-react";
import type { PublicService } from "@doloyal/shared";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@doloyal/ui";

/** Piece = retail/buy-only; Service/Session/Package (or empty) = bookable. */
export function isBookableProduct(service?: PublicService | null): boolean {
  if (!service) return true;
  const unit = (service.unit || "Service").trim().toLowerCase();
  return unit !== "piece";
}

export function isBuyableProduct(service?: PublicService | null): boolean {
  return !!service;
}

export function productNeedsChoice(service?: PublicService | null): boolean {
  return isBookableProduct(service) && isBuyableProduct(service);
}

export function BuyChoiceDialog({
  open,
  service,
  onClose,
  onBuyNow,
  onBook,
}: {
  open: boolean;
  service: PublicService | null;
  onClose: () => void;
  onBuyNow: () => void;
  onBook: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md gap-0 p-0 sm:rounded-2xl" hideClose>
        <div className="relative border-b border-black/[0.06] px-5 py-4">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-lg">How would you like to continue?</DialogTitle>
            <DialogDescription className="text-sm text-[rgb(var(--color-muted-foreground))]">
              {service ? (
                <>
                  For <span className="font-medium text-[rgb(var(--color-foreground))]">{service.name}</span>
                </>
              ) : (
                "Choose take now at the store, or book a time."
              )}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-[rgb(var(--color-muted-foreground))] hover:bg-black/[0.04]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-2 p-4">
          <button
            type="button"
            onClick={onBuyNow}
            className="flex items-start gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 text-left transition hover:border-[rgb(var(--color-primary))]/40 hover:bg-[rgb(var(--color-primary))]/[0.03]"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]">
              <Store className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Buy now</span>
              <span className="mt-0.5 block text-xs leading-5 text-[rgb(var(--color-muted-foreground))]">
                I&apos;m at the store — go straight to payment
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={onBook}
            className="flex items-start gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3.5 text-left transition hover:border-[rgb(var(--color-primary))]/40 hover:bg-[rgb(var(--color-primary))]/[0.03]"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[rgb(var(--color-primary))]/10 text-[rgb(var(--color-primary))]">
              <CalendarDays className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Booking</span>
              <span className="mt-0.5 block text-xs leading-5 text-[rgb(var(--color-muted-foreground))]">
                Pick a date &amp; time, then pay online
              </span>
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
