"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface CategorySidebarItem {
  href: string;
  label: string;
  active: boolean;
  subcategories: {
    href: string;
    label: string;
    active: boolean;
  }[];
}

interface CategorySidebarProps {
  categories: CategorySidebarItem[];
  initiallyOpen?: boolean;
}

/**
 * Opens the longer category list in a slide-over panel without resizing the browse card.
 */
export default function CategorySidebar({ categories, initiallyOpen = false }: CategorySidebarProps) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [isVisible, setIsVisible] = useState(initiallyOpen);
  const [openCategory, setOpenCategory] = useState(
    categories.find((category) => category.active)?.label ?? "",
  );

  const openSidebar = () => {
    setOpenCategory("");
    setIsVisible(true);
    window.requestAnimationFrame(() => setIsOpen(true));
  };

  const closeSidebar = () => {
    setIsOpen(false);
    setOpenCategory("");
  };

  useEffect(() => {
    if (isOpen) {
      return;
    }

    const timer = window.setTimeout(() => setIsVisible(false), 320);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openSidebar}
        className="mt-4 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-[#dc115e]/40 hover:bg-white hover:text-[#dc115e]"
      >
        <span>Browse all categories</span>
        <span aria-hidden="true" className="text-slate-400">
          Browse
        </span>
      </button>

      {isVisible ? (
        <div className="fixed inset-0 z-50" aria-hidden={!isOpen}>
          <button
            type="button"
            aria-label="Close category menu"
            onClick={closeSidebar}
            className={`absolute inset-0 h-full w-full bg-slate-950/30 transition-opacity duration-300 ease-out motion-reduce:duration-0 ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            className={`absolute right-0 top-0 flex h-full w-full max-w-sm transform-gpu flex-col border-l border-slate-200 bg-white text-slate-950 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="site-menu-header flex items-center justify-between border-b px-5 py-4">
              <h2 className="truncate text-xl font-bold">Categories</h2>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close category menu"
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
              <div className="grid gap-2">
                {categories.map((dealCategory) => {
                  const hasSubcategories = dealCategory.subcategories.length > 0;
                  const isExpanded = openCategory === dealCategory.label;

                  return (
                    <div key={dealCategory.label}>
                      {hasSubcategories ? (
                        <button
                          type="button"
                          onClick={() => setOpenCategory(isExpanded ? "" : dealCategory.label)}
                          className={`flex w-full items-center justify-between rounded-lg px-1 py-3 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                            dealCategory.active
                              ? "sidebar-menu-action-active"
                              : "sidebar-menu-action"
                          }`}
                          aria-expanded={isExpanded}
                        >
                          <span>{dealCategory.label}</span>
                          <span aria-hidden="true" className="text-current">
                            {isExpanded ? "-" : "+"}
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={dealCategory.href}
                          scroll={false}
                          onClick={closeSidebar}
                          className={`flex items-center justify-between rounded-lg px-1 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                            dealCategory.active
                              ? "sidebar-menu-action-active"
                              : "sidebar-menu-action"
                          }`}
                        >
                          <span>{dealCategory.label}</span>
                        </Link>
                      )}

                      {hasSubcategories && isExpanded ? (
                        <div className="pb-3 pl-6">
                        <div className="mt-1 grid gap-1 border-l border-slate-200 pl-3">
                          <Link
                            href={dealCategory.href}
                            scroll={false}
                            onClick={closeSidebar}
                            className={`rounded-lg px-1 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                              dealCategory.active && !dealCategory.subcategories.some((subcategory) => subcategory.active)
                                ? "sidebar-menu-action-active"
                                : "sidebar-menu-action"
                            }`}
                          >
                            All {dealCategory.label}
                          </Link>
                          {dealCategory.subcategories.map((subcategory) => (
                            <Link
                              key={subcategory.label}
                              href={subcategory.href}
                              scroll={false}
                              onClick={closeSidebar}
                              className={`rounded-lg px-1 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                                subcategory.active
                                  ? "sidebar-menu-action-active"
                                  : "sidebar-menu-action"
                              }`}
                            >
                              {subcategory.label}
                            </Link>
                          ))}
                        </div>
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
