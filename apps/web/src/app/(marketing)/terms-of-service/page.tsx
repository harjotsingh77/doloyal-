import type { Metadata } from "next";
import { LegalDocument, type LegalTocItem } from "@/marketing/components/legal-document";
import {
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "@/marketing/components/legal-blocks";
import { buildMetadata } from "@/marketing/lib/seo";

const TITLE = "Terms of Service";
const DESCRIPTION =
  "These Terms of Service govern your access to and use of the Doloyal website, application, platform, Client Pages, APIs, integrations, and related services.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/terms-of-service",
  }),
  alternates: {
    canonical: "https://doloyal.com/terms-of-service",
  },
};

const TOC: LegalTocItem[] = [
  { id: "about-doloyal", label: "1. About Doloyal" },
  { id: "eligibility", label: "2. Eligibility" },
  { id: "your-account", label: "3. Your Account" },
  { id: "business-and-customer-accounts", label: "4. Business Accounts and Customer Accounts" },
  { id: "use-of-the-services", label: "5. Use of the Services" },
  { id: "business-responsibilities", label: "6. Business Responsibilities" },
  { id: "customer-data", label: "7. Customer Data" },
  { id: "client-pages", label: "8. Client Pages" },
  { id: "bookings-and-appointments", label: "9. Bookings and Appointments" },
  { id: "loyalty-rewards-and-memberships", label: "10. Loyalty, Rewards, and Memberships" },
  { id: "reviews", label: "11. Reviews" },
  { id: "marketing-and-communications", label: "12. Marketing and Communications" },
  { id: "integrations-and-third-party-services", label: "13. Integrations and Third-Party Services" },
  { id: "payments-and-subscriptions", label: "14. Payments and Subscriptions" },
  { id: "free-trials", label: "15. Free Trials" },
  { id: "refunds-and-cancellation", label: "16. Refunds and Cancellation" },
  { id: "ai-features", label: "17. AI Features" },
  { id: "workflows-and-automation", label: "18. Workflows and Automation" },
  { id: "user-content", label: "19. User Content" },
  { id: "intellectual-property", label: "20. Intellectual Property" },
  { id: "feedback", label: "21. Feedback" },
  { id: "service-availability", label: "22. Service Availability" },
  { id: "third-party-outages", label: "23. Third-Party Outages" },
  { id: "account-suspension-and-termination", label: "24. Account Suspension and Termination" },
  { id: "effect-of-termination", label: "25. Effect of Termination" },
  { id: "data-export-and-deletion", label: "26. Data Export and Deletion" },
  { id: "security", label: "27. Security" },
  { id: "disclaimers", label: "28. Disclaimers" },
  { id: "limitation-of-liability", label: "29. Limitation of Liability" },
  { id: "indemnification", label: "30. Indemnification" },
  { id: "changes-to-the-services", label: "31. Changes to the Services" },
  { id: "changes-to-these-terms", label: "32. Changes to These Terms" },
  { id: "governing-law", label: "33. Governing Law and Dispute Resolution" },
  { id: "severability", label: "34. Severability" },
  { id: "no-waiver", label: "35. No Waiver" },
  { id: "entire-agreement", label: "36. Entire Agreement" },
  { id: "contact-us", label: "37. Contact Us" },
];

