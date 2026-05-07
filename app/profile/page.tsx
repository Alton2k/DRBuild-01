"use client";

import { useState } from "react";

type ProfileTab = "posted" | "saved" | "comments" | "settings";

const profile = {
  name: "Aina Rahman",
  email: "aina.rahman@example.com",
  joinedAt: "March 2026",
  badge: "Trusted Scout",
  initials: "AR",
};

const stats = [
  { label: "Deals posted", value: "18" },
  { label: "Approved deals", value: "14" },
  { label: "Comments", value: "42" },
  { label: "Saved deals", value: "6" },
  { label: "Total score", value: "+286" },
];

const tabs: { value: ProfileTab; label: string }[] = [
  { value: "posted", label: "Posted Deals" },
  { value: "saved", label: "Saved Deals" },
  { value: "comments", label: "Comments" },
  { value: "settings", label: "Settings" },
];

const postedDeals = [
  {
    title: "Samsung Galaxy Buds FE at Shopee MY",
    store: "Shopee",
    category: "Electronics / Audio",
    price: 179,
    originalPrice: 299,
    status: "Approved",
    score: 74,
    comments: 12,
    postedAt: "2 days ago",
    description:
      "Stackable voucher price spotted during the weekly tech sale. Best value appears after platform coins and free shipping voucher.",
  },
  {
    title: "Lotus's weekend grocery bundle",
    store: "Lotus's",
    category: "Groceries",
    price: 49.9,
    originalPrice: 72.5,
    status: "Approved",
    score: 38,
    comments: 8,
    postedAt: "5 days ago",
    description:
      "Useful pantry bundle for rice, cooking oil, and household staples. Availability varies by outlet.",
  },
  {
    title: "Kuala Lumpur to Langkawi flight promo",
    store: "AirAsia",
    category: "Travel / Flights",
    price: 59,
    originalPrice: 129,
    status: "Pending review",
    score: 0,
    comments: 0,
    postedAt: "Today",
    description:
      "Frontend preview of a submitted deal that is still waiting for moderation.",
  },
];

const savedDeals = [
  {
    title: "Uniqlo AIRism innerwear promo",
    store: "Uniqlo",
    note: "Saved for payday checkout",
  },
  {
    title: "TNG eWallet dining cashback",
    store: "Touch 'n Go",
    note: "Check participating outlets before using",
  },
];

const recentComments = [
  {
    deal: "Samsung Galaxy Buds FE at Shopee MY",
    body: "Voucher stack still works for me in Selangor. Make sure to claim the shop voucher first.",
    time: "Yesterday",
  },
  {
    deal: "Lotus's weekend grocery bundle",
    body: "Saw the same bundle in Penang, but the cooking oil brand was substituted.",
    time: "3 days ago",
  },
  {
    deal: "Gaming keyboard flash sale",
    body: "Price is good, but shipping pushed it above the usual Lazada sale price for East Malaysia.",
    time: "1 week ago",
  },
];

const notificationOptions = [
  "Email when my deal is approved",
  "Notify me about replies to my comments",
  "Send weekly saved deal reminders",
];

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits: 2,
  }).format(value);
}

