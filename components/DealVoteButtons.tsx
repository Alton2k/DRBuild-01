"use client";

import { useState, useTransition } from "react";
import { voteDealAction, type VoteDirection } from "@/app/actions";

interface DealVoteButtonsProps {
  dealId: string;
  initialScore: number;
  initialVote?: VoteDirection | null;
  showScore?: boolean;
  scoreClassName?: string;
  buttonClassName?: string;
  containerClassName?: string;
}

const defaultScoreClassName =
  "min-w-10 text-center text-sm font-semibold tabular-nums";

const defaultButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-wait disabled:opacity-60";

const defaultContainerClassName =
  "inline-flex items-center gap-1 rounded-full border p-1 shadow-sm";

const neutralContainerClassName = "border-slate-200 bg-white/80";

const neutralButtonClassName =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950";

const neutralScoreClassName = "text-slate-800";

const selectedContainerClassNames: Record<VoteDirection, string> = {
  up: "border-emerald-300 bg-emerald-50",
  down: "border-rose-300 bg-rose-50",
};

const selectedButtonClassNames: Record<VoteDirection, string> = {
  up: "border-emerald-600 bg-emerald-600 text-white shadow-md hover:border-emerald-700 hover:bg-emerald-700 hover:text-white",
  down: "border-rose-600 bg-rose-600 text-white shadow-md hover:border-rose-700 hover:bg-rose-700 hover:text-white",
};

const selectedScoreClassNames: Record<VoteDirection, string> = {
  up: "text-emerald-700",
  down: "text-rose-700",
};

function getVoteStorageKey(dealId: string) {
  return `deal-rakyat:deal-vote:${dealId}`;
}

function ChevronIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    >
      {direction === "up" ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  );
}

export default function DealVoteButtons({
  dealId,
  initialScore,
  initialVote = null,
  showScore = true,
  scoreClassName = defaultScoreClassName,
  buttonClassName = defaultButtonClassName,
  containerClassName = defaultContainerClassName,
}: DealVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(initialVote);
  const [isPending, startTransition] = useTransition();

  const vote = (direction: VoteDirection) => {
    const previousVote = selectedVote;
    const nextVote = previousVote === direction ? null : direction;
    const previousDelta = previousVote === "up" ? 1 : previousVote === "down" ? -1 : 0;
    const nextDelta = nextVote === "up" ? 1 : nextVote === "down" ? -1 : 0;
    const scoreDelta = nextDelta - previousDelta;

    setScore((current) => current + scoreDelta);
    setSelectedVote(nextVote);

    if (nextVote) {
      window.localStorage.setItem(getVoteStorageKey(dealId), nextVote);
    } else {
      window.localStorage.removeItem(getVoteStorageKey(dealId));
    }

    startTransition(async () => {
      const result = await voteDealAction(dealId, direction);

      if (!result.ok) {
        setScore((current) => current - scoreDelta);
        setSelectedVote(previousVote);

        if (previousVote) {
          window.localStorage.setItem(getVoteStorageKey(dealId), previousVote);
        } else {
          window.localStorage.removeItem(getVoteStorageKey(dealId));
        }

        return;
      }

      setScore(result.score);
      setSelectedVote(result.viewerVote);

      if (result.viewerVote) {
        window.localStorage.setItem(getVoteStorageKey(dealId), result.viewerVote);
      } else {
        window.localStorage.removeItem(getVoteStorageKey(dealId));
      }
    });
  };

  return (
    <div
      className={`${containerClassName} ${
        selectedVote ? selectedContainerClassNames[selectedVote] : neutralContainerClassName
      }`}
      aria-label="Deal voting"
    >
      <button
        type="button"
        aria-label={selectedVote === "up" ? "Remove upvote" : "Upvote deal"}
        onClick={() => vote("up")}
        disabled={isPending}
        aria-pressed={selectedVote === "up"}
        className={`${buttonClassName} ${
          selectedVote === "up" ? selectedButtonClassNames.up : neutralButtonClassName
        }`}
      >
        <ChevronIcon direction="up" />
      </button>
      {showScore ? (
        <span
          className={`${scoreClassName} ${
            selectedVote ? selectedScoreClassNames[selectedVote] : neutralScoreClassName
          }`}
        >
          {score}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={selectedVote === "down" ? "Remove downvote" : "Downvote deal"}
        onClick={() => vote("down")}
        disabled={isPending}
        aria-pressed={selectedVote === "down"}
        className={`${buttonClassName} ${
          selectedVote === "down" ? selectedButtonClassNames.down : neutralButtonClassName
        }`}
      >
        <ChevronIcon direction="down" />
      </button>
    </div>
  );
}
