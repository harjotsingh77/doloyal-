import type { Metadata } from "next";
import { LegalDocument, type LegalTocItem } from "@/marketing/components/legal-document";
import {
  LegalDocNav,
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSection,
  LegalSubheading,
} from "@/marketing/components/legal-blocks";
import { buildMetadata } from "@/marketing/lib/seo";

const TITLE = "Privacy Policy";
const DESCRIPTION =
  "Doloyal respects your privacy and is committed to protecting personal data. This Privacy Policy explains how we collect, use, disclose, store, and protect personal information.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/privacy-policy",
  }),
  alternates: {
    canonical: "https://doloyal.com/privacy-policy",
  },
};

const TOC: LegalTocItem[] = [
  { id: "about-doloyal", label: "1. About Doloyal" },
  { id: "information-we-collect", label: "2. Information We Collect" },
  { id: "information-from-third-parties", label: "3. Information We Receive From Third Parties" },
  { id: "how-we-use-information", label: "4. How We Use Information" },
  { id: "legal-bases", label: "5. Legal Bases for Processing" },
  { id: "business-customer-data", label: "6. Business Customer Data" },
  { id: "how-we-share-information", label: "7. How We Share Information" },
  { id: "cookies", label: "8. Cookies and Similar Technologies" },
  { id: "data-retention", label: "9. Data Retention" },
  { id: "data-security", label: "10. Data Security" },
  { id: "multi-tenant-data-protection", label: "11. Multi-Tenant Data Protection" },
  { id: "international-data-transfers", label: "12. International Data Transfers" },
  { id: "your-privacy-rights", label: "13. Your Privacy Rights" },
  { id: "exercise-your-rights", label: "14. How to Exercise Your Rights" },
  { id: "data-deletion", label: "15. Data Deletion" },
  { id: "marketing-communications", label: "16. Marketing Communications" },
  { id: "third-party-services", label: "17. Third-Party Services and Links" },
  { id: "google-and-connected-accounts", label: "18. Google and Connected Accounts" },
  { id: "ai-and-automated-processing", label: "19. AI and Automated Processing" },
  { id: "childrens-privacy", label: "20. Children's Privacy" },
  { id: "user-generated-content", label: "21. User-Generated Content" },
  { id: "account-suspension", label: "22. Account Suspension" },
  { id: "changes", label: "23. Changes to This Privacy Policy" },
  { id: "contact-us", label: "24. Contact Us" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title={TITLE}
      effectiveDate="September 14, 2026"
      lastUpdated="September 14, 2026"
      toc={TOC}
      intro={
        <>
          <LegalParagraph>
            Doloyal (“Doloyal,” “we,” “us,” or “our”) respects your privacy and is committed to protecting personal data.
          </LegalParagraph>
          <LegalParagraph>
            This Privacy Policy explains how we collect, use, disclose, store, and protect personal information when you access or use doloyal.com, the Doloyal platform, customer-facing Client Pages, applications, integrations, and related services (collectively, the “Services”).
          </LegalParagraph>
          <LegalParagraph>
            By using the Services, you acknowledge that you have read and understood this Privacy Policy.
          </LegalParagraph>
        </>
      }
    >
      <LegalSection id="about-doloyal" title="1. About Doloyal">
        <LegalParagraph>
          Doloyal is a SaaS platform that helps local businesses manage customer relationships, bookings, loyalty, rewards, memberships, marketing, customer retention, reviews, workflows, analytics, AI-powered insights, and related business operations.
        </LegalParagraph>
        <LegalParagraph>Doloyal may process information relating to two primary groups:</LegalParagraph>
        <LegalList
          items={[
            "Business Users — businesses, business owners, employees, staff, administrators, and other authorised users who use Doloyal.",
            "Customers — individuals who interact with a business through a Doloyal-powered Client Page or other customer-facing functionality.",
          ]}
        />
        <LegalParagraph>
          For customer information provided by a business, the relevant business may determine the purposes for which that information is collected and used. Depending on the applicable law and circumstances, that business may act as the controller/data fiduciary and Doloyal may act as a processor/service provider. Under the GDPR, these roles depend on who determines the purposes and means of processing.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="information-we-collect" title="2. Information We Collect">
        <LegalParagraph>
          We collect information you provide directly, information generated through your use of the Services, and information received from connected services.
        </LegalParagraph>

        <LegalSubheading>Account Information</LegalSubheading>
        <LegalParagraph>When you create or manage an account, we may collect:</LegalParagraph>
        <LegalList
          items={[
            "Name",
            "Email address",
            "Phone number",
            "Password or authentication credentials",
            "Profile information",
            "Account preferences",
            "Login and account activity",
          ]}
        />
        <LegalParagraph>
          Where available, you may also sign in using third-party authentication services such as Google.
        </LegalParagraph>

        <LegalSubheading>Business Information</LegalSubheading>
        <LegalParagraph>Business Users may provide:</LegalParagraph>
        <LegalList
          items={[
            "Business name",
            "Business category",
            "Business address",
            "Business phone number",
            "Business email",
            "Website",
            "Business hours",
            "Business description",
            "Business logo and branding assets",
            "Social links",
            "Services and products",
            "Prices",
            "Loyalty programs",
            "Rewards",
            "Membership plans",
            "Referral settings",
            "Booking settings",
            "Marketing preferences",
            "Business policies",
            "Registration or tax information where applicable",
          ]}
        />

        <LegalSubheading>Customer Information</LegalSubheading>
        <LegalParagraph>A business may use Doloyal to manage customer information such as:</LegalParagraph>
        <LegalList
          items={[
            "Name",
            "Email",
            "Phone number",
            "Customer profile",
            "Booking history",
            "Purchase/order information",
            "Loyalty points",
            "Rewards",
            "Memberships",
            "Referrals",
            "Reviews and ratings",
            "Campaign activity",
            "Communication history",
            "Customer preferences",
            "Customer status",
            "Other information voluntarily entered by the business or customer",
          ]}
        />

        <LegalSubheading>Booking, Order, and Transaction Information</LegalSubheading>
        <LegalParagraph>Depending on the features used, Doloyal may process:</LegalParagraph>
        <LegalList
          items={[
            "Appointments",
            "Booking dates and times",
            "Services booked",
            "Staff information",
            "Booking status",
            "Orders",
            "Invoices",
            "Membership purchases",
            "Reward redemptions",
            "Transaction-related records",
          ]}
        />
        <LegalParagraph>
          Payment information may be processed by third-party payment providers, such as Stripe or Razorpay, rather than being stored directly by Doloyal. Their own terms and privacy policies apply to their processing.
        </LegalParagraph>

        <LegalSubheading>Reviews and Feedback</LegalSubheading>
        <LegalParagraph>
          If you submit a review, rating, feedback, or similar content through a Doloyal-powered Client Page, we may collect:
        </LegalParagraph>
        <LegalList
          items={[
            "Name",
            "Rating",
            "Review text",
            "Date and time",
            "Business associated with the review",
            "Related customer/account information",
          ]}
        />
        <LegalParagraph>
          Where a business connects supported review platforms, information may also be received from those third-party services.
        </LegalParagraph>

        <LegalSubheading>Communications</LegalSubheading>
        <LegalParagraph>We may process information relating to:</LegalParagraph>
        <LegalList
          items={[
            "Email communications",
            "SMS",
            "WhatsApp communications",
            "Notifications",
            "Marketing campaigns",
            "Automated messages",
            "Support requests",
            "Customer reviews",
            "Other communications sent through the Services",
          ]}
        />

        <LegalSubheading>Technical and Usage Information</LegalSubheading>
        <LegalParagraph>We may automatically collect information such as:</LegalParagraph>
        <LegalList
          items={[
            "IP address",
            "Browser type",
            "Device type",
            "Operating system",
            "Session information",
            "Login timestamps",
            "Pages and features accessed",
            "Application events",
            "Error logs",
            "Performance information",
            "Referrer information",
            "Security and diagnostic information",
          ]}
        />
      </LegalSection>

      <LegalSection id="information-from-third-parties" title="3. Information We Receive From Third Parties">
        <LegalParagraph>You or a Business User may connect Doloyal to third-party services.</LegalParagraph>
        <LegalParagraph>
          Depending on the integration and permissions granted, Doloyal may receive information from services such as:
        </LegalParagraph>
        <LegalList
          items={[
            "Google",
            "Google Business Profile",
            "Google Calendar",
            "Stripe",
            "Razorpay",
            "Resend",
            "Meta / WhatsApp",
            "Other supported integrations",
          ]}
        />
        <LegalParagraph>
          The information we receive depends on the permissions granted and the functionality enabled.
        </LegalParagraph>
        <LegalParagraph>
          Third-party services may independently process information according to their own privacy policies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="how-we-use-information" title="4. How We Use Information">
        <LegalParagraph>
          We use information to operate, provide, maintain, secure, and improve the Services.
        </LegalParagraph>
        <LegalParagraph>This may include:</LegalParagraph>

        <LegalSubheading>Providing the Services</LegalSubheading>
        <LegalParagraph>To:</LegalParagraph>
        <LegalList
          items={[
            "Create and manage accounts",
            "Manage businesses and customers",
            "Provide CRM functionality",
            "Provide bookings and appointments",
            "Manage loyalty and rewards",
            "Manage memberships and referrals",
            "Provide Client Pages",
            "Provide reviews functionality",
            "Run campaigns and workflows",
            "Provide analytics",
            "Provide customer-retention tools",
            "Process integrations",
            "Provide support",
          ]}
        />

        <LegalSubheading>Personalization</LegalSubheading>
        <LegalParagraph>
          To personalise dashboards, Client Pages, recommendations, workflows, campaigns, and other features based on available information.
        </LegalParagraph>

        <LegalSubheading>AI-Powered Features</LegalSubheading>
        <LegalParagraph>Doloyal may process information to provide:</LegalParagraph>
        <LegalList
          items={[
            "Business insights",
            "Customer-retention insights",
            "Customer segmentation",
            "Recommendations",
            "Campaign suggestions",
            "Automated workflows",
            "Summaries",
            "Other AI-generated outputs",
          ]}
        />
        <LegalParagraph>
          AI-generated outputs may contain errors and should be reviewed before important decisions are made.
        </LegalParagraph>

        <LegalSubheading>Security</LegalSubheading>
        <LegalParagraph>To:</LegalParagraph>
        <LegalList
          items={[
            "Detect and prevent fraud",
            "Protect accounts",
            "Detect suspicious activity",
            "Prevent abuse",
            "Investigate security incidents",
            "Enforce our policies",
            "Protect our Services and users",
          ]}
        />

        <LegalSubheading>Communications</LegalSubheading>
        <LegalParagraph>To send:</LegalParagraph>
        <LegalList
          items={[
            "Account-related communications",
            "Security alerts",
            "Booking and service notifications",
            "Support communications",
            "Product updates",
            "Marketing communications where permitted by law and applicable preferences/consent requirements",
          ]}
        />

        <LegalSubheading>Legal Compliance</LegalSubheading>
        <LegalParagraph>
          To comply with applicable laws and lawful requests, protect our rights, resolve disputes, and establish or defend legal claims.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="legal-bases" title="5. Legal Bases for Processing">
        <LegalParagraph>Where applicable, we may process personal information based on:</LegalParagraph>
        <LegalList
          items={[
            "Performance of a contract",
            "Compliance with legal obligations",
            "Legitimate interests",
            "Consent",
            "Other lawful grounds permitted under applicable law",
          ]}
        />
        <LegalParagraph>
          Where consent is required, we will seek it in an appropriate manner and provide mechanisms to withdraw consent where required.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="business-customer-data" title="6. Business Customer Data">
        <LegalParagraph>Doloyal provides businesses with tools to manage their own customer information.</LegalParagraph>
        <LegalParagraph>A Business User may determine:</LegalParagraph>
        <LegalList
          items={[
            "What information is collected",
            "How it is used",
            "Who receives it",
            "How long it is retained",
            "Which customer communications are sent",
          ]}
        />
        <LegalParagraph>
          Where Doloyal processes such information on behalf of a business, the business may remain responsible for its own privacy obligations toward its customers.
        </LegalParagraph>
        <LegalParagraph>
          Customers with questions about their information held by a particular business should generally contact that business first.
        </LegalParagraph>
        <LegalParagraph>
          Where appropriate, Doloyal may assist the business in responding to a privacy request.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="how-we-share-information" title="7. How We Share Information">
        <LegalParagraph>We do not sell personal information as a standalone commercial product.</LegalParagraph>
        <LegalParagraph>We may share information with:</LegalParagraph>

        <LegalSubheading>Service Providers</LegalSubheading>
        <LegalParagraph>
          Third-party providers that help us operate the Services, including providers for:
        </LegalParagraph>
        <LegalList
          items={[
            "Hosting and cloud infrastructure",
            "Databases",
            "Authentication",
            "Payments",
            "Email",
            "SMS",
            "WhatsApp",
            "Analytics",
            "AI functionality",
            "Security",
            "Monitoring",
            "Customer support",
          ]}
        />

        <LegalSubheading>Businesses</LegalSubheading>
        <LegalParagraph>
          When you interact with a business using Doloyal, information you provide may be made available to that business as necessary to provide the relevant services.
        </LegalParagraph>

        <LegalSubheading>Third-Party Integrations</LegalSubheading>
        <LegalParagraph>
          Information may be exchanged with connected third-party services according to the permissions and functionality enabled by the user or business.
        </LegalParagraph>

        <LegalSubheading>Legal and Safety Purposes</LegalSubheading>
        <LegalParagraph>We may disclose information where reasonably necessary to:</LegalParagraph>
        <LegalList
          items={[
            "Comply with law",
            "Respond to lawful requests",
            "Prevent fraud or abuse",
            "Protect users",
            "Protect Doloyal and its property",
            "Investigate security incidents",
          ]}
        />

        <LegalSubheading>Business Transfers</LegalSubheading>
        <LegalParagraph>
          Information may be transferred as part of a merger, acquisition, financing, restructuring, sale of assets, or similar corporate transaction, subject to applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="cookies" title="8. Cookies and Similar Technologies">
        <LegalParagraph>
          Doloyal may use cookies, local storage, pixels, SDKs, and similar technologies for purposes including:
        </LegalParagraph>
        <LegalList
          items={[
            "Authentication",
            "Session management",
            "Security",
            "Remembering preferences",
            "Product functionality",
            "Analytics",
            "Performance monitoring",
            "Improving the Services",
          ]}
        />
        <LegalParagraph>
          Where required by law, we will provide appropriate consent or preference mechanisms for non-essential technologies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="data-retention" title="9. Data Retention">
        <LegalParagraph>
          We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including to:
        </LegalParagraph>
        <LegalList
          items={[
            "Provide the Services",
            "Maintain accounts and records",
            "Meet legal obligations",
            "Resolve disputes",
            "Prevent fraud and abuse",
            "Maintain security",
            "Enforce agreements",
          ]}
        />
        <LegalParagraph>
          Retention periods may vary depending on the type of information and applicable legal requirements.
        </LegalParagraph>
        <LegalParagraph>
          When information is no longer required, we may delete, anonymise, or securely dispose of it, subject to lawful retention requirements.
        </LegalParagraph>
        <LegalParagraph>
          This follows the general principle of retaining personal data no longer than necessary for its purpose.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="data-security" title="10. Data Security">
        <LegalParagraph>
          We use reasonable technical and organisational safeguards designed to protect personal information against unauthorised access, loss, misuse, alteration, or disclosure.
        </LegalParagraph>
        <LegalParagraph>Depending on the system, safeguards may include:</LegalParagraph>
        <LegalList
          items={[
            "Encryption in transit",
            "Access controls",
            "Authentication mechanisms",
            "Role-based access",
            "Business/tenant isolation",
            "Secure credential handling",
            "Logging and monitoring",
            "Backups and recovery procedures",
            "Infrastructure protections",
          ]}
        />
        <LegalParagraph>
          However, no internet-based service can be guaranteed to be completely secure.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="multi-tenant-data-protection" title="11. Multi-Tenant Data Protection">
        <LegalParagraph>Doloyal is designed as a multi-business SaaS platform.</LegalParagraph>
        <LegalParagraph>
          Business and customer information is intended to remain associated with the appropriate business account.
        </LegalParagraph>
        <LegalParagraph>
          A customer using one business&apos;s Client Page should not be given access to another business&apos;s customer information unless properly authorised.
        </LegalParagraph>
        <LegalParagraph>
          We use technical and access-control measures designed to prevent unauthorised cross-business access.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="international-data-transfers" title="12. International Data Transfers">
        <LegalParagraph>
          Doloyal and its service providers may process or store information in countries outside the country where you live.
        </LegalParagraph>
        <LegalParagraph>
          Where applicable law requires safeguards for international transfers, we will use appropriate measures required by that law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="your-privacy-rights" title="13. Your Privacy Rights">
        <LegalParagraph>
          Depending on your jurisdiction, you may have rights relating to your personal information, including:
        </LegalParagraph>
        <LegalList
          items={[
            "Access",
            "Correction",
            "Deletion",
            "Restriction of processing",
            "Objection to certain processing",
            "Data portability",
            "Withdrawal of consent where applicable",
            "Information about how your data is processed",
            "Rights relating to certain automated decision-making or profiling",
          ]}
        />
        <LegalParagraph>
          The exact rights available to you depend on the law applicable to your circumstances. GDPR, for example, provides rights including access, rectification, erasure, restriction, portability, objection, and certain rights regarding automated decision-making.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="exercise-your-rights" title="14. How to Exercise Your Rights">
        <LegalParagraph>To submit a privacy request, contact:</LegalParagraph>
        <LegalParagraph>
          Privacy: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>You may request access, correction, deletion, or other privacy assistance.</LegalParagraph>
        <LegalParagraph>
          We may request reasonable information to verify your identity before fulfilling certain requests.
        </LegalParagraph>
        <LegalParagraph>
          Where the information is controlled by a Business User, we may direct you to the relevant business where appropriate.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="data-deletion" title="15. Data Deletion">
        <LegalParagraph>You may request deletion of personal information by contacting:</LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>Depending on the applicable circumstances, deletion may include:</LegalParagraph>
        <LegalList
          items={[
            "Deleting an account",
            "Removing profile information",
            "Removing personal information from active systems",
            "Anonymising information where appropriate",
          ]}
        />
        <LegalParagraph>
          Certain information may need to be retained for legal, security, fraud-prevention, accounting, dispute-resolution, or other lawful purposes.
        </LegalParagraph>
        <LegalParagraph>
          For detailed instructions, see our{" "}
          <LegalLink href="/data-deletion">Data Deletion Policy</LegalLink>.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="marketing-communications" title="16. Marketing Communications">
        <LegalParagraph>
          Where permitted, Doloyal or a Business User may send communications through email, SMS, WhatsApp, or other supported channels.
        </LegalParagraph>
        <LegalParagraph>
          You may opt out of promotional communications using the unsubscribe mechanism provided.
        </LegalParagraph>
        <LegalParagraph>
          Transactional, security, account, booking, and service-related communications may continue where reasonably necessary.
        </LegalParagraph>
        <LegalParagraph>
          Businesses using Doloyal are responsible for ensuring that marketing communications sent to their customers comply with applicable laws and consent requirements.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third-party-services" title="17. Third-Party Services and Links">
        <LegalParagraph>Doloyal may contain links to third-party services or websites.</LegalParagraph>
        <LegalParagraph>
          We do not control and are not responsible for the privacy practices of third parties that operate independently from Doloyal.
        </LegalParagraph>
        <LegalParagraph>
          Your use of those services may be governed by their own privacy policies and terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="google-and-connected-accounts" title="18. Google and Connected Accounts">
        <LegalParagraph>
          When you connect Google, Google Business Profile, Google Calendar, or another supported service, Doloyal may access information according to the permissions you grant.
        </LegalParagraph>
        <LegalParagraph>
          You may disconnect supported integrations through Doloyal where that functionality is available.
        </LegalParagraph>
        <LegalParagraph>
          Disconnecting an integration may prevent future synchronisation but may not automatically remove information that was previously imported or stored.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ai-and-automated-processing" title="19. AI and Automated Processing">
        <LegalParagraph>
          Doloyal uses AI and automation for certain features, including business insights, customer-retention analysis, campaign recommendations, workflow suggestions, summaries, and other functionality.
        </LegalParagraph>
        <LegalParagraph>
          AI outputs are generated based on available information and may not always be accurate or complete.
        </LegalParagraph>
        <LegalParagraph>
          Business Users remain responsible for reviewing AI-generated outputs before taking important business actions.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal AI is not intended to provide legal, financial, medical, or other regulated professional advice.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="childrens-privacy" title="20. Children's Privacy">
        <LegalParagraph>
          The Services are intended for businesses and their customers and are not directed toward children.
        </LegalParagraph>
        <LegalParagraph>
          We do not knowingly seek to collect personal information from children where prohibited by applicable law.
        </LegalParagraph>
        <LegalParagraph>
          If you believe that a child has provided personal information to Doloyal inappropriately, contact:
        </LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="user-generated-content" title="21. User-Generated Content">
        <LegalParagraph>Users may submit information such as:</LegalParagraph>
        <LegalList
          items={[
            "Reviews",
            "Ratings",
            "Images",
            "Logos",
            "Business descriptions",
            "Service information",
            "Messages",
            "Marketing content",
          ]}
        />
        <LegalParagraph>
          You are responsible for ensuring that you have the necessary rights and permissions to submit such content.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="account-suspension" title="22. Account Suspension">
        <LegalParagraph>We may restrict, suspend, or terminate access where reasonably necessary to:</LegalParagraph>
        <LegalList
          items={[
            "Prevent abuse",
            "Address security issues",
            "Prevent fraud",
            "Protect users",
            "Comply with law",
            "Enforce our Terms",
          ]}
        />
        <LegalParagraph>
          Information may be retained where necessary for security, legal, or compliance purposes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" title="23. Changes to This Privacy Policy">
        <LegalParagraph>
          We may update this Privacy Policy from time to time to reflect:
        </LegalParagraph>
        <LegalList
          items={[
            "New features",
            "Changes to our Services",
            "Changes to our data practices",
            "Legal or regulatory requirements",
            "Security improvements",
          ]}
        />
        <LegalParagraph>
          Where required, we may notify users of material changes through the Services, website, or email.
        </LegalParagraph>
        <LegalParagraph>The latest version will always show the current Last Updated date.</LegalParagraph>
      </LegalSection>

      <LegalSection id="contact-us" title="24. Contact Us">
        <LegalParagraph>
          For questions, requests, or concerns regarding this Privacy Policy or your personal information:
        </LegalParagraph>
        <LegalParagraph>Doloyal</LegalParagraph>
        <LegalParagraph>
          Website: <LegalLink href="https://doloyal.com">https://doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Privacy: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Support: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>

        <LegalSubheading>Legal Notice</LegalSubheading>
        <LegalParagraph>
          This Privacy Policy is intended to describe Doloyal&apos;s privacy practices in a clear and transparent manner. It is not a substitute for legal advice. Doloyal should review this policy against its actual technical architecture, contracts, subprocessors, data retention practices, and applicable laws before publication.
        </LegalParagraph>
        <LegalParagraph>
          For India, the Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025 are relevant to the handling of digital personal data, with the Rules providing the detailed framework and phased commencement provisions.
        </LegalParagraph>
      </LegalSection>
      <LegalDocNav />
    </LegalDocument>
  );
}
