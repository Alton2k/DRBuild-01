"use client";

import { useState, useTransition } from "react";
import { voteDealAction, type VoteDirection } from "@/app/actions";
import { VoteChevronIcon } from "@/components/icons";

interface DealVoteButtonsProps {
  dealId: string;
  initialScore: number;
  initialVote?: VoteDirection | null;
  showScore?: boolean;
  scoreClassName?: string;
  buttonClassName?: string;
  containerClassName?: string;
  wrapperClassName?: string;
  flat?: boolean;
  voteStorageScope?: string;
  disabled?: boolean;
}

const defaultScoreClassName =
  "min-w-10 text-center text-sm font-semibold tabular-nums";

const defaultButtonClassName =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-wait disabled:opacity-60";

const defaultContainerClassName =
  "inline-flex items-center gap-1 rounded-full border p-1 shadow-sm";

const neutralContainerClassName = "deal-vote-control-neutral";

const neutralButtonClassName =
  "deal-vote-button-neutral";

const neutralScoreClassName = "deal-vote-score-neutral";

const selectedContainerClassNames: Record<VoteDirection, string> = {
  up: "deal-vote-control-up",
  down: "deal-vote-control-down",
};

const selectedButtonClassNames: Record<VoteDirection, string> = {
  up: "deal-vote-button-up",
  down: "deal-vote-button-down",
};

const selectedScoreClassNames: Record<VoteDirection, string> = {
  up: "deal-vote-score-up",
  down: "deal-vote-score-down",
};

function getVoteStorageKey(dealId: string, voteStorageScope: string) {
  return `deal-rakyat:deal-vote:${voteStorageScope}:${dealId}`;
}

function persistVoteSelection(key: string, vote: VoteDirection | null) {
  try {
    if (vote) window.localStorage.setItem(key, vote);
    else window.localStorage.removeItem(key);
  } catch {
    // Voting remains functional when browser storage is restricted.
  }
}

export default function DealVoteButtons({
  dealId,
  initialScore,
  initialVote = null,
  showScore = true,
  scoreClassName = defaultScoreClassName,
  buttonClassName = defaultButtonClassName,
  containerClassName = defaultContainerClassName,
  wrapperClassName = "flex flex-col gap-2",
  flat = false,
  voteStorageScope = "anonymous",
  disabled = false,
}: DealVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(initialVote);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const vote = (direction: VoteDirection) => {
    if (disabled) {
      return;
    }

    const previousVote = selectedVote;
    const nextVote = previousVote === direction ? null : direction;
    const previousDelta = previousVote === "up" ? 1 : previousVote === "down" ? -1 : 0;
    const nextDelta = nextVote === "up" ? 1 : nextVote === "down" ? -1 : 0;
    const scoreDelta = nextDelta - previousDelta;

    setErrorMessage("");
    setScore((current) => current + scoreDelta);
    setSelectedVote(nextVote);

    const storageKey = getVoteStorageKey(dealId, voteStorageScope);
    persistVoteSelection(storageKey, nextVote);

    startTransition(async () => {
      const result = await voteDealAction(dealId, direction);

      if (!result.ok) {
        setScore((current) => current - scoreDelta);
        setSelectedVote(previousVote);
        setErrorMessage(result.message ?? "Could not save your vote right now. Please try again.");

        persistVoteSelection(storageKey, previousVote);

        return;
      }

      setScore(result.score);
      setSelectedVote(result.viewerVote);

      persistVoteSelection(storageKey, result.viewerVote);
    });
  };

  const voteControls = (
    <>
      <button
        type="button"
        aria-label={selectedVote === "up" ? "Remove upvote" : "Upvote deal"}
        onClick={() => vote("up")}
        disabled={isPending || disabled}
        aria-pressed={selectedVote === "up"}
        className={`deal-vote-button ${buttonClassName} ${
          selectedVote === "up" ? selectedButtonClassNames.up : neutralButtonClassName
        }`}
      >
        <VoteChevronIcon direction="up" />
      </button>
      {showScore ? (
        <span
          className={`deal-vote-score ${scoreClassName} ${
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
        disabled={isPending || disabled}
        aria-pressed={selectedVote === "down"}
        className={`deal-vote-button ${buttonClassName} ${
          selectedVote === "down" ? selectedButtonClassNames.down : neutralButtonClassName
        }`}
      >
        <VoteChevronIcon direction="down" />
      </button>
    </>
  );

  const error = errorMessage ? (
        <p className={`theme-alert theme-alert-warning max-w-64 px-3 py-2 text-xs font-semibold leading-5 ${flat ? "mobile-safe-toast fixed bottom-4 left-1/2 z-[80] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 text-center" : ""}`} aria-live="polite">
          <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
            {"\u26A0"}
          </span>
          {errorMessage}
        </p>
  ) : null;

  if (flat) {
    return <>{voteControls}{error}</>;
  }

  return (
    <div className={wrapperClassName}>
      <div
        className={`deal-vote-control ${containerClassName} ${
          selectedVote ? selectedContainerClassNames[selectedVote] : neutralContainerClassName
        }`}
        aria-label="Deal voting"
      >
        {voteControls}
      </div>
      {error}
    </div>
  );
}
