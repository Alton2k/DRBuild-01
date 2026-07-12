"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { deleteDealAction, moderateDealAction, restoreReportedDealAction } from "@/app/actions";
import { formatMyrPrice } from "@/lib/formatters";
import ConfirmDialog from "@/components/ConfirmDialog";

type DealStatus = "pending" | "approved" | "rejected";
type ModerationFilter = "all" | DealStatus | "expired" | "reported" | "risk";
type ModerationSort = "priority" | "most-reported" | "pending-first" | "newest";

export interface DealModerationRow {
  id: string;
  title: string;
  price: number;
  store: string;
  user: string;
  status: DealStatus;
  moderationReason: string;
  isExpired: boolean;
  expiredAt?: string;
  duplicateOfDealId?: string;
  duplicateReason?: string;
  reportCount: number;
  submittedAt: string;
}

const statusStyles: Record<DealStatus, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-rose-100 text-rose-700 border-rose-200",
};

const moderationReasonLabels: Record<string, string> = {
  admin_auto_approved: "Admin auto-approved",
  trusted_user_auto_approved: "Trusted user auto-approved",
  duplicate_manual_review: "Duplicate review",
  previous_rejection_manual_review: "Prior rejection review",
  new_user_manual_review: "New user review",
  admin_manual_pending: "Admin marked pending",
  admin_manual_approved: "Admin approved",
  admin_manual_rejected: "Admin rejected",
  admin_manual_update: "Admin updated",
  admin_restored_reported: "Admin restored",
  missing_image_manual_review: "Missing image",
  quality_manual_review: "Quality review",
  restricted_content_manual_review: "Restricted content",
  suspicious_claim_manual_review: "Suspicious claim",
  suspicious_link_manual_review: "Suspicious link",
};

const filterLabels: Record<ModerationFilter, string> = {
  all: "All",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  reported: "Reported",
  risk: "Risk review",
  expired: "Expired",
};

const filterOrder: ModerationFilter[] = [
  "all",
  "pending",
  "approved",
  "rejected",
  "reported",
  "risk",
  "expired",
];

/**
 * Formats a submitted timestamp for display in the admin moderation table.
 */
const formatDate = (timestamp: string) => {
  return new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(timestamp));
};

const newestFirst = (firstDeal: DealModerationRow, secondDeal: DealModerationRow) => {
  return new Date(secondDeal.submittedAt).getTime() - new Date(firstDeal.submittedAt).getTime();
};

const statusWeight = (status: DealStatus) => {
  if (status === "pending") {
    return 0;
  }

  if (status === "approved") {
    return 1;
  }

  return 2;
};

const priorityWeight = (deal: DealModerationRow) => {
  return (
    deal.reportCount * 10 +
    (deal.status === "pending" ? 4 : 0) +
    (deal.isExpired ? 3 : 0) +
    (isRiskReview(deal) ? 3 : 0) +
    (deal.duplicateReason ? 2 : 0)
  );
};

function isRiskReview(deal: DealModerationRow) {
  return [
    "missing_image_manual_review",
    "quality_manual_review",
    "restricted_content_manual_review",
    "suspicious_claim_manual_review",
    "suspicious_link_manual_review",
  ].includes(deal.moderationReason);
}

interface DealModerationTableProps {
  initialDeals: DealModerationRow[];
}

/**
 * Renders a moderation table backed by Server Actions.
 */
