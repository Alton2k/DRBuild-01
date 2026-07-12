"use client";

import { useEffect, useRef, useState } from "react";

type ShareStatus = "idle" | "copied" | "shared" | "error";

function getAbsoluteDealUrl(href: string) {
  if (typeof window === "undefined") {
    return href;
  }

  return new URL(href, window.location.origin).toString();
}

export default function ShareDealButton({
  title,
  href,
  text,
  className,
  disabled = false,
}: {
  title: string;
  href: string;
  text?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showStatus = (nextStatus: ShareStatus) => {
    setStatus(nextStatus);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
    }, 2200);
  };

  const shareDeal = async () => {
    if (disabled) {
      return;
    }

    const url = getAbsoluteDealUrl(href);

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: text ?? "Check out this Deal Rakyat deal.",
          url,
        });
        showStatus("shared");
        return;
      }

      await navigator.clipboard.writeText(url);
      showStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      showStatus("error");
    }
  };

  const statusLabel = {
    idle: "",
    copied: "Link copied",
    shared: "Shared",
    error: "Could not share",
  }[status];

  return (
    <span className="inline-flex items-center">
      <button
        type="button"
        aria-label={disabled ? "Sharing is unavailable for expired deals" : "Share deal"}
        onClick={shareDeal}
        disabled={disabled}
        className={
          className
            ? `${className} ${disabled ? "cursor-not-allowed opacity-45" : ""}`.trim()
            : `inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              }`
        }
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
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
          <path d="m16 6-4-4-4 4" />
          <path d="M12 2v13" />
        </svg>
      </button>
      <span
        role="status"
        aria-live="polite"
        className={status === "idle" ? "sr-only" : `mobile-safe-toast theme-alert pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-4 py-3 text-center text-sm font-semibold shadow-lg ${status === "error" ? "theme-alert-warning" : "theme-alert-success"}`}
      >
        {statusLabel}
      </span>
    </span>
  );
}
