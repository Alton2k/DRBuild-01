"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { clearCommentReportsAsAdminAction, deleteCommentAsAdminAction } from "@/app/actions";
import ConfirmDialog from "@/components/ConfirmDialog";
import { formatMalaysiaDateTime } from "@/lib/formatters";

export interface CommentModerationRow {
  id: string;
  dealId: string;
  dealTitle: string;
  parentId: string | null;
  authorName: string;
  body: string;
  likeCount: number;
  createdAt: string;
  reportCount: number;
  reportReasons: string[];
}

interface CommentModerationTableProps {
  initialComments: CommentModerationRow[];
}

export default function CommentModerationTable({
  initialComments,
}: CommentModerationTableProps) {
  const router = useRouter();
  const refreshAdminOverview = (notice: "comment-deleted" | "comment-reports-cleared") => {
    const refresh = new URLSearchParams(window.location.search).get("refresh") === "1" ? "0" : "1";
    router.replace(`/admin?notice=${notice}&refresh=${refresh}#comments`, { scroll: false });
  };
  const [comments, setComments] = useState(initialComments);
  const [searchValue, setSearchValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [clearReportsConfirmId, setClearReportsConfirmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const clearReportsTriggerRef = useRef<HTMLButtonElement>(null);

  const filteredComments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return comments;
    }

    return comments.filter((comment) => {
      const haystack = `${comment.authorName} ${comment.body} ${comment.dealTitle} ${comment.reportReasons.join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [comments, searchValue]);

  const handleDelete = (id: string) => {
    setPendingId(id);
    setStatusMessage("");
    startTransition(async () => {
      try {
        const result = await deleteCommentAsAdminAction(id);
        if (!result.ok) {
          setStatusMessage("Could not delete this comment. Please try again.");
          return;
        }
        setComments((current) => {
          const childrenByParentId = new Map<string, CommentModerationRow[]>();

          for (const comment of current) {
            if (!comment.parentId) {
              continue;
            }

            const children = childrenByParentId.get(comment.parentId) ?? [];
            children.push(comment);
            childrenByParentId.set(comment.parentId, children);
          }

          const idsToRemove = new Set([id]);
          const collectChildren = (commentId: string) => {
            for (const child of childrenByParentId.get(commentId) ?? []) {
              idsToRemove.add(child.id);
              collectChildren(child.id);
            }
          };

          collectChildren(id);

          return current.filter((comment) => !idsToRemove.has(comment.id));
        });
        refreshAdminOverview("comment-deleted");
      } catch {
        setStatusMessage("Could not delete this comment. Please try again.");
      } finally {
        setPendingId(null);
        setDeleteConfirmId(null);
      }
    });
  };

  const handleClearReports = (id: string) => {
    setPendingId(id);
    setStatusMessage("");
    startTransition(async () => {
      try {
        const result = await clearCommentReportsAsAdminAction(id);
        if (!result.ok) {
          setStatusMessage("Could not clear these reports. Please try again.");
          return;
        }
        setComments((current) => current.map((comment) => comment.id === id ? { ...comment, reportCount: 0, reportReasons: [] } : comment));
        refreshAdminOverview("comment-reports-cleared");
      } catch {
        setStatusMessage("Could not clear these reports. Please try again.");
      } finally {
        setPendingId(null);
        setClearReportsConfirmId(null);
      }
    });
  };

  return (
    <section id="comments" className="settings-section-divider scroll-mt-32 space-y-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Comments</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Review discussions and resolve reported content without losing context.
          </p>
        </div>
        <label className="grid gap-2 self-end text-sm font-semibold text-slate-700 lg:justify-self-end">
          <span className="sr-only">Search comments</span>
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search comments"
            className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-[#dc115e] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 sm:min-w-[220px]"
          />
        </label>
      </div>
      {statusMessage ? <p className={`theme-alert px-4 py-3 text-sm font-semibold ${statusMessage.startsWith("Could not") ? "theme-alert-warning" : "theme-alert-success"}`} role="status">{statusMessage}</p> : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="hidden grid-cols-6 gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 lg:grid">
          <div className="col-span-2">Comment</div>
          <div className="col-span-2">Deal</div>
          <div>Stats</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredComments.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-600">
              No comments match this search.
            </div>
          ) : (
            [...filteredComments].sort((first, second) => second.reportCount - first.reportCount || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).map((comment) => {
              const rowPending = isPending && pendingId === comment.id;

              return (
                <article
                  key={comment.id}
                  className="flex flex-col gap-4 bg-white px-5 py-6 transition hover:bg-slate-50 lg:grid lg:grid-cols-6 lg:items-start lg:gap-4 lg:px-6"
                >
                  <div className="lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-950">{comment.authorName}</span>
                      {comment.parentId ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                          Reply
                        </span>
                      ) : null}
                      {comment.reportCount > 0 ? (
                        <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                          {comment.reportCount} report{comment.reportCount === 1 ? "" : "s"}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {comment.body}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm lg:col-span-2">
                    {comment.dealId ? (
                      <Link
                        href={`/deal/${comment.dealId}#comments`}
                        className="font-semibold text-slate-950 transition hover:text-slate-700"
                      >
                        {comment.dealTitle}
                      </Link>
                    ) : <p className="font-semibold text-slate-500">Unavailable deal</p>}
                    <p className="text-xs text-slate-500">#{comment.id.slice(0, 8)}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>{comment.likeCount} like{comment.likeCount === 1 ? "" : "s"}</p>
                    {comment.reportReasons.length > 0 ? (
                      <p className="text-xs font-semibold text-rose-700">
                        {Array.from(new Set(comment.reportReasons)).map((reason) => reason.replace(/-/g, " ")).join(", ")}
                      </p>
                    ) : null}
                    <p className="text-slate-500">{formatMalaysiaDateTime(comment.createdAt)}</p>
                  </div>
                  <div className="admin-moderation-actions flex flex-wrap gap-2 text-sm lg:justify-end">
                    {comment.reportCount > 0 ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          clearReportsTriggerRef.current = event.currentTarget;
                          setClearReportsConfirmId(comment.id);
                        }}
                        disabled={rowPending}
                        className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {rowPending ? "Working…" : "Clear reports"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={(event) => {
                        deleteTriggerRef.current = event.currentTarget;
                        setDeleteConfirmId(comment.id);
                      }}
                      disabled={rowPending}
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-rose-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowPending ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(deleteConfirmId)}
        title="Delete comment and replies?"
        description="This permanently removes the selected comment and every reply beneath it. This action cannot be undone."
        confirmLabel="Delete permanently"
        pending={isPending && pendingId === deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
        returnFocusRef={deleteTriggerRef}
      />
      <ConfirmDialog
        open={Boolean(clearReportsConfirmId)}
        title="Clear comment reports?"
        description="This dismisses all current reports and keeps the comment visible. The same viewers may report it again if another issue occurs."
        confirmLabel="Clear reports"
        pending={isPending && pendingId === clearReportsConfirmId}
        onCancel={() => setClearReportsConfirmId(null)}
        onConfirm={() => { if (clearReportsConfirmId) handleClearReports(clearReportsConfirmId); }}
        returnFocusRef={clearReportsTriggerRef}
      />
    </section>
  );
}
