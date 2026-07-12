import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Contact - Deal Rakyat",
  description: "Current support and reporting channels for Deal Rakyat.",
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact Deal Rakyat"
      intro="Use Deal Rakyat's first-party report controls for deal and comment issues, or email the monitored support and legal channels below."
      sections={[
        {
          title: "Account and profile help",
          body: [
            <>Signed-in members can update supported profile, appearance, notification, and privacy preferences in Settings. For other account help, email <a className="font-bold text-[#dc115e] underline underline-offset-4" href="mailto:support@dealrakyat.my">support@dealrakyat.my</a>. Password recovery is not currently available.</>,
          ],
        },
        {
          title: "Report bad deals or safety issues",
          body: [
            "Use the report controls on a deal or comment to send the relevant item, selected reason, and viewer identity directly to moderation.",
            "Do not submit passwords, payment details, identity documents, or other sensitive personal data through community posts or report reasons.",
          ],
        },
        {
          title: "Takedown and rights requests",
          body: [
            <>The in-product report tools cover ordinary unsafe, abusive, spam, misleading, and unlawful content reports. Send formal takedown, intellectual-property, and legal notices to <a className="font-bold text-[#dc115e] underline underline-offset-4" href="mailto:legal@dealrakyat.my">legal@dealrakyat.my</a>.</>,
            "Identify the affected URL or content, explain the request, provide a reply address, and include supporting information. Do not send passwords, payment details, or unnecessary identity documents.",
          ],
        },
        {
          title: "Privacy requests",
          body: [
            <>Supported profile corrections are available in Settings. Send account deactivation, deletion, data-access, correction, and other privacy requests to <a className="font-bold text-[#dc115e] underline underline-offset-4" href="mailto:support@dealrakyat.my?subject=Privacy%20request">support@dealrakyat.my</a> with the subject “Privacy request.”</>,
            "Deal Rakyat may request proportionate information to verify the account holder before acting. Do not send identity documents unless the support team specifically requests them and explains the secure verification process.",
          ],
        },
        {
          title: "Response expectations",
          body: [
            "Deal Rakyat aims to acknowledge ordinary support, privacy, takedown, and legal messages within five Malaysian business days. Investigation or resolution may take longer depending on complexity, verification, and applicable obligations.",
            "Use the in-product report controls for ordinary deal and comment moderation because they attach the relevant content directly to the moderation queue. Email is not an emergency service.",
          ],
        },
      ]}
    />
  );
}
