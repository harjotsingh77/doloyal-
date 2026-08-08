import type { Metadata } from "next";
import { Instrument_Serif, Sora } from "next/font/google";
import { SiteFooter } from "../../../web/src/marketing/components/footer";
import { SiteHeader } from "../../../web/src/marketing/components/header";
import { WaitlistProvider } from "../../../web/src/marketing/components/waitlist-modal";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "DoLoyal — Turn First-Time Visitors Into Loyal Customers",
  description: "Everything local businesses need to manage customers, boost repeat visits, and grow.",
};

export default function LandingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${instrument.variable} ${sora.variable}`}>
      <body className="bg-[#FAFAFC] font-[family-name:var(--font-sora)]">
        <WaitlistProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </WaitlistProvider>
      </body>
    </html>
  );
}
