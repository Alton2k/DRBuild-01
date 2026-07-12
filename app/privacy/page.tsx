import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Privacy - Deal Rakyat",
  description: "Privacy notice for Deal Rakyat.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy Notice"
      intro="This notice explains the personal data Deal Rakyat processes to provide accounts, community activity, preferences, moderation, and abuse prevention."
      sections={[
        {
          title: "Information we process",
          body: [
            "Deal Rakyat processes account information such as email address, display name, profile details, user-submitted deals, comments, votes, saved deals, follows, reports, and moderation records.",
            "The service also uses login and preference cookies, anonymous viewer identifiers, IP addresses for rate limiting, and server records needed to operate and protect first-party workflows. Deal Rakyat does not currently run third-party analytics, advertising, or marketing trackers.",
          ],
        },
        {
          title: "How information is used",
          body: [
            "Information is used to operate accounts, publish community submissions, show comments and votes, remember settings, moderate content, prevent duplicate or abusive actions, investigate reports, and maintain service security.",
            "The service operator is responsible for confirming and meeting applicable Malaysian privacy obligations before public launch.",
          ],
        },
        {
          title: "Cookies and similar technology",
          body: [
            "Deal Rakyat uses cookies and browser storage for login sessions, theme and profile preferences, anonymous voting and reporting identity, and account-scoped local deal drafts. Deal drafts expire from browser storage after 30 days and are cleared sooner after submission or confirmed discard.",
            "If analytics, advertising, affiliate attribution, or other non-essential tracking is introduced later, this notice and any required consent controls must be updated before that tracking is enabled.",
          ],
        },
        {
          title: "Affiliate and merchant links",
          body: [
            "When users open an outbound merchant link, the destination merchant and the user's browser may receive ordinary request information such as the referring page and device or network details.",
            "Deal Rakyat does not control the privacy practices of external merchants. Users should review the destination's privacy notice before purchasing or creating an account there.",
          ],
        },
        {
          title: "Sharing and retention",
          body: [
            "Public posts, comments, votes, and profile details may be visible to other users depending on product settings. Reports, moderation notes, account records, and security logs may be kept privately for trust and safety purposes.",
            "Records are retained while needed for service operation, account history, moderation, security, abuse prevention, disputes, and applicable obligations. The operator must publish any more specific retention schedule adopted for production.",
          ],
        },
        {
          title: "Privacy requests",
          body: [
            "Users can correct supported profile fields in Settings. Access, deletion, correction, and other privacy requests can be sent to support@dealrakyat.my with the subject “Privacy request.” Some requests require proportionate identity verification.",
            "Deal Rakyat may need to retain certain records where required for legal, security, abuse-prevention, accounting, or dispute-resolution reasons.",
          ],
        },
      ]}
    />
  );
}
