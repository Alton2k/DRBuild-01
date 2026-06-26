"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createCommentAction, deleteOwnCommentAction, likeCommentAction, type CommentActionState } from "@/app/actions";
import UserImage from "./UserImage";

export interface ThreadComment {
  id: string;
  dealId: string;
  parentId: string | null;
  authorName: string;
  authorAvatarUrl?: string;
  authorProfileHref?: string;
  body: string;
  likeCount: number;
  viewerHasLiked: boolean;
  canDelete: boolean;
  createdAt: string;
}

interface CommentThreadProps {
  dealId: string;
  comments: ThreadComment[];
  readOnly?: boolean;
  currentUserName?: string | null;
}

interface CommentNode extends ThreadComment {
  replies: CommentNode[];
}

const maxPreviewReplies = 3;
const initialCommentState: CommentActionState = {
  ok: false,
  message: "",
  postedAt: undefined,
};

function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildCommentTree(comments: ThreadComment[]) {
  const nodes = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const comment of comments) {
    nodes.set(comment.id, {
      ...comment,
      replies: [],
    });
  }

  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : null;

    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of nodes.values()) {
    node.replies.sort(compareRepliesByRelevance);
  }

  return roots;
}

function compareRepliesByRelevance(first: CommentNode, second: CommentNode) {
  if (second.likeCount !== first.likeCount) {
    return second.likeCount - first.likeCount;
  }

  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

function getCommentInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "?";
}

function EllipsisIcon() {
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
      <path d="M12 12h.01" />
      <path d="M19 12h.01" />
      <path d="M5 12h.01" />
    </svg>
  );
}

function LikeIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M7 11v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Z" />
      <path d="M7 11 12 2a3 3 0 0 1 3 3v4h4a2 2 0 0 1 2 2.3l-1.2 8A2 2 0 0 1 17.8 21H7" />
    </svg>
  );
}

function ReplyIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m9 17-5-5 5-5" />
      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
    </svg>
  );
}

