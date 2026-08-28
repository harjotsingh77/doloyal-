"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import { cn } from "@doloyal/ui";

/**
 * Shopify/Wix-style preview viewport.
 *
 * The website is rendered into a real <iframe> that is sized to the *virtual*
 * device viewport (1440×900 / 768×1024 / 390×844) and then scaled down with a
 * CSS transform so the whole thing fits the builder's centre column.
 *
 * The iframe is the important part. CSS media queries inside an iframe resolve
 * against the iframe's own width, so the page picks its genuine desktop,
 * tablet or mobile layout — instead of reacting to the dashboard's width and
 * collapsing a desktop preview into a phone-shaped column.
 *
 * Children are mounted with a React portal, so the preview is not a snapshot:
 * it is the same React tree as the builder. Clicks select sections, edits land
 * instantly, and no state is duplicated.
 */

export type PreviewDevice = "desktop" | "tablet" | "mobile";

export const PREVIEW_VIEWPORTS: Record<PreviewDevice, { width: number; height: number; label: string }> = {
  desktop: { width: 1440, height: 900, label: "Desktop" },
  tablet: { width: 768, height: 1024, label: "Tablet" },
  mobile: { width: 390, height: 844, label: "Mobile" },
};

/**
 * Frame chrome, in real (unscaled) pixels — the frame is drawn at natural size
 * around the scaled website so browser dots and URLs stay crisp and legible.
 */
const FRAMES: Record<PreviewDevice, { bezel: number; border: number; chrome: number; outerRadius: number; screenRadius: number }> = {
  desktop: { bezel: 0, border: 1, chrome: 38, outerRadius: 14, screenRadius: 0 },
  tablet: { bezel: 14, border: 0, chrome: 0, outerRadius: 28, screenRadius: 14 },
  mobile: { bezel: 11, border: 0, chrome: 0, outerRadius: 44, screenRadius: 34 },
};

/** Room reserved under the frame for the "1440 × 900 · 42%" caption. */
const CAPTION_SPACE = 26;
const MIN_SCALE = 0.15;
const BLANK_DOC = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';

/**
 * Mirrors the host document's stylesheets and <html> attributes into the
 * iframe, then returns a node to portal into.
 *
 * Styles have to be copied because the iframe is a separate document: Tailwind's
 * output, the app's CSS custom properties, and the brand tokens that
 * TenantBrandingSync writes as inline properties on <html> all live in the
 * parent. The observers keep all of that live, so a brand-colour change shows
 * up in the preview immediately (and dev HMR style updates keep working).
 */
function usePreviewMount(frame: HTMLIFrameElement | null) {
  const [mount, setMount] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!frame) return;
    const observers: MutationObserver[] = [];
    let pending = 0;

    const attach = () => {
      const doc = frame.contentDocument;
      if (!doc?.body) return;

      doc.documentElement.lang = "en";
      doc.body.style.margin = "0";
      doc.body.className = "font-sans antialiased";

      let host = doc.getElementById("client-page-preview-root");
      if (!host) {
        host = doc.createElement("div");
        host.id = "client-page-preview-root";
        doc.body.appendChild(host);
      }

      const copyStyles = () => {
        doc.head.querySelectorAll("[data-mirrored-style]").forEach((node) => node.remove());
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
          const clone = node.cloneNode(true) as HTMLElement;
          clone.setAttribute("data-mirrored-style", "");
          doc.head.appendChild(clone);
        });
      };

      const copyRootAttributes = () => {
        const source = document.documentElement;
        // The customer page is previewed in its default light appearance even
        // when the dashboard itself is in dark mode.
        const classes = source.className.split(/\s+/).filter((name) => name && name !== "dark");
        if (!classes.includes("light")) classes.push("light");
        doc.documentElement.className = classes.join(" ");
        doc.documentElement.setAttribute("style", source.getAttribute("style") ?? "");
      };

      copyStyles();
      copyRootAttributes();
      setMount(host);

      const styleObserver = new MutationObserver(() => {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(copyStyles);
      });
      styleObserver.observe(document.head, { childList: true, subtree: true, characterData: true });

      const rootObserver = new MutationObserver(copyRootAttributes);
      rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });

      observers.push(styleObserver, rootObserver);
    };

    attach();
    frame.addEventListener("load", attach);
    return () => {
      frame.removeEventListener("load", attach);
      cancelAnimationFrame(pending);
      observers.forEach((observer) => observer.disconnect());
      observers.length = 0;
    };
  }, [frame]);

  return mount;
}

