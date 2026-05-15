import Link from "next/link";
import { cookies } from "next/headers";
import {
  getApprovedDeals,
  getDealVoteDirectionsByDealIds,
  type Deal,
  type DealFeedMode,
  type DealVoteDirection,
} from "@/lib/deals";
import { getCommentCountsByDealIds } from "@/lib/comments";
import DealVoteButtons from "@/components/DealVoteButtons";
import RunningTime from "@/components/RunningTime";
import SaveDealButton from "@/components/SaveDealButton";
import ShareDealButton from "@/components/ShareDealButton";
import UserImage from "@/components/UserImage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deal Rakyat - Malaysia Deal Marketplace",
  description: "A clean deal-sharing homepage for Malaysia-focused community deals.",
};

type HomeSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  subCategory?: string | string[];
  feed?: string | string[];
  period?: string | string[];
}>;

type FeedPeriod = "day" | "week" | "month" | "all";

const feedModes: {
  value: DealFeedMode;
  label: string;
  description: string;
  heading: string;
}[] = [
  {
    value: "hot",
    label: "Trending",
    description: "Sorted by Popularity",
    heading: "Trending Deals",
  },
  {
    value: "discussed",
    label: "Discussed",
    description: "Active Chatter",
    heading: "Most Discussed Deals",
  },
  {
    value: "new",
    label: "All",
    description: "All Community Deals",
    heading: "All Deals",
  },
];

