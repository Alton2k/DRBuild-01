import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { markDealExpiredAction } from "@/app/actions";
import CloseOnOutsideDetails from "@/components/CloseOnOutsideDetails";
import CommentThread, { type ThreadComment } from "@/components/CommentThread";
import DealImageCarousel from "@/components/DealImageCarousel";
import DealVoteButtons from "@/components/DealVoteButtons";
import ExpirationTime from "@/components/ExpirationTime";
import { CommentIcon, EllipsisIcon } from "@/components/icons";
import ReportDealForm from "@/components/ReportDealForm";
import RunningTime from "@/components/RunningTime";
import SaveDealButton from "@/components/SaveDealButton";
import ShareDealButton from "@/components/ShareDealButton";
import UserImage from "@/components/UserImage";
import { getCurrentUser } from "@/lib/auth";
import { getCommentsForDealResult } from "@/lib/comments";
import { getDescriptionText, sanitizeDescriptionHtml } from "@/lib/description";
import { getDealByIdResult, getDealVoteDirection, type Deal } from "@/lib/deals";
import { getDealDiscountPercent, getDealSavingsAmount } from "@/lib/dealDisplay";
import { formatMyrPrice } from "@/lib/formatters";
import { getSavedDealIdsForUser } from "@/lib/savedDeals";
import { getAbsoluteUrl, siteDescription, siteName } from "@/lib/site";
import { getAccountSettingsByUserIds } from "@/lib/userSettings";

export const dynamic = "force-dynamic";

const commentViewerCookieName = "dealmy_comment_viewer_id";
const dealViewerCookieName = "dealmy_deal_viewer_id";

function getCategoryHref(category: string, subCategory?: string) {
  const params = new URLSearchParams();

  params.set("category", category);

  if (subCategory) {
    params.set("subCategory", subCategory);
  }

  return `/?${params.toString()}#deals`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getUserDisplayName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email ?? null;
}

function getAuthorInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

function getPriceVoteClassName(score: number) {
  if (score > 0) {
    return "deal-detail-current-price deal-detail-current-price-up";
  }

  if (score < 0) {
    return "deal-detail-current-price deal-detail-current-price-down";
  }

  return "deal-detail-current-price deal-detail-current-price-neutral";
}

function getShippingLabel(deal: Deal) {
  if (deal.hasFreeShipping) {
    return "Free shipping";
  }

  if (typeof deal.shippingCost === "number" && Number.isFinite(deal.shippingCost)) {
    return formatMyrPrice(deal.shippingCost);
  }

  return "";
}

