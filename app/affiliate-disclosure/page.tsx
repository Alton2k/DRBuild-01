import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Affiliate Disclosure - Deal Rakyat",
  description: "Draft affiliate disclosure for Deal Rakyat.",
};

export default function AffiliateDisclosurePage() {
  return (
    <InfoPage
      eyebrow="Transparency"
      title="Affiliate Disclosure"
      intro="This draft disclosure explains how Deal Rakyat may use affiliate links or earn commissions from some merchant links."
      sections={[
        {
          title: "How affiliate links work",
          body: [
            "Some outbound links on Deal Rakyat may contain affiliate tracking. If a user clicks one of these links and later completes a purchase, Deal Rakyat may receive a commission from the merchant, affiliate network, or platform.",
            "This commission should not add extra cost to the user. The final price, delivery fees, warranty, returns, taxes, and order terms remain controlled by the merchant or platform.",
          ],
        },
        {
          title: "Community independence",
          body: [
            "Deal Rakyat is built around user-submitted deals, voting, comments, and moderation. Affiliate earning potential should not be the reason a deal is approved or promoted.",
            "Deals can still be removed, expired, corrected, or downranked if they are misleading, poor value, unsafe, unavailable, spammy, or against the Community Rules.",
          ],
        },
        {
          title: "User and merchant submissions",
          body: [
            "Users who have a commercial relationship with a merchant, brand, agency, or affiliate programme should disclose that relationship when posting or commenting.",
            "Deal Rakyat may add, remove, or replace affiliate tracking on outbound links where appropriate, while keeping the original deal discussion available to the community where possible.",
          ],
        },
        {
          title: "Questions or concerns",
          body: [
            "Users can report undisclosed promotion, suspicious merchant behaviour, or misleading affiliate activity through the contact placeholders on the Contact page.",
          ],
        },
      ]}
    />
  );
}
