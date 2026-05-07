"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createCommentAction, deleteOwnCommentAction, likeCommentAction } from "@/app/actions";

export interface ThreadComment {
  id: string;
  dealId: string;
  parentId: string | null;
  authorName: string;
  body: string;
  likeCount: number;
  viewerHasLiked: boolean;
  canDelete: boolean;
  createdAt: string;
}

interface CommentThreadProps {
  dealId: string;
  comments: ThreadComment[];
}

interface CommentNode extends ThreadComment {
  replies: CommentNode[];
}

const maxPreviewReplies = 3;

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
  onSubmit,
}: {
  dealId: string;
  parentId?: string;
  buttonLabel: string;
  onSubmit?: () => void;
}) {
  const postComment = createCommentAction.bind(null, dealId);

  return (
    <form action={postComment} onSubmit={onSubmit} className="grid gap-4">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label className="grid gap-2 text-sm font-semibold text-slate-950">
        Name
        <input
          name="authorName"
          required
          maxLength={80}
          className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200"
          placeholder="Your name"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-950">
        Comment
        <textarea
          name="body"
          required
          maxLength={1000}
          rows={parentId ? 3 : 4}
          className="resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-6 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200"
          placeholder={parentId ? "Write a reply..." : "Is this legit? Any voucher code? Cheaper elsewhere?"}
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
      >
        {buttonLabel}
      </button>
    </form>
  );
}

function CommentCard({
  comment,
  dealId,
  depth,
  onDeleted,
}: {
  comment: CommentNode;
  dealId: string;
  depth: number;
  onDeleted: (comment: CommentNode) => void;
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
    <article className={depth === 0 ? "py-4 first:pt-0 last:pb-0" : "py-3"}>
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${isDeleting ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-950">{comment.authorName}</h3>
          <time dateTime={comment.createdAt} className="text-xs font-medium text-slate-500">
            {formatCommentTime(comment.createdAt)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.body}</p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={like}
              disabled={isPending || isDeleting}
              aria-pressed={viewerHasLiked}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LikeIcon filled={viewerHasLiked} />
              {viewerHasLiked ? "Liked" : "Like"} {likeCount}
            </button>
            <button
              type="button"
              onClick={() => setIsReplying((current) => !current)}
              disabled={isDeleting}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ReplyIcon />
              {isReplying ? "Cancel reply" : "Reply"}
            </button>
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
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                isMenuOpen ? "border-slate-300 bg-slate-100 text-slate-950" : "border-slate-200 bg-white"
              }`}
            >
              <EllipsisIcon />
            </button>

            {isMenuOpen ? (
              <div
                id={menuId}
                role="menu"
                className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1 text-sm shadow-md"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={showEditPlaceholder}
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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
                      ? "text-rose-700 hover:bg-rose-50"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {isDeleting ? "Deleting..." : "Delete comment"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
        {actionMessage ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600" aria-live="polite">
            {actionMessage}
          </p>
        ) : null}
      </div>

      {isReplying ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <CommentForm
            dealId={dealId}
            parentId={comment.id}
            buttonLabel="Post reply"
            onSubmit={() => setIsReplying(false)}
          />
        </div>
      ) : null}

      {comment.replies.length > 0 ? (
        <div className="ml-4 mt-3 border-l-2 border-slate-200 pl-4">
          {visibleReplies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              dealId={dealId}
              depth={depth + 1}
              onDeleted={onDeleted}
            />
          ))}
          {hiddenReplyCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAllReplies((current) => !current)}
              className="mt-2 inline-flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
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

export default function CommentThread({ dealId, comments }: CommentThreadProps) {
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
          <div className="divide-y divide-slate-200">
            {tree.map((comment) => (
              <CommentCard
                key={comment.id}
                comment={comment}
                dealId={dealId}
                depth={0}
                onDeleted={removeCommentTree}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm leading-6 text-slate-600">
              No comments yet. Ask about vouchers, expiry, stock, or cheaper finds.
            </p>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <CommentForm dealId={dealId} buttonLabel="Post comment" />
      </div>
    </>
  );
}
