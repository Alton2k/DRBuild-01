"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "@/components/icons";

const pageWindowSize = 5;

export default function ProfilePaginationControls({
  currentPage,
  pageCount,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const pageWindowStart = Math.min(
    Math.max(1, currentPage - Math.floor(pageWindowSize / 2)),
    Math.max(1, pageCount - pageWindowSize + 1),
  );
  const pageNumbers = Array.from(
    { length: Math.min(pageWindowSize, pageCount) },
    (_, index) => pageWindowStart + index,
  );

  return (
    <nav className="flex justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          aria-label="First page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(1)}
          className="inline-flex h-10 min-w-8 items-center justify-center px-2 text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronsLeftIcon />
        </button>
        <button
          type="button"
          aria-label="Previous page"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="inline-flex h-10 min-w-8 items-center justify-center px-2 text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeftIcon />
        </button>
        {pageNumbers.map((pageNumber) => {
          const isCurrentPage = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              type="button"
              aria-current={isCurrentPage ? "page" : undefined}
              onClick={() => onPageChange(pageNumber)}
              className={`inline-flex h-10 min-w-8 items-center justify-center px-2 text-sm font-black transition ${
                isCurrentPage
                  ? "text-[#dc115e]"
                  : "text-slate-700 hover:text-slate-950"
              }`}
            >
              {pageNumber}
            </button>
          );
        })}
        <button
          type="button"
          aria-label="Next page"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
          className="inline-flex h-10 min-w-8 items-center justify-center px-2 text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          aria-label="Last page"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(pageCount)}
          className="inline-flex h-10 min-w-8 items-center justify-center px-2 text-slate-700 transition hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronsRightIcon />
        </button>
      </div>
    </nav>
  );
}
