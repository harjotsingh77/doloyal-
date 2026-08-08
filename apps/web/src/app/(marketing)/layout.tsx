import type { Metadata } from "next";
import { Instrument_Serif, Sora } from "next/font/google";
import { SiteHeader } from "@/marketing/components/header";
import { SiteFooter } from "@/marketing/components/footer";
import { WaitlistProvider } from "@/marketing/components/waitlist-modal";
import { site } from "@/marketing/lib/site";
import { buildMetadata } from "@/marketing/lib/seo";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = buildMetadata({});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <WaitlistProvider>
      <SiteHeader />
      <main className={`${instrument.variable} ${sora.variable} font-[family-name:var(--font-sora)]`}>
        {children}
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.legalName,
            url: site.url,
            logo: `${site.url}${site.logo}`,
            description: site.description,
            email: site.email,
            sameAs: Object.values(site.social),
          }),
        }}
      />
    </WaitlistProvider>
  );
}