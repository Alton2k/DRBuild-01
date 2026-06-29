import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import {
  getDealsByAuthorUserIdResult,
  getDealVoteDirectionsByDealIds,
  getProfileVoteStats,
} from "@/lib/deals";
import { getCommentCountsByDealIds, getCommentsByAuthorUserIdResult } from "@/lib/comments";
import { getSavedDealsForUserResult } from "@/lib/savedDeals";
import { getDealVoteViewerAliases, getDealVoteViewerId } from "@/lib/dealVoteIdentity";
import { createDefaultAccountSettings } from "@/lib/accountSettings";
import { getAccountSettingsForUser } from "@/lib/userSettings";
import { getFollowSummaryForUser } from "@/lib/follows";
import ProfileActivityTabs from "./ProfileActivityTabs";
import ProfileHeaderClient from "./ProfileHeaderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile | Deal Rakyat",
  description: "View your Deal Rakyat account activity and submitted deals.",
};

const dealViewerCookieName = "dealmy_deal_viewer_id";
const commentViewerCookieName = "dealmy_comment_viewer_id";

function getDisplayName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return user?.user_metadata.full_name ?? user?.user_metadata.name ?? user?.email ?? "Deal Rakyat member";
}

function formatJoinedDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-MY", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth?mode=login&next=/profile");
  }

  const cookieStore = await cookies();
  const dealViewerId = cookieStore.get(dealViewerCookieName)?.value;
  const commentViewerId = cookieStore.get(commentViewerCookieName)?.value;
  const [dealsResult, savedDealsResult, commentsResult] = await Promise.all([
    getDealsByAuthorUserIdResult(user.id),
    getSavedDealsForUserResult(user.id),
    getCommentsByAuthorUserIdResult(user.id, commentViewerId),
  ]);
  const rawPostedDeals = dealsResult.ok ? dealsResult.data : [];
  const rawSavedDeals = savedDealsResult.ok ? savedDealsResult.data : [];
  const comments = commentsResult.ok ? commentsResult.data : [];
  const displayName = getDisplayName(user);
  const settings = await getAccountSettingsForUser(user.id, displayName).catch(() =>
    createDefaultAccountSettings(displayName),
  );
  const joinedDate = formatJoinedDate(user.joinedAt);
  const profileDealIds = Array.from(
    new Set([
      ...rawPostedDeals.map((deal) => deal.id),
      ...rawSavedDeals.map((savedDeal) => savedDeal.deal.id),
    ]),
  );
  const dealVoteViewerId = getDealVoteViewerId({ userId: user.id, anonymousViewerId: dealViewerId });
  const dealVoteViewerAliases = getDealVoteViewerAliases({ userId: user.id, anonymousViewerId: dealViewerId });
  const [viewerVotes, voteStats, followCounts, profileCommentCounts] = await Promise.all([
    getDealVoteDirectionsByDealIds(profileDealIds, dealVoteViewerId, user.id, dealVoteViewerAliases),
    getProfileVoteStats(rawPostedDeals.map((deal) => deal.id), dealVoteViewerId, user.id),
    getFollowSummaryForUser(user.id),
    getCommentCountsByDealIds(profileDealIds),
  ]);
  const postedDeals = rawPostedDeals.map((deal) => ({
    ...deal,
    commentCount: profileCommentCounts.get(deal.id) ?? deal.commentCount,
  }));
  const savedDeals = rawSavedDeals.map((savedDeal) => ({
    ...savedDeal,
    deal: {
      ...savedDeal.deal,
      commentCount: profileCommentCounts.get(savedDeal.deal.id) ?? savedDeal.deal.commentCount,
    },
  }));
  const initialVotes = Object.fromEntries(viewerVotes);
  const savedDealIds = savedDeals.map((savedDeal) => savedDeal.deal.id);

  return (
    <main className="home-page min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-4">
        <ProfileHeaderClient
          initialDisplayName={settings.profile.userName || displayName}
          initialEmail={user.email}
          initialAvatarUrl={settings.profile.avatarUrl}
          initialBio={settings.profile.bio}
          joinedDate={joinedDate}
          showActions={false}
          editProfileHref="/settings#profile"
        />

        <div className="mx-4 border-t border-slate-200 sm:mx-5" aria-hidden="true" />

        <section className="home-panel">
          {!dealsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Submitted deals are temporarily unavailable.
            </div>
          ) : null}
          {!savedDealsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Saved deals are temporarily unavailable.
            </div>
          ) : null}
          {!commentsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Comment history is temporarily unavailable.
            </div>
          ) : null}
          <ProfileActivityTabs
            postedDeals={postedDeals}
            savedDeals={savedDeals}
            comments={comments}
            initialVotes={initialVotes}
            savedDealIds={savedDealIds}
            voteStorageScope={dealVoteViewerId}
            showStats
            stats={{
              upvotesGiven: voteStats.upvotesGiven,
              upvotesReceived: voteStats.upvotesReceived,
              comments: comments.length,
              dealsPosted: postedDeals.length,
              followers: followCounts.followers,
              following: followCounts.following,
            }}
          />
        </section>
      </div>
    </main>
  );
}
