import type { Metadata } from "next";
import { Sparkles, ShieldCheck } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy | Doloyal",
  description: "Learn how Doloyal collects, protects, and uses customer data.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="overflow-hidden bg-[#FCFBFA] font-[family-name:var(--font-sora)] text-[#282628]">
      {/* Hero Section */}
      <section className="relative pt-36 pb-16 sm:pt-44 sm:pb-20">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-1.5 text-[13px] font-semibold text-[#2563EB]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Legal</span>
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-[#282628] sm:text-6xl max-w-3xl mx-auto">
            Privacy Policy
          </h1>

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Last Updated: {currentDate}
          </p>
        </div>
      </section>

      {/* Policy Content */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="rounded-3xl border border-black/5 bg-white p-8 sm:p-12 shadow-sm space-y-8 text-gray-700 leading-relaxed text-base">
            
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-800 font-medium">
              <strong>Legal Disclaimer:</strong> This privacy policy document is provided for operational reference and should be reviewed by appropriate legal counsel prior to formal production use.
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">1. Introduction</h2>
              <p>
                At Doloyal, we respect your privacy and are committed to protecting your personal data and the data of your customers. This Privacy Policy explains how we collect, use, store, and safeguard information when you use the Doloyal customer retention platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">2. Information We Collect</h2>
              <p>We collect information required to operate and provide our services effectively:</p>
              <ul className="mt-2 space-y-2 list-disc list-inside text-sm">
                <li><strong>Account Information:</strong> Name, business name, phone number, email address, and login credentials.</li>
                <li><strong>Customer Data:</strong> Customer contact details, visit history, booking records, and loyalty points imported or generated through the platform.</li>
                <li><strong>Payment Information:</strong> Billing records, subscription plan choices, and payment confirmations via authorized payment gateways.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">3. How We Use Information</h2>
              <p>We use your information exclusively to power Doloyal services:</p>
              <ul className="mt-2 space-y-2 list-disc list-inside text-sm">
                <li>To deliver customer retention, loyalty, appointment booking, and campaign tools.</li>
                <li>To calculate AI-assisted retention insights and customer risk scores.</li>
                <li>To send transaction receipts, appointment reminders, and platform updates.</li>
                <li>To maintain system security, detect fraud, and ensure 99.9% platform availability.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">4. Customer Data Ownership</h2>
              <p>
                Your customer data belongs entirely to your business. Doloyal acts strictly as a data processor. We do not sell, rent, or monetize your customer database or use it for third-party advertising.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">5. Cookies & Analytics</h2>
              <p>
                We use essential cookies and minimal session telemetry to keep you logged in, save your workspace settings, and analyze website performance to fix bugs.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">6. Data Security & Retention</h2>
              <p>
                All data transmitted to and from Doloyal is encrypted using industry-standard TLS 1.2+ encryption. Data at rest is encrypted in secure databases. Accounts can request data export or permanent deletion at any time.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">7. User Rights & Account Deletion</h2>
              <p>
                You retain the right to access, edit, export, or permanently delete your account and associated customer records. To request account deletion, contact hello@doloyal.com.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">8. Contact Information</h2>
              <p>
                If you have any questions regarding this Privacy Policy, please contact our team at:
              </p>
              <p className="mt-2 font-bold text-[#2563EB]">hello@doloyal.com</p>
            </div>

          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
