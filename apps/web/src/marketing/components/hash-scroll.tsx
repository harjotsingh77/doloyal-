"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  const headerOffset = 80;
  const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - headerOffset);
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
  window.scrollTo(0, top);
  return true;
}

function scrollToHash() {
  const id = window.location.hash.replace("#", "");
  if (!id) return;
  scrollToId(id);
}

export function goToHash(href: string, event?: React.MouseEvent<HTMLAnchorElement>) {
  if (!href.includes("#")) return;
  const id = href.split("#")[1];
  if (!id || typeof window === "undefined") return;
  if (window.location.pathname !== "/") return;
  event?.preventDefault();
  window.history.pushState(null, "", `/#${id}`);
  scrollToId(id);
}

/** Next.js client navigations to `/#section` often skip native hash scrolling. */
export function HashScroll() {
  const pathname = usePathname();

  React.useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    scrollToHash();
    const t1 = window.setTimeout(scrollToHash, 120);
    const t2 = window.setTimeout(scrollToHash, 400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname]);

  React.useEffect(() => {
    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor) return;
      const raw = anchor.getAttribute("href") || "";
      if (!raw.includes("#")) return;
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      const id = url.hash.replace("#", "");
      if (!id) return;
      const targetPath = url.pathname || "/";
      if (targetPath !== window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      window.history.pushState(null, "", `${targetPath}${url.hash}`);
      scrollToId(id);
      window.setTimeout(() => scrollToId(id), 50);
      window.setTimeout(() => scrollToId(id), 200);
    }

    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", scrollToHash);
    window.addEventListener("popstate", scrollToHash);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", scrollToHash);
      window.removeEventListener("popstate", scrollToHash);
    };
  }, []);

  return null;
}
