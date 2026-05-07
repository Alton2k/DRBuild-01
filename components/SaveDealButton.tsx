"use client";

import { useEffect, useState } from "react";

const savedDealsStorageKey = "dealmy_saved_deal_ids";
const savedDealsChangedEventName = "dealmy:saved-deals-changed";

function readSavedDealIds() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const rawValue = window.localStorage.getItem(savedDealsStorageKey);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];

    return new Set(
      Array.isArray(parsedValue)
        ? parsedValue.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set<string>();
  }
}

function writeSavedDealIds(savedDealIds: Set<string>) {
  window.localStorage.setItem(savedDealsStorageKey, JSON.stringify([...savedDealIds]));
  window.dispatchEvent(new Event(savedDealsChangedEventName));
}

export default function SaveDealButton({
  dealId,
  className,
}: {
  dealId: string;
  className?: string;
}) {
  const [isSaved, setIsSaved] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const syncSavedState = () => {
      setIsSaved(readSavedDealIds().has(dealId));
      setIsReady(true);
    };

    syncSavedState();

    window.addEventListener("storage", syncSavedState);
    window.addEventListener(savedDealsChangedEventName, syncSavedState);

    return () => {
      window.removeEventListener("storage", syncSavedState);
      window.removeEventListener(savedDealsChangedEventName, syncSavedState);
    };
  }, [dealId]);

  const toggleSavedDeal = () => {
    const savedDealIds = readSavedDealIds();

    if (savedDealIds.has(dealId)) {
      savedDealIds.delete(dealId);
      setIsSaved(false);
    } else {
      savedDealIds.add(dealId);
      setIsSaved(true);
    }

    writeSavedDealIds(savedDealIds);
  };

  return (
    <button
      type="button"
      aria-pressed={isSaved}
      aria-label={isSaved ? "Remove saved deal" : "Save deal"}
      onClick={toggleSavedDeal}
      className={
        className ??
        `inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition ${
          isSaved
            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
        }`
      }
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill={isReady && isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M6 4.75A2.75 2.75 0 0 1 8.75 2h6.5A2.75 2.75 0 0 1 18 4.75V21l-6-3.5L6 21z" />
      </svg>
    </button>
  );
}
