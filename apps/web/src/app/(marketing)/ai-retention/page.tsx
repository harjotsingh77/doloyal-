import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/marketing/components/feature-page";
import { buildMetadata } from "@/marketing/lib/seo";
import { getFeature } from "@/marketing/data/features";

const feature = getFeature("ai-retention")!;

export const metadata: Metadata = buildMetadata({
  title: feature.name,
  description: feature.intro,
  path: `/ai-retention`,
});

export default function AIPage() {
  return <FeaturePageTemplate slug="ai-retention" />;
}