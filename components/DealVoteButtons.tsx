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
}

const defaultScoreClassName =
  "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700";

const defaultButtonClassName =
  "rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

function getVoteStorageKey(dealId: string) {
  return `deal-rakyat:deal-vote:${dealId}`;
}

export default function DealVoteButtons({
  dealId,
  initialScore,
  initialVote = null,
  showScore = true,
  scoreClassName = defaultScoreClassName,
  buttonClassName = defaultButtonClassName,
}: DealVoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [selectedVote, setSelectedVote] = useState<VoteDirection | null>(initialVote);
  const [isPending, startTransition] = useTransition();

  const vote = (direction: VoteDirection) => {
    const storedVote = window.localStorage.getItem(getVoteStorageKey(dealId));
    const previousVote =
      storedVote === "up" || storedVote === "down" ? storedVote : selectedVote;

    if (previousVote === direction) {
      setSelectedVote(direction);
      return;
    }

    const previousDelta = previousVote === "up" ? 1 : previousVote === "down" ? -1 : 0;
    const nextDelta = direction === "up" ? 1 : -1;
    const scoreDelta = nextDelta - previousDelta;

    setScore((current) => current + scoreDelta);
    setSelectedVote(direction);
    window.localStorage.setItem(getVoteStorageKey(dealId), direction);

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
    });
  };

  return (
    <>
      {showScore ? <span className={scoreClassName}>Score {score}</span> : null}
      <button
        type="button"
        onClick={() => vote("up")}
        disabled={isPending || selectedVote === "up"}
        aria-pressed={selectedVote === "up"}
        className={buttonClassName}
      >
        Upvote
      </button>
      <button
        type="button"
        onClick={() => vote("down")}
        disabled={isPending || selectedVote === "down"}
        aria-pressed={selectedVote === "down"}
        className={buttonClassName}
      >
        Downvote
      </button>
    </>
  );
}
