import type { MetadataRoute } from "next";
import { site } from "@/marketing/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/onboarding", "/sign-in", "/forgot-password"] }],
    sitemap: `${site.url}/sitemap.xml`,
  };
}