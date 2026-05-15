"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { signOutAction } from "@/app/auth/actions";
import type { DealCategory } from "@/lib/categories";

type ThemeMode = "auto" | "dark" | "light";

const themeStorageKey = "dealmy_theme";
const themeModeChangedEventName = "dealmy:theme-mode-changed";

const appearanceOptions: { value: ThemeMode; label: string }[] = [
  {
    value: "light",
    label: "Light",
  },
  {
    value: "dark",
    label: "Dark",
  },
  {
    value: "auto",
    label: "Auto",
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

function subscribeToThemeModeChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeModeChangedEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeModeChangedEventName, onStoreChange);
  };
}

/**
 * Provides the shared site navigation shown above every route.
 */
export default function TopNavClient({
  categories,
  userEmail,
}: {
  categories: DealCategory[];
  userEmail: string | null;
  userName: string | null;
}) {
  const pathname = usePathname();
  const authNext = pathname === "/auth" ? "/" : pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState("");
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const themeMode = useSyncExternalStore<ThemeMode>(
    subscribeToThemeModeChanges,
    getStoredThemeMode,
    () => "auto",
  );

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

  useEffect(() => {
    if (isMenuOpen) {
      return;
    }

    lastScrollYRef.current = window.scrollY;
    let animationFrame = 0;

    const handleScroll = () => {
      if (animationFrame) {
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        const scrollDelta = currentScrollY - lastScrollYRef.current;

        if (currentScrollY < 80) {
          setIsHeaderHidden(false);
        } else if (scrollDelta > 8) {
          setIsHeaderHidden(true);
        } else if (scrollDelta < -8) {
          setIsHeaderHidden(false);
        }

        lastScrollYRef.current = currentScrollY;
        animationFrame = 0;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [isMenuOpen]);

  const handleLogoClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (pathname !== "/" || window.location.search) {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSidebarHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    closeMenu();

    if (pathname !== "/" || window.location.search) {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleThemeChange = (mode: ThemeMode) => {
    localStorage.setItem(themeStorageKey, mode);
    window.dispatchEvent(new Event(themeModeChangedEventName));
    applyThemeMode(mode);
  };

  const authHref = `/auth?next=${encodeURIComponent(authNext)}`;
  const closeMenu = () => {
    setIsMenuOpen(false);
    setIsCategoryMenuOpen(false);
    setOpenCategory("");
  };
  const postIsActive = pathname === "/post";
  const profileIsActive = pathname === "/profile";
  const createCategoryHref = (category: string, subCategory?: string) => {
    const params = new URLSearchParams({ category });

    if (subCategory) {
      params.set("subCategory", subCategory);
    }

    return `/?${params.toString()}#deals`;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 border-b border-[#cbd83d] bg-[#e6f24f] shadow-sm backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isHeaderHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
      <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[auto_minmax(240px,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            onClick={() => {
              setIsHeaderHidden(false);
              setIsMenuOpen(true);
            }}
            className="topbar-account-action inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-sm transition"
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
            className="inline-flex min-w-0 items-center gap-3 rounded-full pr-2 text-lg font-semibold text-slate-950 transition hover:text-slate-700"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-sm ring-2 ring-white/55">
              D
            </span>
          </Link>
        </div>

        <form
          action="/"
          method="get"
          role="search"
          className="mx-auto flex w-full max-w-md min-w-0 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-2 shadow-sm transition focus-within:border-[#e0115f]/45 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#e0115f]/15"
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
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="topbar-account-action inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/20 disabled:opacity-60"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Link
            href="/post"
            aria-current={postIsActive ? "page" : undefined}
            className={`post-deal-cta inline-flex h-11 items-center justify-center gap-2 rounded-full border-[3px] px-4 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/25 ${
              postIsActive
                ? "is-active"
                : ""
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="3"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Post Deal
          </Link>
          {userEmail ? (
            <>
              <Link
                href="/profile"
                aria-current={profileIsActive ? "page" : undefined}
                className={`topbar-account-action inline-flex h-10 max-w-[180px] items-center justify-center truncate rounded-full border px-4 text-sm font-semibold transition ${
                  profileIsActive
                    ? "is-active"
                    : ""
                }`}
              >
                Profile
              </Link>
              <form action={signOutAction} className="contents">
                <button
                  type="submit"
                  title={userEmail}
                  className="topbar-account-action inline-flex h-10 max-w-[180px] items-center justify-center truncate rounded-full border px-4 text-sm font-semibold transition"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link
              href={authHref}
              className="topbar-account-action inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-semibold transition"
            >
              Log in / Register
            </Link>
          )}
        </div>
      </nav>
      </header>

      <button
        type="button"
        aria-label="Close menu"
        className={`fixed inset-0 z-40 bg-slate-950/35 transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeMenu}
        aria-hidden={!isMenuOpen}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-sm transform-gpu flex-col border-r border-slate-200 bg-white text-slate-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#e6f24f] px-5 py-4">
          <p className="truncate text-xl font-bold text-black">Menu</p>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="topbar-account-action inline-flex h-10 w-10 items-center justify-center rounded-full border transition"
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
              Navigation
            </h2>
            <Link
              href="/"
              onClick={handleSidebarHomeClick}
              aria-current={pathname === "/" ? "page" : undefined}
              className="sidebar-menu-action mt-3 inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="m3 10 9-7 9 7" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
              <span>Home</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpenCategory("");
                setIsCategoryMenuOpen(true);
              }}
              className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
              aria-expanded={isCategoryMenuOpen}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-5 w-5 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M8 6v12" />
              </svg>
              <span>Categories</span>
            </button>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Account
            </h2>
            <div className="mt-3 space-y-2">
              {userEmail ? (
                <>
                  <Link
                    href="/profile"
                    onClick={closeMenu}
                    aria-current={profileIsActive ? "page" : undefined}
                    className={`inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15 ${
                      profileIsActive
                        ? "sidebar-menu-action-active"
                        : "sidebar-menu-action"
                    }`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-5 w-5 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21a8 8 0 0 1 16 0" />
                    </svg>
                    <span>Settings</span>
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="m16 17 5-5-5-5" />
                        <path d="M21 12H9" />
                      </svg>
                      <span>Log out</span>
                    </button>
                  </form>
                </>
              ) : (
                <Link
                  href={authHref}
                  onClick={closeMenu}
                  className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  >
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <path d="m10 17 5-5-5-5" />
                    <path d="M15 12H3" />
                  </svg>
                  <span>Log in / Register</span>
                </Link>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Appearance
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-full border border-slate-900 bg-white p-1 shadow-inner">
              {appearanceOptions.map((option) => {
                const isSelected = option.value === themeMode;

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={`Use ${option.label.toLowerCase()} appearance`}
                    aria-pressed={isSelected}
                    title={option.label}
                    onClick={() => handleThemeChange(option.value)}
                    className={`inline-flex h-10 min-w-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 ${
                      isSelected
                        ? "border border-[#e0115f] bg-[#e0115f] text-white shadow-sm ring-2 ring-[#e0115f]/25"
                        : "appearance-mode-option"
                    }`}
                  >
                    <span className="sr-only">{option.label}</span>
                    {option.value === "light" ? (
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
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2" />
                        <path d="M12 20v2" />
                        <path d="m4.93 4.93 1.41 1.41" />
                        <path d="m17.66 17.66 1.41 1.41" />
                        <path d="M2 12h2" />
                        <path d="M20 12h2" />
                        <path d="m6.34 17.66-1.41 1.41" />
                        <path d="m19.07 4.93-1.41 1.41" />
                      </svg>
                    ) : option.value === "dark" ? (
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
                        <path d="M12 3a6.36 6.36 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                      </svg>
                    ) : (
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
                        <rect width="18" height="12" x="3" y="4" rx="2" />
                        <path d="M8 20h8" />
                        <path d="M12 16v4" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-sm transform-gpu flex-col border-r border-slate-200 bg-white text-slate-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
          isMenuOpen && isCategoryMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen || !isCategoryMenuOpen}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-[#e6f24f] px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Back to menu"
              onClick={() => {
                setIsCategoryMenuOpen(false);
                setOpenCategory("");
              }}
              className="topbar-account-action inline-flex h-10 w-10 items-center justify-center rounded-full border transition"
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
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <p className="truncate text-xl font-bold text-black">Categories</p>
          </div>
          <button
            type="button"
            aria-label="Close categories"
            onClick={closeMenu}
            className="topbar-account-action inline-flex h-10 w-10 items-center justify-center rounded-full border transition"
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

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="grid gap-1">
            <Link
              href="/"
              onClick={closeMenu}
              className="sidebar-menu-action rounded-lg px-1 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
            >
              All categories
            </Link>
            {categories.map((dealCategory) => {
              const hasSubcategories = dealCategory.subcategories.length > 0;
              const isExpanded = openCategory === dealCategory.name;

              return (
                <div key={dealCategory.name}>
                  {hasSubcategories ? (
                    <button
                      type="button"
                      onClick={() => setOpenCategory(isExpanded ? "" : dealCategory.name)}
                      className="sidebar-menu-action flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                      aria-expanded={isExpanded}
                    >
                      <span>{dealCategory.name}</span>
                      <span aria-hidden="true" className="text-current">
                        {isExpanded ? "-" : "+"}
                      </span>
                    </button>
                  ) : (
                    <Link
                      href={createCategoryHref(dealCategory.name)}
                      onClick={closeMenu}
                      className="sidebar-menu-action block rounded-lg px-1 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                    >
                      {dealCategory.name}
                    </Link>
                  )}

                  {hasSubcategories && isExpanded ? (
                    <div className="ml-3 mt-1 grid gap-1 border-l border-slate-200 pl-3">
                      <Link
                        href={createCategoryHref(dealCategory.name)}
                        onClick={closeMenu}
                        className="sidebar-menu-action rounded-lg px-1 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                      >
                        All {dealCategory.name}
                      </Link>
                      {dealCategory.subcategories.map((subcategory) => (
                        <Link
                          key={subcategory}
                          href={createCategoryHref(dealCategory.name, subcategory)}
                          onClick={closeMenu}
                          className="sidebar-menu-action rounded-lg px-1 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e0115f]/15"
                        >
                          {subcategory}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
