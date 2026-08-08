import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/marketing/components/feature-page";
import { buildMetadata } from "@/marketing/lib/seo";
import { getFeature } from "@/marketing/data/features";

const feature = getFeature("website-builder")!;

export const metadata: Metadata = buildMetadata({
  title: feature.name,
  description: feature.intro,
  path: `/website-builder`,
});

export default function WebsiteBuilderPage() {
  return <FeaturePageTemplate slug="website-builder" />;
}