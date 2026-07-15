"use client";

import { useMemo, useState } from "react";
import type { Deal } from "@/lib/deals";
import type { DealVoteDirection } from "@/lib/deals";
import type { ProfileComment } from "@/lib/comments";
import type { SavedDeal } from "@/lib/savedDeals";
import {
  ArrowUpIcon,
  BookmarkIcon,
  CommentIcon,
  DocumentListIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import ProfileCommentPreviewCard from "./ProfileCommentPreviewCard";
import ProfileDealPreviewCard from "./ProfileDealPreviewCard";
import ProfileEmptyState from "./ProfileEmptyState";
import ProfilePaginationControls from "./ProfilePaginationControls";

type ProfileTab = "posted" | "saved" | "comments";
type CommentSort = "newest" | "oldest";

const tabs: { value: ProfileTab; label: string }[] = [
  { value: "posted", label: "Posts" },
  { value: "saved", label: "Saved" },
  { value: "comments", label: "Comments" },
];
const activityPageSize = 5;

function ProfileTabIcon({ tab }: { tab: ProfileTab }) {
  if (tab === "posted") {
    return <DocumentListIcon className="h-5 w-5 shrink-0" />;
  }

  if (tab === "saved") {
    return <BookmarkIcon className="h-5 w-5 shrink-0" />;
  }

  return <CommentIcon className="h-5 w-5 shrink-0" />;
}

type StatIconName = "up-given" | "up-received" | "comments" | "deals" | "followers" | "following";
type StatItem = { label: string; value: number; icon: StatIconName };

function StatIcon({ name }: { name: StatIconName }) {
  if (name === "up-given" || name === "up-received") {
    if (name === "up-received") {
      return <TrophyIcon className="h-5 w-5" />;
    }

    return <ArrowUpIcon className="h-5 w-5" />;
  }

  if (name === "comments") {
    return <CommentIcon className="h-5 w-5" />;
  }

  if (name === "deals") {
    return <DocumentListIcon className="h-5 w-5" />;
  }

  return <UsersIcon name={name} className="h-5 w-5" />;
}

function ProfilePrivateState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-8 text-center">
      <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-5 text-slate-600">{description}</p>
    </div>
  );
}

