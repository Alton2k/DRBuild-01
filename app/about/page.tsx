import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "About - Deal Rakyat",
  description: "About Deal Rakyat, a Malaysia-focused community deals platform.",
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About Deal Rakyat"
      title="Community-powered deals for Malaysia"
      intro="Deal Rakyat is a Malaysia-focused deals community where people can submit, discuss, vote on, and save promotions they think are genuinely useful."
      sections={[
        {
          title: "What we are building",
          body: [
            "Deal Rakyat is inspired by community deal platforms such as HotUKDeals and LatestDeals UK, adapted for shoppers in Malaysia. The goal is to help people find better prices, vouchers, bundles, free delivery offers, and limited-time promotions across local and international merchants that serve Malaysia.",
            "Most deal posts are user-submitted. That means prices, stock, shipping terms, and merchant conditions can change quickly. Community votes, comments, reports, and moderation help keep the feed useful.",
          ],
        },
        {
          title: "How the community works",
          body: [
            "Members can post deals, discuss whether an offer is worthwhile, report bad deals, and share context such as cheaper alternatives, expiry dates, or merchant restrictions.",
            "Moderators may approve, edit, expire, hide, or remove posts when needed. We aim to be fair, but we also need to protect users from spam, misleading claims, unsafe links, and abuse.",
          ],
        },
        {
          title: "Commercial transparency",
          body: [
            "Deal Rakyat does not currently add affiliate tracking or earn purchase commissions. The Affiliate Disclosure must be updated before any affiliate programme is enabled.",
            "Commercial relationships and self-promotion must be disclosed. Posts still need to be useful, accurate enough for the community, and open to discussion and reporting.",
          ],
        },
        {
          title: "Support channels",
          body: [
            "Deal and comment reports are available in the product. General support and privacy requests use support@dealrakyat.my, while formal takedown and legal notices use legal@dealrakyat.my. The Contact page explains what to include and the current response expectations.",
          ],
        },
      ]}
    />
  );
}