const feedPeriods: { value: FeedPeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

function getSingleSearchParam(value: string | string[] | undefined) {
  const resolvedValue = Array.isArray(value) ? value[0] : value;
  return resolvedValue?.trim() ?? "";
}

function getFeedMode(value: string | string[] | undefined): DealFeedMode {
  const feed = getSingleSearchParam(value).toLowerCase();
  return feedModes.some((mode) => mode.value === feed) ? (feed as DealFeedMode) : "hot";
}

function getFeedPeriod(value: string | string[] | undefined): FeedPeriod {
  const period = getSingleSearchParam(value).toLowerCase();
  return feedPeriods.some((mode) => mode.value === period) ? (period as FeedPeriod) : "all";
}

function getCreatedAfter(period: FeedPeriod) {
  if (period === "all") {
    return undefined;
  }

  const createdAfter = new Date();
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  createdAfter.setDate(createdAfter.getDate() - days);
  return createdAfter.toISOString();
}

function createHomeHref(filters: {
  q?: string;
  category?: string;
  subCategory?: string;
  feed?: DealFeedMode;
  period?: FeedPeriod;
}) {
  const params = new URLSearchParams();

  if (filters.q) {
    params.set("q", filters.q);
  }

  if (filters.category) {
    params.set("category", filters.category);
  }

  if (filters.subCategory) {
    params.set("subCategory", filters.subCategory);
  }

  if (filters.feed && filters.feed !== "hot") {
    params.set("feed", filters.feed);
  }

  if (filters.period && filters.period !== "all" && filters.feed !== "new") {
    params.set("period", filters.period);
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

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

function getSavingsAmount(deal: Deal) {
  if (!deal.originalPrice || deal.originalPrice <= deal.price) {
    return null;
  }

  return deal.originalPrice - deal.price;
}

const dealViewerCookieName = "dealmy_deal_viewer_id";

function CommentIcon({ className = "h-4 w-4", strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
    >
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" />
    </svg>
  );
}

function DealCard({
  deal,
  commentCount,
  initialVote,
}: {
  deal: Deal;
  commentCount: number;
  initialVote: DealVoteDirection | null;
}) {
  const discountPercent = getDiscountPercent(deal);
  const savingsAmount = getSavingsAmount(deal);
  const categoryLabel = deal.subCategory
    ? `${deal.category} / ${deal.subCategory}`
    : deal.category;
  const thumbnailUrl = deal.imageGalleryUrls[0] || deal.imageUrl || deal.uploadedImageUrl;
  const dealHref = `/deal/${deal.id}`;

  return (
    <article
      className={`home-deal-card overflow-hidden rounded-3xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        deal.isExpired ? "home-deal-card-expired opacity-85" : ""
      }`}
    >
      <div className="grid gap-0 md:grid-cols-[210px_minmax(0,1fr)]">
        <Link
          href={dealHref}
          className="home-deal-card-media flex aspect-[16/10] items-center justify-center border-b md:aspect-auto md:min-h-full md:border-b-0 md:border-r"
          aria-label={`View ${deal.title}`}
        >
          {thumbnailUrl ? (
            <UserImage
              src={thumbnailUrl}
              alt=""
              className={`h-full w-full object-contain p-4 transition duration-200 hover:scale-[1.02] ${deal.isExpired ? "grayscale" : ""}`}
            />
          ) : (
            <span className="px-4 text-center text-sm font-medium text-slate-400">
              No image submitted
            </span>
          )}
        </Link>

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {deal.isExpired ? (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Expired
                  </span>
                ) : null}
                {discountPercent ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {discountPercent}% off
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  <RunningTime timestamp={deal.createdAt} />
                </span>
              </div>

              <Link
                href={dealHref}
                className="line-clamp-2 text-lg font-semibold leading-6 text-slate-950 transition hover:text-slate-700 sm:text-xl"
              >
                {deal.title}
              </Link>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {deal.store}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {categoryLabel}
                </span>
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                <p className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  {formatPrice(deal.price)}
                </p>
                {deal.originalPrice ? (
                  <p className="pb-1 text-sm text-slate-500 line-through">
                    {formatPrice(deal.originalPrice)}
                  </p>
                ) : null}
              </div>
              {savingsAmount ? (
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  Save {formatPrice(savingsAmount)}
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
            {deal.description}
          </p>

          <div className="home-deal-card-actions mt-5 flex flex-col gap-3 border-t pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <DealVoteButtons dealId={deal.id} initialScore={deal.score} initialVote={initialVote} />
              <Link
                href={`${dealHref}#comments`}
                aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#e0115f]/40 hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
              >
                <CommentIcon />
                <span>{commentCount}</span>
              </Link>
              <SaveDealButton dealId={deal.id} />
              <ShareDealButton
                title={deal.title}
                href={dealHref}
                text={`Check out this deal on Deal Rakyat: ${deal.title}`}
              />
            </div>
            <Link
              href={dealHref}
              className="inline-flex h-12 min-w-[128px] items-center justify-center rounded-full bg-[#e0115f] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c90f55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/20"
            >
              View Deal
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

/**
 * Renders the public homepage with approved deals from the local deal store.
 */
export default async function Home({ searchParams }: { searchParams: HomeSearchParams }) {
  const params = await searchParams;
  const q = getSingleSearchParam(params.q);
  const category = getSingleSearchParam(params.category);
  const subCategory = getSingleSearchParam(params.subCategory);
  const feed = getFeedMode(params.feed);
  const period = feed === "new" ? "all" : getFeedPeriod(params.period);
  const createdAfter = feed === "new" ? undefined : getCreatedAfter(period);
  const selectedFeedMode = feedModes.find((mode) => mode.value === feed) ?? feedModes[0];
  const activeFilters = [
    q ? { label: `Search: ${q}` } : null,
    category ? { label: `Category: ${category}` } : null,
    subCategory ? { label: `Subcategory: ${subCategory}` } : null,
  ].filter((filter): filter is { label: string } => Boolean(filter));
  const hasActiveFilters = activeFilters.length > 0;
  const deals = await getApprovedDeals({ q, category, subCategory, feed, createdAfter });
  const allDeals = await getApprovedDeals();
  const viewerId = (await cookies()).get(dealViewerCookieName)?.value;
  const viewerVotes = await getDealVoteDirectionsByDealIds(
    deals.map((deal) => deal.id),
    viewerId,
  );
  const commentCounts = await getCommentCountsByDealIds(deals.map((deal) => deal.id));
  const visibleDeals =
    feed === "discussed"
      ? deals
          .slice()
          .sort((first, second) => (commentCounts.get(second.id) ?? 0) - (commentCounts.get(first.id) ?? 0))
      : deals;
  const allDealCommentCounts = await getCommentCountsByDealIds(allDeals.map((deal) => deal.id));
  const bestDeal = allDeals[0] ?? null;
  const biggestDropDeal = allDeals.reduce<Deal | null>((best, deal) => {
    const discountPercent = getDiscountPercent(deal) ?? 0;
    const bestDiscountPercent = best ? getDiscountPercent(best) ?? 0 : 0;
    return discountPercent > bestDiscountPercent ? deal : best;
  }, null);
  const mostDiscussedDeal = allDeals.reduce<Deal | null>((best, deal) => {
    const commentCount = allDealCommentCounts.get(deal.id) ?? 0;
    const bestCommentCount = best ? allDealCommentCounts.get(best.id) ?? 0 : 0;
    return commentCount > bestCommentCount ? deal : best;
  }, null);
  const biggestDropPercent = biggestDropDeal ? getDiscountPercent(biggestDropDeal) : null;
  const mostDiscussedCount = mostDiscussedDeal ? allDealCommentCounts.get(mostDiscussedDeal.id) ?? 0 : 0;

  return (
    <div className="home-page min-h-screen text-slate-900">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[1.6fr_0.9fr] lg:px-8">
        <section className="py-6 sm:py-8 lg:col-span-2">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)] lg:items-center">
            <div className="max-w-2xl">
              <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Need a better deal?
                <span className="block">See the <span className="text-[#e0115f]">DR.</span></span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                Discover the Hottest Discount, Price Drops, Voucher and Hidden Gems shared by our Community 
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#deals"
                  className="hero-explore-button inline-flex h-12 items-center justify-center gap-3 rounded-full px-6 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e6f24f]/25"
                >
                  Explore Deals
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </Link>
                <Link
                  href="/post"
                  className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-[#e0115f] px-6 text-sm font-bold text-white transition hover:bg-[#c90f55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/25"
                >
                  Post a Deal
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </Link>
              </div>

              <div className="mt-10 grid gap-4 text-sm font-semibold text-slate-950 sm:grid-cols-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center text-[#e6f24f]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                      <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span>Real People<br />Real Deals</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center text-[#e6f24f]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <span>Community<br />Verified</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center text-[#e6f24f]">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                      <path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                      <path d="M7 7h.01" />
                    </svg>
                  </span>
                  <span>Save More<br />Everyday</span>
                </div>
              </div>
            </div>

            <div className="deal-check-card rounded-3xl border p-5 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
                <span className="text-[#e0115f]">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                    <path d="M22 12h-4l-3 8-6-16-3 8H2" />
                  </svg>
                </span>
                <h2 className="text-lg font-bold uppercase tracking-[0.12em] text-slate-950">
                  Today&apos;s deal check
                </h2>
              </div>

              <div className="divide-y divide-slate-200">
                <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-5">
                  <span className="deal-check-icon deal-check-icon-yellow flex h-14 w-14 items-center justify-center rounded-full border">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                      <path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                      <path d="M7 7h.01" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-600">Best Deal Today</p>
                    <p className="truncate text-lg font-bold text-slate-950">
                      {bestDeal?.title ?? "No deal yet"}
                    </p>
                  </div>
                  <p className="text-right text-lg font-bold text-slate-950">
                    {bestDeal ? formatPrice(bestDeal.price) : "-"}
                  </p>
                </div>

                <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-5">
                  <span className="deal-check-icon deal-check-icon-ruby flex h-14 w-14 items-center justify-center rounded-full border">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                      <path d="m3 7 6 6 4-4 8 8" />
                      <path d="M21 10v7h-7" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Biggest Drop</p>
                    <p className="text-2xl font-bold text-slate-950">
                      {biggestDropPercent ? `-${biggestDropPercent}%` : "-"}
                    </p>
                    <p className="text-sm text-slate-500">Price drop detected</p>
                  </div>
                </div>

                <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-5">
                  <span className="deal-check-icon deal-check-icon-cyan flex h-14 w-14 items-center justify-center rounded-full border">
                    <CommentIcon className="h-6 w-6 shrink-0" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-600">Most Discussed</p>
                    <p className="truncate text-lg font-bold text-slate-950">
                      {mostDiscussedDeal?.title ?? "No discussion yet"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {mostDiscussedCount} {mostDiscussedCount === 1 ? "comment" : "comments"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-5">
                  <span className="deal-check-icon deal-check-icon-yellow flex h-14 w-14 items-center justify-center rounded-full border">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-600">Community Approved</p>
                    <p className="text-lg font-bold text-slate-950">
                      {allDeals.length} {allDeals.length === 1 ? "deal" : "deals"}
                    </p>
                    <p className="text-sm text-slate-500">High quality picks</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="deals" className="home-panel scroll-mt-28 lg:col-span-2">
          <div className="flex flex-col gap-5">
            <div className="community-feed-controls rounded-3xl border p-3 sm:p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <h2 className="community-feed-title truncate text-2xl font-bold tracking-tight sm:text-3xl">
                    {selectedFeedMode.heading}
                  </h2>
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-[520px]">
                  {feedModes.map((mode) => {
                    const isSelected = mode.value === feed;

                    return (
                      <Link
                        key={mode.value}
                        href={createHomeHref({
                          q,
                          category,
                          subCategory,
                          feed: mode.value,
                          period: mode.value === "new" ? "all" : period,
                        })}
                        scroll={false}
                        aria-current={isSelected ? "page" : undefined}
                        className={`community-feed-tab group rounded-2xl px-3 py-3 text-center text-sm transition ${
                          isSelected
                            ? "community-feed-tab-active shadow-sm"
                            : "community-feed-tab-idle"
                        }`}
                      >
                        <span className="block text-sm font-bold">
                          {mode.label}
                        </span>
                        <span
                          className={`community-feed-tab-description mt-0.5 block text-[11px] ${
                            isSelected
                              ? "community-feed-tab-description-active"
                              : "community-feed-tab-description-idle"
                          }`}
                        >
                          {mode.description}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {feed !== "new" ? (
                <div className="community-feed-periods mt-4 flex flex-wrap items-center justify-end gap-2">
                  {feedPeriods.map((mode) => {
                    const isSelected = mode.value === period;

                    return (
                      <Link
                        key={mode.value}
                        href={createHomeHref({ q, category, subCategory, feed, period: mode.value })}
                        scroll={false}
                        aria-current={isSelected ? "page" : undefined}
                        className={`community-feed-period rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "community-feed-period-active"
                            : "community-feed-period-idle"
                        }`}
                      >
                        {mode.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-col gap-3 rounded-3xl border border-[#e6f24f] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Active filters</span>
                  {activeFilters.map((filter) => (
                    <span
                      key={filter.label}
                      className="rounded-full border border-[#e0115f]/20 bg-[#e6f24f]/20 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {filter.label}
                    </span>
                  ))}
                </div>
                <Link
                  href={createHomeHref({ feed, period })}
                  scroll={false}
                  className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  Clear filters
                </Link>
              </div>
            ) : null}

            {visibleDeals.length > 0 ? (
              <div className="grid gap-4">
                {visibleDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    commentCount={commentCounts.get(deal.id) ?? 0}
                    initialVote={viewerVotes.get(deal.id) ?? null}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500">
                  0
                </div>
                <h3 className="text-xl font-semibold text-slate-950">
                  {hasActiveFilters ? "No matching deals found" : "No approved deals yet"}
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
                  {hasActiveFilters
                    ? "Try clearing filters or searching for a different store, category, or deal keyword."
                    : "Submit the first real deal, then approve it from the admin page to publish it on the homepage."}
                </p>
                {hasActiveFilters ? (
                  <Link
                    href={createHomeHref({ feed, period })}
                    scroll={false}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#e0115f] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c90f55]"
                  >
                    Clear filters
                  </Link>
                ) : (
                  <Link
                    href="/post"
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#e0115f] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c90f55]"
                  >
                    Post a Deal
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e6f24f] bg-white/90 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Deal Rakyat</p>
          <div className="flex flex-wrap gap-4">
            <a href="#" className="transition hover:text-slate-900">
              About
            </a>
            <a href="#" className="transition hover:text-slate-900">
              Terms
            </a>
            <a href="#" className="transition hover:text-slate-900">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
