import Link from "next/link";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import HomeDealCard from "./HomeDealCard";
import HomeDealCheckMiniCard from "./HomeDealCheckMiniCard";
import { siteDescription } from "@/lib/site";
import {
  getApprovedDealsPageResult,
  getDealByIdResult,
  getDealVoteDirectionsByDealIds,
  type Deal,
  type DealFeedMode,
  type PaginatedDeals,
} from "@/lib/deals";
import { getDealSavingsAmount } from "@/lib/dealDisplay";
import { getApprovedDealCommentCountsInRangeResult, getCommentCountsByDealIds } from "@/lib/comments";
import { getCurrentUser } from "@/lib/auth";
import { getSavedDealIdsForUser } from "@/lib/savedDeals";
import { getDealVoteViewerAliases, getDealVoteViewerId } from "@/lib/dealVoteIdentity";
import { formatMyrPrice } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deal Rakyat - Malaysia Deal Marketplace",
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
};

type HomeSearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  subCategory?: string | string[];
  feed?: string | string[];
  period?: string | string[];
  page?: string | string[];
}>;

type FeedPeriod = "day" | "week" | "month" | "all";

type AmbientGradientStyle = CSSProperties & {
  "--ambient-card-brand-stop": string;
  "--ambient-card-accent-x": string;
  "--ambient-card-accent-y": string;
  "--ambient-card-accent-stop": string;
  "--ambient-feed-brand-stop": string;
  "--ambient-feed-accent-x": string;
  "--ambient-feed-accent-y": string;
  "--ambient-feed-accent-stop": string;
};

function getRandomPercent(min: number, max: number) {
  return `${Math.round(min + Math.random() * (max - min))}%`;
}

function createAmbientGradientStyle(): AmbientGradientStyle {
  return {
    "--ambient-card-brand-stop": getRandomPercent(38, 50),
    "--ambient-card-accent-x": getRandomPercent(0, 14),
    "--ambient-card-accent-y": getRandomPercent(84, 100),
    "--ambient-card-accent-stop": getRandomPercent(58, 70),
    "--ambient-feed-brand-stop": getRandomPercent(34, 44),
    "--ambient-feed-accent-x": getRandomPercent(4, 18),
    "--ambient-feed-accent-y": getRandomPercent(0, 12),
    "--ambient-feed-accent-stop": getRandomPercent(24, 34),
  };
}

const singaporeUtcOffsetMs = 8 * 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;

type RankingDefinition = {
  label: string;
  metric: string;
  period: string;
  description: string;
  dataSource: string;
  calculation: string;
};

// Homepage ranking labels must stay in sync with these definitions.
// All calendar periods are evaluated in Singapore time (Asia/Singapore).
const RANKING_DEFINITIONS = {
  topDealToday: {
    label: "Top Deal Today",
    metric: "score",
    period: "Singapore calendar day",
    description: "",
    dataSource: "Approved, unexpired deals",
    calculation: "Sort today's approved deals by score descending and use the first deal.",
  },
  topDealThisWeek: {
    label: "Top Deal This Week",
    metric: "score",
    period: "Singapore calendar week, Monday to Sunday",
    description: "",
    dataSource: "Approved, unexpired deals",
    calculation: "Sort this week's approved deals by score descending and use the first deal.",
  },
  biggestPriceDropToday: {
    label: "Biggest Price Drop Today",
    metric: "originalPrice - price",
    period: "Singapore calendar day",
    description: "",
    dataSource: "Approved, unexpired deals with a higher original price",
    calculation: "Compare absolute savings in RM and use the deal with the largest reduction.",
  },
  mostDiscussedToday: {
    label: "Most Discussed Today",
    metric: "comment count",
    period: "Singapore calendar day",
    description: "",
    dataSource: "Comments on approved, unexpired deals",
    calculation: "Count today's comments per approved deal and use the highest count.",
  },
  feedTopScore: {
    label: "Top Score",
    metric: "score",
    period: "Selected period",
    description: "Highest community score",
    dataSource: "Approved, unexpired deals",
    calculation: "Sort selected-period approved deals by score descending.",
  },
  feedMostComments: {
    label: "Most Comments",
    metric: "comment count",
    period: "Selected deal-posted period",
    description: "Highest comment count",
    dataSource: "Approved, unexpired deals and stored comment totals",
    calculation: "Filter deals by selected posted period, then sort by total comment count descending.",
  },
  feedNewest: {
    label: "Newest",
    metric: "createdAt",
    period: "All time",
    description: "Latest approved deals",
    dataSource: "Approved, unexpired deals",
    calculation: "Sort approved deals by creation time descending.",
  },
} satisfies Record<string, RankingDefinition>;

