import type { Metadata } from "next";
import { LegalPage } from "@/marketing/components/legal";
import { buildMetadata } from "@/marketing/lib/seo";
import { CookieSettingsButton } from "@/components/cookie-settings-button";

export const metadata: Metadata = buildMetadata({
  title: "Cookie Policy",
  description: "How Doloyal uses cookies and similar technologies.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalPage
      eyebrow="Cookie Policy"
      title="Cookies, explained simply"
      updated="July 20, 2026"
      sections={[
        {
          h: "What are cookies?",
          p: "Cookies are small text files stored in your browser that help websites remember you. We use cookies, plus localStorage and similar technologies, to make Doloyal work and to measure how the site performs.",
        },
        {
          h: "The cookies we use",
          ul: [
            "Essential — required for signing in, security, and core functionality",
            "Preferences — remember your language, theme, and saved settings",
            "Analytics — anonymous, aggregated data on how the site is used (with your consent)",
          ],
        },
        {
          h: "Your choices",
          p: "After you accept or deny once, the floating cookie badge is hidden. You can change your choice anytime with Cookie settings below, or in your browser. Essential cookies can't be turned off without breaking the product.",
        },
        {
          h: "Third parties",
          p: "We use a small number of trusted providers for payments, analytics, and media delivery. Each operates under its own privacy policy and data-processing terms.",
        },
        {
          h: "Contact",
          p: "Questions about cookies? Email hello@doloyal.com.",
        },
      ]}
    >
      <CookieSettingsButton className="rounded-full border border-[rgb(var(--color-border))] bg-white px-4 py-2 text-sm font-semibold text-[rgb(var(--color-foreground))] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
        Cookie settings
      </CookieSettingsButton>
    </LegalPage>
  );
}