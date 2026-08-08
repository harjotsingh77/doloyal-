import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IndustryPageTemplate } from "@/marketing/components/industry-page";
import { INDUSTRIES, INDUSTRY_SLUGS, getIndustry } from "@/marketing/data/industries";
import { buildMetadata } from "@/marketing/lib/seo";

export function generateStaticParams() {
  return INDUSTRY_SLUGS.map((slug) => ({ industry: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { industry: string };
}): Promise<Metadata> {
  const industry = getIndustry(params.industry);
  if (!industry) return {};
  return buildMetadata({
    title: `${industry.name} retention software`,
    description: industry.intro,
    path: `/solutions/${industry.slug}`,
  });
}

export default function IndustryPage({ params }: { params: { industry: string } }) {
  const industry = getIndustry(params.industry);
  if (!industry) notFound();
  return <IndustryPageTemplate slug={industry.slug} />;
}