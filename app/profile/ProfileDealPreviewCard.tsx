import Link from "next/link";
import DealVoteButtons from "@/components/DealVoteButtons";
import { CommentIcon } from "@/components/icons";
import RunningTime from "@/components/RunningTime";
import SaveDealButton from "@/components/SaveDealButton";
import ShareDealButton from "@/components/ShareDealButton";
import UserImage from "@/components/UserImage";
import type { Deal, DealVoteDirection } from "@/lib/deals";
import { getDealDiscountPercent } from "@/lib/dealDisplay";
import { formatMyrPrice } from "@/lib/formatters";

function getStatusLabel(status: Deal["status"]) {
  if (status === "approved") {
    return "Approved";
  }

  if (status === "rejected") {
    return "Rejected";
  }

  return "Pending review";
}

function getStatusClassName(status: Deal["status"]) {
  if (status === "approved") {
    return "border-emerald-600 bg-emerald-600 text-white";
  }

  if (status === "rejected") {
    return "border-rose-600 bg-rose-600 text-white";
  }

  return "border-amber-500 bg-amber-500 text-white";
}

export default function ProfileDealPreviewCard({
  deal,
  savedAt,
  initialVote,
  initialSaved,
}: {
  deal: Deal;
  savedAt?: string;
  initialVote: DealVoteDirection | null;
  initialSaved: boolean;
}) {
  const hasOriginalPrice = deal.originalPrice !== null && deal.originalPrice > deal.price;
  const discountPercent = getDealDiscountPercent(deal);
  const thumbnailUrl = deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl;
  const content = (
    <article className="home-deal-card flex min-h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex min-h-full flex-col">
        {deal.status === "approved" ? (
          <Link
            href={`/deal/${deal.id}`}
            aria-label={`View ${deal.title}`}
            className="home-deal-card-media relative flex aspect-[4/3] items-center justify-center border-b"
          >
          <div className="absolute left-3 top-3 z-10">
            <span
              className={`home-deal-card-badge inline-flex h-7 items-center border px-3 text-xs font-bold uppercase tracking-[0.12em] shadow-sm ${getStatusClassName(deal.status)}`}
            >
              {getStatusLabel(deal.status)}
            </span>
          </div>
          {discountPercent !== null ? (
            <div className="absolute right-3 top-3 z-10">
              <span className="home-deal-card-discount-tab h-7 px-2.5 text-xs font-bold shadow-sm">
                -{discountPercent}%
              </span>
            </div>
          ) : null}
          {thumbnailUrl ? (
            <UserImage
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-contain p-3 transition duration-200 hover:scale-[1.02]"
            />
          ) : (
            <span className="px-4 text-center text-sm font-medium text-slate-400">
              No image submitted
            </span>
          )}
          </Link>
        ) : (
          <div className="home-deal-card-media relative flex aspect-[4/3] items-center justify-center border-b">
            <div className="absolute left-3 top-3 z-10">
              <span
                className={`home-deal-card-badge inline-flex h-7 items-center border px-3 text-xs font-bold uppercase tracking-[0.12em] shadow-sm ${getStatusClassName(deal.status)}`}
              >
                {getStatusLabel(deal.status)}
              </span>
            </div>
            {discountPercent !== null ? (
              <div className="absolute right-3 top-3 z-10">
                <span className="home-deal-card-discount-tab h-7 px-2.5 text-xs font-bold shadow-sm">
                  -{discountPercent}%
                </span>
              </div>
            ) : null}
            {thumbnailUrl ? (
              <UserImage src={thumbnailUrl} alt="" className="h-full w-full object-contain p-3" />
            ) : (
              <span className="px-4 text-center text-sm font-medium text-slate-400">
                No image submitted
              </span>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col p-3">
          {deal.status === "approved" ? (
            <Link
              href={`/deal/${deal.id}`}
              className="truncate text-base font-bold leading-[1.35] text-slate-950 transition hover:text-[#dc115e]"
              title={deal.title}
            >
              {deal.title}
            </Link>
          ) : (
            <h3 className="truncate text-base font-bold leading-[1.35] text-slate-950" title={deal.title}>
              {deal.title}
            </h3>
          )}

          <div className="mt-2">
            <div className="flex flex-wrap items-end gap-2">
                <p className="home-deal-card-price text-2xl font-bold tracking-tight">
                {formatMyrPrice(deal.price)}
              </p>
              {hasOriginalPrice ? (
                <p className="pb-0.5 text-sm text-slate-500 line-through">
                  {formatMyrPrice(deal.originalPrice!)}
                </p>
              ) : null}
            </div>
            {deal.store ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">at {deal.store}</p>
            ) : null}
          </div>

          {deal.status === "rejected" && deal.moderationReason ? (
            <p className="mt-3 line-clamp-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {deal.moderationReason}
            </p>
          ) : null}

          <div className="pt-3">
          <div className="home-deal-card-actions flex items-center gap-1.5 border-t pt-2.5">
            <DealVoteButtons
              dealId={deal.id}
              initialScore={deal.score}
              initialVote={initialVote}
              disabled={deal.status !== "approved" || deal.isExpired}
              buttonClassName="inline-flex h-6 w-6 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:h-3.5 [&_svg]:w-3.5"
              containerClassName="inline-flex items-center gap-0.5 rounded-full border-0 bg-transparent p-0 shadow-none"
              scoreClassName="min-w-4 text-center text-xs font-bold tabular-nums"
            />
            {deal.status === "approved" ? (
              <Link
                href={`/deal/${deal.id}#comments`}
                aria-label={`${deal.commentCount} ${deal.commentCount === 1 ? "comment" : "comments"}`}
                className="home-deal-card-stat home-deal-card-stat-link inline-flex items-center gap-1 text-xs font-semibold transition"
              >
                <CommentIcon />
                <span>{deal.commentCount}</span>
              </Link>
            ) : (
              <span className="home-deal-card-stat inline-flex items-center gap-1 text-xs font-semibold opacity-45">
                <CommentIcon />
                <span>{deal.commentCount}</span>
              </span>
            )}
            <SaveDealButton
              dealId={deal.id}
              initialSaved={initialSaved}
              isSignedIn
              disabled={deal.status !== "approved" || deal.isExpired}
              className="home-deal-card-icon-action inline-flex h-6 w-6 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-4 [&_svg]:w-4"
            />
            <ShareDealButton
              title={deal.title}
              href={`/deal/${deal.id}`}
              text={`Check out this deal on Deal Rakyat: ${deal.title}`}
              disabled={deal.status !== "approved" || deal.isExpired}
              className="home-deal-card-icon-action inline-flex h-6 w-6 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-4 [&_svg]:w-4"
            />
            <span className="home-deal-card-stat ml-auto whitespace-nowrap text-[0.68rem] font-semibold">
              <RunningTime timestamp={savedAt ?? deal.createdAt} />
            </span>
          </div>
          </div>
        </div>
      </div>
    </article>
  );

  return content;
}
