"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toggleSavedDealAction } from "@/app/actions";
import { BookmarkIcon } from "@/components/icons";

export default function SaveDealButton({
  dealId,
  initialSaved = false,
  isSignedIn = false,
  className,
  disabled = false,
}: {
  dealId: string;
  initialSaved?: boolean;
  isSignedIn?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const goToLogin = () => {
    const query = searchParams.toString();
    const next = query ? `${pathname}?${query}` : pathname;
    router.push(`/auth?mode=login&next=${encodeURIComponent(next)}`);
  };

  const toggleSavedDeal = () => {
    if (disabled || isPending) {
      return;
    }

    if (!isSignedIn) {
      goToLogin();
      return;
    }

    const previousSaved = isSaved;
    const nextSaved = !previousSaved;
    setIsSaved(nextSaved);
    setMessage("");

    startTransition(async () => {
      const result = await toggleSavedDealAction(dealId, nextSaved);

      if (result.loginRequired) {
        setIsSaved(previousSaved);
        goToLogin();
        return;
      }

      if (!result.ok) {
        setIsSaved(previousSaved);
        setMessage(result.message ?? "Could not update saved deal.");
        return;
      }

      setIsSaved(result.isSaved);
      setMessage(result.isSaved ? "Deal saved." : "Removed from saved deals.");
      router.refresh();
    });
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-pressed={isSaved}
        aria-label={
          disabled
            ? "Saving is unavailable for expired deals"
            : isSaved
              ? "Remove saved deal"
              : "Save deal"
        }
        title={message || undefined}
        onClick={toggleSavedDeal}
        disabled={disabled || isPending}
        className={
          className
            ? `${className} ${disabled || isPending ? "cursor-not-allowed opacity-45" : ""}`.trim()
            : `inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition ${
                disabled || isPending
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                  : isSaved
                    ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              }`
        }
      >
        <BookmarkIcon fill={isSaved ? "currentColor" : "none"} />
      </button>
      {message ? <span className="mobile-safe-toast theme-alert theme-alert-info pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-4 py-3 text-center text-sm font-semibold shadow-lg" role="status">{message}</span> : null}
    </span>
  );
}
