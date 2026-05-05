"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent } from "react";
import { signOutAction } from "@/app/auth/actions";

/**
 * Provides the shared site navigation shown above every route.
 */
export default function TopNavClient({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const authNext = pathname === "/auth" ? "/" : pathname;

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(280px,1fr)_auto] lg:items-center lg:px-8">
        <Link
          href="/"
          onClick={handleLogoClick}
          className="inline-flex w-fit items-center gap-3 text-lg font-semibold text-slate-950"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
            D
          </span>
          Deal Rakyat
        </Link>

        <form
          action="/"
          method="get"
          role="search"
          className="flex min-w-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm"
        >
          <label className="sr-only" htmlFor="top-search-deals">
            Search deals
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            id="top-search-deals"
            name="q"
            type="search"
            placeholder="Search deals"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="inline-flex h-8 items-center justify-center rounded-full bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link
            href="/post"
            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Post Deal
          </Link>
          {userEmail ? (
            <form action={signOutAction} className="contents">
              <button
                type="submit"
                title={userEmail}
                className="inline-flex h-10 max-w-[180px] items-center justify-center truncate rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
              >
                Log out
              </button>
            </form>
          ) : (
            <Link
              href={`/auth?next=${encodeURIComponent(authNext)}`}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Log in / Register
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