export default function ProfileActivityTabs({
  postedDeals,
  savedDeals,
  comments,
  initialVotes,
  savedDealIds,
  voteStorageScope,
  stats,
  showSaved = true,
  showComments = true,
  savedIsPrivate = false,
  commentsArePrivate = false,
  showStats = true,
  showCommentStat = true,
  showFollowingStat = true,
  showOwnerActions = false,
}: {
  postedDeals: Deal[];
  savedDeals: SavedDeal[];
  comments: ProfileComment[];
  initialVotes: Record<string, DealVoteDirection | null>;
  savedDealIds: string[];
  voteStorageScope?: string;
  stats: {
    upvotesGiven: number;
    upvotesReceived: number;
    comments: number;
    dealsPosted: number;
    followers: number;
    following: number;
  };
  showSaved?: boolean;
  showComments?: boolean;
  savedIsPrivate?: boolean;
  commentsArePrivate?: boolean;
  showStats?: boolean;
  showCommentStat?: boolean;
  showFollowingStat?: boolean;
  showOwnerActions?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("posted");
  const [postedPage, setPostedPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(() => new Set());
  const savedDealIdSet = useMemo(() => new Set(savedDealIds), [savedDealIds]);
  const visibleProfileComments = useMemo(
    () => comments.filter((comment) => !deletedCommentIds.has(comment.id)),
    [comments, deletedCommentIds],
  );
  const sortedComments = useMemo(
    () =>
      [...visibleProfileComments].sort((first, second) => {
        const firstTime = new Date(first.createdAt).getTime();
        const secondTime = new Date(second.createdAt).getTime();

        return commentSort === "newest" ? secondTime - firstTime : firstTime - secondTime;
      }),
    [commentSort, visibleProfileComments],
  );
  const postedPageCount = Math.max(1, Math.ceil(postedDeals.length / activityPageSize));
  const savedPageCount = Math.max(1, Math.ceil(savedDeals.length / activityPageSize));
  const commentsPageCount = Math.max(1, Math.ceil(sortedComments.length / activityPageSize));
  const currentPostedPage = Math.min(postedPage, postedPageCount);
  const currentSavedPage = Math.min(savedPage, savedPageCount);
  const currentCommentsPage = Math.min(commentsPage, commentsPageCount);
  const postedPageStart = (currentPostedPage - 1) * activityPageSize;
  const savedPageStart = (currentSavedPage - 1) * activityPageSize;
  const commentsPageStart = (currentCommentsPage - 1) * activityPageSize;
  const visiblePostedDeals = postedDeals.slice(postedPageStart, postedPageStart + activityPageSize);
  const visibleSavedDeals = savedDeals.slice(savedPageStart, savedPageStart + activityPageSize);
  const visibleComments = sortedComments.slice(commentsPageStart, commentsPageStart + activityPageSize);
  const hasPostedPagination = postedDeals.length > activityPageSize;
  const hasSavedPagination = savedDeals.length > activityPageSize;
  const hasCommentsPagination = sortedComments.length > activityPageSize;
  const visibleTabs = tabs.filter((tab) => {
    if (tab.value === "saved") {
      return showSaved || savedIsPrivate;
    }

    if (tab.value === "comments") {
      return showComments || commentsArePrivate;
    }

    return true;
  });
  const tabGridClassName =
    visibleTabs.length === 3 ? "grid-cols-3" : visibleTabs.length === 2 ? "grid-cols-2" : "grid-cols-1";
  const visibleStats: StatItem[] = [
    { label: "Upvotes received", value: stats.upvotesReceived, icon: "up-received" },
    ...(showCommentStat ? [{ label: "Comments", value: stats.comments, icon: "comments" as const }] : []),
    { label: "Deals posted", value: stats.dealsPosted, icon: "deals" },
    { label: "Followers", value: stats.followers, icon: "followers" },
    ...(showFollowingStat ? [{ label: "Following", value: stats.following, icon: "following" as const }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="profile-activity-panel px-4 pb-2 sm:px-5">
        {showStats ? (
        <section className="pb-5">
          <dl className="flex flex-wrap justify-center">
            {visibleStats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[8.5rem] px-3 py-3 text-center"
              >
                <div className="mx-auto flex w-fit items-center gap-1.5 text-slate-500">
                  <StatIcon name={stat.icon} />
                  <dd className="text-xl font-black tabular-nums text-slate-950">{stat.value}</dd>
                </div>
                <dt className="mt-0.5 text-xs font-semibold text-slate-500">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </section>
        ) : null}
        <div
          className={`profile-activity-tabs grid gap-1 border-b ${tabGridClassName}`}
          role="tablist"
          aria-label="Profile activity"
        >
          {visibleTabs.map((tab) => {
            const isSelected = tab.value === activeTab;

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveTab(tab.value);
                  setPostedPage(1);
                  setSavedPage(1);
                  setCommentsPage(1);
                }}
                className={`profile-activity-tab relative inline-flex h-12 items-center justify-center gap-2 px-3 text-center text-sm font-bold transition sm:h-14 sm:px-4 sm:text-base ${
                  isSelected
                    ? "profile-activity-tab-active"
                    : "profile-activity-tab-idle"
                }`}
              >
                <ProfileTabIcon tab={tab.value} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "posted" ? (
        postedDeals.length > 0 ? (
          <>
            <div className="profile-deal-grid grid gap-3">
              {visiblePostedDeals.map((deal) => (
                <ProfileDealPreviewCard
                  key={deal.id}
                  deal={deal}
                  initialVote={initialVotes[deal.id] ?? null}
                  initialSaved={savedDealIdSet.has(deal.id)}
                  voteStorageScope={voteStorageScope}
                  showOwnerActions={showOwnerActions}
                />
              ))}
            </div>
            {hasPostedPagination ? (
              <ProfilePaginationControls
                currentPage={currentPostedPage}
                pageCount={postedPageCount}
                onPageChange={setPostedPage}
              />
            ) : null}
          </>
        ) : (
          <ProfileEmptyState
            title="No posted deals yet"
            description="Deals submitted from this account will appear here after you post them."
          />
        )
      ) : null}

      {activeTab === "saved" ? (
        savedIsPrivate ? (
          <ProfilePrivateState
            title="Saved deals are private"
            description="This member has chosen not to show saved deals on their public profile."
          />
        ) : savedDeals.length > 0 ? (
          <>
            <div className="profile-deal-grid grid gap-3">
              {visibleSavedDeals.map((savedDeal) => (
                <ProfileDealPreviewCard
                  key={savedDeal.id}
                  deal={savedDeal.deal}
                  savedAt={savedDeal.savedAt}
                  initialVote={initialVotes[savedDeal.deal.id] ?? null}
                  initialSaved
                  voteStorageScope={voteStorageScope}
                />
              ))}
            </div>
            {hasSavedPagination ? (
              <ProfilePaginationControls
                currentPage={currentSavedPage}
                pageCount={savedPageCount}
                onPageChange={setSavedPage}
              />
            ) : null}
          </>
        ) : (
          <ProfileEmptyState
            title="No saved deals available"
            description="Use the bookmark button on any live deal to keep it here."
          />
        )
      ) : null}

      {activeTab === "comments" ? (
        commentsArePrivate ? (
          <ProfilePrivateState
            title="Comments are private"
            description="This member has chosen not to show comments on their public profile."
          />
        ) : visibleProfileComments.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-black text-slate-950">
                Comments <span className="text-slate-500">({visibleProfileComments.length})</span>
              </h2>
              <label className="home-deal-card-fact inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold text-slate-600">
                <span className="sr-only">Sort comments</span>
                <select
                  value={commentSort}
                  onChange={(event) => {
                    setCommentSort(event.target.value as CommentSort);
                    setCommentsPage(1);
                  }}
                  className="bg-transparent font-bold outline-none"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </label>
            </div>
            <div className="divide-y-0">
              {visibleComments.map((comment) => (
                <ProfileCommentPreviewCard
                  key={comment.id}
                  comment={comment}
                  onDeleted={(commentId) => {
                    setDeletedCommentIds((current) => new Set([...current, commentId]));
                    setCommentsPage(1);
                  }}
                />
              ))}
            </div>
            {hasCommentsPagination ? (
              <ProfilePaginationControls
                currentPage={currentCommentsPage}
                pageCount={commentsPageCount}
                onPageChange={setCommentsPage}
              />
            ) : null}
          </>
        ) : (
          <ProfileEmptyState
            title="No comments yet"
            description="Comments you post while signed in will appear here."
          />
        )
      ) : null}

    </div>
  );
}