function CommentForm({
  dealId,
  parentId,
  buttonLabel,
  onPosted,
}: {
  dealId: string;
  parentId?: string;
  buttonLabel: string;
  onPosted?: () => void;
}) {
  const postComment = createCommentAction.bind(null, dealId);
  const [state, formAction, isPending] = useActionState(postComment, initialCommentState);
  const formRef = useRef<HTMLFormElement>(null);
  const lastHandledPostRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.ok || !state.postedAt || lastHandledPostRef.current === state.postedAt) {
      return;
    }

    lastHandledPostRef.current = state.postedAt;
    formRef.current?.reset();
    onPosted?.();
  }, [onPosted, state.ok, state.postedAt]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label className="comment-form-label grid gap-2 text-sm font-bold">
        <span className="sr-only">Comment</span>
        <textarea
          name="body"
          required
          maxLength={1000}
          rows={parentId ? 2 : 3}
          className={`comment-form-field resize-none rounded-2xl border px-4 py-3 text-sm font-normal leading-6 outline-none transition ${
            parentId ? "h-24" : "h-28"
          }`}
          placeholder={parentId ? "Write a reply..." : "Post a comment..."}
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="comment-submit-button inline-flex h-10 w-fit items-center justify-center justify-self-end rounded-full px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Posting..." : buttonLabel}
      </button>
      {state.message && !state.ok ? (
        <p className="theme-alert theme-alert-warning px-3 py-2 text-xs font-semibold leading-5" aria-live="polite">
          <span className="theme-alert-symbol mr-1.5" aria-hidden="true">
            {"\u26A0"}
          </span>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function CommentCard({
  comment,
  dealId,
  depth,
  onDeleted,
  readOnly,
  currentUserName,
}: {
  comment: CommentNode;
  dealId: string;
  depth: number;
  onDeleted: (comment: CommentNode) => void;
  readOnly: boolean;
  currentUserName?: string | null;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [viewerHasLiked, setViewerHasLiked] = useState(comment.viewerHasLiked);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = `comment-actions-${comment.id}`;
  const hiddenReplyCount = Math.max(0, comment.replies.length - maxPreviewReplies);
  const visibleReplies =
    showAllReplies || hiddenReplyCount === 0
      ? comment.replies
      : comment.replies.slice(0, maxPreviewReplies);

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

  const like = () => {
    if (readOnly) {
      return;
    }

    const previousLikeCount = likeCount;
    const previousViewerHasLiked = viewerHasLiked;
    const nextViewerHasLiked = !previousViewerHasLiked;

    setLikeCount((current) => Math.max(0, current + (nextViewerHasLiked ? 1 : -1)));
    setViewerHasLiked(nextViewerHasLiked);

    startTransition(async () => {
      const result = await likeCommentAction(dealId, comment.id);

      if (!result.ok) {
        setLikeCount(previousLikeCount);
        setViewerHasLiked(previousViewerHasLiked);
        return;
      }

      setLikeCount(result.likeCount);
      setViewerHasLiked(result.viewerHasLiked);
    });
  };

  const deleteComment = () => {
    if (!comment.canDelete || isDeleting) {
      setActionMessage("Only your own comments can be deleted right now.");
      return;
    }

    setIsMenuOpen(false);
    setActionMessage("");
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteOwnCommentAction(dealId, comment.id);

      if (!result.ok) {
        setIsDeleting(false);
        setActionMessage("Could not delete this comment. Please try again.");
        return;
      }

      onDeleted(comment);
    });
  };

  const showEditPlaceholder = () => {
    setIsMenuOpen(false);
    setActionMessage("Editing comments is not available yet.");
  };

  return (
    <article className={depth === 0 ? "py-5 first:pt-0 last:pb-0" : "py-4"}>
      <div className={`comment-body grid grid-cols-[40px_minmax(0,1fr)] gap-3 ${isDeleting ? "opacity-60" : ""}`}>
        {comment.authorProfileHref ? (
          <Link
            href={comment.authorProfileHref}
            aria-label={`View ${comment.authorName}'s profile`}
            className="comment-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
          >
            {comment.authorAvatarUrl ? (
              <UserImage src={comment.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              getCommentInitials(comment.authorName)
            )}
          </Link>
        ) : (
        <div className="comment-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
          {comment.authorAvatarUrl ? (
            <UserImage src={comment.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            getCommentInitials(comment.authorName)
          )}
        </div>
        )}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="comment-author text-sm font-bold">
                  {comment.authorProfileHref ? (
                    <Link href={comment.authorProfileHref}>
                      {comment.authorName}
                    </Link>
                  ) : (
                    comment.authorName
                  )}
                </h3>
                <time dateTime={comment.createdAt} className="comment-time text-xs font-medium">
                  {formatCommentTime(comment.createdAt)}
                </time>
              </div>
              <p className="comment-text mt-1.5 whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
            </div>

            <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              aria-label="Comment actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((current) => !current)}
              disabled={isDeleting}
              className={`comment-menu-button inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                isMenuOpen ? "comment-menu-button-open" : ""
              }`}
            >
              <EllipsisIcon />
            </button>

            {isMenuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="comment-menu-panel absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border p-1 text-sm shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={showEditPlaceholder}
                  className="comment-menu-item flex w-full items-center rounded-xl px-3 py-2 text-left font-bold transition focus-visible:outline-none focus-visible:ring-4"
                >
                  Edit comment
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={deleteComment}
                  disabled={isDeleting}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                    comment.canDelete
                      ? "comment-menu-item-danger"
                      : "comment-menu-item-muted"
                  }`}
                >
                  {isDeleting ? "Deleting..." : "Delete comment"}
                </button>
              </div>
            ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={like}
              disabled={isPending || isDeleting || readOnly}
              aria-pressed={viewerHasLiked}
              className="comment-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LikeIcon filled={viewerHasLiked} />
              {likeCount}
            </button>
            {readOnly ? null : (
              <button
                type="button"
                onClick={() => setIsReplying((current) => !current)}
                disabled={isDeleting}
                className="comment-action-button inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ReplyIcon />
                {isReplying ? "Cancel reply" : "Reply"}
              </button>
            )}
          </div>

          {actionMessage ? (
            <p className="theme-alert theme-alert-info mt-3 px-3 py-2 text-xs font-medium leading-5" aria-live="polite">
              {actionMessage}
            </p>
          ) : null}
        </div>
      </div>

      {isReplying && !readOnly ? (
        currentUserName ? (
          <div className="ml-[52px] mt-3">
            <CommentForm
              dealId={dealId}
              parentId={comment.id}
              buttonLabel="Post reply"
              onPosted={() => setIsReplying(false)}
            />
          </div>
        ) : (
          <p className="comment-time ml-[52px] mt-3 text-sm font-medium">
            Please{" "}
            <a href={`/auth?mode=login&next=/deal/${dealId}#comments`} className="font-bold text-[#dc115e]">
              log in
            </a>{" "}
            to reply.
          </p>
        )
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="comment-replies ml-5 mt-3 pl-7">
          {visibleReplies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              dealId={dealId}
              depth={depth + 1}
              onDeleted={onDeleted}
              readOnly={readOnly}
              currentUserName={currentUserName}
            />
          ))}
          {hiddenReplyCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllReplies((current) => !current)}
              className="comment-more-replies-button mt-2 inline-flex h-9 items-center justify-center rounded-full border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4"
              aria-expanded={showAllReplies}
            >
              {showAllReplies
                ? "Show fewer replies"
                : `View ${hiddenReplyCount} more ${hiddenReplyCount === 1 ? "reply" : "replies"}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function CommentThread({ dealId, comments, readOnly = false, currentUserName = null }: CommentThreadProps) {
  const router = useRouter();
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(() => new Set());
  const visibleComments = useMemo(
    () => comments.filter((comment) => !deletedCommentIds.has(comment.id)),
    [comments, deletedCommentIds],
  );
  const tree = useMemo(() => buildCommentTree(visibleComments), [visibleComments]);

  const removeCommentTree = (comment: CommentNode) => {
    const idsToRemove = new Set<string>();
    const collectIds = (node: CommentNode) => {
      idsToRemove.add(node.id);
      node.replies.forEach(collectIds);
    };

    collectIds(comment);
    setDeletedCommentIds((current) => new Set([...current, ...idsToRemove]));
    router.refresh();
  };

  return (
    <>
      <div className="mt-5">
        {tree.length > 0 ? (
          <div className="space-y-1">
            {tree.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                dealId={dealId}
                depth={0}
                onDeleted={removeCommentTree}
                readOnly={readOnly}
                currentUserName={currentUserName}
              />
            ))}
          </div>
        ) : (
          <div className="comment-empty-state p-4">
            <p className="comment-empty-text text-sm leading-6">
              {readOnly ? "No comments were posted before this deal expired." : "No comments yet. Ask about vouchers, expiry, stock, or cheaper finds."}
            </p>
          </div>
        )}
      </div>

      {readOnly ? (
        <p className="theme-alert theme-alert-info mt-6 px-4 py-3 text-sm font-semibold">
          This deal has expired, so new comments and replies are closed.
        </p>
      ) : (
        currentUserName ? (
          <div className="mt-6">
            <CommentForm dealId={dealId} buttonLabel="Post comment" onPosted={() => router.refresh()} />
          </div>
        ) : (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p className="comment-time text-sm font-medium">Log in to join the discussion.</p>
            <a
              href={`/auth?mode=login&next=/deal/${dealId}#comments`}
              className="comment-submit-button inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4"
            >
              Log in to comment
            </a>
          </div>
        )
      )}
    </>
  );
}
