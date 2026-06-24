import Link from "next/link";

export default function NotFound() {
  return (
    <main className="home-page flex min-h-screen flex-1 items-center px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <section className="home-status-panel mx-auto w-full max-w-3xl px-6 py-14 text-center">
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
            <path d="M9.5 9a3 3 0 1 1 4.9 2.3c-.9.7-1.4 1.2-1.4 2.7" />
            <path d="M12 17h.01" />
            <circle cx="12" cy="12" r="9" />
          </svg>
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#dc115e]">
          404
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
          Page not found
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-700 sm:text-base sm:leading-7">
          This page may have moved, expired, or never existed. Head back to the deal feed or share a fresh bargain with the community.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#dc115e] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#f01768] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25"
          >
            Back to homepage
          </Link>
          <Link
            href="/post"
            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-bold text-slate-900 shadow-sm transition hover:border-[#dc115e]/40 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            Post a deal
          </Link>
        </div>
      </section>
    </main>
  );
}
