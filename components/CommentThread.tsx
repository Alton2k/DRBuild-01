"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createCommentAction, deleteOwnCommentAction, editOwnCommentAction, likeCommentAction, reportCommentAction, type CommentActionState } from "@/app/actions";
import UserImage from "./UserImage";
import ConfirmDialog from "./ConfirmDialog";

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
  editedAt: string | null;
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
    timeZone: "Asia/Kuala_Lumpur",
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
    .replace(/^@+/, "")
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
  draft,
  onDraftChange,
}: {
  dealId: string;
  parentId?: string;
  buttonLabel: string;
  onPosted?: () => void;
  draft: string;
  onDraftChange: (value: string) => void;
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
    onDraftChange("");
    onPosted?.();
  }, [onDraftChange, onPosted, state.ok, state.postedAt]);

  useEffect(() => {
    if (!draft.trim()) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [draft]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-2">
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label className="comment-form-label grid gap-2 text-sm font-bold">
        <span className="sr-only">Comment</span>
        <textarea
          name="body"
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          required
          maxLength={1000}
          rows={parentId ? 2 : 3}
          className={`comment-form-field resize-none rounded-2xl border px-4 py-3 text-sm font-normal leading-6 outline-none transition ${
            parentId ? "h-24" : "h-28"
          }`}
          placeholder={parentId ? "Write a reply…" : "Post a comment…"}
        />
      </label>
      <span className="comment-time justify-self-end text-xs font-medium" aria-live="polite">{draft.length}/1000</span>
      <button
        type="submit"
        disabled={isPending}
        className="comment-submit-button inline-flex h-10 w-fit items-center justify-center justify-self-end rounded-full px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Posting…" : buttonLabel}
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
  const [replyDraft, setReplyDraft] = useState("");
  const [isCloseReplyConfirmOpen, setIsCloseReplyConfirmOpen] = useState(false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [viewerHasLiked, setViewerHasLiked] = useState(comment.viewerHasLiked);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isCancelEditConfirmOpen, setIsCancelEditConfirmOpen] = useState(false);
  const [displayedBody, setDisplayedBody] = useState(comment.body);
  const [editBody, setEditBody] = useState(comment.body);
  const [editedAt, setEditedAt] = useState(comment.editedAt);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [isPending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const reportDialogRef = useRef<HTMLDivElement>(null);
  const reportReasonRef = useRef<HTMLSelectElement>(null);
  const replyButtonRef = useRef<HTMLButtonElement>(null);
  const editCancelButtonRef = useRef<HTMLButtonElement>(null);
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
        event.preventDefault();
        setIsMenuOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!replyDraft.trim()) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [replyDraft]);

  useEffect(() => {
    if (!isEditing || editBody === displayedBody) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [displayedBody, editBody, isEditing]);

  useEffect(() => {
    if (!isReportOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reportReasonRef.current?.focus();

    const handleDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isReporting) {
        setIsReportOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(reportDialogRef.current?.querySelectorAll<HTMLElement>("select, button:not([disabled])") ?? []);
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDialogKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isReportOpen, isReporting]);

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
        setActionMessage("Could not update this like. Please try again.");
        return;
      }

      setLikeCount(result.likeCount);
      setViewerHasLiked(result.viewerHasLiked);
    });
  };

  const requestDeleteComment = () => {
    if (!comment.canDelete || isDeleting) {
      setActionMessage("Only your own comments can be deleted right now.");
      return;
    }

    setIsMenuOpen(false);
    setIsDeleteConfirmOpen(true);
  };

  const deleteComment = () => {
    if (!comment.canDelete || isDeleting) return;
    setActionMessage("");
    setIsDeleting(true);
    startTransition(async () => {
      const result = await deleteOwnCommentAction(dealId, comment.id);

      if (!result.ok) {
        setIsDeleting(false);
        setIsDeleteConfirmOpen(false);
        setActionMessage("Could not delete this comment. Please try again.");
        return;
      }

      onDeleted(comment);
    });
  };

  const startEditing = () => {
    setIsMenuOpen(false);
    setActionMessage("");
    setEditBody(displayedBody);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditBody(displayedBody);
    setActionMessage("");
    setIsEditing(false);
  };

  const requestCancelEditing = () => {
    if (editBody !== displayedBody) {
      setIsCancelEditConfirmOpen(true);
      return;
    }
    cancelEditing();
  };

  const saveEdit = () => {
    if (isSavingEdit) return;
    setActionMessage("");
    setIsSavingEdit(true);
    startTransition(async () => {
      const result = await editOwnCommentAction(dealId, comment.id, editBody);
      setIsSavingEdit(false);

      if (!result.ok || !result.body) {
        setActionMessage(result.message || "Could not update this comment. Please try again.");
        return;
      }

      setDisplayedBody(result.body);
      setEditBody(result.body);
      setEditedAt(result.editedAt ?? new Date().toISOString());
      setIsEditing(false);
      setActionMessage(result.message);
    });
  };

  const openReportDialog = () => {
    setIsMenuOpen(false);
    setReportMessage("");
    setIsReportOpen(true);
  };

  const closeReportDialog = () => {
    if (isReporting) return;
    setIsReportOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  const submitReport = () => {
    if (isReporting) return;
    if (!reportReason) {
      setReportMessage("Please choose why you are reporting this comment.");
      reportReasonRef.current?.focus();
      return;
    }
    setIsReporting(true);
    setReportMessage("");
    startTransition(async () => {
      const result = await reportCommentAction(dealId, comment.id, reportReason);
      setIsReporting(false);
      if (!result.ok) {
        setReportMessage(result.message);
        return;
      }
      setIsReportOpen(false);
      setActionMessage(result.message);
      setReportReason("");
      window.requestAnimationFrame(() => menuButtonRef.current?.focus());
    });
  };

  return (
    <article
      id={`comment-${comment.id}`}
      className={`${depth === 0 ? "py-5 first:pt-0 last:pb-0" : "py-4"} scroll-mt-28`}
    >
      <div className={`comment-body grid grid-cols-[40px_minmax(0,1fr)] gap-3 ${isDeleting ? "opacity-60" : ""}`}>
        {comment.authorProfileHref ? (
          <Link
            href={comment.authorProfileHref}
            aria-label={`View ${comment.authorName}'s profile`}
            className="comment-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
          >
            {comment.authorAvatarUrl ? (
              <UserImage src={comment.authorAvatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
            ) : (
              getCommentInitials(comment.authorName)
            )}
          </Link>
        ) : (
        <div className="comment-avatar flex h-10 w-10 items-center justify-center overflow-hidden rounded-full text-sm font-bold">
          {comment.authorAvatarUrl ? (
            <UserImage src={comment.authorAvatarUrl} alt="" width={40} height={40} className="h-full w-full object-cover" />
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
                {editedAt ? <span className="comment-time text-xs font-medium" title={`Edited ${formatCommentTime(editedAt)}`}>(edited)</span> : null}
              </div>
              {isEditing ? (
                <div className="mt-2 grid gap-2">
                  <label className="comment-form-label grid gap-1.5 text-sm font-bold">
                    <span className="sr-only">Edit comment</span>
                    <textarea
                      value={editBody}
                      onChange={(event) => setEditBody(event.target.value)}
                      required
                      maxLength={1000}
                      rows={3}
                      disabled={isSavingEdit}
                      className="comment-form-field min-h-24 resize-y rounded-2xl border px-4 py-3 text-sm font-normal leading-6 outline-none transition"
                    />
                  </label>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="comment-time text-xs font-medium" aria-live="polite">{editBody.length}/1000</span>
                    <div className="flex gap-2">
                      <button ref={editCancelButtonRef} type="button" onClick={requestCancelEditing} disabled={isSavingEdit} className="comment-more-replies-button inline-flex h-10 items-center justify-center rounded-full border px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:opacity-60">Cancel</button>
                      <button type="button" onClick={saveEdit} disabled={isSavingEdit || editBody === displayedBody} className="comment-submit-button inline-flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60">{isSavingEdit ? "Saving…" : "Save"}</button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="comment-text mt-1.5 whitespace-pre-wrap text-sm leading-6">{displayedBody}</p>
              )}
            </div>

            <div ref={menuRef} className="relative shrink-0">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label="Comment actions"
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
              aria-controls={isMenuOpen ? menuId : undefined}
              onClick={() => setIsMenuOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setIsMenuOpen(true);
                  window.requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus());
                }
              }}
              disabled={isDeleting}
              className={`comment-menu-button inline-flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
                isMenuOpen ? "comment-menu-button-open" : ""
              }`}
            >
              <EllipsisIcon />
            </button>

            {isMenuOpen ? (
              <div
                id={menuId}
                role="menu"
                onKeyDown={(event) => {
                  const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)'));
                  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    const direction = event.key === "ArrowDown" ? 1 : -1;
                    items[(currentIndex + direction + items.length) % items.length]?.focus();
                  } else if (event.key === "Home") {
                    event.preventDefault();
                    items[0]?.focus();
                  } else if (event.key === "End") {
                    event.preventDefault();
                    items[items.length - 1]?.focus();
                  }
                }}
                className="comment-menu-panel absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border p-1 text-sm shadow-md"
              >
                {comment.canDelete ? <button
                  type="button"
                  role="menuitem"
                  onClick={startEditing}
                  disabled={!comment.canDelete || isEditing}
                  className="comment-menu-item flex w-full items-center rounded-xl px-3 py-2 text-left font-bold transition focus-visible:outline-none focus-visible:ring-4"
                >
                  Edit comment
                </button> : null}
                {comment.canDelete ? <button
                  type="button"
                  role="menuitem"
                  onClick={requestDeleteComment}
                  disabled={isDeleting}
                  className={`flex w-full items-center rounded-xl px-3 py-2 text-left font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60 ${
                    comment.canDelete
                      ? "comment-menu-item-danger"
                      : "comment-menu-item-muted"
                  }`}
                >
                  {isDeleting ? "Deleting…" : "Delete comment"}
                </button> : null}
                {!comment.canDelete ? <button
                  type="button"
                  role="menuitem"
                  onClick={openReportDialog}
                  className="comment-menu-item flex w-full items-center rounded-xl px-3 py-2 text-left font-bold transition focus-visible:outline-none focus-visible:ring-4"
                >
                  Report comment
                </button> : null}
              </div>
            ) : null}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={like}
              disabled={isPending || isDeleting || isEditing || readOnly}
              aria-pressed={viewerHasLiked}
              className="comment-action-button inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LikeIcon filled={viewerHasLiked} />
              {likeCount}
            </button>
            {readOnly ? null : (
              <button
                ref={replyButtonRef}
                type="button"
                onClick={() => {
                  if (isReplying && replyDraft.trim()) {
                    setIsCloseReplyConfirmOpen(true);
                  } else {
                    setIsReplying((current) => !current);
                  }
                }}
                disabled={isDeleting || isEditing}
                className="comment-action-button inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
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
              draft={replyDraft}
              onDraftChange={setReplyDraft}
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
              className="comment-more-replies-button mt-2 inline-flex h-10 items-center justify-center rounded-full border px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4"
              aria-expanded={showAllReplies}
            >
              {showAllReplies
                ? "Show fewer replies"
                : `View ${hiddenReplyCount} more ${hiddenReplyCount === 1 ? "reply" : "replies"}`}
            </button>
          ) : null}
        </div>
      ) : null}

      {isReportOpen ? (
        <div
          className="app-dialog-overlay fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeReportDialog();
          }}
        >
          <div
            ref={reportDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`report-comment-title-${comment.id}`}
            aria-describedby={`report-comment-description-${comment.id}`}
            className="post-discard-dialog w-full max-w-md rounded-3xl border p-5 shadow-2xl sm:p-6"
          >
            <h2 id={`report-comment-title-${comment.id}`} className="text-xl font-bold tracking-tight text-slate-950">Report comment</h2>
            <p id={`report-comment-description-${comment.id}`} className="mt-2 text-sm leading-6 text-slate-600">Tell moderators what needs review. The comment will stay visible until they decide.</p>
            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-800">
              Reason
              <select ref={reportReasonRef} value={reportReason} onChange={(event) => { setReportReason(event.target.value); setReportMessage(""); }} disabled={isReporting} className="comment-form-field h-12 rounded-xl border px-3 text-sm font-normal outline-none focus-visible:ring-4">
                <option value="">Choose a reason</option>
                <option value="spam">Spam or promotion</option>
                <option value="harassment">Harassment or abuse</option>
                <option value="misinformation">Misleading information</option>
                <option value="unsafe">Unsafe or illegal content</option>
                <option value="other">Something else</option>
              </select>
            </label>
            {reportMessage ? <p className="theme-alert theme-alert-warning mt-3 px-3 py-2 text-sm font-semibold" role="alert">{reportMessage}</p> : null}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={closeReportDialog} disabled={isReporting} className="post-secondary-button inline-flex h-12 items-center justify-center rounded-full border px-5 text-sm font-bold disabled:opacity-60">Cancel</button>
              <button type="button" onClick={submitReport} disabled={isReporting} className="post-primary-button inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold disabled:cursor-wait disabled:opacity-60">{isReporting ? "Sending…" : "Send report"}</button>
            </div>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Delete comment?"
        description="This permanently removes the comment and its replies. This action cannot be undone."
        confirmLabel="Delete comment"
        pending={isDeleting}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={deleteComment}
        returnFocusRef={menuButtonRef}
      />
      <ConfirmDialog
        open={isCancelEditConfirmOpen}
        title="Discard comment changes?"
        description="Your unsaved edit will be lost. Keep editing if you want to preserve the current text."
        confirmLabel="Discard changes"
        onCancel={() => setIsCancelEditConfirmOpen(false)}
        onConfirm={() => { setIsCancelEditConfirmOpen(false); cancelEditing(); }}
        returnFocusRef={editCancelButtonRef}
      />
      <ConfirmDialog
        open={isCloseReplyConfirmOpen}
        title="Close this reply?"
        description="Your draft will be kept on this comment and restored when you reopen the reply box."
        confirmLabel="Close reply"
        onCancel={() => setIsCloseReplyConfirmOpen(false)}
        onConfirm={() => { setIsCloseReplyConfirmOpen(false); setIsReplying(false); }}
        returnFocusRef={replyButtonRef}
      />
    </article>
  );
}

export default function CommentThread({ dealId, comments, readOnly = false, currentUserName = null }: CommentThreadProps) {
  const router = useRouter();
  const [deletedCommentIds, setDeletedCommentIds] = useState<Set<string>>(() => new Set());
  const [commentDraft, setCommentDraft] = useState("");
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
            <CommentForm dealId={dealId} buttonLabel="Post comment" draft={commentDraft} onDraftChange={setCommentDraft} onPosted={() => router.refresh()} />
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
