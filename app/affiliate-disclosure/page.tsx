import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Affiliate Disclosure - Deal Rakyat",
  description: "Affiliate disclosure for Deal Rakyat.",
};

export default function AffiliateDisclosurePage() {
  return (
    <InfoPage
      eyebrow="Transparency"
      title="Affiliate Disclosure"
      intro="Deal Rakyat does not currently add affiliate tracking to community links or earn commissions from purchases. This disclosure must be updated before any affiliate programme is enabled."
      sections={[
        {
          title: "How affiliate links work",
          body: [
            "Current outbound deal links take users to the merchant URL submitted with the deal; Deal Rakyat does not currently add commission tracking.",
            "The final price, delivery fees, warranty, returns, taxes, and order terms are controlled by the merchant or platform, not Deal Rakyat.",
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
            "Deal Rakyat will publish updated disclosure wording before adding or replacing outbound links with affiliate tracking.",
          ],
        },
        {
          title: "Questions or concerns",
          body: [
            "Users can report undisclosed promotion, suspicious merchant behaviour, or misleading commercial activity through the deal reporting controls or email support@dealrakyat.my.",
          ],
        },
      ]}
    />
  );
}
