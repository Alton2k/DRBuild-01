import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { markDealExpiredAction, reportDealAction } from "@/app/actions";
import CommentThread, { type ThreadComment } from "@/components/CommentThread";
import DealImageCarousel from "@/components/DealImageCarousel";
import DealVoteButtons from "@/components/DealVoteButtons";
import RunningTime from "@/components/RunningTime";
import SaveDealButton from "@/components/SaveDealButton";
import ShareDealButton from "@/components/ShareDealButton";
import { getCommentsForDeal } from "@/lib/comments";
import { getDealById, getDealVoteDirection, type Deal } from "@/lib/deals";

export const dynamic = "force-dynamic";

const commentViewerCookieName = "dealmy_comment_viewer_id";
const dealViewerCookieName = "dealmy_deal_viewer_id";

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getDiscountPercent(deal: Deal) {
  if (!deal.originalPrice || deal.originalPrice <= deal.price) {
    return null;
  }

  return Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getSavingsAmount(deal: Deal) {
  if (!deal.originalPrice || deal.originalPrice <= deal.price) {
    return null;
  }

  return deal.originalPrice - deal.price;
}

function CommentIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    </svg>
  );
}

function EllipsisIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const deal = await getDealById(id);

  return {
    title: deal ? `${deal.title} | Deal Rakyat` : "Deal not found | Deal Rakyat",
    description: deal?.description ?? "Deal detail page",
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
  const deal = await getDealById(id);

  if (!deal) {
    notFound();
  }

  const discountPercent = getDiscountPercent(deal);
  const comments = await getCommentsForDeal(deal.id);
  const cookieStore = await cookies();
  const viewerId = cookieStore.get(commentViewerCookieName)?.value;
  const dealViewerId = cookieStore.get(dealViewerCookieName)?.value;
  const viewerDealVote = await getDealVoteDirection(deal.id, dealViewerId);
  const threadComments: ThreadComment[] = comments.map(({ authorViewerId, likedBy, ...comment }) => ({
    ...comment,
    viewerHasLiked: viewerId ? likedBy.includes(viewerId) : false,
    canDelete: Boolean(viewerId && authorViewerId === viewerId),
  }));
  const categoryLabel = deal.subCategory
    ? `${deal.category} / ${deal.subCategory}`
    : deal.category;
  const savingsAmount = getSavingsAmount(deal);
  const dealHref = `/deal/${deal.id}`;
  const markExpiredAction = markDealExpiredAction.bind(null, deal.id);
  const reportAction = reportDealAction.bind(null, deal.id);
  const galleryImages =
    deal.imageGalleryUrls.length > 0
      ? deal.imageGalleryUrls
      : [deal.imageUrl || deal.uploadedImageUrl].filter(Boolean);

  return (
    <main className="deal-detail-page min-h-screen px-4 py-6 text-slate-900 sm:px-6 sm:py-8 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="deal-detail-back-link text-sm font-semibold transition">
            Back to deals
          </Link>
          {deal.isExpired ? (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
              Expired
            </span>
          ) : null}
        </div>

        <section className="deal-detail-hero grid items-start gap-6 rounded-3xl border p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] lg:gap-8 lg:p-8">
          <div className="deal-detail-media">
            <DealImageCarousel images={galleryImages} title={deal.title} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <header className="deal-detail-header border-b pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {deal.store}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {categoryLabel}
                </span>
                {discountPercent ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                    {discountPercent}% off
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {deal.title}
              </h1>

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
                <p className="text-3xl font-bold text-slate-950 sm:text-4xl">
                  {formatPrice(deal.price)}
                </p>
                {deal.originalPrice ? (
                  <p className="pb-1 text-base text-slate-500 line-through">
                    {formatPrice(deal.originalPrice)}
                  </p>
                ) : null}
                {savingsAmount ? (
                  <span className="mb-1 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                    Save {formatPrice(savingsAmount)}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>
                  Posted <RunningTime timestamp={deal.createdAt} />
                </span>
                <span aria-hidden="true">/</span>
                <time dateTime={deal.createdAt}>{formatDateTime(deal.createdAt)}</time>
              </div>
            </header>

            {deal.isExpired ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
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
              />
              <a
                href="#comments"
                aria-label={`${comments.length} ${comments.length === 1 ? "comment" : "comments"}`}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              >
                <CommentIcon />
                <span>{comments.length}</span>
              </a>
              <SaveDealButton dealId={deal.id} />
              <ShareDealButton
                title={deal.title}
                href={dealHref}
                text={`Check out this deal on Deal Rakyat: ${deal.title}`}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              />
              <details className="deal-detail-more-menu relative inline-flex">
                <summary
                  aria-label="More deal actions"
                  className="inline-flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                >
                  <EllipsisIcon />
                </summary>
                <div className="deal-detail-more-panel absolute right-0 z-20 mt-2 w-72 rounded-2xl border p-3 shadow-md">
                  <form action={markExpiredAction}>
                    <button
                      type="submit"
                      disabled={deal.isExpired}
                      className="deal-detail-more-action inline-flex h-11 w-full items-center justify-center rounded-full border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark expired
                    </button>
                  </form>

                  <form action={reportAction} className="mt-3 flex flex-col gap-3">
                    <label className="sr-only" htmlFor="report-reason">
                      Report reason
                    </label>
                    <select
                      id="report-reason"
                      name="reason"
                      defaultValue="expired"
                      className="min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950 shadow-sm outline-none transition hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200"
                    >
                      <option value="expired">Already expired</option>
                      <option value="bad-price">Price is wrong</option>
                      <option value="bad-link">Link does not work</option>
                      <option value="spam">Spam or unsafe</option>
                    </select>
                    <button
                      type="submit"
                      className="deal-detail-primary-action inline-flex h-11 items-center justify-center rounded-full px-4 text-sm font-semibold shadow-sm transition"
                    >
                      Report
                    </button>
                  </form>
                </div>
              </details>
            </div>

            <a
              href={deal.url}
              target="_blank"
              rel="noreferrer"
              aria-disabled={deal.isExpired}
              className={`mt-3 inline-flex h-12 w-full max-w-[260px] items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                deal.isExpired
                  ? "pointer-events-none bg-slate-200 text-slate-500"
                  : "deal-detail-primary-action shadow-sm"
              }`}
            >
              {deal.isExpired ? "Deal Expired" : "View Deal"}
            </a>
            </div>
          </div>
        </section>

        <section className="deal-detail-panel mt-6 rounded-3xl border p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Description
          </p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {deal.description}
          </p>
        </section>

        <section id="comments" className="deal-detail-panel mt-8 scroll-mt-24 rounded-3xl border p-5 shadow-sm sm:p-8">
          <div className="deal-detail-header border-b pb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Community
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Comments</h2>
          </div>

          <CommentThread dealId={deal.id} comments={threadComments} />
        </section>
      </div>
    </main>
  );
}
