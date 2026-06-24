"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteOwnCommentAction, likeCommentAction } from "@/app/actions";
import { ClockIcon, CommentIcon, LikeIcon, MoreVerticalIcon } from "@/components/icons";
import RunningTime from "@/components/RunningTime";
import UserImage from "@/components/UserImage";
import type { ProfileComment } from "@/lib/comments";
import { formatMyrPrice } from "@/lib/formatters";

export default function ProfileCommentPreviewCard({
  comment,
  onDeleted,
}: {
  comment: ProfileComment;
  onDeleted: (commentId: string) => void;
}) {
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [viewerHasLiked, setViewerHasLiked] = useState(comment.viewerHasLiked);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `profile-comment-actions-${comment.id}`;
  const thumbnailUrl =
    comment.dealImageGalleryUrls[0] || comment.dealImageUrl || comment.dealUploadedImageUrl;
  const categoryLabel = comment.dealSubCategory || comment.dealCategory;
  const dealHref = comment.dealStatus === "approved" ? `/deal/${comment.dealId}` : "";
  const dealPreview = (
    <div className="flex min-w-0 items-center gap-4 md:justify-end">
      <div className="flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <UserImage src={thumbnailUrl} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="px-3 text-center text-xs font-bold text-slate-400">No image</span>
        )}
      </div>
      <div className="min-w-0 md:w-56">
        {dealHref ? (
          <Link
            href={dealHref}
            className="line-clamp-2 text-base font-black leading-5 text-slate-950 transition hover:text-[#dc115e]"
            title={comment.dealTitle}
          >
            {comment.dealTitle}
          </Link>
        ) : (
          <p className="line-clamp-2 text-base font-black leading-5 text-slate-950" title={comment.dealTitle}>
            {comment.dealTitle}
          </p>
        )}
        {comment.dealPrice > 0 ? (
          <p className="mt-2 text-sm font-black text-[#dc115e]">{formatMyrPrice(comment.dealPrice)}</p>
        ) : null}
        {categoryLabel ? (
          <p className="mt-1 truncate text-xs font-bold text-slate-500">{categoryLabel}</p>
        ) : null}
      </div>
    </div>
  );
  const commentsHref = dealHref ? `${dealHref}#comments` : "";

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  const toggleLike = () => {
    if (isPending || isDeleting || !dealHref) {
      return;
    }

    const previousLikeCount = likeCount;
    const previousViewerHasLiked = viewerHasLiked;
    const nextViewerHasLiked = !viewerHasLiked;

    setViewerHasLiked(nextViewerHasLiked);
    setLikeCount((current) => Math.max(0, current + (nextViewerHasLiked ? 1 : -1)));
    setActionMessage("");

    startTransition(async () => {
      const result = await likeCommentAction(comment.dealId, comment.id);

      if (!result.ok) {
        setViewerHasLiked(previousViewerHasLiked);
        setLikeCount(previousLikeCount);
        setActionMessage("Could not update this like. The deal may be expired.");
        return;
      }

      setViewerHasLiked(result.viewerHasLiked);
      setLikeCount(result.likeCount);
    });
  };

  const deleteComment = () => {
    if (!comment.canDelete || isDeleting) {
      setActionMessage("Only your own comments can be deleted.");
      setIsMenuOpen(false);
      return;
    }

    setIsDeleting(true);
    setIsMenuOpen(false);
    setActionMessage("");

    startTransition(async () => {
      const result = await deleteOwnCommentAction(comment.dealId, comment.id);

      if (!result.ok) {
        setIsDeleting(false);
        setActionMessage("Could not delete this comment. Please try again.");
        return;
      }

      onDeleted(comment.id);
    });
  };

  return (
    <article className={`profile-comment-row grid gap-4 py-5 transition sm:py-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)_36px] md:items-center ${isDeleting ? "opacity-60" : ""}`}>
      <div className="min-w-0">
        <p className="comment-text mt-1.5 line-clamp-3 whitespace-pre-wrap pl-2.5 text-sm leading-6">{comment.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={toggleLike}
            disabled={isPending || isDeleting || !dealHref}
            aria-pressed={viewerHasLiked}
            className={`comment-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              viewerHasLiked ? "profile-comment-action-active" : ""
            }`}
          >
            <LikeIcon className="h-4 w-4" />
            <span>{likeCount}</span>
          </button>
          {commentsHref ? (
            <Link
              href={commentsHref}
              className="comment-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition"
            >
              <CommentIcon className="h-4 w-4" />
              <span>Comment</span>
            </Link>
          ) : (
            <span className="comment-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold opacity-50">
              <CommentIcon className="h-4 w-4" />
              <span>Comment</span>
            </span>
          )}
          <span className="comment-time inline-flex h-8 items-center gap-1 px-2 text-xs font-medium">
            <ClockIcon className="h-4 w-4" />
            <RunningTime timestamp={comment.createdAt} />
          </span>
        </div>
        {actionMessage ? (
          <p className="mt-3 text-xs font-semibold text-amber-600" aria-live="polite">
            {actionMessage}
          </p>
        ) : null}
      </div>

      {dealPreview}

      <div ref={menuRef} className="relative md:justify-self-end">
        {comment.canDelete ? (
          <>
            <button
              type="button"
              aria-label="Comment options"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((current) => !current)}
              disabled={isDeleting}
              className="profile-comment-menu-button inline-flex h-9 w-9 items-center justify-center rounded-md transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MoreVerticalIcon />
            </button>
            {isMenuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="profile-comment-menu absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-xl border p-1 text-sm shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={deleteComment}
                  disabled={isDeleting}
                  className="profile-comment-delete-button flex w-full items-center rounded-lg px-3 py-2 text-left font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Delete comment"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <span
            className="inline-flex h-9 w-9 items-center justify-center"
            aria-hidden="true"
          >
            &nbsp;
          </span>
        )}
      </div>
    </article>
  );
}
