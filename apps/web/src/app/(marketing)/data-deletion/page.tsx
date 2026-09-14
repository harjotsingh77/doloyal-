import type { Metadata } from "next";
import { LegalDocument, type LegalTocItem } from "@/marketing/components/legal-document";
import {
  LegalDocNav,
  LegalLink,
  LegalList,
  LegalParagraph,
  LegalSection,
} from "@/marketing/components/legal-blocks";
import { buildMetadata } from "@/marketing/lib/seo";

const TITLE = "Data Deletion Policy";
const DESCRIPTION =
  "How to request deletion of information associated with your Doloyal account, and how Doloyal handles data deletion requests.";

export const metadata: Metadata = {
  ...buildMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/data-deletion",
  }),
  alternates: {
    canonical: "https://doloyal.com/data-deletion",
  },
};

const TOC: LegalTocItem[] = [
  { id: "your-right-to-request-deletion", label: "1. Your Right to Request Deletion" },
  { id: "how-to-request-data-deletion", label: "2. How to Request Data Deletion" },
  { id: "deleting-your-doloyal-account", label: "3. Deleting Your Doloyal Account" },
  { id: "customer-data-deletion", label: "4. Customer Data Deletion" },
  { id: "what-may-be-deleted", label: "5. What May Be Deleted" },
  { id: "information-that-may-be-retained", label: "6. Information That May Be Retained" },
  { id: "third-party-services", label: "7. Third-Party Services" },
  { id: "disconnecting-an-integration", label: "8. Disconnecting an Integration" },
  { id: "google-and-other-connected-accounts", label: "9. Google and Other Connected Accounts" },
  { id: "data-deletion-from-client-pages", label: "10. Data Deletion From Client Pages" },
  { id: "verification-of-deletion-requests", label: "11. Verification of Deletion Requests" },
  { id: "processing-time", label: "12. Processing Time" },
  { id: "deletion-from-backups", label: "13. Deletion From Backups" },
  { id: "anonymous-or-aggregated-information", label: "14. Anonymous or Aggregated Information" },
  { id: "consequences-of-account-deletion", label: "15. Consequences of Account Deletion" },
  { id: "business-account-deletion", label: "16. Business Account Deletion" },
  { id: "marketing-preferences", label: "17. Marketing Preferences" },
  { id: "children", label: "18. Children" },
  { id: "right-to-challenge-a-deletion-decision", label: "19. Right to Challenge a Deletion Decision" },
  { id: "contact-us", label: "20. Contact Us" },
  { id: "changes", label: "21. Changes to This Data Deletion Policy" },
];

