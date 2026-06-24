import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Contact - Deal Rakyat",
  description: "Draft contact information for Deal Rakyat.",
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact Deal Rakyat"
      intro="Use these placeholder contact channels until the final support, privacy, abuse, and takedown processes are confirmed before launch."
      sections={[
        {
          title: "General support",
          body: [
            "Placeholder: hello@dealrakyat.example. Use this for general questions, feedback, account help, feature suggestions, and issues using the site.",
          ],
        },
        {
          title: "Report bad deals or safety issues",
          body: [
            "Placeholder: reports@dealrakyat.example. Use this to report expired offers, incorrect prices, suspicious merchants, broken links, unsafe products, scams, spam, or abusive comments.",
            "Include the deal URL, screenshots if helpful, the merchant name, and a short explanation of the problem.",
          ],
        },
        {
          title: "Takedown and rights requests",
          body: [
            "Placeholder: abuse@dealrakyat.example. Use this for takedown requests, intellectual property concerns, privacy-sensitive content, unlawful content, or urgent trust and safety matters.",
            "Please identify the content, explain the issue, provide contact details, and include supporting information so the request can be reviewed.",
          ],
        },
        {
          title: "Privacy requests",
          body: [
            "Placeholder: privacy@dealrakyat.example. Use this for privacy questions, data access, correction, deletion, or account-data review requests.",
            "Some requests may require identity verification before Deal Rakyat can disclose or change account information.",
          ],
        },
        {
          title: "Before launch",
          body: [
            "Replace all placeholder email addresses with monitored addresses or a working support form. Confirm response time expectations, record-keeping, escalation owners, and Malaysia-relevant legal review before public launch.",
          ],
        },
      ]}
    />
  );
}
