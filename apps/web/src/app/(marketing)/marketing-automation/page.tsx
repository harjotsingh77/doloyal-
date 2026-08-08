import type { Metadata } from "next";
import { FeaturePageTemplate } from "@/marketing/components/feature-page";
import { buildMetadata } from "@/marketing/lib/seo";
import { getFeature } from "@/marketing/data/features";

const feature = getFeature("marketing-automation")!;

export const metadata: Metadata = buildMetadata({
  title: feature.name,
  description: feature.intro,
  path: `/marketing-automation`,
});

export default function MarketingAutomationPage() {
  return <FeaturePageTemplate slug="marketing-automation" />;
}