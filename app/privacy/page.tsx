import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Privacy - Deal Rakyat",
  description: "Draft privacy notice for Deal Rakyat.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal Draft"
      title="Privacy Notice"
      intro="This draft privacy notice explains the personal data Deal Rakyat may collect, why it is used, how cookies may work, and how users can contact us about privacy requests."
      sections={[
        {
          title: "Information we may collect",
          body: [
            "Deal Rakyat may collect account information such as email address, display name, authentication details, user-submitted deals, comments, votes, saved deals, reports, moderation history, and support messages.",
            "We may also collect technical information such as IP address, browser type, device information, approximate location derived from technical data, pages visited, referral URLs, cookies, and security logs.",
          ],
        },
        {
          title: "How we may use information",
          body: [
            "Information may be used to operate accounts, publish user-submitted deals, show comments and votes, moderate content, prevent spam and abuse, respond to reports or takedown requests, improve the service, and maintain site security.",
            "Malaysia-relevant privacy obligations should be reviewed before launch, including whether the Personal Data Protection Act 2010 or other rules apply to the final operator and processing activities.",
          ],
        },
        {
          title: "Cookies and similar technology",
          body: [
            "Deal Rakyat may use cookies or similar storage for login sessions, preferences, security, analytics, saved choices, and affiliate attribution. Some cookies may be essential for account and security features.",
            "Where required, the launched site should provide appropriate cookie notices, controls, and records for analytics or marketing tools actually used in production.",
          ],
        },
        {
          title: "Affiliate and merchant links",
          body: [
            "When users click outbound merchant links, the destination merchant, affiliate network, analytics provider, or browser may receive information such as the referring page, device data, or tracking identifiers.",
            "Deal Rakyat does not control the privacy practices of external merchants or affiliate networks. Users should review the privacy notices of those third parties before purchasing or creating accounts with them.",
          ],
        },
        {
          title: "Sharing and retention",
          body: [
            "Public posts, comments, votes, and profile details may be visible to other users depending on product settings. Reports, moderation notes, account records, and security logs may be kept privately for trust and safety purposes.",
            "Data should be kept only as long as needed for the service, legal obligations, dispute handling, security, moderation, and legitimate operational reasons. Exact retention periods should be confirmed before launch.",
          ],
        },
        {
          title: "Privacy requests",
          body: [
            "Users may request access, correction, deletion, or review of personal data through the privacy contact placeholder on the Contact page. Some requests may require identity verification.",
            "Deal Rakyat may need to retain certain records where required for legal, security, abuse-prevention, accounting, or dispute-resolution reasons.",
          ],
        },
      ]}
    />
  );
}
