"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent } from "react";
import { signOutAction } from "@/app/auth/actions";

type ThemeMode = "auto" | "dark" | "light";

const themeStorageKey = "dealmy_theme";

const appearanceOptions: { value: ThemeMode; label: string; description: string }[] = [
  {
    value: "auto",
    label: "Auto",
    description: "Follow browser",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always dark",
  },
  {
    value: "light",
    label: "Light",
    description: "Always light",
  },
];

function getResolvedTheme(mode: ThemeMode) {
  if (mode === "dark") {
    return "dark";
  }

  if (mode === "light") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "auto";
  }

  const storedTheme = localStorage.getItem(themeStorageKey);

  return storedTheme === "dark" || storedTheme === "light" || storedTheme === "auto"
    ? storedTheme
    : "auto";
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.dataset.theme = getResolvedTheme(mode);
}

/**
 * Provides the shared site navigation shown above every route.
 */
export default function TopNavClient({
  userEmail,
  userName,
}: {
  userEmail: string | null;
  userName: string | null;
}) {
  const pathname = usePathname();
  const authNext = pathname === "/auth" ? "/" : pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    applyThemeMode(themeMode);

    const handleSystemThemeChange = () => {
      if (themeMode === "auto") {
        applyThemeMode("auto");
      }
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/") {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem(themeStorageKey, mode);
    applyThemeMode(mode);
  };

  const authHref = `/auth?next=${encodeURIComponent(authNext)}`;
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
      <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(280px,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </svg>
          </button>
          <Link
            href="/"
            onClick={handleLogoClick}
            className="inline-flex min-w-0 items-center gap-3 text-lg font-semibold text-slate-950"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
              D
            </span>
            <span className="truncate">Deal Rakyat</span>
          </Link>
        </div>

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
              href={authHref}
              className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Log in / Register
            </Link>
          )}
        </div>
      </nav>
      </header>

      {isMenuOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,360px)] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white shadow-sm">
              D
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">Deal Rakyat</p>
              <p className="text-xs text-slate-500">Menu</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Account
            </h2>
            <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {userEmail ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{userName ?? userEmail}</p>
                    <p className="mt-1 truncate text-sm text-slate-600">{userEmail}</p>
                  </div>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="inline-flex h-10 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      Log out
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-slate-600">
                    Log in to post deals, vote, and comment.
                  </p>
                  <Link
                    href={authHref}
                    onClick={closeMenu}
                    className="inline-flex h-10 w-full items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Log in / Register
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Appearance
            </h2>
            <div className="mt-3 grid gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2">
              {appearanceOptions.map((option) => {
                const isSelected = option.value === themeMode;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleThemeChange(option.value)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-slate-900 bg-white text-slate-950 shadow-sm"
                        : "border-transparent text-slate-600 hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
                    </span>
                    <span
                      className={`h-3 w-3 rounded-full border ${
                        isSelected ? "border-slate-900 bg-slate-900" : "border-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