export default function TermsOfServicePage() {
  return (
    <LegalDocument
      title={TITLE}
      effectiveDate="September 14, 2026"
      lastUpdated="September 14, 2026"
      toc={TOC}
      intro={
        <>
          <LegalParagraph>
            Welcome to Doloyal. These Terms of Service (“Terms”) govern your access to and use of the Doloyal website, application, platform, Client Pages, APIs, integrations, and related services (collectively, the “Services”).
          </LegalParagraph>
          <LegalParagraph>
            By creating an account, accessing, or using the Services, you agree to be bound by these Terms. If you do not agree to these Terms, you must not use the Services.
          </LegalParagraph>
        </>
      }
    >
      <LegalSection id="about-doloyal" title="1. About Doloyal">
        <LegalParagraph>
          Doloyal is a software-as-a-service (“SaaS”) platform designed to help businesses manage customer relationships, bookings, loyalty, rewards, memberships, marketing, customer retention, reviews, workflows, analytics, AI-powered tools, Client Pages, and related business activities.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal provides software and infrastructure. Doloyal does not operate, manage, or take responsibility for the underlying business activities of businesses using the Services.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="eligibility" title="2. Eligibility">
        <LegalParagraph>
          You must be legally capable of entering into a binding agreement to use the Services.
        </LegalParagraph>
        <LegalParagraph>
          If you use Doloyal on behalf of a business or organization, you represent that you have authority to accept these Terms on behalf of that business or organization.
        </LegalParagraph>
        <LegalParagraph>
          You may not use the Services if you are prohibited from doing so under applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="your-account" title="3. Your Account">
        <LegalParagraph>Certain features require you to create an account.</LegalParagraph>
        <LegalParagraph>You agree to:</LegalParagraph>
        <LegalList
          items={[
            "Provide accurate and current information.",
            "Keep your account information updated.",
            "Maintain the confidentiality of your login credentials.",
            "Use your account only for lawful purposes.",
            "Notify Doloyal if you believe your account has been compromised.",
            "Be responsible for activity occurring through your account.",
          ]}
        />
        <LegalParagraph>
          You must not share account credentials in a manner that compromises account security or violates these Terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="business-and-customer-accounts" title="4. Business Accounts and Customer Accounts">
        <LegalParagraph>Doloyal may provide different account experiences for:</LegalParagraph>
        <LegalList
          items={[
            "Business Users, including owners, administrators, staff, and other authorized business representatives.",
            "Customers, including individuals who interact with a business through a Doloyal-powered Client Page or related customer-facing functionality.",
          ]}
        />
        <LegalParagraph>
          Business Users are responsible for managing their business accounts, users, permissions, customer information, content, and configurations appropriately.
        </LegalParagraph>
        <LegalParagraph>
          Customers are responsible for information they provide through customer-facing features.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="use-of-the-services" title="5. Use of the Services">
        <LegalParagraph>
          Subject to these Terms, Doloyal grants you a limited, non-exclusive, non-transferable, and revocable right to access and use the Services for their intended purposes.
        </LegalParagraph>
        <LegalParagraph>You may not use the Services to:</LegalParagraph>
        <LegalList
          items={[
            "Violate applicable laws or regulations.",
            "Infringe intellectual property or privacy rights.",
            "Attempt to gain unauthorized access to accounts, systems, or data.",
            "Interfere with or disrupt the Services.",
            "Introduce malware or other harmful code.",
            "Scrape or collect information in an unauthorized manner.",
            "Circumvent security or usage restrictions.",
            "Abuse APIs, integrations, messaging systems, or automation features.",
            "Use the Services for fraudulent, deceptive, or harmful activities.",
          ]}
        />
        <LegalParagraph>
          We may take appropriate action where we reasonably believe the Services are being misused.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="business-responsibilities" title="6. Business Responsibilities">
        <LegalParagraph>Business Users are responsible for:</LegalParagraph>
        <LegalList
          items={[
            "Information entered into Doloyal.",
            "Their customer relationships.",
            "Customer communications.",
            "Services, prices, offers, and policies displayed through Client Pages.",
            "Obtaining appropriate permissions and consents.",
            "Ensuring their use of messaging, email, reviews, marketing, and automation features complies with applicable law and platform rules.",
            "Configuring account permissions appropriately.",
            "Protecting customer information.",
            "Reviewing automated and AI-generated outputs before taking important actions.",
          ]}
        />
        <LegalParagraph>
          Doloyal does not independently verify every piece of information submitted by a Business User.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="customer-data" title="7. Customer Data">
        <LegalParagraph>
          Businesses may use Doloyal to store and manage information about their customers.
        </LegalParagraph>
        <LegalParagraph>
          Business Users are responsible for ensuring that they have the appropriate legal basis, notices, permissions, and consents required to collect, use, store, and communicate with customer information.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal processes customer information in accordance with its{" "}
          <LegalLink href="/privacy-policy">Privacy Policy</LegalLink> and applicable agreements with Business Users.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="client-pages" title="8. Client Pages">
        <LegalParagraph>
          Doloyal may allow Business Users to create and publish customer-facing pages (“Client Pages”).
        </LegalParagraph>
        <LegalParagraph>Client Pages may include:</LegalParagraph>
        <LegalList
          items={[
            "Business information",
            "Services",
            "Booking functionality",
            "Customer accounts",
            "Loyalty",
            "Rewards",
            "Memberships",
            "Referrals",
            "Reviews",
            "Offers",
            "Other customer-facing features",
          ]}
        />
        <LegalParagraph>
          Business Users are responsible for the content and configuration of their Client Pages.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal is not responsible for inaccurate, misleading, unlawful, or otherwise problematic business content published through a Client Page.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="bookings-and-appointments" title="9. Bookings and Appointments">
        <LegalParagraph>Doloyal may provide booking and appointment functionality.</LegalParagraph>
        <LegalParagraph>
          Doloyal provides the software used to facilitate bookings but does not guarantee that a business will:
        </LegalParagraph>
        <LegalList
          items={[
            "Accept a booking",
            "Provide a particular service",
            "Be available at a particular time",
            "Honor a particular price or offer",
          ]}
        />
        <LegalParagraph>
          The agreement for the actual service is between the customer and the relevant business.
        </LegalParagraph>
        <LegalParagraph>
          Businesses are responsible for managing availability, cancellations, rescheduling, pricing, and customer communication.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="loyalty-rewards-and-memberships" title="10. Loyalty, Rewards, and Memberships">
        <LegalParagraph>
          Doloyal may provide tools for businesses to operate loyalty programs, rewards programs, memberships, referrals, and similar customer engagement programs.
        </LegalParagraph>
        <LegalParagraph>Business Users are responsible for:</LegalParagraph>
        <LegalList
          items={[
            "Program rules",
            "Eligibility",
            "Reward values",
            "Expiration dates",
            "Membership terms",
            "Redemption rules",
            "Customer communications",
          ]}
        />
        <LegalParagraph>
          Doloyal does not guarantee that a particular loyalty or rewards program will generate a specific amount of revenue or customer activity.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="reviews" title="11. Reviews">
        <LegalParagraph>
          Doloyal may allow customers to submit reviews and businesses to manage or display reviews.
        </LegalParagraph>
        <LegalParagraph>
          Business Users must not manipulate reviews, create fraudulent reviews, or use the review system in violation of applicable law or third-party platform rules.
        </LegalParagraph>
        <LegalParagraph>
          Where reviews are imported from third-party services, their availability and display may depend on those services.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="marketing-and-communications" title="12. Marketing and Communications">
        <LegalParagraph>
          Doloyal may provide tools for email, WhatsApp, SMS, notifications, campaigns, and automated communications.
        </LegalParagraph>
        <LegalParagraph>
          Business Users are solely responsible for ensuring that messages sent using Doloyal comply with applicable laws, consent requirements, platform policies, and recipient preferences.
        </LegalParagraph>
        <LegalParagraph>
          Businesses must not use Doloyal to send unlawful, deceptive, abusive, unsolicited, or prohibited communications.
        </LegalParagraph>
        <LegalParagraph>
          Third-party communication providers may impose additional restrictions, limits, fees, approval requirements, or policies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="integrations-and-third-party-services" title="13. Integrations and Third-Party Services">
        <LegalParagraph>
          Doloyal may integrate with third-party services such as payment providers, communication platforms, calendar services, analytics providers, authentication services, and other external platforms.
        </LegalParagraph>
        <LegalParagraph>Examples may include:</LegalParagraph>
        <LegalList
          items={[
            "Google",
            "Google Calendar",
            "Google Business Profile",
            "Stripe",
            "Razorpay",
            "Resend",
            "Meta / WhatsApp",
          ]}
        />
        <LegalParagraph>
          Third-party services are governed by their own terms, policies, and privacy practices.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal does not control third-party services and does not guarantee their availability, accuracy, performance, or continued compatibility.
        </LegalParagraph>
        <LegalParagraph>
          You are responsible for ensuring that you have the necessary authorization to connect a third-party account to Doloyal.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="payments-and-subscriptions" title="14. Payments and Subscriptions">
        <LegalParagraph>Certain Doloyal features require a paid subscription.</LegalParagraph>
        <LegalParagraph>
          Subscription details, including applicable pricing, billing frequency, included features, and limits, will be presented during purchase or within your account.
        </LegalParagraph>
        <LegalParagraph>
          By subscribing, you authorize the applicable payment provider to process charges according to your selected plan.
        </LegalParagraph>
        <LegalParagraph>Unless otherwise stated:</LegalParagraph>
        <LegalList
          items={[
            "Subscriptions may renew automatically.",
            "You are responsible for applicable taxes and charges.",
            "Failed payments may result in restricted or suspended access.",
            "Changes to pricing or plans may be subject to notice as required by law.",
          ]}
        />
        <LegalParagraph>
          Payment information may be processed by third-party payment providers rather than stored directly by Doloyal.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="free-trials" title="15. Free Trials">
        <LegalParagraph>Doloyal may offer free trials or promotional access.</LegalParagraph>
        <LegalParagraph>Trial terms may include:</LegalParagraph>
        <LegalList
          items={[
            "Trial duration",
            "Feature restrictions",
            "Usage limits",
            "Eligibility requirements",
            "Conversion to a paid subscription",
          ]}
        />
        <LegalParagraph>Any applicable trial terms will be presented when the trial is offered.</LegalParagraph>
        <LegalParagraph>
          Doloyal may change, suspend, or discontinue promotional offers where permitted by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="refunds-and-cancellation" title="16. Refunds and Cancellation">
        <LegalParagraph>
          Refunds and cancellation rights are governed by the applicable plan terms, purchase terms, and applicable law.
        </LegalParagraph>
        <LegalParagraph>
          Where a specific refund policy applies, it will be made available through the Services or a{" "}
          <LegalLink href="/refund">linked policy page</LegalLink>.
        </LegalParagraph>
        <LegalParagraph>
          Cancelling a subscription may stop future renewals but does not necessarily entitle you to a refund for amounts already charged.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ai-features" title="17. AI Features">
        <LegalParagraph>Doloyal may provide AI-powered features including:</LegalParagraph>
        <LegalList
          items={[
            "Business insights",
            "Customer-retention analysis",
            "Recommendations",
            "Campaign suggestions",
            "Workflow generation",
            "Automated content",
            "Summaries",
            "Other AI-assisted functionality",
          ]}
        />
        <LegalParagraph>
          AI-generated output may be incomplete, inaccurate, or unsuitable for a particular situation.
        </LegalParagraph>
        <LegalParagraph>
          You are responsible for reviewing AI-generated output before relying on it or using it to make important decisions.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal does not guarantee that AI-generated outputs will be accurate, unique, error-free, or appropriate for every purpose.
        </LegalParagraph>
        <LegalParagraph>
          AI features should not be relied upon as a substitute for professional legal, financial, medical, or other regulated advice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="workflows-and-automation" title="18. Workflows and Automation">
        <LegalParagraph>
          Doloyal may allow users to create automated workflows that perform actions based on triggers or conditions.
        </LegalParagraph>
        <LegalParagraph>Business Users are responsible for:</LegalParagraph>
        <LegalList
          items={[
            "Workflow configuration",
            "Trigger conditions",
            "Recipient selection",
            "Message content",
            "Timing",
            "Resulting actions",
          ]}
        />
        <LegalParagraph>You should review workflows before activating them.</LegalParagraph>
        <LegalParagraph>
          Doloyal does not guarantee that third-party systems will always execute an automated action successfully.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="user-content" title="19. User Content">
        <LegalParagraph>You may submit or upload content through the Services, including:</LegalParagraph>
        <LegalList
          items={[
            "Business information",
            "Logos",
            "Images",
            "Reviews",
            "Descriptions",
            "Marketing materials",
            "Messages",
            "Other content",
          ]}
        />
        <LegalParagraph>
          You retain your rights in your content, subject to the rights necessary for Doloyal to operate the Services.
        </LegalParagraph>
        <LegalParagraph>
          You represent that you have the necessary rights and permissions to submit that content.
        </LegalParagraph>
        <LegalParagraph>
          You must not upload unlawful, infringing, malicious, misleading, or unauthorized content.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="intellectual-property" title="20. Intellectual Property">
        <LegalParagraph>
          The Services, including Doloyal&apos;s software, branding, design, interfaces, documentation, technology, and underlying systems, are owned by or licensed to Doloyal and are protected by applicable intellectual property laws.
        </LegalParagraph>
        <LegalParagraph>Except as expressly permitted by these Terms, you may not:</LegalParagraph>
        <LegalList
          items={[
            "Copy",
            "Modify",
            "Reverse engineer",
            "Disassemble",
            "Reproduce",
            "Redistribute",
            "Sell",
            "Lease",
            "Create derivative works from",
            "Attempt to extract source code from",
          ]}
        />
        <LegalParagraph>Doloyal&apos;s Services or intellectual property.</LegalParagraph>
      </LegalSection>

      <LegalSection id="feedback" title="21. Feedback">
        <LegalParagraph>
          If you provide suggestions, ideas, feature requests, or other feedback regarding Doloyal, you agree that Doloyal may use that feedback to improve or develop its Services without obligation to compensate you, subject to applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="service-availability" title="22. Service Availability">
        <LegalParagraph>
          We aim to provide reliable Services, but we do not guarantee that the Services will always be:
        </LegalParagraph>
        <LegalList
          items={[
            "Available",
            "Uninterrupted",
            "Error-free",
            "Secure",
            "Free from bugs",
            "Compatible with every device or third-party service",
          ]}
        />
        <LegalParagraph>
          The Services may occasionally be unavailable due to maintenance, updates, technical issues, third-party outages, or circumstances beyond our reasonable control.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third-party-outages" title="23. Third-Party Outages">
        <LegalParagraph>Doloyal may depend on third-party services.</LegalParagraph>
        <LegalParagraph>
          If a third-party provider experiences an outage, limitation, policy change, API change, account restriction, or other failure, some Doloyal features may become unavailable or behave differently.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal is not responsible for failures caused by third-party providers beyond its reasonable control.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="account-suspension-and-termination" title="24. Account Suspension and Termination">
        <LegalParagraph>
          We may suspend, restrict, or terminate access to the Services if reasonably necessary to:
        </LegalParagraph>
        <LegalList
          items={[
            "Prevent abuse or fraud",
            "Address security risks",
            "Protect users",
            "Comply with law",
            "Enforce these Terms",
            "Protect Doloyal&apos;s systems or intellectual property",
            "Respond to misuse of third-party integrations",
          ]}
        />
        <LegalParagraph>You may stop using the Services at any time.</LegalParagraph>
        <LegalParagraph>
          Termination does not automatically eliminate obligations that by their nature should continue after termination.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="effect-of-termination" title="25. Effect of Termination">
        <LegalParagraph>Following termination:</LegalParagraph>
        <LegalList
          items={[
            "Access to the Services may be disabled.",
            "Active subscriptions may be cancelled according to the applicable terms.",
            "Certain information may be retained where legally or operationally necessary.",
            "Business or customer data may be deleted or handled according to the applicable data-retention and deletion policies.",
          ]}
        />
        <LegalParagraph>
          For additional information, see the <LegalLink href="/privacy-policy">Privacy Policy</LegalLink> and{" "}
          <LegalLink href="/privacy-policy#data-deletion">Data Deletion Policy</LegalLink>.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="data-export-and-deletion" title="26. Data Export and Deletion">
        <LegalParagraph>
          Where supported, Business Users may export or delete data through available account functionality.
        </LegalParagraph>
        <LegalParagraph>
          You may also request deletion in accordance with our{" "}
          <LegalLink href="/privacy-policy#data-deletion">Data Deletion Policy</LegalLink>.
        </LegalParagraph>
        <LegalParagraph>
          Some information may need to be retained where required by law, necessary for security, fraud prevention, accounting, dispute resolution, or other legitimate purposes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="security" title="27. Security">
        <LegalParagraph>
          You must not attempt to compromise or bypass the security of the Services.
        </LegalParagraph>
        <LegalParagraph>
          We use reasonable technical and organizational measures designed to protect the Services and information processed through them, but no system is completely secure.
        </LegalParagraph>
        <LegalParagraph>
          You are responsible for maintaining reasonable security practices for your account, devices, credentials, and connected third-party services.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="disclaimers" title="28. Disclaimers">
        <LegalParagraph>
          To the maximum extent permitted by applicable law, the Services are provided on an “as available” and “as is” basis.
        </LegalParagraph>
        <LegalParagraph>Doloyal does not guarantee that:</LegalParagraph>
        <LegalList
          items={[
            "The Services will satisfy every business requirement.",
            "Business results or revenue will increase.",
            "Customers will return or engage with a business.",
            "AI recommendations will produce a particular result.",
            "Integrations will remain available indefinitely.",
            "Third-party services will operate without interruption.",
            "All information displayed through third-party integrations will always be accurate or current.",
          ]}
        />
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="29. Limitation of Liability">
        <LegalParagraph>
          To the maximum extent permitted by applicable law, Doloyal and its affiliates, officers, employees, contractors, and service providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, lost revenue, lost data, loss of business opportunities, or similar losses arising from or related to your use of the Services.
        </LegalParagraph>
        <LegalParagraph>
          Any additional limitation, exclusion, or monetary cap will apply to the extent permitted by applicable law.
        </LegalParagraph>
        <LegalParagraph>
          Nothing in these Terms excludes liability that cannot lawfully be excluded or limited.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="indemnification" title="30. Indemnification">
        <LegalParagraph>
          To the extent permitted by applicable law, you agree to defend, indemnify, and hold harmless Doloyal and its affiliates, officers, employees, contractors, and service providers from claims, losses, liabilities, damages, costs, and expenses arising from:
        </LegalParagraph>
        <LegalList
          items={[
            "Your violation of these Terms.",
            "Your unlawful use of the Services.",
            "Your content.",
            "Your business activities.",
            "Your violation of third-party rights.",
            "Your misuse of customer information.",
            "Your use of integrations or communications in violation of applicable laws or platform policies.",
          ]}
        />
      </LegalSection>

      <LegalSection id="changes-to-the-services" title="31. Changes to the Services">
        <LegalParagraph>
          Doloyal may modify, improve, add, remove, or discontinue features from time to time.
        </LegalParagraph>
        <LegalParagraph>We may make changes for reasons including:</LegalParagraph>
        <LegalList
          items={[
            "Product improvements",
            "Security",
            "Technical requirements",
            "Legal requirements",
            "Changes to third-party services",
            "Business or operational considerations",
          ]}
        />
        <LegalParagraph>
          Where required by applicable law, we will provide appropriate notice for material changes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes-to-these-terms" title="32. Changes to These Terms">
        <LegalParagraph>We may update these Terms from time to time.</LegalParagraph>
        <LegalParagraph>
          When we make material changes, we may provide notice through the Services, website, email, or another appropriate method.
        </LegalParagraph>
        <LegalParagraph>The updated Terms will include a new “Last Updated” date.</LegalParagraph>
        <LegalParagraph>
          Your continued use of the Services after the effective date of updated Terms constitutes acceptance of the updated Terms to the extent permitted by applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="governing-law" title="33. Governing Law and Dispute Resolution">
        <LegalParagraph>
          These Terms will be governed by the laws specified in the applicable legal and corporate documentation governing Doloyal, without prejudice to any mandatory rights or protections available to you under the laws that apply to you.
        </LegalParagraph>
        <LegalParagraph>
          Any dispute-resolution procedure, jurisdiction, arbitration provision, or applicable court will be determined according to the final legal terms adopted by Doloyal.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="severability" title="34. Severability">
        <LegalParagraph>
          If any provision of these Terms is found to be invalid, unlawful, or unenforceable, that provision will be interpreted or limited to the minimum extent necessary, and the remaining provisions will continue in effect to the extent permitted by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="no-waiver" title="35. No Waiver">
        <LegalParagraph>
          A failure to enforce any provision of these Terms does not constitute a waiver of our right to enforce that provision later.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="entire-agreement" title="36. Entire Agreement">
        <LegalParagraph>
          These Terms, together with applicable policies and agreements referenced in them, constitute the agreement governing your use of the Services, unless a separate written agreement with Doloyal expressly applies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact-us" title="37. Contact Us">
        <LegalParagraph>For questions about these Terms, contact:</LegalParagraph>
        <LegalParagraph>Doloyal</LegalParagraph>
        <LegalParagraph>
          Website: <LegalLink href="https://doloyal.com">https://doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Legal Email: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Support Email: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
      </LegalSection>
    </LegalDocument>
  );
}
