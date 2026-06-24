import Link from "next/link";
import DealVoteButtons from "@/components/DealVoteButtons";
import ExpirationTime from "@/components/ExpirationTime";
import { CommentIcon } from "@/components/icons";
import RunningTime from "@/components/RunningTime";
import SaveDealButton from "@/components/SaveDealButton";
import ShareDealButton from "@/components/ShareDealButton";
import UserImage from "@/components/UserImage";
import type { Deal, DealVoteDirection } from "@/lib/deals";
import { getDealDiscountPercent } from "@/lib/dealDisplay";
import { formatMyrPrice } from "@/lib/formatters";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function getExpirationLabel(deal: Deal) {
  if (!deal.expiredAt) {
    return "";
  }

  return `${deal.isExpired ? "Expired" : "Expires"} ${formatShortDate(deal.expiredAt)}`;
}

export default function HomeDealCard({
  deal,
  commentCount,
  initialVote,
  initialSaved,
  isSignedIn,
}: {
  deal: Deal;
  commentCount: number;
  initialVote: DealVoteDirection | null;
  initialSaved: boolean;
  isSignedIn: boolean;
}) {
  const discountPercent = getDealDiscountPercent(deal);
  const expirationLabel = getExpirationLabel(deal);
  const thumbnailUrl = deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl;
  const dealHref = `/deal/${deal.id}`;

  return (
    <article
      className={`home-deal-card flex min-h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        deal.isExpired ? "home-deal-card-expired" : ""
      }`}
    >
      <div className="flex min-h-full flex-col">
        <Link
          href={dealHref}
          className="home-deal-card-media relative flex aspect-[4/3] items-center justify-center border-b"
          aria-label={`View ${deal.title}`}
        >
          <div className="absolute left-3 top-3 z-10 flex items-start">
            {deal.isExpired ? (
              <span className="home-deal-card-badge home-deal-card-badge-muted inline-flex h-7 items-center px-2.5 text-xs font-bold shadow-sm">
                Expired
              </span>
            ) : (
              <span className="home-deal-card-badge home-deal-card-badge-trending inline-flex h-7 items-center px-2.5 text-xs font-bold shadow-sm">
                Trending
              </span>
            )}
          </div>
          {discountPercent ? (
            <div className="absolute right-3 top-3 z-10">
              <span className="home-deal-card-discount-tab h-7 px-2.5 text-xs font-bold shadow-sm">
                -{discountPercent}%
              </span>
            </div>
          ) : null}
          {thumbnailUrl ? (
            <span className="block h-full w-full overflow-hidden">
              <UserImage
                src={thumbnailUrl}
                alt=""
                className={`h-full w-full object-contain p-3 transition duration-200 hover:scale-[1.02] ${
                  deal.isExpired ? "grayscale" : ""
                }`}
              />
            </span>
          ) : (
            <span className="px-4 text-center text-sm font-medium text-slate-400">
              No image submitted
            </span>
          )}
        </Link>

        <div className="flex min-h-0 flex-1 flex-col p-3">
          <Link
            href={dealHref}
            className="truncate text-base font-bold leading-[1.35] text-slate-950 transition hover:text-slate-700"
            title={deal.title}
          >
            {deal.title}
          </Link>

          <div className="mt-2">
            <div className="flex flex-wrap items-end gap-2">
              <p className="home-deal-card-price text-2xl font-bold tracking-tight">
                {formatMyrPrice(deal.price)}
              </p>
              {deal.originalPrice ? (
                <p className="pb-0.5 text-sm text-slate-500 line-through">
                  {formatMyrPrice(deal.originalPrice)}
                </p>
              ) : null}
            </div>
            <div className="mt-0.5 flex min-w-0 items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-slate-500">
                at {deal.store}
              </p>
              {expirationLabel && !deal.isExpired ? (
                <span className="home-deal-card-fact shrink-0 rounded-full border px-3 py-1 text-xs font-medium text-slate-600">
                {deal.expiredAt ? (
                  <ExpirationTime expiresAt={deal.expiredAt} fallback={expirationLabel} />
                ) : (
                  expirationLabel
                )}
                </span>
              ) : null}
            </div>
          </div>

          <div className="pt-3">
            <Link
              href={dealHref}
              className="home-deal-card-cta inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
            >
              Get Deal
            </Link>

            <div className="home-deal-card-actions mt-3 flex items-center gap-1.5 border-t pt-2.5">
              <DealVoteButtons
                dealId={deal.id}
                initialScore={deal.score}
                initialVote={initialVote}
                disabled={deal.isExpired}
                buttonClassName="inline-flex h-6 w-6 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-3.5 [&_svg]:w-3.5"
                containerClassName="inline-flex items-center gap-0.5 rounded-full border-0 bg-transparent p-0 shadow-none"
                scoreClassName="min-w-4 text-center text-xs font-bold tabular-nums"
              />
              {deal.isExpired ? (
                <span
                  aria-label="Comments are closed for expired deals"
                  className="home-deal-card-stat inline-flex cursor-not-allowed items-center gap-1 text-xs font-semibold opacity-45"
                >
                  <CommentIcon className="h-4 w-4" />
                  <span>{commentCount}</span>
                </span>
              ) : (
                <Link
                  href={`${dealHref}#comments`}
                  aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                  className="home-deal-card-stat home-deal-card-stat-link inline-flex items-center gap-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
                >
                  <CommentIcon className="h-4 w-4" />
                  <span>{commentCount}</span>
                </Link>
              )}
              <SaveDealButton
                dealId={deal.id}
                initialSaved={initialSaved}
                isSignedIn={isSignedIn}
                disabled={deal.isExpired}
                className="home-deal-card-icon-action ml-1 inline-flex h-6 w-6 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-4 [&_svg]:w-4"
              />
              <ShareDealButton
                title={deal.title}
                href={dealHref}
                text={`Check out this deal on Deal Rakyat: ${deal.title}`}
                disabled={deal.isExpired}
                className="home-deal-card-icon-action inline-flex h-6 w-6 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-4 [&_svg]:w-4"
              />
              <span className="home-deal-card-stat ml-auto whitespace-nowrap text-[0.68rem] font-semibold">
                <RunningTime timestamp={deal.createdAt} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