const feedModes: {
  value: DealFeedMode;
  label: string;
  description: string;
}[] = [
  {
    value: "hot",
    label: RANKING_DEFINITIONS.feedTopScore.label,
    description: RANKING_DEFINITIONS.feedTopScore.description,
  },
  {
    value: "discussed",
    label: RANKING_DEFINITIONS.feedMostComments.label,
    description: RANKING_DEFINITIONS.feedMostComments.description,
  },
  {
    value: "new",
    label: RANKING_DEFINITIONS.feedNewest.label,
    description: RANKING_DEFINITIONS.feedNewest.description,
  },
];

const feedPeriods: { value: FeedPeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "day", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

function renderFeedModeIcon(mode: DealFeedMode) {
  if (mode === "hot") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="community-feed-icon-comments h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      >
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
        <path d="M5 6H3v1a4 4 0 0 0 4 4" />
        <path d="M19 6h2v1a4 4 0 0 1-4 4" />
      </svg>
    );
  }

  if (mode === "discussed") {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      >
        <path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.6-4.7A8 8 0 1 1 21 12Z" />
        <path d="M8 12h.01" />
        <path d="M12 12h.01" />
        <path d="M16 12h.01" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

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

function getPageNumber(value: string | string[] | undefined) {
  const page = Number.parseInt(getSingleSearchParam(value), 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function getSingaporeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(partMap.get("year")),
    month: Number(partMap.get("month")),
    day: Number(partMap.get("day")),
  };
}

function getDateRangeFromSingaporeLocalMidnight(localMidnightUtcMs: number) {
  return {
    start: new Date(localMidnightUtcMs - singaporeUtcOffsetMs).toISOString(),
    end: new Date(localMidnightUtcMs + oneDayMs - singaporeUtcOffsetMs).toISOString(),
  };
}

function getTodayRange(date = new Date()) {
  const { year, month, day } = getSingaporeDateParts(date);
  return getDateRangeFromSingaporeLocalMidnight(Date.UTC(year, month - 1, day));
}

function getThisWeekRange(date = new Date()) {
  const { year, month, day } = getSingaporeDateParts(date);
  const localMidnightUtcMs = Date.UTC(year, month - 1, day);
  const dayOfWeek = new Date(localMidnightUtcMs).getUTCDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStartLocalMidnightUtcMs = localMidnightUtcMs - daysSinceMonday * oneDayMs;

  return {
    start: new Date(weekStartLocalMidnightUtcMs - singaporeUtcOffsetMs).toISOString(),
    end: new Date(weekStartLocalMidnightUtcMs + 7 * oneDayMs - singaporeUtcOffsetMs).toISOString(),
  };
}

function getThisMonthRange(date = new Date()) {
  const { year, month } = getSingaporeDateParts(date);
  const monthStartLocalMidnightUtcMs = Date.UTC(year, month - 1, 1);
  const nextMonthStartLocalMidnightUtcMs = Date.UTC(year, month, 1);

  return {
    start: new Date(monthStartLocalMidnightUtcMs - singaporeUtcOffsetMs).toISOString(),
    end: new Date(nextMonthStartLocalMidnightUtcMs - singaporeUtcOffsetMs).toISOString(),
  };
}

function getFeedPeriodRange(period: FeedPeriod): { start?: string; end?: string } {
  if (period === "day") {
    return getTodayRange();
  }

  if (period === "week") {
    return getThisWeekRange();
  }

  if (period === "month") {
    return getThisMonthRange();
  }

  return {};
}

function createHomeHref(filters: {
  q?: string;
  category?: string;
  subCategory?: string;
  feed?: DealFeedMode;
  period?: FeedPeriod;
  page?: number;
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

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  const queryString = params.toString();
  return queryString ? `/?${queryString}` : "/";
}

function getBiggestSavingsDeal(deals: Deal[]) {
  return deals.reduce<Deal | null>((best, deal) => {
    const savingsAmount = getDealSavingsAmount(deal) ?? 0;
    const bestSavingsAmount = best ? getDealSavingsAmount(best) ?? 0 : 0;
    return savingsAmount > bestSavingsAmount ? deal : best;
  }, null);
}

function getUnavailableDealsPage(page: number, pageSize: number): PaginatedDeals {
  return {
    deals: [],
    pagination: {
      page,
      pageSize,
      pageCount: 1,
      total: 0,
    },
  };
}

async function getMostDiscussedDealByCommentsInRange(range: { start: string; end: string }) {
  const commentCountsResult = await getApprovedDealCommentCountsInRangeResult({
    createdAfter: range.start,
    createdBefore: range.end,
  });

  if (!commentCountsResult.ok) {
    return { ok: false as const, deal: null, commentCount: 0 };
  }

  const topCommentCount = commentCountsResult.data[0];

  if (!topCommentCount) {
    return { ok: true as const, deal: null, commentCount: 0 };
  }

  const dealResult = await getDealByIdResult(topCommentCount.dealId);

  if (!dealResult.ok) {
    return { ok: false as const, deal: null, commentCount: 0 };
  }

  return {
    ok: true as const,
    deal: dealResult.data,
    commentCount: dealResult.data ? topCommentCount.count : 0,
  };
}

const dealViewerCookieName = "dealmy_deal_viewer_id";

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
  const page = getPageNumber(params.page);
  const pageSize = 12;
  const periodRange: { start?: string; end?: string } = feed === "new" ? {} : getFeedPeriodRange(period);
  const todayRange = getTodayRange();
  const thisWeekRange = getThisWeekRange();
  const activeFilters = [
    q ? { label: `Search: ${q}` } : null,
    category ? { label: `Category: ${category}` } : null,
    subCategory ? { label: `Subcategory: ${subCategory}` } : null,
  ].filter((filter): filter is { label: string } => Boolean(filter));
  const hasActiveFilters = activeFilters.length > 0;
  const userPromise = getCurrentUser();
  const dealPagePromise = getApprovedDealsPageResult({
    q,
    category,
    subCategory,
    feed,
    createdAfter: periodRange.start,
    createdBefore: periodRange.end,
    page,
    pageSize,
  });
  const topDealTodayPromise = getApprovedDealsPageResult({
    feed: "hot",
    createdAfter: todayRange.start,
    createdBefore: todayRange.end,
    page: 1,
    pageSize: 1,
  });
  const topDealThisWeekPromise = getApprovedDealsPageResult({
    feed: "hot",
    createdAfter: thisWeekRange.start,
    createdBefore: thisWeekRange.end,
    page: 1,
    pageSize: 1,
  });
  const todayDropDealsPromise = getApprovedDealsPageResult({
    feed: "new",
    createdAfter: todayRange.start,
    createdBefore: todayRange.end,
    page: 1,
    pageSize: 100,
  });
  const mostDiscussedTodayDealPromise = getMostDiscussedDealByCommentsInRange(todayRange);
  const viewerIdPromise = cookies().then((cookieStore) => cookieStore.get(dealViewerCookieName)?.value);
  const [
    dealPageResult,
    topDealTodayResult,
    topDealThisWeekResult,
    todayDropDealsResult,
    mostDiscussedTodayDealResult,
    viewerId,
    user,
  ] = await Promise.all([
    dealPagePromise,
    topDealTodayPromise,
    topDealThisWeekPromise,
    todayDropDealsPromise,
    mostDiscussedTodayDealPromise,
    viewerIdPromise,
    userPromise,
  ]);
  const dealPageFailed = !dealPageResult.ok;
  const { deals, pagination } = dealPageResult.ok ? dealPageResult.data : getUnavailableDealsPage(page, pageSize);
  const { deals: topDealsToday } = topDealTodayResult.ok ? topDealTodayResult.data : getUnavailableDealsPage(1, 1);
  const { deals: topDealsThisWeek } = topDealThisWeekResult.ok
    ? topDealThisWeekResult.data
    : getUnavailableDealsPage(1, 1);
  const { deals: todayDropDeals } = todayDropDealsResult.ok ? todayDropDealsResult.data : getUnavailableDealsPage(1, 100);
  const visibleDeals = deals;
  const visibleDealIds = visibleDeals.map((deal) => deal.id);
  const dealVoteViewerId = getDealVoteViewerId({ userId: user?.id, anonymousViewerId: viewerId });
  const dealVoteViewerAliases = getDealVoteViewerAliases({ userId: user?.id, anonymousViewerId: viewerId });
  const [viewerVotes, savedDealIds, visibleCommentCounts] = await Promise.all([
    getDealVoteDirectionsByDealIds(visibleDealIds, dealVoteViewerId, user?.id, dealVoteViewerAliases),
    user ? getSavedDealIdsForUser(user.id) : Promise.resolve(new Set<string>()),
    getCommentCountsByDealIds(visibleDealIds),
  ]);
  const visibleDealsWithCommentCounts = visibleDeals.map((deal) => ({
    ...deal,
    commentCount: visibleCommentCounts.get(deal.id) ?? deal.commentCount,
  }));
  const topDealToday = topDealsToday[0] ?? null;
  const topDealThisWeek = topDealsThisWeek[0] ?? null;
  const biggestDropDeal = getBiggestSavingsDeal(todayDropDeals);
  const mostDiscussedDeal = mostDiscussedTodayDealResult.deal;
  const biggestDropSavings = biggestDropDeal ? getDealSavingsAmount(biggestDropDeal) : null;
  const mostDiscussedCount = mostDiscussedTodayDealResult.commentCount;
  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < pagination.pageCount;
  const ambientGradientStyle = createAmbientGradientStyle();
  const dealCheckPanel = (
    <section className="home-secondary-content min-w-0 py-2 sm:py-6">
      <div className="deal-check-card rounded-3xl border p-5 shadow-sm">
        <div className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 border-b border-slate-200 pb-3">
          <span className="flex h-12 w-12 items-center justify-center text-[#dc115e]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5">
              <path d="M22 12h-4l-3 8-6-16-3 8H2" />
            </svg>
          </span>
          <h2 className="deal-check-heading text-xl font-semibold uppercase tracking-[0.16em]">
            Today&apos;s deal check
          </h2>
        </div>

        <div className="deal-check-mini-grid mt-4">
          <HomeDealCheckMiniCard
            href={topDealToday ? `/deal/${topDealToday.id}` : undefined}
            ariaLabel={topDealToday ? `View top deal today: ${topDealToday.title}` : undefined}
            label={RANKING_DEFINITIONS.topDealToday.label}
            deal={topDealTodayResult.ok ? topDealToday : null}
            value={topDealTodayResult.ok && topDealToday ? formatMyrPrice(topDealToday.price) : "-"}
            fallbackTitle={topDealTodayResult.ok ? "No deals ranked today yet" : "Deals unavailable"}
          />
          <HomeDealCheckMiniCard
            href={topDealThisWeek ? `/deal/${topDealThisWeek.id}` : undefined}
            ariaLabel={topDealThisWeek ? `View top deal this week: ${topDealThisWeek.title}` : undefined}
            label={RANKING_DEFINITIONS.topDealThisWeek.label}
            deal={topDealThisWeekResult.ok ? topDealThisWeek : null}
            value={topDealThisWeekResult.ok && topDealThisWeek ? formatMyrPrice(topDealThisWeek.price) : "-"}
            fallbackTitle={topDealThisWeekResult.ok ? "No deals ranked this week yet" : "Deals unavailable"}
          />
          <HomeDealCheckMiniCard
            href={biggestDropDeal ? `/deal/${biggestDropDeal.id}` : undefined}
            ariaLabel={biggestDropDeal ? `View biggest price drop today: ${biggestDropDeal.title}` : undefined}
            label={RANKING_DEFINITIONS.biggestPriceDropToday.label}
            deal={todayDropDealsResult.ok ? biggestDropDeal : null}
            value={biggestDropSavings ? `Save ${formatMyrPrice(biggestDropSavings)}` : "-"}
            fallbackTitle={todayDropDealsResult.ok ? "No price drops ranked today yet" : "Deals unavailable"}
          />
          <HomeDealCheckMiniCard
            href={mostDiscussedDeal ? `/deal/${mostDiscussedDeal.id}#comments` : undefined}
            ariaLabel={mostDiscussedDeal ? `View most discussed deal today: ${mostDiscussedDeal.title}` : undefined}
            label={RANKING_DEFINITIONS.mostDiscussedToday.label}
            deal={mostDiscussedTodayDealResult.ok ? mostDiscussedDeal : null}
            value={`${mostDiscussedCount} ${mostDiscussedCount === 1 ? "comment" : "comments"}`}
            fallbackTitle={mostDiscussedTodayDealResult.ok ? "No discussions today yet" : "Comments unavailable"}
          />
        </div>
      </div>
    </section>
  );

  return (
    <div className="home-page flex flex-1 flex-col text-slate-900" style={ambientGradientStyle}>
      <main className="home-marketplace-layout mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:grid-cols-[1.6fr_0.9fr] lg:px-8">
        <section className="home-introduction min-w-0 py-2 sm:py-6 lg:pl-4">
          <div className="max-w-3xl">
            <h1 className="max-w-3xl text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Need a better deal?
              <span className="block">See the <span className="text-[#dc115e]">DR.</span></span>
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-xl sm:leading-9">
              Discover discounts, price drops, vouchers, and hidden gems shared by the community.
            </p>

            <div className="mt-5 flex gap-3 sm:mt-9 sm:flex-row">
                <Link
                  href="#deals"
                  className="hero-explore-button inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e6f24f]/25 sm:h-14 sm:flex-none sm:gap-3 sm:px-7"
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
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#dc115e] px-4 text-sm font-bold text-white transition hover:bg-[#dc115e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25 sm:h-14 sm:flex-none sm:gap-3 sm:px-7"
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

            <div className="home-trust-points mt-11 grid grid-cols-3 gap-5 text-sm font-bold text-slate-950">
              <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <span className="deal-check-icon-yellow flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                    <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <span>Real People<br />Real Deals</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <span className="deal-check-icon-yellow flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </span>
                <span>Community<br />Verified</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                <span className="deal-check-icon-yellow flex h-11 w-11 shrink-0 items-center justify-center rounded-full border">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25">
                    <path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                    <path d="M7 7h.01" />
                  </svg>
                </span>
                <span>Save More<br />Everyday</span>
              </div>
            </div>
          </div>
        </section>

        {dealCheckPanel}

        <section id="deals" className="home-deal-feed home-panel min-w-0 scroll-mt-28 lg:col-span-2">
          <div className="flex flex-col gap-7">
            <div className="community-feed-controls">
              <div className="home-feed-filter-groups flex flex-wrap items-center gap-2.5 lg:flex-nowrap lg:justify-between">
                <div className="home-feed-mode-grid flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
                  {feedModes.map((mode) => {
                    const isSelected = mode.value === feed;

                    return (
                      <Link
                        key={mode.value}
                        href={`${createHomeHref({
                          q,
                          category,
                          subCategory,
                          feed: mode.value,
                          period: mode.value === "new" ? "all" : period,
                        })}#deals`}
                        title={mode.label}
                        aria-current={isSelected ? "page" : undefined}
                        className={`community-feed-period inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                          isSelected
                            ? "community-feed-period-active"
                            : "community-feed-period-idle"
                        }`}
                      >
                        {renderFeedModeIcon(mode.value)}
                        <span>{mode.label}</span>
                      </Link>
                    );
                  })}
                </div>

                {feed !== "new" ? (
                  <div className="home-feed-period-grid community-feed-periods flex flex-wrap items-center gap-2 lg:flex-nowrap">
                    {feedPeriods.map((mode) => {
                      const isSelected = mode.value === period;

                      return (
                        <Link
                          key={mode.value}
                          href={`${createHomeHref({ q, category, subCategory, feed, period: mode.value })}#deals`}
                          title={
                            mode.value === "all"
                              ? "No posted-date filter."
                              : `Uses the ${mode.label.toLowerCase()} Singapore calendar period.`
                          }
                          aria-current={isSelected ? "page" : undefined}
                          className={`community-feed-period inline-flex h-11 min-w-0 items-center justify-center rounded-md border px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
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
            </div>

            {hasActiveFilters ? (
              <div className="active-filters-card flex w-full max-w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <span className="active-filters-label inline-flex items-center gap-1.5 text-sm font-bold">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.4"
                    >
                      <path d="M4 5h16" />
                      <path d="M7 12h10" />
                      <path d="M10 19h4" />
                    </svg>
                    Active filters
                  </span>
                  {activeFilters.map((filter) => (
                    <span
                      key={filter.label}
                      className="active-filter-chip max-w-full truncate rounded-full border px-3 py-1 text-xs font-bold"
                    >
                      {filter.label}
                    </span>
                  ))}
                </div>
                <Link
                  href={createHomeHref({ feed, period })}
                  scroll={false}
                  className="active-filters-clear inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold transition"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.4"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v5" />
                    <path d="M14 11v5" />
                  </svg>
                  Clear all
                </Link>
              </div>
            ) : null}

            {dealPageFailed ? (
              <div className="home-status-panel px-6 py-14 text-center">
                <div className="home-status-icon mx-auto mb-5 flex h-14 w-14 items-center justify-center">
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
                <h3 className="text-xl font-semibold text-slate-950">
                  Deals are temporarily unavailable
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-700">
                  Check your connection, then try loading these deals again.
                </p>
                <a href={createHomeHref({ q, category, subCategory, feed, period, page })} className="post-primary-button mt-5 inline-flex h-11 items-center justify-center rounded-full px-5 text-sm font-bold">Try again</a>
              </div>
            ) : visibleDealsWithCommentCounts.length > 0 ? (
              <div className="home-deal-grid grid gap-4">
                {visibleDealsWithCommentCounts.map((deal, index) => (
                  <HomeDealCard
                    key={deal.id}
                    deal={deal}
                    commentCount={deal.commentCount}
                    initialVote={viewerVotes.get(deal.id) ?? null}
                    initialSaved={savedDealIds.has(deal.id)}
                    isSignedIn={Boolean(user)}
                    voteStorageScope={dealVoteViewerId}
                    imageLoading={index === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
            ) : (
              <div className="home-empty-state px-6 py-14 text-center">
                <h3 className="text-xl font-semibold">
                  {hasActiveFilters ? "Sorry, we couldn't find any posts" : "No approved deals yet"}
                </h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6">
                  {hasActiveFilters
                    ? "Please try changing the filter options."
                    : "Submit the first real deal, then approve it from the admin page to publish it on the homepage."}
                </p>
                {hasActiveFilters ? (
                  null
                ) : (
                  <Link
                    href="/post"
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#dc115e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc115e]"
                  >
                    Post a Deal
                  </Link>
                )}
              </div>
            )}

            {pagination.pageCount > 1 ? (
              <nav className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-slate-600">
                  Page {pagination.page} of {pagination.pageCount}
                </p>
                <div className="flex gap-2">
                  {hasPreviousPage ? (
                    <Link
                      href={createHomeHref({ q, category, subCategory, feed, period, page: pagination.page - 1 })}
                      scroll={false}
                      className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#dc115e]/40 hover:text-slate-950"
                    >
                      Previous
                    </Link>
                  ) : null}
                  {hasNextPage ? (
                    <Link
                      href={createHomeHref({ q, category, subCategory, feed, period, page: pagination.page + 1 })}
                      scroll={false}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#dc115e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#dc115e]"
                    >
                      Next
                    </Link>
                  ) : null}
                </div>
              </nav>
            ) : null}
          </div>
        </section>

      </main>

      <footer className="site-footer border-t px-4 py-6 text-sm sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>Deal Rakyat</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/about" className="transition">
              About
            </Link>
            <Link href="/terms" className="transition">
              Terms
            </Link>
            <Link href="/privacy" className="transition">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
