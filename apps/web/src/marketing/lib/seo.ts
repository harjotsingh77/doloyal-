import type { Metadata } from "next";
import { site } from "./site";

interface PageSeo {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  publishedTime?: string;
  robots?: Metadata["robots"];
}

export function buildMetadata({
  title,
  description = site.description,
  path = "/",
  type = "website",
  publishedTime,
  robots,
}: PageSeo): Metadata {
  const url = `${site.url}${path}`;
  const fullTitle = title ? `${title} · ${site.name}` : `${site.name} — ${site.tagline}`;
  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: site.name,
      type,
      images: [{ url: site.ogImage, width: 1200, height: 630, alt: site.name }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [site.ogImage],
    },
    icons: {
      icon: "/logo-symbol.png",
      shortcut: "/logo-symbol.png",
      apple: "/logo-symbol.png",
    },
    robots: robots ?? {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true },
    },
  };
}