function DealPreviewCard({ deal }: { deal: (typeof postedDeals)[number] }) {
  const discountPercent = Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
  const isPending = deal.status !== "Approved";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="grid gap-0 md:grid-cols-[160px_minmax(0,1fr)]">
        <div className="flex aspect-[16/10] items-center justify-center bg-slate-100 md:aspect-auto md:min-h-full">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-slate-200 bg-white text-lg font-semibold text-slate-500">
            {deal.store.slice(0, 1)}
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    isPending
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-emerald-200 bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {deal.status}
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  {discountPercent}% off
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                  {deal.postedAt}
                </span>
              </div>

              <h3 className="line-clamp-2 text-lg font-semibold leading-6 text-slate-950 sm:text-xl">
                {deal.title}
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {deal.store}
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
                  {deal.category}
                </span>
              </div>
            </div>

            <div className="shrink-0 lg:text-right">
              <div className="flex flex-wrap items-end gap-2 lg:justify-end">
                <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                  {formatPrice(deal.price)}
                </p>
                <p className="pb-1 text-sm text-slate-500 line-through">
                  {formatPrice(deal.originalPrice)}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{deal.description}</p>

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4 text-sm text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
              Score {deal.score}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700">
              {deal.comments} {deal.comments === 1 ? "comment" : "comments"}
            </span>
            <span className="ml-auto rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500">
              Frontend preview
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-semibold text-slate-500">
        0
      </div>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posted");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:col-span-2">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl border border-slate-200 bg-slate-100 text-2xl font-semibold text-slate-600">
                {profile.initials}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                    {profile.name}
                  </h1>
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {profile.badge}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{profile.email}</p>
                <p className="mt-3 text-sm font-medium text-slate-500">
                  Joined Deal Rakyat in {profile.joinedAt}
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:min-w-[280px]">
              <p className="text-sm font-semibold text-slate-950">Reputation snapshot</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Consistently posts approved Malaysia deals with helpful price context and active discussion replies.
              </p>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Account
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Stats summary</h2>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {stat.label}
                  </dt>
                  <dd className="mt-1 text-2xl font-semibold text-slate-950">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
              Empty States
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">When there is no activity</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This dashboard is ready for real account data later, with quiet fallback states for new users.
            </p>
          </section>
        </aside>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                  Dashboard
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Profile activity</h2>
              </div>

              <div className="grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 sm:grid-cols-4">
                {tabs.map((tab) => {
                  const isSelected = tab.value === activeTab;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setActiveTab(tab.value)}
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        isSelected
                          ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                          : "text-slate-600 hover:bg-white hover:text-slate-950"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeTab === "posted" ? (
              postedDeals.length > 0 ? (
                <div className="grid gap-4">
                  {postedDeals.map((deal) => (
                    <DealPreviewCard key={deal.title} deal={deal} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No posted deals yet"
                  description="Deals submitted by this user will appear here once the frontend is connected to real account data."
                />
              )
            ) : null}

            {activeTab === "saved" ? (
              savedDeals.length > 0 ? (
                <div className="grid gap-3">
                  {savedDeals.map((deal) => (
                    <article
                      key={deal.title}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">{deal.title}</h3>
                          <p className="mt-2 text-sm text-slate-600">{deal.note}</p>
                        </div>
                        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                          {deal.store}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No saved deals"
                  description="Saved deals will show up here when account saving is wired into the backend."
                />
              )
            ) : null}

            {activeTab === "comments" ? (
              recentComments.length > 0 ? (
                <div className="grid gap-3">
                  {recentComments.map((comment) => (
                    <article
                      key={`${comment.deal}-${comment.time}`}
                      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="font-semibold text-slate-950">{comment.deal}</h3>
                        <span className="text-xs font-semibold text-slate-500">{comment.time}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-600">{comment.body}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No comments yet"
                  description="Recent discussion replies will appear here once real user activity is available."
                />
              )
            ) : null}

            {activeTab === "settings" ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="border-b border-slate-200 pb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
                    Frontend only
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-slate-950">Settings preview</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    These controls are disabled until account updates are connected to real backend mutations.
                  </p>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Display name
                    <input
                      value={profile.name}
                      disabled
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-normal text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-80"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-slate-700">
                    Email
                    <input
                      value={profile.email}
                      disabled
                      className="h-12 rounded-2xl border border-slate-200 bg-slate-100 px-4 text-sm font-normal text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-80"
                    />
                  </label>
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-semibold text-slate-700">
                      Notification preferences
                    </legend>
                    {notificationOptions.map((option, index) => (
                      <label
                        key={option}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                      >
                        <input
                          type="checkbox"
                          checked={index < 2}
                          disabled
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:ring-4 focus-visible:ring-slate-200"
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-slate-200 px-5 text-sm font-semibold text-slate-500 disabled:cursor-not-allowed"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
