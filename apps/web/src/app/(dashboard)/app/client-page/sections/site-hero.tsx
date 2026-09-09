"use client";

import * as React from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { PublicBusinessInfo } from "@doloyal/shared";
import { clientPageBrand, heroDescriptionFromBrand, heroHeadingFromBrand } from "../client-page-brand";
import { catalogImageSrc, SelectableBlock, type HeroSlide, type MasterConfig, type PortalChrome } from "../portal-shared";
import { siteCopy } from "../website-copy";

const HEIGHT: Record<NonNullable<MasterConfig["heroHeight"]>, string> = {
  compact: "min-h-[70dvh]",
  default: "min-h-[88dvh]",
  tall: "min-h-[100dvh]",
};

function isVideoSrc(src: string, kind?: string) {
  if (kind === "video") return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(src) || src.includes("youtube.com") || src.includes("youtu.be") || src.includes("vimeo.com");
}

function youtubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{6,})/);
  return match?.[1] ?? null;
}

export function SiteHero({
  chrome,
  config,
  business,
  onBook,
  onExplore,
}: {
  chrome: PortalChrome;
  config?: MasterConfig;
  business: PublicBusinessInfo;
  onBook: () => void;
  onExplore: () => void;
}) {
  const brand = clientPageBrand(business);
  const copy = siteCopy(config?.businessType || "custom");
  const heading = heroHeadingFromBrand(business, config?.heroHeading);
  const description = heroDescriptionFromBrand(business, config?.heroDescription);
  const bookLabel = config?.heroButtonLabel?.trim() || copy.book;
  const secondary = config?.secondaryCta?.trim() || copy.explore;
  const align = config?.heroAlign === "center" ? "items-center text-center" : "items-start text-left";
  const overlay = Math.min(80, Math.max(20, config?.heroOverlay ?? 46));
  const height = HEIGHT[config?.heroHeight || "default"];
  const mode = config?.heroMode || (config?.heroVideoSrc ? "video" : brand.coverUrl ? "image" : "image");

  const slides = React.useMemo<HeroSlide[]>(() => {
    if (mode === "video" && (config?.heroVideoSrc || brand.coverUrl)) {
      return [{ id: "fixed-video", kind: "video", src: config?.heroVideoSrc || brand.coverUrl || "", poster: brand.coverUrl || undefined }];
    }
    if (config?.heroSlides?.length) return config.heroSlides.filter((slide) => slide.src);
    if (brand.coverUrl) return [{ id: "cover", kind: isVideoSrc(brand.coverUrl) ? "video" : "image", src: brand.coverUrl }];
    return [{ id: "fallback", kind: "image", src: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80" }];
  }, [brand.coverUrl, config?.heroSlides, config?.heroVideoSrc, mode]);

  const slider = mode === "slider" && slides.length > 1;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [videoPaused, setVideoPaused] = React.useState(false);
  const touchX = React.useRef<number | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const current = slides[Math.min(index, slides.length - 1)] || slides[0];
  const duration = Math.max(2500, config?.slideMs || 5500);
  const auto = slider && (config?.autoSlide ?? true) && !paused && !videoPaused;

  React.useEffect(() => {
    if (!auto) return;
    const timer = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), duration);
    return () => window.clearTimeout(timer);
  }, [auto, duration, index, slides.length]);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (videoPaused) el.pause();
    else void el.play().catch(() => undefined);
  }, [videoPaused, index, current?.src]);

  const go = (next: number) => setIndex((next + slides.length) % slides.length);
  const mediaSrc = catalogImageSrc(current?.src, "");

  return (
    <SelectableBlock sid="hero" chrome={chrome}>
      <section
        id="portal-hero"
        className={`relative isolate -mt-16 overflow-hidden sm:-mt-[4.25rem] ${height}`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(event) => { touchX.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchX.current == null) return;
          const delta = event.changedTouches[0].clientX - touchX.current;
          if (Math.abs(delta) > 40 && slider) go(index + (delta < 0 ? 1 : -1));
          touchX.current = null;
        }}
      >
        {slides.map((slide, i) => {
          const active = slide.id === current?.id;
          const src = catalogImageSrc(slide.src, "");
          const video = isVideoSrc(slide.src, slide.kind);
          return (
            <div
              key={slide.id}
              className="absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
              aria-hidden={!active}
            >
              {video ? (
                youtubeId(slide.src) ? (
                  <iframe
                    title=""
                    src={`https://www.youtube.com/embed/${youtubeId(slide.src)}?autoplay=${active ? 1 : 0}&mute=1&loop=1&playlist=${youtubeId(slide.src)}&controls=0&playsinline=1`}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <video
                    key={src}
                    ref={active ? videoRef : undefined}
                    className="absolute inset-0 h-full w-full object-cover"
                    autoPlay={active && !videoPaused}
                    muted
                    loop
                    playsInline
                    poster={slide.poster ? catalogImageSrc(slide.poster, "") : undefined}
                    controls={false}
                  >
                    <source src={src} />
                  </video>
                )
              ) : (
                <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
            </div>
          );
        })}

        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, rgb(17 17 17 / ${overlay / 100}) 0%, rgb(17 17 17 / ${overlay * 0.45 / 100}) 55%, rgb(17 17 17 / 0.18) 100%)` }} />

        <div className={`relative z-10 mx-auto flex ${height} w-full max-w-[1280px] flex-col justify-end px-5 pb-16 pt-28 sm:px-8 lg:px-10 ${align}`}>
          <div className={`max-w-xl ${config?.heroAlign === "center" ? "mx-auto" : ""}`}>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              {heading}
            </h1>
            {description ? (
              <p className="mt-4 max-w-[38ch] text-[15px] leading-7 text-white/78 sm:text-base">
                {description}
              </p>
            ) : chrome.isBuilder ? (
              <p className="mt-4 max-w-[38ch] text-[15px] leading-7 text-amber-100">
                Add a short description in Brand settings so visitors know who you are.
              </p>
            ) : null}
            <div className={`mt-8 flex flex-wrap gap-3 ${config?.heroAlign === "center" ? "justify-center" : ""}`}>
              <button
                type="button"
                onClick={onBook}
                className="group inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98]"
                style={{ backgroundColor: "var(--site-accent)" }}
              >
                {bookLabel}
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="inline-flex h-12 items-center rounded-full bg-white/10 px-6 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition duration-500 hover:bg-white/16"
              >
                {secondary}
              </button>
            </div>
          </div>
        </div>

        {slider ? (
          <div className="absolute inset-x-0 bottom-6 z-10 mx-auto flex max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-10">
            <div className="flex items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? "w-8 bg-white" : "w-2.5 bg-white/40"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/20 backdrop-blur-md">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : isVideoSrc(current?.src || "", current?.kind) && !youtubeId(mediaSrc) ? (
          <button
            type="button"
            onClick={() => setVideoPaused((v) => !v)}
            className="absolute bottom-6 right-6 z-10 inline-flex h-10 items-center gap-2 rounded-full bg-white/12 px-3 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur-md"
          >
            {videoPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {videoPaused ? "Play" : "Pause"}
          </button>
        ) : null}
      </section>
    </SelectableBlock>
  );
}
