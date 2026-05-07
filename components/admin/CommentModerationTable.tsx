"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { deleteCommentAsAdminAction } from "@/app/actions";

export interface CommentModerationRow {
  id: string;
  dealId: string;
  dealTitle: string;
  parentId: string | null;
  authorName: string;
  body: string;
  likeCount: number;
  createdAt: string;
}

interface CommentModerationTableProps {
  initialComments: CommentModerationRow[];
}

function formatDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function CommentModerationTable({
  initialComments,
}: CommentModerationTableProps) {
  const [comments, setComments] = useState(initialComments);
  const [searchValue, setSearchValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredComments = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    if (!query) {
      return comments;
    }

    return comments.filter((comment) => {
      const haystack = `${comment.authorName} ${comment.body} ${comment.dealTitle}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [comments, searchValue]);

  const handleDelete = (id: string) => {
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteCommentAsAdminAction(id);

      if (result.ok) {
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
      }

      setPendingId(null);
    });
  };

  return (
    <section id="comments" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Comment controls
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Discussion moderation</h2>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          <span className="sr-only">Search comments</span>
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search comments"
            className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200"
          />
        </label>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
        <div className="hidden grid-cols-6 gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 sm:grid">
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
            filteredComments.map((comment) => {
              const rowPending = isPending && pendingId === comment.id;

              return (
                <article
                  key={comment.id}
                  className="flex flex-col gap-4 bg-white px-5 py-6 transition hover:bg-slate-50 sm:grid sm:grid-cols-6 sm:items-start sm:gap-4 sm:px-6"
                >
                  <div className="sm:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="font-semibold text-slate-950">{comment.authorName}</span>
                      {comment.parentId ? (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                          Reply
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {comment.body}
                    </p>
                  </div>
                  <div className="space-y-2 text-sm sm:col-span-2">
                    <Link
                      href={`/deal/${comment.dealId}#comments`}
                      className="font-semibold text-slate-950 transition hover:text-slate-700"
                    >
                      {comment.dealTitle}
                    </Link>
                    <p className="text-xs text-slate-500">#{comment.id.slice(0, 8)}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <p>{comment.likeCount} like{comment.likeCount === 1 ? "" : "s"}</p>
                    <p className="text-slate-500">{formatDate(comment.createdAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm sm:justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(comment.id)}
                      disabled={rowPending}
                      className="inline-flex items-center justify-center rounded-2xl bg-rose-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowPending ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
