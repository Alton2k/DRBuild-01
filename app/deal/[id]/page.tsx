import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { markDealExpiredAction, reportDealAction } from "@/app/actions";
import CommentThread, { type ThreadComment } from "@/components/CommentThread";
import DealImageCarousel from "@/components/DealImageCarousel";
import DealVoteButtons from "@/components/DealVoteButtons";
import RunningTime from "@/components/RunningTime";
import UserImage from "@/components/UserImage";
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

function getStoreHost(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function DetailStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "warning" | "danger" | "positive";
}) {
  const valueClassName = {
    neutral: "text-slate-950",
    warning: "text-amber-700",
    danger: "text-rose-700",
    positive: "text-emerald-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-sm font-semibold ${valueClassName}`}>{value}</dd>
    </div>
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
    title: deal ? `${deal.title} | DealMY` : "Deal not found | DealMY",
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
  const storeHost = getStoreHost(deal.url);
  const commentsLabel = `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`;
  const reportsLabel =
    deal.reportCount > 0
      ? `${deal.reportCount} ${deal.reportCount === 1 ? "report" : "reports"}`
      : "No reports";
  const markExpiredAction = markDealExpiredAction.bind(null, deal.id);
  const reportAction = reportDealAction.bind(null, deal.id);
  const galleryImages =
    deal.imageGalleryUrls.length > 0
      ? deal.imageGalleryUrls
      : [deal.imageUrl || deal.uploadedImageUrl].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-sm font-semibold text-slate-600 transition hover:text-slate-950">
            Back to deals
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {deal.isExpired ? (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                Expired
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              {deal.status}
            </span>
            {deal.reportCount > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Reported
              </span>
            ) : null}
          </div>
        </div>

        <section className="grid gap-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
          <DealImageCarousel images={galleryImages} title={deal.title} />

          <div className="flex flex-col gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {deal.store}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  {categoryLabel}
                </span>
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {deal.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span>
                  Posted <RunningTime timestamp={deal.createdAt} />
                </span>
                <time dateTime={deal.createdAt}>({formatDateTime(deal.createdAt)})</time>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Deal price
                  </p>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <p className="text-4xl font-semibold text-slate-950 sm:text-5xl">
                      {formatPrice(deal.price)}
                    </p>
                    {deal.originalPrice ? (
                      <p className="pb-1 text-base text-slate-500 line-through">
                        {formatPrice(deal.originalPrice)}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {discountPercent ? (
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                        {discountPercent}% off
                      </span>
                    ) : null}
                    {savingsAmount ? (
                      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                        Save {formatPrice(savingsAmount)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <dl className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-[320px]">
                  <DetailStat label="Score" value={String(deal.score)} tone={deal.score >= 0 ? "positive" : "danger"} />
                  <DetailStat label="Discussion" value={commentsLabel} />
                  <DetailStat label="Store" value={deal.store} />
                  <DetailStat label="Reports" value={reportsLabel} tone={deal.reportCount > 0 ? "warning" : "neutral"} />
                </dl>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {deal.isExpired ? "This deal is marked expired" : `Open deal at ${deal.store}`}
                    </p>
                    <p className="mt-1 break-all text-xs leading-5 text-slate-500">
                      {storeHost || deal.url}
                    </p>
                  </div>
                  <a
                    href={deal.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={deal.isExpired}
                    className={`inline-flex h-12 shrink-0 items-center justify-center rounded-full px-5 text-sm font-semibold transition ${
                      deal.isExpired
                        ? "pointer-events-none bg-slate-200 text-slate-500"
                        : "bg-slate-900 text-white hover:bg-slate-800"
                    }`}
                  >
                    {deal.isExpired ? "Deal Expired" : "Go to Deal"}
                  </a>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <DealVoteButtons
                  dealId={deal.id}
                  initialScore={deal.score}
                  initialVote={viewerDealVote}
                  scoreClassName="text-sm text-slate-600"
                  buttonClassName="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>
            </div>

            {(deal.isExpired || deal.reportCount > 0) ? (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                <h2 className="text-base font-semibold text-amber-950">Community context</h2>
                <div className="mt-3 grid gap-2 text-sm leading-6 text-amber-900">
                  {deal.isExpired ? (
                    <p>
                      Marked expired
                      {deal.expiredAt ? ` on ${formatDateTime(deal.expiredAt)}` : ""}. Check comments before attempting checkout.
                    </p>
                  ) : null}
                  {deal.reportCount > 0 ? (
                    <p>
                      {deal.reportCount} community {deal.reportCount === 1 ? "report has" : "reports have"} been submitted for this deal.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Details
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Deal description</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {deal.description}
            </p>
            {deal.uploadedImageUrl && deal.imageGalleryUrls.length === 0 ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Submitted image</p>
                <UserImage
                  src={deal.uploadedImageUrl}
                  alt=""
                  className="mt-4 max-h-[420px] w-full rounded-2xl object-contain"
                />
              </div>
            ) : null}
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between lg:flex-col">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Maintenance
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">Keep this deal useful</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mark it expired or report issues so the community can shop with more confidence.
                </p>
                {deal.reportCount > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-amber-700">
                    {deal.reportCount} report{deal.reportCount === 1 ? "" : "s"} submitted
                  </p>
                ) : null}
              </div>
              <form action={markExpiredAction}>
                <button
                  type="submit"
                  disabled={deal.isExpired}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark expired
                </button>
              </form>
            </div>

            <form action={reportAction} className="mt-5 flex flex-col gap-3">
              <label className="sr-only" htmlFor="report-reason">
                Report reason
              </label>
              <select
                id="report-reason"
                name="reason"
                defaultValue="expired"
                className="min-h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              >
                <option value="expired">Already expired</option>
                <option value="bad-price">Price is wrong</option>
                <option value="bad-link">Link does not work</option>
                <option value="spam">Spam or unsafe</option>
              </select>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Report
              </button>
            </form>
          </section>
        </section>

        <section id="comments" className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Community
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Discussion</h2>
            
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              {commentsLabel}
            </span>
          </div>

          <CommentThread dealId={deal.id} comments={threadComments} />
        </section>
      </div>
    </main>
  );
}
