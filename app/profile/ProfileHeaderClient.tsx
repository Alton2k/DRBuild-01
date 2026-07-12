"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toggleFollowUserAction } from "@/app/actions";
import { formatUserHandle } from "@/lib/userHandles";

type ProfileHeaderClientProps = {
  initialDisplayName: string;
  initialUserName?: string;
  initialEmail?: string;
  initialAvatarUrl: string;
  initialBio: string;
  joinedDate: string;
  showActions?: boolean;
  editProfileHref?: string;
  followState?: {
    userId: string;
    initialIsFollowing: boolean;
    allowFollowers: boolean;
  };
};

function getInitials(name: string, email?: string) {
  const source = (name || email || "DR").replace(/^@+/, "");
  const words = source
    .split(/[\s._-]+/)
    .filter(Boolean);
  const initials = words.length > 1 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);

  return initials.toUpperCase();
}

export default function ProfileHeaderClient({
  initialDisplayName,
  initialUserName,
  initialEmail,
  initialAvatarUrl,
  initialBio,
  joinedDate,
  showActions = true,
  editProfileHref,
  followState,
}: ProfileHeaderClientProps) {
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(followState?.initialIsFollowing ?? false);
  const [message, setMessage] = useState("");
  const canRenderFollow = Boolean(followState);
  const followDisabled = isPending || Boolean(followState && !followState.allowFollowers && !isFollowing);
  const avatarClassName = `flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border text-2xl font-black shadow-sm sm:h-28 sm:w-28 sm:text-3xl ${
    initialAvatarUrl
      ? "border-slate-300 bg-transparent"
      : "border-[#dc115e]/20 bg-[#dc115e] text-white"
  }`;
  const avatarContent = initialAvatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={initialAvatarUrl} alt="" width={112} height={112} className="h-full w-full object-cover" />
  ) : (
    getInitials(initialDisplayName, initialEmail)
  );

  function handleFollowClick() {
    if (!followState) {
      return;
    }

    const nextIsFollowing = !isFollowing;

    setMessage("");
    setIsFollowing(nextIsFollowing);

    startTransition(async () => {
      const result = await toggleFollowUserAction(followState.userId, nextIsFollowing);

      if (result.loginRequired) {
        const nextPath = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth?mode=login&next=${encodeURIComponent(nextPath)}`;
        return;
      }

      if (!result.ok) {
        setIsFollowing(result.isFollowing);
        setMessage(result.message ?? "Could not update this follow. Please try again.");
        return;
      }

      setIsFollowing(result.isFollowing);
    });
  }

  return (
    <section className="p-4 sm:p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {editProfileHref ? (
            <Link
              href={editProfileHref}
              aria-label="Edit profile"
              className="group relative block h-20 w-20 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 sm:h-28 sm:w-28"
            >
              <span className={`${avatarClassName} transition group-hover:brightness-95`}>
                {avatarContent}
              </span>
              <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#dc115e] text-white shadow-sm transition group-hover:bg-[#c70f55] sm:h-8 sm:w-8">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
              </span>
            </Link>
          ) : (
            <div className={avatarClassName}>{avatarContent}</div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-start gap-1.5">
              <h1 className="min-w-0 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {initialDisplayName}
              </h1>
              <span className="profile-member-badge mt-0.5 inline-flex items-center rounded border px-1.5 py-0.5 text-[0.55rem] font-black uppercase tracking-[0.12em]">
                Member
              </span>
            </div>
            <p className="mt-1 max-w-xl break-words text-sm font-medium leading-6 text-slate-600">
              {initialUserName ? (
                <>
                  {formatUserHandle(initialUserName)}
                  <span className="px-1.5" aria-hidden="true">
                    |
                  </span>
                </>
              ) : null}
              {joinedDate ? `Joined ${joinedDate}` : "Member profile"}
              {showActions && initialBio ? (
                <>
                  <span className="px-1.5" aria-hidden="true">
                    |
                  </span>
                  {initialBio}
                </>
              ) : null}
            </p>
            {showActions ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/settings#profile"
                className="profile-compact-action inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-transparent px-3 text-[0.7rem] font-bold text-slate-600 transition hover:!border-[#dc115e] hover:!bg-[#dc115e] hover:!text-white focus-visible:!border-[#dc115e] focus-visible:!bg-[#dc115e] focus-visible:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                </svg>
                Edit Profile
              </Link>
              <Link
                href="/settings"
                className="profile-compact-action inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-transparent px-3 text-[0.7rem] font-bold text-slate-600 transition hover:!border-[#dc115e] hover:!bg-[#dc115e] hover:!text-white focus-visible:!border-[#dc115e] focus-visible:!bg-[#dc115e] focus-visible:!text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.97 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.52-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.05V3h4v.08a1.7 1.7 0 0 0 1.03 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 7l-.06.06a1.7 1.7 0 0 0-.34 1.88A1.7 1.7 0 0 0 20.92 10H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z" />
                </svg>
                Account Settings
              </Link>
            </div>
            ) : null}
            {!showActions && initialBio ? (
              <p className="mt-3 max-w-xl break-words text-sm font-medium leading-6 text-slate-600">
                {initialBio}
              </p>
            ) : null}
            {canRenderFollow ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={followDisabled}
                  onClick={handleFollowClick}
                  className="profile-compact-action inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-[#dc115e] bg-[#dc115e] px-3 text-[0.7rem] font-bold text-white transition hover:!bg-[#c70f55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
                {!followState?.allowFollowers && !isFollowing ? (
                  <span className="text-xs font-semibold text-slate-500">Not accepting followers</span>
                ) : null}
                {message ? (
                  <span className="text-xs font-semibold text-rose-600" aria-live="polite">
                    {message}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
