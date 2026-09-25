import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import Script from "next/script";
import { site } from "@/marketing/lib/site";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
  alternates: { canonical: site.url },
  openGraph: {
    type: "website",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [{ url: `${site.url}/og.png`, width: 1200, height: 630, alt: site.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [`${site.url}/og.png`],
  },
  icons: {
    icon: "/logo-symbol.png",
    shortcut: "/logo-symbol.png",
    apple: "/logo-symbol.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`light ${inter.variable}`}>
      <head>
        {/* CookieHub Consent Banner */}
        <Script
          src="https://cdn.cookiehub.eu/c2/845e0a11.js"
          strategy="lazyOnload"
        />
        <Script id="cookiehub-init" strategy="lazyOnload">
          {`
            function hideCookiehubIcon() {
              try {
                if (window.__cookiehub && window.__cookiehub.core && window.__cookiehub.core.closeIcon) {
                  window.__cookiehub.core.closeIcon();
                }
              } catch (e) {}
              var icons = document.querySelectorAll(".ch2-icon");
              for (var i = 0; i < icons.length; i++) {
                icons[i].style.setProperty("display", "none", "important");
              }
            }
            function startCookiehub() {
              var cpm = {
                onInitialise: function () {
                  if (this.hasAnswered && this.hasAnswered()) hideCookiehubIcon();
                },
                onStatusChange: function () {
                  hideCookiehubIcon();
                },
              };
              if (window.cookiehub) window.cookiehub.load(cpm);
            }
            if (document.readyState === "loading") {
              document.addEventListener("DOMContentLoaded", startCookiehub);
            } else {
              startCookiehub();
            }
          `}
        </Script>

        {/* Google Analytics (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-CHEX55XDZD"
          strategy="lazyOnload"
        />
        <Script id="google-analytics" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CHEX55XDZD');
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-[rgb(var(--color-background))] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
