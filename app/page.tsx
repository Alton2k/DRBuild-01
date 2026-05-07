import Link from "next/link";
import { cookies } from "next/headers";
import {
  getApprovedDeals,
  getDealVoteDirectionsByDealIds,
  type Deal,
  type DealFeedMode,
  type DealVoteDirection,
} from "@/lib/deals";
import { dealCategories } from "@/lib/categories";
import { getCommentCountsByDealIds } from "@/lib/comments";
import CategorySidebar from "@/components/CategorySidebar";
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
}>;

const feedModes: {
  value: DealFeedMode;
  label: string;
  description: string;
  heading: string;
}[] = [
  {
    value: "hot",
    label: "Trending",
    description: "Sorted by popularity",
    heading: "Trending deals right now",
  },
  {
    value: "new",
    label: "New",
    description: "Freshly shared finds",
    heading: "New deals just shared",
  },
  {
    value: "discussed",
    label: "Discussed",
    description: "Active community chatter",
    heading: "Deals people are talking about",
  },
];

const highlightedCategoryNames = [
  "Electronics",
  "Groceries",
  "Fashion & Accessories",
  "Travel",
  "Gaming",
  "Health & Beauty",
];

function getSingleSearchParam(value: string | string[] | undefined) {
  const resolvedValue = Array.isArray(value) ? value[0] : value;
  return resolvedValue?.trim() ?? "";
}

function getFeedMode(value: string | string[] | undefined): DealFeedMode {
  const feed = getSingleSearchParam(value).toLowerCase();
  return feedModes.some((mode) => mode.value === feed) ? (feed as DealFeedMode) : "hot";
}

function createHomeHref(filters: {
  q?: string;
  category?: string;
  subCategory?: string;
  feed?: DealFeedMode;
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
      className={`overflow-hidden rounded-3xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md ${
        deal.isExpired ? "border-rose-200 bg-rose-50/40 opacity-85" : "border-slate-200"
      }`}
    >
      <div className="grid gap-0 md:grid-cols-[190px_minmax(0,1fr)]">
        <Link
          href={dealHref}
          className="flex aspect-[16/10] items-center justify-center border-b border-slate-200 bg-slate-100 md:aspect-auto md:min-h-full md:border-b-0 md:border-r"
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

        <div className="flex min-w-0 flex-col p-4 sm:p-5 lg:p-6">
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

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <DealVoteButtons dealId={deal.id} initialScore={deal.score} initialVote={initialVote} />
              <Link
                href={`${dealHref}#comments`}
                aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                className="inline-flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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
              className="inline-flex h-12 min-w-[128px] items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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
  const selectedFeedMode = feedModes.find((mode) => mode.value === feed) ?? feedModes[0];
  const activeFilters = [
    q ? { label: `Search: ${q}` } : null,
    category ? { label: `Category: ${category}` } : null,
    subCategory ? { label: `Subcategory: ${subCategory}` } : null,
  ].filter((filter): filter is { label: string } => Boolean(filter));
  const hasActiveFilters = activeFilters.length > 0;
  const deals = await getApprovedDeals({ q, category, subCategory, feed });
  const viewerId = (await cookies()).get(dealViewerCookieName)?.value;
  const viewerVotes = await getDealVoteDirectionsByDealIds(
    deals.map((deal) => deal.id),
    viewerId,
  );
  const commentCounts = await getCommentCountsByDealIds(deals.map((deal) => deal.id));
  const highlightedCategories = dealCategories.filter((dealCategory) =>
    highlightedCategoryNames.includes(dealCategory.name),
  );
  const sidebarCategories = dealCategories.map((dealCategory) => ({
    href: createHomeHref({ q, category: dealCategory.name, feed }),
    label: dealCategory.name,
    active: dealCategory.name === category,
    subcategories: dealCategory.subcategories.map((subcategory) => ({
      href: createHomeHref({
        q,
        category: dealCategory.name,
        subCategory: subcategory,
        feed,
      }),
      label: subcategory,
      active: dealCategory.name === category && subcategory === subCategory,
    })),
  }));
  const isViewingSidebarCategory = dealCategories.some(
    (dealCategory) => dealCategory.name === category && !highlightedCategoryNames.includes(dealCategory.name),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid lg:grid-cols-[1.6fr_0.9fr] lg:px-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                Marketplace
              </p>
              <h1 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Good Deals, Shared Fast
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Find the latest savings from stores, apps, and shoppers around Malaysia. Browse fresh promos, price drops, vouchers, and limited-time offers shared by people who spot value first.
              </p>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Post a deal, vote on what&apos;s worth it, and help other Malaysians shop smarter.
              </p>
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:h-full">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
              Browse
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Categories</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Jump into popular deal sections, or open the full list.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={createHomeHref({ q, feed })}
              scroll={false}
              className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                category
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  : "border-slate-900 bg-slate-900 text-white"
              }`}
            >
              All
            </Link>
            {highlightedCategories.map((dealCategory) => (
              <Link
                key={dealCategory.name}
                href={createHomeHref({ q, category: dealCategory.name, feed })}
                scroll={false}
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  dealCategory.name === category
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                }`}
              >
                {dealCategory.name}
              </Link>
            ))}
          </div>

          <CategorySidebar categories={sidebarCategories} initiallyOpen={isViewingSidebarCategory} />
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:col-span-2">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Community posts
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {selectedFeedMode.heading}
                </h2>
                <p className="mt-2 text-sm text-slate-600">{selectedFeedMode.description}</p>
              </div>
              {deals.length > 0 ? (
                <div className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  {deals.length} {deals.length === 1 ? "deal" : "deals"}
                </div>
              ) : null}
            </div>

            <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-3">
              {feedModes.map((mode) => {
                const isSelected = mode.value === feed;

                return (
                  <Link
                    key={mode.value}
                    href={createHomeHref({ q, category, subCategory, feed: mode.value })}
                    scroll={false}
                    aria-current={isSelected ? "page" : undefined}
                    className={`rounded-2xl px-4 py-3 text-sm transition ${
                      isSelected
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-600 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    <span className="block font-semibold">{mode.label}</span>
                    <span className={`mt-1 block text-xs ${isSelected ? "text-slate-500" : "text-slate-500"}`}>
                      {mode.description}
                    </span>
                  </Link>
                );
              })}
            </div>

            {hasActiveFilters ? (
              <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Active filters</span>
                  {activeFilters.map((filter) => (
                    <span
                      key={filter.label}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {filter.label}
                    </span>
                  ))}
                </div>
                <Link
                  href={createHomeHref({ feed })}
                  scroll={false}
                  className="text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                >
                  Clear filters
                </Link>
              </div>
            ) : null}

            {deals.length > 0 ? (
              <div className="grid gap-4">
                {deals.map((deal) => (
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
                    href={createHomeHref({ feed })}
                    scroll={false}
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Clear filters
                  </Link>
                ) : (
                  <Link
                    href="/post"
                    className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                  >
                    Post a Deal
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
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