export default function DataDeletionPage() {
  return (
    <LegalDocument
      title={TITLE}
      lastUpdated="September 14, 2026"
      toc={TOC}
      intro={
        <>
          <LegalParagraph>
            At Doloyal, we respect your right to control your personal information. This Data Deletion Policy explains how you can request deletion of information associated with your Doloyal account and how we handle deletion requests.
          </LegalParagraph>
          <LegalParagraph>
            This policy should be read together with our{" "}
            <LegalLink href="/privacy-policy">Privacy Policy</LegalLink> and{" "}
            <LegalLink href="/terms-of-service">Terms of Service</LegalLink>.
          </LegalParagraph>
        </>
      }
    >
      <LegalSection id="your-right-to-request-deletion" title="1. Your Right to Request Deletion">
        <LegalParagraph>
          Depending on applicable law, you may have the right to request deletion of personal information that Doloyal holds about you.
        </LegalParagraph>
        <LegalParagraph>You can request deletion of information associated with:</LegalParagraph>
        <LegalList
          items={[
            "Your Doloyal user account",
            "Your customer profile",
            "Your personal information",
            "Information submitted through a Doloyal Client Page",
            "Other personal information associated with your use of the Services",
          ]}
        />
        <LegalParagraph>
          Some information may not be eligible for immediate deletion where retention is required or permitted by applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="how-to-request-data-deletion" title="2. How to Request Data Deletion">
        <LegalParagraph>You can request deletion by contacting us at:</LegalParagraph>
        <LegalParagraph>
          Privacy Email: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>Please include:</LegalParagraph>
        <LegalList
          items={[
            "Your full name",
            "Email address associated with your account",
            "Phone number associated with your account, where applicable",
            "Business name, if you are a Business User",
            "A clear description of the information you want deleted",
          ]}
        />
        <LegalParagraph>
          For security reasons, we may ask you to verify your identity before processing the request.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="deleting-your-doloyal-account" title="3. Deleting Your Doloyal Account">
        <LegalParagraph>
          Where account deletion functionality is available within Doloyal, you may initiate deletion directly through your account.
        </LegalParagraph>
        <LegalParagraph>
          Depending on your account type, deleting your account may result in the removal or deactivation of information associated with that account.
        </LegalParagraph>
        <LegalParagraph>
          For Business Users, account deletion may affect business data, customer records, bookings, loyalty programs, rewards, memberships, workflows, Client Pages, and other data associated with the business.
        </LegalParagraph>
        <LegalParagraph>
          Before permanently deleting a business account, review any available data-export functionality.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="customer-data-deletion" title="4. Customer Data Deletion">
        <LegalParagraph>
          If you are a customer of a business using Doloyal, your information may be stored and managed on behalf of that business.
        </LegalParagraph>
        <LegalParagraph>
          In such cases, you may also contact the relevant business directly to request deletion of your customer information.
        </LegalParagraph>
        <LegalParagraph>Examples include information relating to:</LegalParagraph>
        <LegalList
          items={[
            "Bookings",
            "Customer profiles",
            "Loyalty points",
            "Rewards",
            "Memberships",
            "Referrals",
            "Reviews",
            "Purchase or transaction history",
            "Marketing communications",
          ]}
        />
        <LegalParagraph>
          Where a business controls the information, Doloyal may assist that business in processing the request.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="what-may-be-deleted" title="5. What May Be Deleted">
        <LegalParagraph>
          Depending on the nature of your request and applicable law, deletion may include:
        </LegalParagraph>
        <LegalList
          items={[
            "Name",
            "Email address",
            "Phone number",
            "Profile information",
            "Account information",
            "Customer profile information",
            "Booking information containing personal data",
            "Loyalty information",
            "Membership information",
            "Referral information",
            "Review information",
            "Communication records",
            "Other personal information associated with your account",
          ]}
        />
        <LegalParagraph>
          The exact scope of deletion may depend on technical, contractual, legal, and operational requirements.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="information-that-may-be-retained" title="6. Information That May Be Retained">
        <LegalParagraph>
          Certain information may need to be retained even after a deletion request.
        </LegalParagraph>
        <LegalParagraph>This may include information that is necessary to:</LegalParagraph>
        <LegalList
          items={[
            "Comply with legal obligations",
            "Meet tax, accounting, or financial requirements",
            "Prevent fraud",
            "Detect or investigate abuse",
            "Protect security",
            "Resolve disputes",
            "Establish, exercise, or defend legal claims",
            "Enforce our agreements",
            "Maintain required business or transaction records",
          ]}
        />
        <LegalParagraph>
          Where information must be retained, we will limit its use to the purposes for which retention is required or otherwise permitted by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="third-party-services" title="7. Third-Party Services">
        <LegalParagraph>
          Doloyal may use third-party services and integrations to provide certain functionality.
        </LegalParagraph>
        <LegalParagraph>
          Depending on the integration, information may also be stored or processed by third parties such as:
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
            "Other connected providers",
          ]}
        />
        <LegalParagraph>
          Deleting information from Doloyal does not necessarily delete information held directly by a third-party provider.
        </LegalParagraph>
        <LegalParagraph>
          Where appropriate, you may need to submit a separate deletion request to the relevant third party.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="disconnecting-an-integration" title="8. Disconnecting an Integration">
        <LegalParagraph>
          Disconnecting a third-party integration from Doloyal generally stops future synchronization or access, where supported.
        </LegalParagraph>
        <LegalParagraph>
          However, disconnecting an integration does not necessarily delete information that was previously imported or stored in Doloyal.
        </LegalParagraph>
        <LegalParagraph>
          To request deletion of previously stored information, follow the deletion request process described in this policy.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="google-and-other-connected-accounts" title="9. Google and Other Connected Accounts">
        <LegalParagraph>
          If you connected a Google or other third-party account to Doloyal, you may disconnect that account through available integration controls.
        </LegalParagraph>
        <LegalParagraph>
          Where applicable, you may also revoke Doloyal&apos;s access through the third-party provider&apos;s account settings.
        </LegalParagraph>
        <LegalParagraph>
          Revoking access prevents future authorized access but does not automatically delete information already stored in Doloyal.
        </LegalParagraph>
        <LegalParagraph>A separate deletion request may be required.</LegalParagraph>
      </LegalSection>

      <LegalSection id="data-deletion-from-client-pages" title="10. Data Deletion From Client Pages">
        <LegalParagraph>
          Customers using a Doloyal-powered Client Page may request deletion of their account or personal information.
        </LegalParagraph>
        <LegalParagraph>
          Where supported, customers may initiate deletion through their account settings.
        </LegalParagraph>
        <LegalParagraph>Alternatively, customers may contact:</LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>or the relevant business operating the Client Page.</LegalParagraph>
      </LegalSection>

      <LegalSection id="verification-of-deletion-requests" title="11. Verification of Deletion Requests">
        <LegalParagraph>
          We may require reasonable verification before processing a deletion request.
        </LegalParagraph>
        <LegalParagraph>
          This is intended to help prevent unauthorized deletion of another person&apos;s account or information.
        </LegalParagraph>
        <LegalParagraph>
          We may request information necessary to verify that you are the account holder or are otherwise authorized to make the request.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="processing-time" title="12. Processing Time">
        <LegalParagraph>
          We aim to process valid deletion requests within a reasonable period and within the timeframe required by applicable law.
        </LegalParagraph>
        <LegalParagraph>The time required may depend on:</LegalParagraph>
        <LegalList
          items={[
            "The nature of the request",
            "Amount of information involved",
            "Verification requirements",
            "Technical limitations",
            "Legal retention obligations",
            "Requests involving third-party services",
          ]}
        />
        <LegalParagraph>
          Where additional time is reasonably necessary, we may provide an explanation where required by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="deletion-from-backups" title="13. Deletion From Backups">
        <LegalParagraph>
          Some deleted information may remain temporarily in secure backup systems.
        </LegalParagraph>
        <LegalParagraph>Backup copies may be retained for:</LegalParagraph>
        <LegalList
          items={[
            "Disaster recovery",
            "Security",
            "Business continuity",
            "Legal compliance",
          ]}
        />
        <LegalParagraph>
          Such information will remain subject to appropriate safeguards and will be deleted or overwritten according to applicable backup-retention practices.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="anonymous-or-aggregated-information" title="14. Anonymous or Aggregated Information">
        <LegalParagraph>
          Information that has been permanently anonymized or aggregated so that it can no longer reasonably identify an individual may not be considered personal information.
        </LegalParagraph>
        <LegalParagraph>
          Doloyal may retain and use properly anonymized or aggregated information for purposes such as:
        </LegalParagraph>
        <LegalList
          items={[
            "Analytics",
            "Product improvement",
            "Security",
            "Research",
            "Business reporting",
          ]}
        />
      </LegalSection>

      <LegalSection id="consequences-of-account-deletion" title="15. Consequences of Account Deletion">
        <LegalParagraph>
          Depending on the account and services involved, deletion may result in loss of access to:
        </LegalParagraph>
        <LegalList
          items={[
            "Doloyal account",
            "Client Pages",
            "Bookings",
            "Loyalty points",
            "Rewards",
            "Memberships",
            "Referrals",
            "Customer history",
            "Campaigns",
            "Workflows",
            "Reports",
            "Other account-related functionality",
          ]}
        />
        <LegalParagraph>
          Business Users should ensure that they export any information they are legally entitled and technically able to retain before requesting permanent deletion.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="business-account-deletion" title="16. Business Account Deletion">
        <LegalParagraph>
          For Business Users, a deletion request may affect information belonging to the entire business account.
        </LegalParagraph>
        <LegalParagraph>Before permanent business deletion, Business Users should review:</LegalParagraph>
        <LegalList
          items={[
            "Customer records",
            "Booking history",
            "Invoices",
            "Loyalty records",
            "Membership records",
            "Rewards",
            "Reviews",
            "Campaigns",
            "Workflows",
            "Client Page",
            "Integration data",
          ]}
        />
        <LegalParagraph>Deletion may be permanent once completed.</LegalParagraph>
      </LegalSection>

      <LegalSection id="marketing-preferences" title="17. Marketing Preferences">
        <LegalParagraph>
          A request to stop receiving marketing communications is different from a request to delete your account.
        </LegalParagraph>
        <LegalParagraph>
          You may unsubscribe from promotional communications using the unsubscribe mechanism provided in the relevant communication.
        </LegalParagraph>
        <LegalParagraph>You may also contact us at:</LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>for assistance.</LegalParagraph>
        <LegalParagraph>
          Transactional, security, account, and service-related communications may continue where reasonably necessary.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="children" title="18. Children">
        <LegalParagraph>Our Services are not directed toward children.</LegalParagraph>
        <LegalParagraph>
          If you believe that information belonging to a child has been collected inappropriately, contact:
        </LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          We will review the request and take appropriate action as required by applicable law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="right-to-challenge-a-deletion-decision" title="19. Right to Challenge a Deletion Decision">
        <LegalParagraph>
          Where applicable law provides additional rights regarding a deletion request, you may request further review by contacting:
        </LegalParagraph>
        <LegalParagraph>
          <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          You may also have the right to contact the applicable data protection or privacy authority in your jurisdiction.
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="contact-us" title="20. Contact Us">
        <LegalParagraph>For data deletion requests or questions regarding this policy:</LegalParagraph>
        <LegalParagraph>Doloyal</LegalParagraph>
        <LegalParagraph>
          Website: <LegalLink href="https://doloyal.com">https://doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Privacy Email: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>
          Support Email: <LegalLink href="mailto:hello@doloyal.com">hello@doloyal.com</LegalLink>
        </LegalParagraph>
        <LegalParagraph>Legal Email: [LEGAL EMAIL]</LegalParagraph>
        <LegalParagraph>Company Legal Name: [COMPANY LEGAL NAME]</LegalParagraph>
        <LegalParagraph>Registered Address: [REGISTERED ADDRESS]</LegalParagraph>
      </LegalSection>

      <LegalSection id="changes" title="21. Changes to This Data Deletion Policy">
        <LegalParagraph>
          We may update this Data Deletion Policy from time to time to reflect:
        </LegalParagraph>
        <LegalList
          items={[
            "Changes to our Services",
            "Changes to data-processing practices",
            "Legal or regulatory requirements",
            "Technical improvements",
          ]}
        />
        <LegalParagraph>
          The latest version will always display the applicable Last Updated date.
        </LegalParagraph>
      </LegalSection>

      <LegalDocNav />
    </LegalDocument>
  );
}
