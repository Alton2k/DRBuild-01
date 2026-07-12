"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { signOutAction } from "@/app/auth/actions";
import { saveAccountSettingsAction } from "@/app/settings/actions";
import type { DealCategory } from "@/lib/categories";
import { formatUserHandle, getUserProfilePath } from "@/lib/userHandles";

type ThemeMode = "auto" | "dark" | "light";

type MemberSearchResult = {
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
};

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
const secondaryCategoryNames = [
  "Electronics",
  "Fashion & Accessories",
  "Groceries",
  "Gaming",
  "Home & Living",
  "Travel",
  "Health & Beauty",
  "Sports & Outdoors",
];
const browseParamNames = ["q", "category", "subCategory", "feed", "period", "page"];
const mobileMenuId = "mobile-site-menu";
const memberSearchListboxId = "top-search-member-results";
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

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

function toSettingsTheme(mode: ThemeMode) {
  return mode === "auto" ? "system" : mode;
}

function subscribeToThemeModeChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(themeModeChangedEventName, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(themeModeChangedEventName, onStoreChange);
  };
}

type CategoryGridStyle = CSSProperties & {
  "--category-grid-columns": number;
  "--category-grid-row-height": string;
};

function getCategoryGridStyle(itemCount: number): CategoryGridStyle {
  const columns =
    itemCount <= 1 ? 1 :
    itemCount <= 3 ? 3 :
    itemCount <= 8 ? 4 :
    5;
  const rowHeight = itemCount <= 3 ? 7.25 : itemCount <= 8 ? 6.25 : 5.55;

  return {
    "--category-grid-columns": columns,
    "--category-grid-row-height": `${rowHeight}rem`,
  };
}

/**
 * Provides the shared site navigation shown above every route.
 */
