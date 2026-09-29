import type { MetadataRoute } from "next";
import { site } from "@/marketing/lib/site";
import { INDUSTRY_SLUGS } from "@/marketing/data/industries";
import { FEATURES } from "@/marketing/data/features";
import { BLOG_POSTS } from "@/marketing/data/blog";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/features",
    "/integrations",
    "/solutions",
    "/resources",
    "/blog",
    "/docs",
    "/api",
    "/help",
    "/about",
    "/contact",
    "/book-demo",
    "/affiliate",
    "/partner",
    "/roadmap",
    "/privacy",
    "/privacy-policy",
    "/data-deletion",
    "/terms",
    "/terms-and-conditions",
    "/terms-of-service",
    "/cookies",
    "/refund",
    "/security",
    ...FEATURES.map((f) => `/${f.slug}`),
    ...INDUSTRY_SLUGS.map((s) => `/solutions/${s}`),
    ...BLOG_POSTS.map((p) => `/blog/${p.slug}`),
  ];

  return staticPaths.map((path) => ({
    url: `${site.url}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/solutions") || path.startsWith("/blog") ? 0.8 : 0.6,
  }));
}