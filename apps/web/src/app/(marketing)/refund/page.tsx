import type { Metadata } from "next";
import { LegalPage } from "@/marketing/components/legal";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Refund Policy",
  description: "Doloyal's refund policy for subscriptions and add-ons.",
  path: "/refund",
});

export default function RefundPage() {
  return (
    <LegalPage
      eyebrow="Refund Policy"
      title="Fair refunds, no fine print"
      updated="July 20, 2026"
      sections={[
        {
          h: "Free trial",
          p: "Every new business gets a 14-day free trial with all features, no credit card required. You'll never be charged unless you explicitly choose a paid plan.",
        },
        {
          h: "14-day money-back guarantee",
          p: "Not a fit? Within 14 days of your first paid payment, we'll refund it in full — no questions, no forms.",
        },
        {
          h: "Monthly plans",
          p: "Cancel anytime and keep access until the end of your current billing period. Unused time isn't charged or billed — you simply don't get billed again.",
        },
        {
          h: "Yearly plans",
          p: "If you cancel a yearly plan within 30 days of renewal, we'll refund the unused months pro-rata. This doesn't apply to abandoned or delinquent accounts.",
        },
        {
          h: "Chargebacks & disputes",
          p: "A chargeback before contacting us delays refunds and can suspend service. Please reach out first — most issues are solved instantly.",
        },
        {
          h: "How to request",
          p: "Email billing@doloyal.ai with your account email. Refunds are processed to the original payment method within 5–7 business days.",
        },
      ]}
    />
  );
}