/** Tracks the space the preview may occupy, re-measuring on any layout change. */
function useAvailableArea() {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [area, setArea] = React.useState<{ width: number; height: number } | null>(null);

  React.useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setArea((previous) =>
        previous && previous.width === width && previous.height === height ? previous : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return [ref, area] as const;
}

export function PreviewViewport({
  device,
  url,
  children,
  className,
}: {
  device: PreviewDevice;
  /** Shown in the desktop browser bar. */
  url: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [stageRef, area] = useAvailableArea();
  const [frame, setFrame] = React.useState<HTMLIFrameElement | null>(null);
  const mount = usePreviewMount(frame);

  const viewport = PREVIEW_VIEWPORTS[device];
  const chrome = FRAMES[device];

  // Fit the virtual viewport into whatever space is left, preserving the
  // device's aspect ratio and never scaling past 1:1.
  const overheadX = chrome.bezel * 2 + chrome.border * 2;
  const overheadY = chrome.bezel * 2 + chrome.border * 2 + chrome.chrome + CAPTION_SPACE;
  const availableWidth = Math.max(0, (area?.width ?? 0) - overheadX);
  const availableHeight = Math.max(0, (area?.height ?? 0) - overheadY);
  const fitted = Math.min(availableWidth / viewport.width, availableHeight / viewport.height, 1);
  const scale = area && Number.isFinite(fitted) ? Math.max(fitted, MIN_SCALE) : 1;

  const screenWidth = viewport.width * scale;
  const screenHeight = viewport.height * scale;
  const isDesktop = device === "desktop";

  // Published to the preview document so selection outlines and labels can
  // compensate for the scale and keep a constant on-screen size.
  React.useEffect(() => {
    mount?.style.setProperty("--preview-scale", String(scale));
  }, [mount, scale]);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-5", className)}>
      <div
        ref={stageRef}
        className="flex h-full min-h-0 w-full min-w-0 flex-col items-center justify-center gap-1.5"
      >
        <div
          className={cn(
            "relative flex shrink-0 flex-col",
            isDesktop
              ? "overflow-hidden border border-black/[0.07] bg-white shadow-[0_18px_45px_rgba(23,54,48,.14)]"
              : "bg-[#131518] shadow-[0_26px_60px_rgba(0,0,0,.28)]",
          )}
          style={{
            width: screenWidth + overheadX,
            padding: chrome.bezel,
            borderRadius: chrome.outerRadius,
            visibility: area ? "visible" : "hidden",
          }}
        >
          {isDesktop && <BrowserBar url={url} />}
          {!isDesktop && (
            <span className="pointer-events-none absolute left-1/2 top-[5px] h-1 w-1 -translate-x-1/2 rounded-full bg-white/25" />
          )}
          <div
            className="relative shrink-0 overflow-hidden bg-white"
            style={{ width: screenWidth, height: screenHeight, borderRadius: chrome.screenRadius }}
          >
            <iframe
              ref={setFrame}
              title={`${viewport.label} preview of your client page`}
              srcDoc={BLANK_DOC}
              className="block border-0 bg-white"
              style={{
                width: viewport.width,
                height: viewport.height,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        </div>
        <p className="shrink-0 text-[11px] tabular-nums text-black/35">
          {viewport.label} · {viewport.width} × {viewport.height} · {Math.round(scale * 100)}%
        </p>
      </div>
      {mount && createPortal(children, mount)}
    </div>
  );
}

function BrowserBar({ url }: { url: string }) {
  return (
    <div className="flex h-[38px] shrink-0 items-center gap-3 border-b border-black/[0.06] bg-[#f6f7f8] px-3.5">
      <div className="flex shrink-0 gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex h-[22px] min-w-0 flex-1 items-center gap-1.5 rounded-md border border-black/[0.06] bg-white px-2.5">
        <Lock className="h-2.5 w-2.5 shrink-0 text-black/35" />
        <span className="truncate text-[11px] text-black/45">{url}</span>
      </div>
    </div>
  );
}
