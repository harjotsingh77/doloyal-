import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { FinalCta } from "@/marketing/landing/FinalCta";
import { buildMetadata } from "@/marketing/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms and Conditions | Doloyal",
  description: "Terms and conditions governing the use of the Doloyal platform.",
  path: "/terms-and-conditions",
});

export default function TermsPage() {
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
            Terms and Conditions
          </h1>

          <p className="mt-4 text-sm font-semibold text-gray-500">
            Last Updated: {currentDate}
          </p>
        </div>
      </section>

      {/* Terms Content */}
      <section className="pb-24 sm:pb-32">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="rounded-3xl border border-black/5 bg-white p-8 sm:p-12 shadow-sm space-y-8 text-gray-700 leading-relaxed text-base">
            
            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">1. Introduction</h2>
              <p>
                Welcome to Doloyal. By registering for or using our customer retention platform, website, or services, you agree to be bound by these Terms and Conditions.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">2. Account Registration</h2>
              <p>
                You must provide accurate business information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities occurring under your account.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">3. Use of Service & Business Responsibilities</h2>
              <p>
                Doloyal grants you a non-exclusive, non-transferable right to access and use the platform for your internal business operations. You agree not to misuse the platform, attempt unauthorized access, or send spam to customers.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">4. Customer Data & Privacy</h2>
              <p>
                You maintain ownership of all customer data uploaded or collected through your Doloyal account. You warrant that you have obtained necessary consent from your customers to send communications via SMS, Email, or WhatsApp.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">5. Subscriptions, Payments & Free Trial</h2>
              <p>
                Doloyal offers free trial access as specified upon registration. Following the trial, continued access requires an active subscription plan (Starter, Growth, Professional, or Enterprise). Subscriptions renew automatically unless cancelled.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">6. Cancellation & Account Suspension</h2>
              <p>
                You may cancel your subscription at any time via your account settings. Doloyal reserves the right to suspend or terminate accounts that violate our acceptable use policy or fail to pay subscription fees.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">7. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Doloyal shall not be liable for indirect, incidental, or consequential damages arising from the use or inability to use the platform.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#282628] mb-3">8. Changes to Terms & Contact</h2>
              <p>
                We may update these terms from time to time. Continued use of Doloyal after updates constitutes acceptance of the new terms. If you have questions regarding these terms, reach out to hello@doloyal.com.
              </p>
            </div>

          </div>
        </div>
      </section>

      <FinalCta />
    </div>
  );
}
