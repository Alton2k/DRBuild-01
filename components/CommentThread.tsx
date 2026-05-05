"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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

  return roots;
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
    <form action={postComment} onSubmit={onSubmit} className="grid gap-3">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Name
        <input
          name="authorName"
          required
          maxLength={80}
          className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-normal text-slate-950 outline-none transition focus:border-slate-400"
          placeholder="Your name"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Comment
        <textarea
          name="body"
          required
          maxLength={1000}
          rows={parentId ? 3 : 4}
          className="resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-6 text-slate-950 outline-none transition focus:border-slate-400"
          placeholder={parentId ? "Write a reply..." : "Is this legit? Any voucher code? Cheaper elsewhere?"}
        />
      </label>
      <button
        type="submit"
        className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
  const [isPending, startTransition] = useTransition();

  const like = () => {
    if (viewerHasLiked) {
      return;
    }

    setLikeCount((current) => current + 1);
    setViewerHasLiked(true);

    startTransition(async () => {
      const result = await likeCommentAction(dealId, comment.id);

      if (!result.ok) {
        setLikeCount((current) => Math.max(0, current - 1));
        setViewerHasLiked(false);
        return;
      }

      setLikeCount(result.likeCount);
      setViewerHasLiked(result.viewerHasLiked);
    });
  };

  const deleteComment = () => {
    if (!comment.canDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteOwnCommentAction(dealId, comment.id);

      if (!result.ok) {
        setIsDeleting(false);
        return;
      }

      onDeleted(comment);
    });
  };

  return (
    <article className={depth === 0 ? "py-4 first:pt-0 last:pb-0" : "py-3"}>
      <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${isDeleting ? "opacity-60" : ""}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-950">{comment.authorName}</h3>
          <time dateTime={comment.createdAt} className="text-xs font-medium text-slate-500">
            {formatCommentTime(comment.createdAt)}
          </time>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{comment.body}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={like}
            disabled={isPending || viewerHasLiked || isDeleting}
            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {viewerHasLiked ? "Liked" : "Like"} {likeCount}
          </button>
          <button
            type="button"
            onClick={() => setIsReplying((current) => !current)}
            disabled={isDeleting}
            className="inline-flex h-9 items-center justify-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            {isReplying ? "Cancel reply" : "Reply"}
          </button>
          {comment.canDelete ? (
            <button
              type="button"
              onClick={deleteComment}
              disabled={isDeleting}
              className="inline-flex h-9 items-center justify-center rounded-full border border-rose-200 px-3 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>
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
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              dealId={dealId}
              depth={depth + 1}
              onDeleted={onDeleted}
            />
          ))}
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