function getExpirationLabel(deal: Deal) {
  if (!deal.expiredAt) {
    return "";
  }

  return `${deal.isExpired ? "Expired" : "Expires"} ${formatDateTime(deal.expiredAt)}`;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

function getDealPreviewDescription(deal: Deal) {
  const descriptionText = truncateText(getDescriptionText(deal.description), 155);
  const priceLabel = formatMyrPrice(deal.price);
  const storeLabel = deal.store ? ` at ${deal.store}` : "";

  return descriptionText || `${deal.title} for ${priceLabel}${storeLabel}. Shared by the Deal Rakyat community.`;
}

function getDealPreviewImage(deal: Deal) {
  return deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl || "/deal-rakyat-og.svg";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const dealResult = await getDealByIdResult(id);
  const deal = dealResult.ok ? dealResult.data : null;
  const dealUrl = getAbsoluteUrl(`/deal/${id}`);

  if (!deal || deal.status !== "approved") {
    const title = dealResult.ok ? "Deal not found" : "Deal temporarily unavailable";

    return {
      title,
      description: siteDescription,
      alternates: {
        canonical: dealUrl,
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const description = getDealPreviewDescription(deal);
  const imageUrl = getDealPreviewImage(deal);

  return {
    title: deal.title,
    description,
    alternates: {
      canonical: dealUrl,
    },
    openGraph: {
      title: deal.title,
      description,
      type: "article",
      url: dealUrl,
      siteName,
      images: [
        {
          url: imageUrl,
          alt: deal.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: deal.title,
      description,
      images: [imageUrl],
    },
  };
}

/**
 * Renders the full deal detail view for a single submitted deal.
 */
export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dealResult = await getDealByIdResult(id);

  if (!dealResult.ok) {
    return (
      <main className="deal-detail-page min-h-screen px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
        <div className="home-status-panel mx-auto max-w-3xl px-6 py-14 text-center">
          <div className="home-status-icon mx-auto flex h-14 w-14 items-center justify-center">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.4"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1 className="mt-5 text-3xl font-semibold text-slate-950">
            Deal temporarily unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-700">
            Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const deal = dealResult.data;

  if (!deal || deal.status !== "approved") {
    notFound();
  }

  const discountPercent = getDealDiscountPercent(deal);
  const commentsResult = await getCommentsForDealResult(deal.id);
  const comments = commentsResult.ok ? commentsResult.data : [];
  const commentsUnavailable = !commentsResult.ok;
  const cookieStore = await cookies();
  const user = await getCurrentUser();
  const currentUserName = getUserDisplayName(user);
  const viewerId = cookieStore.get(commentViewerCookieName)?.value;
  const dealViewerId = cookieStore.get(dealViewerCookieName)?.value;
  const [viewerDealVote, savedDealIds] = await Promise.all([
    getDealVoteDirection(deal.id, dealViewerId),
    user ? getSavedDealIdsForUser(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const publicAuthorSettings = await getAccountSettingsByUserIds([
    deal.authorUserId ?? "",
    ...comments.map((comment) => comment.authorUserId ?? ""),
  ]).catch(() => new Map());
  const dealAuthorProfile = deal.authorUserId ? publicAuthorSettings.get(deal.authorUserId)?.profile : null;
  const dealAuthorToggles = deal.authorUserId ? publicAuthorSettings.get(deal.authorUserId)?.toggles : null;
  const dealAuthorName = dealAuthorProfile?.userName || deal.authorName || deal.authorEmail || "Community member";
  const dealAuthorAvatarUrl = dealAuthorProfile?.avatarUrl ?? "";
  const dealAuthorProfileHref =
    deal.authorUserId && user?.id === deal.authorUserId
      ? "/profile"
      : deal.authorUserId && (dealAuthorToggles?.publicProfile ?? true)
        ? `/profile/${encodeURIComponent(dealAuthorName)}`
        : "";
  const threadComments: ThreadComment[] = comments.map(({ authorViewerId, authorUserId, likedBy, ...comment }) => ({
    ...comment,
    authorName: authorUserId ? publicAuthorSettings.get(authorUserId)?.profile.userName || comment.authorName : comment.authorName,
    authorAvatarUrl: authorUserId ? publicAuthorSettings.get(authorUserId)?.profile.avatarUrl ?? "" : "",
    authorProfileHref:
      authorUserId && user?.id === authorUserId
        ? "/profile"
        : authorUserId && (publicAuthorSettings.get(authorUserId)?.toggles.publicProfile ?? true)
          ? `/profile/${encodeURIComponent(publicAuthorSettings.get(authorUserId)?.profile.userName || comment.authorName)}`
          : "",
    viewerHasLiked: viewerId ? likedBy.includes(viewerId) : false,
    canDelete: Boolean(
      (viewerId && authorViewerId === viewerId) ||
      (user && authorUserId === user.id),
    ),
  }));
  const categoryHref = getCategoryHref(deal.category);
  const subCategoryHref = deal.subCategory ? getCategoryHref(deal.category, deal.subCategory) : "";
  const savingsAmount = getDealSavingsAmount(deal);
  const shippingLabel = getShippingLabel(deal);
  const dealHref = `/deal/${deal.id}`;
  const markExpiredAction = markDealExpiredAction.bind(null, deal.id);
  const galleryImages =
    deal.imageGalleryUrls.length > 0
      ? deal.imageGalleryUrls
      : [deal.imageUrl || deal.uploadedImageUrl].filter(Boolean);

  return (
    <main className="deal-detail-page min-h-screen px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <nav className="deal-detail-breadcrumbs flex min-w-0 flex-wrap items-center gap-2 text-sm font-bold" aria-label="Breadcrumb">
            <Link href="/#deals" className="deal-detail-breadcrumb-link transition">
              Home
            </Link>
            <span aria-hidden="true" className="deal-detail-breadcrumb-separator">
              &gt;
            </span>
            <Link href={categoryHref} className="deal-detail-breadcrumb-link transition">
              {deal.category}
            </Link>
            {deal.subCategory ? (
              <>
                <span aria-hidden="true" className="deal-detail-breadcrumb-separator">
                  &gt;
                </span>
                <Link href={subCategoryHref} className="deal-detail-breadcrumb-current transition" aria-current="page">
                  {deal.subCategory}
                </Link>
              </>
            ) : null}
          </nav>
          {deal.isExpired ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
              Expired
            </span>
          ) : null}
        </div>

        <section className="deal-detail-hero grid items-start gap-6 rounded-3xl border p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(220px,360px)_minmax(0,1fr)] lg:gap-8 lg:p-8">
          <div className="deal-detail-media">
            <DealImageCarousel images={galleryImages} title={deal.title} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <header className="deal-detail-header border-b pb-6">
              <h1 className="deal-detail-title text-3xl font-bold leading-tight sm:text-4xl">
                {deal.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
                <p className={`${getPriceVoteClassName(deal.score)} deal-detail-price text-3xl font-bold sm:text-4xl`}>
                  {formatMyrPrice(deal.price)}
                </p>
                {deal.originalPrice ? (
                  <p className="deal-detail-original-price pb-1 text-base line-through">
                    {formatMyrPrice(deal.originalPrice)}
                  </p>
                ) : null}
                {savingsAmount ? (
                  <span className="deal-detail-save-chip mb-1 rounded-full border px-3 py-1 text-xs font-bold">
                    Save {formatMyrPrice(savingsAmount)}
                  </span>
                ) : null}
                {discountPercent ? (
                  <span className="deal-detail-discount-chip mb-1 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em]">
                    {discountPercent}% off
                  </span>
                ) : null}
              </div>

              <div className="deal-detail-meta mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>
                  Posted <RunningTime timestamp={deal.createdAt} />
                </span>
                <span aria-hidden="true">/</span>
                <time dateTime={deal.createdAt}>{formatDateTime(deal.createdAt)}</time>
              </div>

              <dl className="deal-detail-summary-facts mt-5 grid gap-3 sm:grid-cols-2">
                {shippingLabel ? (
                  <div>
                    <dt className="deal-detail-fact-label text-xs font-bold uppercase tracking-[0.16em]">
                      Shipping
                    </dt>
                    <dd className="deal-detail-fact-value mt-1 text-sm font-bold">{shippingLabel}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="deal-detail-fact-label text-xs font-bold uppercase tracking-[0.16em]">
                    Posted By
                  </dt>
                  <dd className="mt-1">
                    {dealAuthorProfileHref ? (
                      <Link
                        href={dealAuthorProfileHref}
                        className="deal-detail-author-link inline-flex max-w-full items-center gap-2 rounded-md text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
                      >
                        <span className="deal-detail-author-avatar flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black">
                          {dealAuthorAvatarUrl ? (
                            <UserImage src={dealAuthorAvatarUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            getAuthorInitials(dealAuthorName)
                          )}
                        </span>
                        <span className="deal-detail-fact-value truncate">{dealAuthorName}</span>
                      </Link>
                    ) : (
                      <span className="deal-detail-author-link inline-flex max-w-full items-center gap-2 text-sm font-bold">
                        <span className="deal-detail-author-avatar flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-black">
                          {getAuthorInitials(dealAuthorName)}
                        </span>
                        <span className="deal-detail-fact-value truncate">{dealAuthorName}</span>
                      </span>
                    )}
                  </dd>
                </div>
                {getExpirationLabel(deal) ? (
                <div>
                  <dt className="deal-detail-fact-label text-xs font-bold uppercase tracking-[0.16em]">
                    Expiration
                  </dt>
                  <dd className="deal-detail-fact-value mt-1 text-sm font-bold">
                    {deal.expiredAt ? (
                      <ExpirationTime expiresAt={deal.expiredAt} fallback={getExpirationLabel(deal)} />
                    ) : (
                      getExpirationLabel(deal)
                    )}
                  </dd>
                </div>
                ) : null}
              </dl>
            </header>

            {deal.isExpired ? (
              <div className="theme-alert theme-alert-error p-4 text-sm leading-6">
                <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                  {"\u26A0"}
                </span>
                This deal is marked expired
                {deal.expiredAt ? ` as of ${formatDateTime(deal.expiredAt)}` : ""}.
              </div>
            ) : null}

            <div className="deal-detail-action-block">
            <div className="deal-detail-actions flex flex-wrap items-center gap-2">
              <DealVoteButtons
                dealId={deal.id}
                initialScore={deal.score}
                initialVote={viewerDealVote}
                disabled={deal.isExpired}
                buttonClassName="inline-flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-5 [&_svg]:w-5"
                containerClassName="inline-flex items-center gap-1 rounded-full border-0 bg-transparent p-0 shadow-none"
                scoreClassName="min-w-8 text-center text-base font-bold tabular-nums"
              />
              {deal.isExpired ? (
                <span
                  aria-label="Comments are closed for expired deals"
                  className="home-deal-card-stat inline-flex cursor-not-allowed items-center gap-2 text-base font-semibold opacity-45"
                >
                  <CommentIcon className="h-5 w-5" />
                  <span>{commentsUnavailable ? "-" : comments.length}</span>
                </span>
              ) : (
                <a
                  href="#comments"
                  aria-label={
                    commentsUnavailable
                      ? "Comments unavailable"
                      : `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`
                  }
                  className="home-deal-card-stat home-deal-card-stat-link inline-flex items-center gap-2 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
                >
                  <CommentIcon className="h-5 w-5" />
                  <span>{commentsUnavailable ? "-" : comments.length}</span>
                </a>
              )}
              <SaveDealButton
                dealId={deal.id}
                initialSaved={savedDealIds.has(deal.id)}
                isSignedIn={Boolean(user)}
                disabled={deal.isExpired}
                className="home-deal-card-icon-action ml-1 inline-flex h-9 w-9 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-5 [&_svg]:w-5"
              />
              <ShareDealButton
                title={deal.title}
                href={dealHref}
                text={`Check out this deal on Deal Rakyat: ${deal.title}`}
                disabled={deal.isExpired}
                className="home-deal-card-icon-action inline-flex h-9 w-9 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-5 [&_svg]:w-5"
              />
              <CloseOnOutsideDetails className="deal-detail-more-menu relative inline-flex">
                <summary
                  aria-label="More deal actions"
                  className="home-deal-card-icon-action inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 [&_svg]:h-5 [&_svg]:w-5"
                >
                  <EllipsisIcon />
                </summary>
                <div className="deal-detail-more-panel absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border p-3 shadow-md">
                  <form action={markExpiredAction}>
                    <button
                      type="submit"
                      disabled={deal.isExpired}
                      className="deal-detail-more-action inline-flex h-11 w-full items-center justify-center rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark expired
                    </button>
                  </form>

                  <ReportDealForm dealId={deal.id} />
                </div>
              </CloseOnOutsideDetails>
              <a
                href={deal.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={deal.isExpired}
                className={`ml-auto inline-flex h-12 min-w-[200px] items-center justify-center rounded-full px-7 text-sm font-bold transition ${
                  deal.isExpired
                    ? "pointer-events-none bg-slate-200 text-slate-500"
                    : "deal-detail-primary-action shadow-sm"
                }`}
              >
                {deal.isExpired ? "Deal Expired" : "View Deal"}
              </a>
            </div>
            </div>
          </div>
        </section>

        <section className="deal-detail-panel mt-6 rounded-3xl border p-5 shadow-sm sm:p-6">
          <p className="deal-detail-section-kicker text-sm font-bold uppercase tracking-[0.22em]">
            Description
          </p>
          {deal.voucherCode ? (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {deal.voucherCode ? (
                <div className="deal-detail-fact-card rounded-2xl border px-4 py-3">
                  <dt className="deal-detail-fact-label text-xs font-bold uppercase tracking-[0.16em]">
                    Voucher
                  </dt>
                  <dd className="deal-detail-fact-value mt-1 text-sm font-bold">{deal.voucherCode}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          <div
            className="deal-detail-description mt-4 text-[0.95rem] leading-7"
            dangerouslySetInnerHTML={{ __html: sanitizeDescriptionHtml(deal.description) }}
          />
        </section>

        <section id="comments" className="deal-detail-panel mt-8 scroll-mt-24 rounded-3xl border p-5 shadow-sm sm:p-8">
          <div className="pb-2">
            <p className="deal-detail-section-kicker text-sm font-bold uppercase tracking-[0.22em]">
              Community
            </p>
            <h2 className="deal-detail-section-title mt-2 text-2xl font-bold">Comments</h2>
          </div>

          {commentsUnavailable ? (
            <p className="theme-alert theme-alert-warning mt-5 p-4 text-sm font-semibold">
              <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
                {"\u26A0"}
              </span>
              Comments unavailable.
            </p>
          ) : (
            <CommentThread
              dealId={deal.id}
              comments={threadComments}
              readOnly={deal.isExpired}
              currentUserName={currentUserName}
            />
          )}
        </section>
      </div>
    </main>
  );
}
