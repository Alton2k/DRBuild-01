import type { Metadata } from "next";
import InfoPage from "../infoPage";

export const metadata: Metadata = {
  title: "Terms - Deal Rakyat",
  description: "Terms for using Deal Rakyat.",
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms of Use"
      intro="These terms explain the rules for using Deal Rakyat, including accounts, user-submitted deals, moderation, outbound links, and content review requests."
      sections={[
        {
          title: "Using Deal Rakyat",
          body: [
            "Deal Rakyat is a community deals platform for Malaysia. By using the site, creating an account, submitting a deal, voting, commenting, or reporting content, users agree to follow these terms and the Community Rules.",
            "Features may be changed, removed, paused, or limited when needed for security, moderation, maintenance, or service quality.",
          ],
        },
        {
          title: "Accounts and conduct",
          body: [
            "Users are responsible for keeping account details accurate and secure. Do not share an account, impersonate another person, create accounts to manipulate votes, or use the site for spam, scams, harassment, or unlawful activity.",
            "Deal Rakyat may restrict, suspend, or remove accounts that break these rules, interfere with moderation, submit misleading content, abuse reporting tools, or attempt to harm the service.",
          ],
        },
        {
          title: "User-submitted deals",
          body: [
            "Users are responsible for the deals, comments, images, links, prices, voucher codes, and other content they submit. Deal details should be truthful to the best of the submitter's knowledge and should include important limitations such as delivery fees, location restrictions, membership requirements, expiry dates, or minimum spend.",
            "Prices, availability, merchant pages, shipping terms, and promotion conditions can change without notice. Users should check the merchant's own terms before purchasing.",
          ],
        },
        {
          title: "Moderation and reports",
          body: [
            "Deal Rakyat may review, edit, move, expire, hide, reject, or remove posts and comments for quality, safety, legal, spam, duplicate, affiliate, or community reasons.",
            "Users can report bad deals, expired offers, unsafe links, misleading prices, suspected scams, prohibited items, abusive comments, or content that may infringe rights. Reports should be made in good faith and include enough detail for review.",
          ],
        },
        {
          title: "Affiliate links and commissions",
          body: [
            "Deal Rakyat does not currently add affiliate tracking to community links or earn commissions from purchases. The Affiliate Disclosure will be updated before any affiliate programme is enabled.",
            "Outbound links do not make Deal Rakyat the seller, merchant, delivery provider, warranty provider, or payment processor. Any purchase is between the user and the relevant merchant or platform.",
          ],
        },
        {
          title: "Takedown requests",
          body: [
            "Rights holders, merchants, users, or affected parties can request review of content that is unlawful, misleading, infringing, unsafe, confidential, or otherwise inappropriate. Use the in-product report controls where available or email formal requests to legal@dealrakyat.my.",
            "A useful takedown request should identify the content, explain the issue, provide contact details, and include supporting information. Deal Rakyat may ask for more information before taking action.",
          ],
        },
        {
          title: "No formal advice",
          body: [
            "Deal Rakyat content is shared for community discovery and discussion. It is not financial, legal, tax, product safety, or professional advice.",
            "Users should make their own purchasing decisions and check merchant terms, warranty coverage, return policies, delivery areas, and product suitability before buying.",
          ],
        },
      ]}
    />
  );
}