export default function DealModerationTable({ initialDeals }: DealModerationTableProps) {
  const router = useRouter();
  const refreshAdminOverview = (notice: string) => {
    const refresh = new URLSearchParams(window.location.search).get("refresh") === "1" ? "0" : "1";
    router.replace(`/admin?notice=${notice}&refresh=${refresh}#deals`, { scroll: false });
  };
  const [deals, setDeals] = useState<DealModerationRow[]>(initialDeals);
  const [activeFilter, setActiveFilter] = useState<ModerationFilter>("all");
  const [sortMode, setSortMode] = useState<ModerationSort>("priority");
  const [searchValue, setSearchValue] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);

  const filterCounts = useMemo(() => {
    return deals.reduce(
      (counts, deal) => {
        counts.all += 1;
        counts[deal.status] += 1;

        if (deal.reportCount > 0) {
          counts.reported += 1;
        }

        if (deal.isExpired) {
          counts.expired += 1;
        }

        if (isRiskReview(deal)) {
          counts.risk += 1;
        }

        return counts;
      },
      {
        all: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        reported: 0,
        risk: 0,
        expired: 0,
      } satisfies Record<ModerationFilter, number>,
    );
  }, [deals]);

  const filteredDeals = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return [...deals]
      .filter((deal) => {
        const haystack =
          `${deal.title} ${deal.store} ${deal.user} ${deal.moderationReason} ${deal.duplicateReason ?? ""}`.toLowerCase();
        const matchesSearch = haystack.includes(query);
        const matchesFilter =
          activeFilter === "all" ||
          deal.status === activeFilter ||
          (activeFilter === "reported" && deal.reportCount > 0) ||
          (activeFilter === "risk" && isRiskReview(deal)) ||
          (activeFilter === "expired" && deal.isExpired);

        return matchesSearch && matchesFilter;
      })
      .sort((firstDeal, secondDeal) => {
        if (sortMode === "most-reported") {
          return secondDeal.reportCount - firstDeal.reportCount || newestFirst(firstDeal, secondDeal);
        }

        if (sortMode === "pending-first") {
          return statusWeight(firstDeal.status) - statusWeight(secondDeal.status) || newestFirst(firstDeal, secondDeal);
        }

        if (sortMode === "newest") {
          return newestFirst(firstDeal, secondDeal);
        }

        return priorityWeight(secondDeal) - priorityWeight(firstDeal) || newestFirst(firstDeal, secondDeal);
      });
  }, [activeFilter, deals, searchValue, sortMode]);

  const updateDeal = (id: string, changes: Partial<DealModerationRow>) => {
    setDeals((current) =>
      current.map((deal) => (deal.id === id ? { ...deal, ...changes } : deal)),
    );
  };

  const handleModerate = (id: string, status: DealStatus) => {
    setPendingId(id);
    setStatusMessage("");
    startTransition(async () => {
      try {
        await moderateDealAction(id, status);
        updateDeal(id, { status, moderationReason: `admin_manual_${status}` });
        refreshAdminOverview(`deal-${status}`);
      } catch {
        setStatusMessage("Could not update this deal. Please try again.");
      } finally {
        setPendingId(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    setPendingId(id);
    setStatusMessage("");
    startTransition(async () => {
      try {
        await deleteDealAction(id);
        setDeals((current) => current.filter((deal) => deal.id !== id));
        refreshAdminOverview("deal-deleted");
      } catch {
        setStatusMessage("Could not delete this deal. Please try again.");
      } finally {
        setPendingId(null);
        setDeleteConfirmId(null);
      }
    });
  };

  const handleRestore = (id: string) => {
    setPendingId(id);
    setStatusMessage("");
    startTransition(async () => {
      try {
        await restoreReportedDealAction(id);
        updateDeal(id, {
          status: "approved",
          moderationReason: "admin_restored_reported",
          isExpired: false,
          expiredAt: undefined,
          reportCount: 0,
        });
        refreshAdminOverview("deal-restored");
      } catch {
        setStatusMessage("Could not restore this deal. Please try again.");
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <section id="deals" className="space-y-6 border-t border-slate-200 pt-6 sm:pt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
            Moderation controls
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Submitted deals</h2>
        </div>
        <div className="grid w-full gap-3 sm:w-auto sm:grid-flow-col sm:auto-cols-max">
          <label className="sr-only" htmlFor="deal-search">
            Search deals
          </label>
          <input
            id="deal-search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search by title or store"
            className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-slate-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-slate-200"
          />
          <label className="sr-only" htmlFor="moderation-sort">
            Sort deals
          </label>
          <select
            id="moderation-sort"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as ModerationSort)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 shadow-sm outline-none transition hover:border-slate-300 focus-visible:border-slate-500 focus-visible:ring-4 focus-visible:ring-slate-200"
          >
            <option value="priority">Priority</option>
            <option value="most-reported">Most reported</option>
            <option value="pending-first">Pending first</option>
            <option value="newest">Newest first</option>
          </select>
        </div>
      </div>
      {statusMessage ? <p className={`theme-alert px-4 py-3 text-sm font-semibold ${statusMessage.startsWith("Could not") ? "theme-alert-warning" : "theme-alert-success"}`} role="status">{statusMessage}</p> : null}

      <div className="flex flex-wrap gap-2" aria-label="Moderation filters">
        {filterOrder.map((filter) => {
          const isActive = activeFilter === filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={`admin-filter-control inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{filterLabels[filter]}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {filterCounts[filter]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="hidden grid-cols-7 gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 lg:grid">
          <div className="col-span-2">Deal</div>
          <div>Store</div>
          <div>Submitted by</div>
          <div>Status</div>
          <div>Reports</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredDeals.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-600">
              No deals match your search and filter. Try a different keyword or moderation state.
            </div>
          ) : (
            filteredDeals.map((deal) => {
              const rowPending = isPending && pendingId === deal.id;
              const hasReports = deal.reportCount > 0;
              const rowClassName = [
                "group flex flex-col gap-4 border-b border-slate-200 px-5 py-6 transition lg:grid lg:grid-cols-7 lg:items-center lg:gap-4 lg:px-6",
                hasReports || deal.isExpired ? "border-l-4" : "",
                hasReports
                  ? "border-l-amber-500 bg-amber-50/70"
                  : deal.isExpired
                    ? "border-l-rose-500 bg-rose-50/70"
                    : "border-slate-200 bg-white hover:bg-slate-50",
              ].join(" ");

              return (
                <article
                  key={deal.id}
                  className={rowClassName}
                >
                  <div className="lg:col-span-2">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1">
                        #{deal.id.slice(0, 8)}
                      </span>
                      {hasReports ? (
                        <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 font-semibold text-amber-800">
                          Needs report review
                        </span>
                      ) : null}
                      {isRiskReview(deal) ? (
                        <span className="rounded-full border border-violet-300 bg-violet-100 px-2 py-1 font-semibold text-violet-800">
                          Automated risk check
                        </span>
                      ) : null}
                      {deal.isExpired ? (
                        <span className="rounded-full border border-rose-300 bg-rose-100 px-2 py-1 font-semibold text-rose-800">
                          Expired deal
                        </span>
                      ) : null}
                    </div>
                    <Link
                      href={`/deal/${deal.id}`}
                      className="mt-3 block text-lg font-semibold text-slate-950 transition hover:text-slate-700"
                    >
                      {deal.title}
                    </Link>
                    <p className="mt-2 text-sm text-slate-600">{formatMyrPrice(deal.price, 0)} - {deal.store}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="hidden text-slate-500 lg:block">Store</div>
                    <p>{deal.store}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="hidden text-slate-500 lg:block">Submitted by</div>
                    <p className="font-medium text-slate-900">{deal.user}</p>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="hidden text-slate-500 lg:block">Submitted</div>
                    <p>{formatDate(deal.submittedAt)}</p>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${statusStyles[deal.status]}`}>
                      {deal.status}
                    </span>
                    {deal.isExpired ? (
                      <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-rose-700">
                        Expired
                      </span>
                    ) : null}
                    {deal.duplicateReason ? (
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                        isRiskReview(deal)
                          ? "border-violet-200 bg-violet-50 text-violet-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}>
                        {isRiskReview(deal) ? "Signals" : "Duplicate?"}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                      {moderationReasonLabels[deal.moderationReason] ?? "Manual review"}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="hidden text-slate-500 lg:block">Reports</div>
                    <p
                      className={
                        hasReports
                          ? "inline-flex rounded-full border border-amber-300 bg-amber-100 px-3 py-1 font-semibold text-amber-800"
                          : ""
                      }
                    >
                      {deal.reportCount} report{deal.reportCount === 1 ? "" : "s"}
                    </p>
                    {deal.duplicateReason ? (
                      <div className={`rounded-2xl border p-3 text-xs leading-5 ${
                        isRiskReview(deal)
                          ? "border-violet-200 bg-violet-50 text-violet-900"
                          : "border-amber-200 bg-amber-50 text-amber-900"
                      }`}>
                        <p className="font-semibold">
                          {isRiskReview(deal) ? "Automated signals" : "Possible duplicate"}
                        </p>
                        <p>{deal.duplicateReason}</p>
                        {deal.duplicateOfDealId && !isRiskReview(deal) ? (
                          <Link
                            href={`/deal/${deal.duplicateOfDealId}`}
                            className="mt-1 inline-block font-semibold underline decoration-amber-300 underline-offset-2"
                          >
                            Review matched deal
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="admin-moderation-actions flex flex-wrap gap-2 text-sm lg:justify-end">
                    <button
                      type="button"
                      onClick={() => handleModerate(deal.id, "approved")}
                      disabled={rowPending}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-emerald-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModerate(deal.id, "rejected")}
                      disabled={rowPending}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-rose-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestore(deal.id)}
                      disabled={rowPending || (deal.reportCount === 0 && !deal.isExpired)}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-sky-600 px-3 py-2 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        deleteTriggerRef.current = event.currentTarget;
                        setDeleteConfirmId(deal.id);
                      }}
                      disabled={rowPending}
                      className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
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
        title="Permanently delete deal?"
        description="This removes the deal and its related activity. This action cannot be undone."
        confirmLabel="Delete permanently"
        pending={isPending && pendingId === deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        onConfirm={() => { if (deleteConfirmId) handleDelete(deleteConfirmId); }}
        returnFocusRef={deleteTriggerRef}
      />
    </section>
  );
}
