import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Community Rules - Deal Rakyat",
  description: "Community rules for Deal Rakyat users.",
};

export default function CommunityRulesPage() {
  return (
    <InfoPage
      eyebrow="Community"
      title="Community Rules"
      intro="These rules explain how users should submit deals, discuss offers, report problems, and keep Deal Rakyat useful for Malaysian shoppers."
      sections={[
        {
          title: "Post real, useful deals",
          body: [
            "Submit deals that are currently available to users in Malaysia or clearly explain any location, delivery, currency, platform, membership, or voucher restrictions.",
            "Include the final price in RM where possible, delivery fees, expiry dates, store name, promo code, stock limits, and any catch that would affect whether the deal is worthwhile.",
          ],
        },
        {
          title: "No spam or manipulation",
          body: [
            "Do not post fake deals, referral spam, hidden self-promotion, duplicate listings, vote manipulation, misleading titles, unsafe links, or deals for prohibited or illegal goods.",
            "Merchants, agencies, creators, and affiliates should disclose their relationship clearly. Moderators may limit promotional accounts or remove posts that do not serve the community.",
          ],
        },
        {
          title: "Discuss with respect",
          body: [
            "Healthy disagreement about price, quality, shipping, warranty, or merchant reputation is welcome. Personal attacks, harassment, hate speech, threats, doxxing, and repeated bad-faith arguments are not.",
            "Keep comments focused on helping shoppers decide whether the deal is good. Share alternatives, proof, screenshots, expiry updates, or store experiences where useful.",
          ],
        },
        {
          title: "Report bad deals",
          body: [
            "Use the deal and comment reporting tools to flag expired offers, wrong prices, suspicious merchants, counterfeit concerns, unsafe products, broken links, scams, abuse, or other content that needs moderator review.",
            "Reports should be accurate and made in good faith. Reporting a deal only because you dislike a brand, store, or user may be treated as misuse.",
          ],
        },
        {
          title: "Moderation actions",
          body: [
            "Moderators may edit titles, correct prices, add expiry information, merge duplicates, remove unsafe links, reject posts, hide comments, expire deals, or suspend accounts.",
            "Moderation decisions are intended to protect the community and keep deal discovery useful. Users may email support@dealrakyat.my if they believe a moderation decision should be reviewed.",
          ],
        },
      ]}
    />
  );
}
