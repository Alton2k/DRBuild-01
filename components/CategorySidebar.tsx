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
    setIsVisible(true);
    window.requestAnimationFrame(() => setIsOpen(true));
  };

  const closeSidebar = () => {
    setIsOpen(false);
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
        className="mt-4 inline-flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-white"
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
            className={`absolute right-0 top-0 flex h-full w-full max-w-sm transform-gpu flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:duration-0 ${
              isOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Browse
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">Categories</h2>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950"
                aria-label="Close category menu"
              >
                X
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-2">
                {categories.map((dealCategory) => {
                  const hasSubcategories = dealCategory.subcategories.length > 0;
                  const isExpanded = openCategory === dealCategory.label;

                  return (
                    <div key={dealCategory.label} className="border-b border-slate-100 last:border-b-0">
                      {hasSubcategories ? (
                        <button
                          type="button"
                          onClick={() => setOpenCategory(isExpanded ? "" : dealCategory.label)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                            dealCategory.active
                              ? "bg-slate-100 text-slate-950"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                          aria-expanded={isExpanded}
                        >
                          <span>{dealCategory.label}</span>
                          <span aria-hidden="true" className="text-slate-400">
                            {isExpanded ? "-" : "+"}
                          </span>
                        </button>
                      ) : (
                        <Link
                          href={dealCategory.href}
                          scroll={false}
                          onClick={closeSidebar}
                          className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition ${
                            dealCategory.active
                              ? "bg-slate-100 text-slate-950"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                          }`}
                        >
                          <span>{dealCategory.label}</span>
                        </Link>
                      )}

                      {hasSubcategories && isExpanded ? (
                        <div className="px-3 pb-3">
                        <div className="mt-2 grid gap-1 pb-1">
                          <Link
                            href={dealCategory.href}
                            scroll={false}
                            onClick={closeSidebar}
                            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                              dealCategory.active && !dealCategory.subcategories.some((subcategory) => subcategory.active)
                                ? "bg-slate-900 text-white"
                                : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
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
                              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                                subcategory.active
                                  ? "bg-slate-900 text-white"
                                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
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
