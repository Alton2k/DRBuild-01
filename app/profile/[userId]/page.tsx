import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getPublicUserById, getPublicUserByUsername } from "@/lib/auth";
import {
  getDealsByAuthorUserIdResult,
  getDealVoteDirectionsByDealIds,
  getProfileVoteStats,
} from "@/lib/deals";
import { getCommentsByAuthorUserIdResult } from "@/lib/comments";
import { getSavedDealsForUserResult, getSavedDealIdsForUser } from "@/lib/savedDeals";
import { createDefaultAccountSettings } from "@/lib/accountSettings";
import { getAccountSettingsByProfileUserName, getAccountSettingsForUser } from "@/lib/userSettings";
import { getFollowSummaryForUser } from "@/lib/follows";
import ProfileActivityTabs from "../ProfileActivityTabs";
import ProfileHeaderClient from "../ProfileHeaderClient";

export const dynamic = "force-dynamic";

const dealViewerCookieName = "dealmy_deal_viewer_id";
const commentViewerCookieName = "dealmy_comment_viewer_id";

function getFallbackDisplayName(userId: string, authorName?: string) {
  return authorName || `Member ${userId.slice(0, 6)}`;
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

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const profileIdentifier = decodeURIComponent(userId);
  const currentUser = await getCurrentUser();
  const namedProfile = await getAccountSettingsByProfileUserName(profileIdentifier).catch(() => null);
  const strapiUser = namedProfile ? null : await getPublicUserByUsername(profileIdentifier);
  const resolvedUserId = namedProfile?.userId ?? strapiUser?.id ?? userId;
  let publicUser = strapiUser;

  const cookieStore = await cookies();
  const dealViewerId = cookieStore.get(dealViewerCookieName)?.value;
  const commentViewerId = cookieStore.get(commentViewerCookieName)?.value;

  if (currentUser?.id === resolvedUserId) {
    redirect("/profile");
  }

  const [dealsResult, commentsResult] = await Promise.all([
    getDealsByAuthorUserIdResult(resolvedUserId),
    getCommentsByAuthorUserIdResult(resolvedUserId, commentViewerId),
  ]);
  const postedDeals = dealsResult.ok ? dealsResult.data.filter((deal) => deal.status === "approved") : [];
  const comments = commentsResult.ok
    ? commentsResult.data.map((comment) => ({ ...comment, canDelete: false }))
    : [];

  if (!namedProfile && !publicUser && postedDeals.length === 0 && comments.length === 0) {
    publicUser = await getPublicUserById(resolvedUserId);
  }

  const fallbackDisplayName = getFallbackDisplayName(resolvedUserId, publicUser?.displayName || postedDeals[0]?.authorName);
  const settings = namedProfile?.settings ?? await getAccountSettingsForUser(resolvedUserId, fallbackDisplayName).catch(() =>
    createDefaultAccountSettings(fallbackDisplayName),
  );

  if (!namedProfile && !publicUser && postedDeals.length === 0 && comments.length === 0) {
    notFound();
  }

  if (!settings.toggles.publicProfile) {
    notFound();
  }

  if (settings.toggles.showJoinDate && !publicUser) {
    publicUser = await getPublicUserById(resolvedUserId);
  }

  const savedDealsResult = settings.toggles.showSavedDeals
    ? await getSavedDealsForUserResult(resolvedUserId)
    : { ok: true as const, data: [] };
  const savedDeals = savedDealsResult.ok
    ? savedDealsResult.data.filter((savedDeal) => savedDeal.deal.status === "approved")
    : [];
  const profileDealIds = Array.from(new Set([
    ...postedDeals.map((deal) => deal.id),
    ...savedDeals.map((savedDeal) => savedDeal.deal.id),
  ]));
  const [viewerVotes, voteStats, savedDealIds, followSummary] = await Promise.all([
    getDealVoteDirectionsByDealIds(profileDealIds, dealViewerId),
    settings.toggles.showActivityStats
      ? getProfileVoteStats(profileDealIds, dealViewerId)
      : Promise.resolve({ upvotesGiven: 0, upvotesReceived: 0 }),
    currentUser ? getSavedDealIdsForUser(currentUser.id) : Promise.resolve(new Set<string>()),
    settings.toggles.showActivityStats || currentUser
      ? getFollowSummaryForUser(resolvedUserId, currentUser?.id)
      : Promise.resolve({ followers: 0, following: 0, viewerIsFollowing: false }),
  ]);
  const initialVotes = Object.fromEntries(viewerVotes);
  const joinedDate = settings.toggles.showJoinDate ? formatJoinedDate(publicUser?.joinedAt) : "";

  return (
    <main className="home-page min-h-screen px-4 py-5 text-slate-900 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-4">
        <ProfileHeaderClient
          initialDisplayName={settings.profile.userName || fallbackDisplayName}
          initialAvatarUrl={settings.profile.avatarUrl}
          initialBio={settings.profile.bio}
          joinedDate={joinedDate}
          showActions={false}
          followState={{
            userId: resolvedUserId,
            initialIsFollowing: followSummary.viewerIsFollowing,
            allowFollowers: settings.toggles.allowFollowers,
          }}
        />

        <div className="mx-4 border-t border-slate-200 sm:mx-5" aria-hidden="true" />

        <section className="home-panel">
          {!dealsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Submitted deals are temporarily unavailable.
            </div>
          ) : null}
          {!commentsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Comment history is temporarily unavailable.
            </div>
          ) : null}
          {!savedDealsResult.ok ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Saved deals are temporarily unavailable.
            </div>
          ) : null}
          <ProfileActivityTabs
            postedDeals={postedDeals}
            savedDeals={savedDeals}
            comments={comments}
            initialVotes={initialVotes}
            savedDealIds={Array.from(savedDealIds)}
            showSaved={settings.toggles.showSavedDeals}
            showStats={settings.toggles.showActivityStats}
            stats={{
              upvotesGiven: voteStats.upvotesGiven,
              upvotesReceived: voteStats.upvotesReceived,
              comments: comments.length,
              dealsPosted: postedDeals.length,
              followers: followSummary.followers,
              following: followSummary.following,
            }}
          />
        </section>
      </div>
    </main>
  );
}
