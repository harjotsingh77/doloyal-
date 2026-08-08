"use client";

import { Star } from "lucide-react";
import { Stagger, StaggerItem } from "./ui";
import { TESTIMONIALS } from "../data/testimonials";
import { cn } from "@/lib/utils";

export function TestimonialGrid({ items = TESTIMONIALS }: { items?: typeof TESTIMONIALS }) {
  return (
    <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <StaggerItem key={t.name}>
          <figure className="flex h-full flex-col rounded-3xl border border-[rgb(var(--color-border))] bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,23,42,0.18)]">
            <div className="mb-4 flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <blockquote className="flex-1 text-[15px] leading-relaxed text-[rgb(var(--color-muted-foreground))]">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-6 flex items-center gap-3 border-t border-[rgb(var(--color-border))] pt-5">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-[13px] font-bold text-white",
                  t.gradient,
                )}
              >
                {t.initials}
              </span>
              <div>
                <div className="text-[14px] font-bold">{t.name}</div>
                <div className="text-[13px] text-[rgb(var(--color-subtle))]">{t.role}</div>
              </div>
            </figcaption>
          </figure>
        </StaggerItem>
      ))}
    </Stagger>
  );
}