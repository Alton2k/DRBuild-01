import RunningTime from "./components/RunningTime";

export const metadata = {
  title: "DealMY — Malaysia Deal Marketplace",
  description: "A clean deal-sharing homepage for Malaysia-focused deals with an empty state marketplace UI.",
};

const categories = [
  "Fashion",
  "Electronics",
  "Food",
  "Travel",
  "Lifestyle",
  "Health & Beauty",
];

const placeholderDeals = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  offsetMinutes: (index + 1) * 4,
}));

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <a href="#" className="inline-flex items-center gap-3 text-xl font-semibold text-slate-950">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
                D
              </span>
              Deal Rakyat
            </a>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="hidden sm:inline">Find the Best Deals in Malaysia</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Login
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Register
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-4 grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm sm:px-5 sm:py-4">
              <label className="sr-only" htmlFor="search-deals">
                Search deals
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-400">🔍</span>
                <input
                  id="search-deals"
                  type="search"
                  placeholder="Search deals, stores, categories"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Search
                </button>
              </div>
            </div>
            <a
              href="/post"
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Post Deal
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8 lg:grid lg:grid-cols-[1.6fr_0.9fr] lg:items-start">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-[2rem] bg-slate-100 text-4xl text-slate-400 shadow-inner">
              📦
            </div>
            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Marketplace
              </p>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Post a deal now!
              </h1>
              <p className="mt-3 text-base leading-7 text-slate-600 sm:text-lg">
                This is your Malaysia-focused deal community. Share the latest discounts, promos and shop-worthy finds with other deal hunters.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/post"
                className="inline-flex min-w-[170px] items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Post Deal
              </a>
              <button
                type="button"
                className="inline-flex min-w-[170px] items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Explore categories
              </button>
            </div>
          </div>
        </section>

        <aside className="hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:block lg:h-full">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                Browse categories
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Popular topics</h2>
            </div>
          </div>
          <div className="space-y-3">
            {categories.map((category) => (
              <div
                key={category}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                {category}
              </div>
            ))}
          </div>
        </aside>

        <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Community posts
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Latest deal shared by the community
                </h2>
              </div>
              <div className="text-sm text-slate-500">
                Posted <RunningTime timestamp={new Date(Date.now() - 18 * 60_000).toISOString()} />
              </div>
            </div>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        RM29 sneakers flash deal on Shopee
                      </p>
                      <p className="text-sm text-slate-500">Fashion • Shopee • KL delivery</p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
                      Hot
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    Shared by the community: limited stock on casual sneakers with free shipping for selected areas. Click into the deal for full details and coupon codes.
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl text-slate-400">
                  🛍️
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    💬 Comment
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    👍 Upvote
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    👎 Downvote
                  </button>
                </div>
                <a
                  href="/deal/placeholder"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View Deal
                </a>
              </div>
            </article>

            <div className="grid gap-4">
              {placeholderDeals.map((deal) => (
                <article
                  key={deal.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm min-h-[250px]"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex-1 space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold text-slate-950">Placeholder</p>
                          <p className="text-sm text-slate-500">Placeholder • Placeholder</p>
                        </div>
                        <RunningTime timestamp={new Date(Date.now() - deal.offsetMinutes * 60_000).toISOString()} />
                      </div>
                      <p className="text-sm leading-6 text-slate-600">
                        Placeholder content for the deal card, showing the community shared item and offering a consistent card size for scrolling.
                      </p>
                    </div>
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-3xl text-slate-400">
                      🛍️
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        💬 Comment
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        👍 Upvote
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        👎 Downvote
                      </button>
                    </div>
                    <a
                      href="/deal/placeholder"
                      className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      View Deal
                    </a>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Previous
              </button>
              <div className="text-sm text-slate-600">Page 1 of 5</div>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/90 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>DealMY</p>
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
