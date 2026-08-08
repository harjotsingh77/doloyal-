import type { Metadata } from "next";
import { LegalPage } from "@/marketing/components/legal";
import { buildMetadata } from "@/marketing/lib/seo";

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
          p: "You can disable non-essential cookies anytime in your browser settings. Essential cookies can't be turned off without breaking the product. Some features (like one-click sign-in) rely on them.",
        },
        {
          h: "Third parties",
          p: "We use a small number of trusted providers for payments, analytics, and media delivery. Each operates under its own privacy policy and data-processing terms.",
        },
        {
          h: "Contact",
          p: "Questions about cookies? Email privacy@doloyal.ai.",
        },
      ]}
    />
  );
}