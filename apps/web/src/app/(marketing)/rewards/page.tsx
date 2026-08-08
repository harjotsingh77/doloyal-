import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/marketing/components/feature-page";
import { buildMetadata } from "@/marketing/lib/seo";
import { getFeature } from "@/marketing/data/features";

const feature = getFeature("rewards")!;

export const metadata: Metadata = buildMetadata({
  title: feature.name,
  description: feature.intro,
  path: `/rewards`,
});

export default function RewardsPage() {
  return <FeaturePageTemplate slug="rewards" />;
}