export default function TopNavClient({
  categories,
  initialThemeMode = "auto",
  userEmail,
}: {
  categories: DealCategory[];
  initialThemeMode?: ThemeMode;
  userEmail: string | null;
  userName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSearchQuery = searchParams.get("q")?.trim() ?? "";
  const activeCategory = searchParams.get("category")?.trim() ?? "";
  const activeSubCategory = searchParams.get("subCategory")?.trim() ?? "";
  const authNext = pathname === "/auth" ? "/" : pathname;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isCategoryMegaMenuOpen, setIsCategoryMegaMenuOpen] = useState(false);
  const [megaMenuCategoryName, setMegaMenuCategoryName] = useState("");
  const [openCategory, setOpenCategory] = useState("");
  const [searchDraft, setSearchDraft] = useState({
    sourceQuery: activeSearchQuery,
    value: activeSearchQuery,
  });
  const [memberSearch, setMemberSearch] = useState<{
    query: string;
    results: MemberSearchResult[];
    status: "idle" | "loading" | "success" | "error";
  }>({ query: "", results: [], status: "idle" });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeMemberIndex, setActiveMemberIndex] = useState(-1);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const menuOpenButtonRef = useRef<HTMLButtonElement>(null);
  const categoryMegaMenuButtonRef = useRef<HTMLButtonElement>(null);
  const categoryMegaMenuRef = useRef<HTMLDivElement>(null);
  const mainMenuDialogRef = useRef<HTMLElement>(null);
  const categoryMenuDialogRef = useRef<HTMLElement>(null);
  const wasMenuOpenRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const searchValue = searchDraft.sourceQuery === activeSearchQuery ? searchDraft.value : activeSearchQuery;
  const themeMode = useSyncExternalStore<ThemeMode>(
    subscribeToThemeModeChanges,
    getStoredThemeMode,
    () => initialThemeMode,
  );
  const memberResultsAreVisible =
    isSearchFocused &&
    memberSearch.query === searchValue.trim() &&
    memberSearch.results.length > 0;
  const memberPanelIsVisible =
    isSearchFocused &&
    searchValue.trim().length >= 2 &&
    memberSearch.query === searchValue.trim() &&
    memberSearch.status !== "idle";
  const memberSearchAnnouncement = memberSearch.status === "loading"
    ? "Searching members."
    : memberSearch.status === "error"
      ? "Member search is temporarily unavailable. Deal search is still available."
      : memberSearch.status === "success" && memberSearch.results.length === 0
        ? "No matching members found."
        : memberSearch.status === "success"
          ? `${memberSearch.results.length} matching ${memberSearch.results.length === 1 ? "member" : "members"} found.`
          : "";
  const currentMemberSearchAnnouncement = searchValue.trim().length >= 2 && memberSearch.query === searchValue.trim()
    ? memberSearchAnnouncement
    : "";
  const activeMember = memberSearch.results[activeMemberIndex];

  useEffect(() => {
    const query = searchValue.trim();

    if (query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setMemberSearch({ query, results: [], status: "loading" });

      try {
        const response = await fetch(`/api/member-search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          setMemberSearch({ query, results: [], status: "error" });
          return;
        }

        const payload = await response.json() as { members?: MemberSearchResult[] };
        setMemberSearch({
          query,
          results: Array.isArray(payload.members) ? payload.members : [],
          status: "success",
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setMemberSearch({ query, results: [], status: "error" });
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [searchValue]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    setIsCategoryMenuOpen(false);
    setIsCategoryMegaMenuOpen(false);
    setOpenCategory("");
  }, []);

  const getActiveMenuDialog = useCallback(() => {
    if (isCategoryMenuOpen) {
      return categoryMenuDialogRef.current;
    }

    return mainMenuDialogRef.current;
  }, [isCategoryMenuOpen]);

  const getFocusableMenuElements = useCallback(() => {
    const activeDialog = getActiveMenuDialog();

    if (!activeDialog) {
      return [];
    }

    return Array.from(activeDialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
    );
  }, [getActiveMenuDialog]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    if (!localStorage.getItem(themeStorageKey)) {
      localStorage.setItem(themeStorageKey, initialThemeMode);
      window.dispatchEvent(new Event(themeModeChangedEventName));
    }

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
  }, [initialThemeMode, themeMode]);

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

  useEffect(() => {
    if (!isCategoryMegaMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        categoryMegaMenuRef.current?.contains(target) ||
        categoryMegaMenuButtonRef.current?.contains(target)
      ) {
        return;
      }

      setIsCategoryMegaMenuOpen(false);
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCategoryMegaMenuOpen(false);
        categoryMegaMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoryMegaMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen && !isCategoryMegaMenuOpen) {
      if (wasMenuOpenRef.current) {
        menuOpenButtonRef.current?.focus();
      }

      wasMenuOpenRef.current = false;
      return;
    }

    wasMenuOpenRef.current = true;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCategoryMegaMenuOpen, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handleDocumentFocusIn = (event: FocusEvent) => {
      const activeDialog = getActiveMenuDialog();
      const nextFocusedElement = event.target;

      if (!(nextFocusedElement instanceof Node) || !activeDialog || activeDialog.contains(nextFocusedElement)) {
        return;
      }

      const firstFocusableElement = getFocusableMenuElements()[0];

      if (firstFocusableElement) {
        firstFocusableElement.focus();
      } else {
        activeDialog.focus();
      }
    };

    document.addEventListener("focusin", handleDocumentFocusIn);

    return () => {
      document.removeEventListener("focusin", handleDocumentFocusIn);
    };
  }, [getActiveMenuDialog, getFocusableMenuElements, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const focusableElements = getFocusableMenuElements();
      const firstFocusableElement = focusableElements[0];

      if (firstFocusableElement) {
        firstFocusableElement.focus();
      } else {
        getActiveMenuDialog()?.focus();
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [getActiveMenuDialog, getFocusableMenuElements, isCategoryMenuOpen, isMenuOpen]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableElements = getFocusableMenuElements();

    if (focusableElements.length === 0) {
      event.preventDefault();
      getActiveMenuDialog()?.focus();
      return;
    }

    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusableElement) {
      event.preventDefault();
      lastFocusableElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastFocusableElement) {
      event.preventDefault();
      firstFocusableElement.focus();
    }
  };

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

    if (userEmail) {
      void saveAccountSettingsAction({ theme: toSettingsTheme(mode) });
    }
  };

  const authHref = `/auth?next=${encodeURIComponent(authNext)}`;
  const postIsActive = pathname === "/post";
  const profileIsActive = pathname === "/profile";
  const settingsIsActive = pathname === "/settings";
  const secondaryCategories = secondaryCategoryNames
    .map((categoryName) => categories.find((category) => category.name === categoryName))
    .filter((category): category is DealCategory => Boolean(category));
  const megaMenuCategory =
    categories.find((category) => category.name === megaMenuCategoryName) ??
    categories.find((category) => category.name === activeCategory) ??
    categories[0];
  const createBrowseParams = () => {
    const params = new URLSearchParams(searchParams.toString());

    Array.from(params.keys()).forEach((key) => {
      if (!browseParamNames.includes(key)) {
        params.delete(key);
      }
    });

    params.delete("page");

    return params;
  };

  const createBrowseHref = (params: URLSearchParams) => {
    const queryString = params.toString();

    return queryString ? `/?${queryString}#deals` : "/#deals";
  };

  const createCategoryHref = (category: string, subCategory?: string) => {
    const params = createBrowseParams();

    params.set("category", category);

    if (subCategory) {
      params.set("subCategory", subCategory);
    } else {
      params.delete("subCategory");
    }

    return createBrowseHref(params);
  };

  const createAllCategoriesHref = () => {
    const params = createBrowseParams();

    params.delete("category");
    params.delete("subCategory");

    return createBrowseHref(params);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = createBrowseParams();
    const nextQuery = searchValue.trim();

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }

    router.push(createBrowseHref(params));
    setIsSearchFocused(false);
  };

  const handleClearSearch = () => {
    const params = createBrowseParams();

    params.delete("q");
    setSearchDraft({ sourceQuery: "", value: "" });
    setMemberSearch({ query: "", results: [], status: "idle" });
    setActiveMemberIndex(-1);
    router.push(createBrowseHref(params));
  };

  const handleSearchBlur = (event: ReactFocusEvent<HTMLFormElement>) => {
    const nextFocusedElement = event.relatedTarget;

    if (nextFocusedElement instanceof Node && event.currentTarget.contains(nextFocusedElement)) {
      return;
    }

    setIsSearchFocused(false);
    setActiveMemberIndex(-1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsSearchFocused(false);
      setActiveMemberIndex(-1);
      return;
    }

    if (!memberResultsAreVisible) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveMemberIndex((current) => {
        if (current < 0) {
          return direction === 1 ? 0 : memberSearch.results.length - 1;
        }

        return (current + direction + memberSearch.results.length) % memberSearch.results.length;
      });
      return;
    }

    if (event.key === "Enter" && activeMemberIndex >= 0) {
      const member = memberSearch.results[activeMemberIndex];

      if (member) {
        event.preventDefault();
        router.push(getUserProfilePath(member.userId, member.userName));
        setIsSearchFocused(false);
        setActiveMemberIndex(-1);
      }
    }
  };

  return (
    <>
      <header
        className={`topbar-shell sticky top-0 z-40 bg-[#0f172a]/95 shadow-sm backdrop-blur-xl transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isHeaderHidden ? "-translate-y-full" : "translate-y-0"
        }`}
      >
      <nav className="mx-auto grid max-w-7xl gap-3 px-4 py-2 sm:px-6 lg:grid-cols-[auto_minmax(240px,1fr)_auto] lg:items-center lg:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={isMenuOpen}
            aria-controls={mobileMenuId}
            ref={menuOpenButtonRef}
            onClick={() => {
              setIsHeaderHidden(false);
              setIsMenuOpen(true);
            }}
            className="topbar-menu-trigger inline-flex h-10 w-10 shrink-0 items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-7 w-7"
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
            aria-label="Deal Rakyat home"
            className="inline-flex h-11 w-28 shrink-0 cursor-pointer items-center justify-center overflow-hidden bg-transparent px-2 py-1 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 sm:h-12 sm:w-32"
          >
            <Image
              src="/deal-rakyat-logo.svg"
              alt=""
              width={220}
              height={100}
              priority
              unoptimized
              className="pointer-events-none h-full w-full select-none scale-[1.2] object-contain"
            />
          </Link>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          onFocusCapture={() => setIsSearchFocused(true)}
          onBlurCapture={handleSearchBlur}
          role="search"
          className="topbar-search-form relative mx-auto flex w-full max-w-md min-w-0 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-3 py-1.5 shadow-sm transition focus-within:border-[#dc115e]/45 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#dc115e]/15"
        >
          <label className="sr-only" htmlFor="top-search-deals">
            Search deals and members
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
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={searchValue}
            onChange={(event) => {
              setActiveMemberIndex(-1);
              setSearchDraft({
                sourceQuery: activeSearchQuery,
                value: event.target.value,
              });
            }}
            onKeyDown={handleSearchKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={memberPanelIsVisible}
            aria-controls={memberPanelIsVisible ? memberSearchListboxId : undefined}
            aria-activedescendant={
              memberResultsAreVisible && activeMember
                ? `top-search-member-${activeMember.userId}`
                : undefined
            }
            className="topbar-search-input min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
          />
          <span className="sr-only" aria-live="polite" aria-atomic="true">{currentMemberSearchAnnouncement}</span>
          {searchValue ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="topbar-search-clear inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              aria-label="Clear search"
              title="Clear search"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          ) : null}
          <button
            type="submit"
            className="topbar-account-action inline-flex h-10 shrink-0 items-center justify-center rounded-full border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:opacity-60"
          >
            Search
          </button>

          {memberPanelIsVisible ? (
            <div
              id={memberSearchListboxId}
              className="topbar-member-results absolute left-0 right-0 overflow-hidden rounded-lg border shadow-xl"
              onMouseDown={(event) => event.preventDefault()}
            >
              {memberSearch.status === "loading" ? (
                <p className="px-4 py-3 text-sm font-semibold text-slate-600" role="status">Searching members…</p>
              ) : memberSearch.status === "error" ? (
                <p className="px-4 py-3 text-sm font-semibold text-rose-700" role="status">Member search is unavailable. Press Enter to search deals.</p>
              ) : memberSearch.results.length === 0 ? (
                <p className="px-4 py-3 text-sm font-semibold text-slate-600" role="status">No matching members. Press Enter to search deals.</p>
              ) : (
              <div className="grid" role="listbox" aria-label="Matching members">
                {memberSearch.results.map((member, index) => (
                    <Link
                      key={member.userId}
                      id={`top-search-member-${member.userId}`}
                      role="option"
                      aria-selected={index === activeMemberIndex}
                      href={getUserProfilePath(member.userId, member.userName)}
                      onMouseEnter={() => setActiveMemberIndex(index)}
                      onClick={() => {
                        setIsSearchFocused(false);
                        setActiveMemberIndex(-1);
                      }}
                      className={`topbar-member-result grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-[#dc115e]/20 ${
                        index === activeMemberIndex ? "topbar-member-result-active" : ""
                      }`}
                    >
                      <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#dc115e] text-xs font-black uppercase text-white">
                        {member.avatarUrl ? (
                          <Image src={member.avatarUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
                        ) : (
                          member.userName.slice(0, 2)
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="topbar-member-result-name block truncate text-sm font-black">
                          {member.displayName || formatUserHandle(member.userName)}
                        </span>
                        <span className="topbar-member-result-handle mt-0.5 block truncate text-xs font-semibold">
                          {formatUserHandle(member.userName)} · Member
                        </span>
                      </span>
                    </Link>
                ))}
              </div>
              )}
            </div>
          ) : null}
        </form>

        <div className="hidden flex-wrap items-center gap-2 sm:flex lg:justify-end">
          <Link
            href="/post"
            aria-current={postIsActive ? "page" : undefined}
            className={`post-deal-cta inline-flex h-10 items-center justify-center gap-2 rounded-full border-[3px] px-4 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/25 ${
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
      <div className="secondary-category-bar">
        <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Popular categories" className="flex min-w-max items-center justify-center gap-2 py-2">
            <button
              type="button"
              ref={categoryMegaMenuButtonRef}
              onClick={() => {
                setIsHeaderHidden(false);
                setMegaMenuCategoryName((currentCategoryName) =>
                  currentCategoryName || activeCategory || categories[0]?.name || "",
                );
                setIsCategoryMegaMenuOpen((isOpen) => !isOpen);
              }}
              className="secondary-category-tab secondary-category-tab-menu inline-flex items-center gap-2 px-3.5 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              aria-haspopup="dialog"
              aria-expanded={isCategoryMegaMenuOpen}
            >
              Categories
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {secondaryCategories.map((category) => {
              const isActiveCategory = category.name === activeCategory && !activeSubCategory;

              return (
                <Link
                  key={category.name}
                  href={createCategoryHref(category.name)}
                  aria-current={isActiveCategory ? "page" : undefined}
                  className={`secondary-category-tab px-3.5 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 ${
                    isActiveCategory ? "is-active" : ""
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {isCategoryMegaMenuOpen && megaMenuCategory ? (
        <div
          role="presentation"
          className="category-mega-menu absolute inset-x-0 top-full z-50"
          onClick={() => setIsCategoryMegaMenuOpen(false)}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div
              ref={categoryMegaMenuRef}
              role="dialog"
              aria-label="Categories"
              className="category-mega-menu-panel grid gap-5 rounded-b-2xl p-4 shadow-xl lg:grid-cols-[210px_minmax(0,1fr)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="category-mega-menu-sidebar">
                <p className="category-mega-menu-eyebrow">Categories</p>
                <div className="category-mega-menu-category-list mt-2">
                  {categories.map((category) => {
                    const isSelected = category.name === megaMenuCategory.name;

                    return (
                      <Link
                        key={category.name}
                        href={createCategoryHref(category.name)}
                        onMouseEnter={() => setMegaMenuCategoryName(category.name)}
                        onFocus={() => setMegaMenuCategoryName(category.name)}
                        onClick={() => setIsCategoryMegaMenuOpen(false)}
                        className={`category-mega-menu-category ${
                          isSelected ? "is-active" : ""
                        }`}
                      >
                        {category.name}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="category-mega-menu-eyebrow">Browse</p>
                    <h2 className="category-mega-menu-title">{megaMenuCategory.name}</h2>
                  </div>
                  <Link
                    href={createCategoryHref(megaMenuCategory.name)}
                    onClick={() => setIsCategoryMegaMenuOpen(false)}
                    className="category-mega-menu-shop-all"
                  >
                    Shop all
                  </Link>
                </div>

                <div
                  className="category-mega-menu-grid mt-4"
                  style={getCategoryGridStyle(megaMenuCategory.subcategories.length)}
                >
                  {megaMenuCategory.subcategories.map((subcategory) => {
                    const isCurrentSubCategory =
                      megaMenuCategory.name === activeCategory && subcategory === activeSubCategory;

                    return (
                      <Link
                        key={subcategory}
                        href={createCategoryHref(megaMenuCategory.name, subcategory)}
                        onClick={() => setIsCategoryMegaMenuOpen(false)}
                        aria-current={isCurrentSubCategory ? "page" : undefined}
                        className={`category-mega-menu-subcategory ${
                          isCurrentSubCategory ? "is-active" : ""
                        }`}
                      >
                        <span className="category-mega-menu-subcategory-mark" aria-hidden="true">
                          {subcategory.slice(0, 1)}
                        </span>
                        <span className="category-mega-menu-subcategory-label">{subcategory}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </header>

      {isCategoryMegaMenuOpen ? (
        <button
          type="button"
          aria-label="Close categories"
          className="category-mega-menu-backdrop fixed inset-0 z-30 cursor-default"
          onClick={() => setIsCategoryMegaMenuOpen(false)}
        />
      ) : null}

      {isMenuOpen ? (
        <div id={mobileMenuId} className="fixed inset-0 z-50 pointer-events-none">
          <div
            className="absolute inset-0 pointer-events-auto bg-slate-950/35 opacity-100 transition-opacity duration-300 ease-out motion-reduce:duration-0"
            onClick={closeMenu}
            aria-hidden="true"
          />

      <aside
        ref={mainMenuDialogRef}
        role={isCategoryMenuOpen ? undefined : "dialog"}
        aria-modal={isCategoryMenuOpen ? undefined : true}
        aria-label="Site menu"
        tabIndex={-1}
        onKeyDown={handleMenuKeyDown}
        className={`mobile-menu-panel pointer-events-auto fixed inset-y-0 left-0 z-10 flex w-full max-w-sm transform-gpu flex-col border-r border-slate-200 text-slate-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
          isCategoryMenuOpen ? "-translate-x-full" : "translate-x-0"
        }`}
        aria-hidden={isCategoryMenuOpen}
      >
        <div className="site-menu-header flex items-center justify-between border-b px-5 py-4">
          <p className="truncate text-xl font-bold">Menu</p>
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
              className="sidebar-menu-action mt-3 inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
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
            <Link
              href="/post"
              onClick={closeMenu}
              aria-current={postIsActive ? "page" : undefined}
              className={`sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                postIsActive ? "sidebar-menu-action-active" : ""
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span>Post Deal</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpenCategory("");
                setIsCategoryMenuOpen(true);
              }}
              className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
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
                    className={`inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
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
                    <span>Profile</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={closeMenu}
                    aria-current={settingsIsActive ? "page" : undefined}
                    className={`inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                      settingsIsActive
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
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
                    </svg>
                    <span>Settings</span>
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
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
                  className="sidebar-menu-action inline-flex h-10 w-full items-center gap-3 rounded-lg px-1 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
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
            <p className="mt-3 text-sm font-semibold text-slate-950">Theme</p>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-inner">
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
                        ? "border border-[#dc115e] bg-[#dc115e] text-white shadow-sm ring-2 ring-[#dc115e]/25"
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
        ref={categoryMenuDialogRef}
        role={isCategoryMenuOpen ? "dialog" : undefined}
        aria-modal={isCategoryMenuOpen ? true : undefined}
        aria-label="Categories menu"
        tabIndex={-1}
        onKeyDown={handleMenuKeyDown}
        className={`mobile-menu-panel pointer-events-auto fixed inset-y-0 left-0 z-20 flex w-full max-w-sm transform-gpu flex-col border-r border-slate-200 text-slate-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
          isCategoryMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isCategoryMenuOpen}
      >
        <div className="site-menu-header flex items-center justify-between border-b px-5 py-4">
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
            <p className="truncate text-xl font-bold">Categories</p>
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
              href={createAllCategoriesHref()}
              onClick={closeMenu}
              aria-current={activeCategory ? undefined : "page"}
              className={`rounded-lg px-1 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                activeCategory ? "sidebar-menu-action" : "sidebar-menu-action-active"
              }`}
            >
              All categories
            </Link>
            {categories.map((dealCategory) => {
              const hasSubcategories = dealCategory.subcategories.length > 0;
              const isExpanded = openCategory === dealCategory.name;
              const isActiveCategory = dealCategory.name === activeCategory;

              return (
                <div key={dealCategory.name}>
                  {hasSubcategories ? (
                    <button
                      type="button"
                      onClick={() => setOpenCategory(isExpanded ? "" : dealCategory.name)}
                      className={`flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                        isActiveCategory ? "sidebar-menu-action-active" : "sidebar-menu-action"
                      }`}
                      aria-expanded={isExpanded}
                      aria-current={isActiveCategory && !activeSubCategory ? "page" : undefined}
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
                      aria-current={isActiveCategory ? "page" : undefined}
                      className={`block rounded-lg px-1 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                        isActiveCategory ? "sidebar-menu-action-active" : "sidebar-menu-action"
                      }`}
                    >
                      {dealCategory.name}
                    </Link>
                  )}

                  {hasSubcategories && isExpanded ? (
                    <div className="ml-3 mt-2 grid grid-cols-2 gap-2 border-l border-slate-200 pl-3">
                      <Link
                        href={createCategoryHref(dealCategory.name)}
                        onClick={closeMenu}
                        aria-current={isActiveCategory && !activeSubCategory ? "page" : undefined}
                        className={`category-mobile-subcategory-tile ${
                          isActiveCategory && !activeSubCategory
                            ? "sidebar-menu-action-active"
                            : "sidebar-menu-action"
                        }`}
                      >
                        All {dealCategory.name}
                      </Link>
                      {dealCategory.subcategories.map((subcategory) => {
                        const isActiveSubCategory = isActiveCategory && subcategory === activeSubCategory;

                        return (
                          <Link
                            key={subcategory}
                            href={createCategoryHref(dealCategory.name, subcategory)}
                            onClick={closeMenu}
                            aria-current={isActiveSubCategory ? "page" : undefined}
                            className={`category-mobile-subcategory-tile ${
                              isActiveSubCategory
                                ? "sidebar-menu-action-active"
                                : "sidebar-menu-action"
                            }`}
                          >
                            <span className="category-mobile-subcategory-mark" aria-hidden="true">
                              {subcategory.slice(0, 1)}
                            </span>
                            <span>{subcategory}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </aside>
        </div>
      ) : null}
    </>
  );
}
