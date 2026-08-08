import type { Metadata } from "next";
import { LegalPage } from "@/marketing/components/legal";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Security",
  description:
    "How Doloyal protects your data — encryption, access controls, audit logs, compliance, and our responsible disclosure program.",
  path: "/security",
});

export default function SecurityPage() {
  return (
    <LegalPage
      eyebrow="Security"
      title="Security is the product"
      updated="July 20, 2026"
      sections={[
        {
          h: "Encryption",
          p: "All data is encrypted in transit with TLS 1.2+ and at rest with AES-256. Customer payment details are handled by PCI-DSS-compliant processors (Stripe & Razorpay) — we never store raw card numbers.",
        },
        {
          h: "Access & authentication",
          ul: [
            "Role-based access control across staff, branches, and plans",
            "Optional multi-factor authentication on every account",
            "Scoped API keys with rotation and instant revocation",
            "Session management and activity logs you can review",
          ],
        },
        {
          h: "Data protection practices",
          ul: [
            "Customer data remains your property — never sold, never used for ad targeting",
            "The AI retention engine operates only on your business data",
            "Automated backups with verified restore processes",
            "Right to export or delete your data at any time",
          ],
        },
        {
          h: "Monitoring & incidents",
          p: "We monitor infrastructure 24×7 with intrusion detection and anomaly alerts. In the unlikely event of a data incident, affected customers are notified within 72 hours, with the details we know and the steps we're taking.",
        },
        {
          h: "Responsible disclosure",
          p: "Found a vulnerability? Report it to security@doloyal.ai. We investigate every report, fix issues in priority order, and welcome the security community's help in keeping local businesses safe.",
        },
      ]}
    />
  );
}