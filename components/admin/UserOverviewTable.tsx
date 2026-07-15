"use client";

import { useMemo, useState } from "react";
import { formatMalaysiaDateTime } from "@/lib/formatters";

export type UserTrustStatus = "admin" | "trusted" | "needs-review" | "new-user" | "legacy";

export interface UserOverviewRow {
  id: string;
  name: string;
  email: string;
  status: UserTrustStatus;
  totalDeals: number;
  approvedDeals: number;
  pendingDeals: number;
  rejectedDeals: number;
  reportedDeals: number;
  latestSubmissionAt: string;
}

interface UserOverviewTableProps {
  users: UserOverviewRow[];
}

const statusLabels: Record<UserTrustStatus, string> = {
  admin: "Admin",
  trusted: "Trusted",
  "needs-review": "Needs review",
  "new-user": "New user",
  legacy: "Legacy",
};

const statusStyles: Record<UserTrustStatus, string> = {
  admin: "border-slate-300 bg-slate-950 text-white",
  trusted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "needs-review": "border-amber-200 bg-amber-50 text-amber-800",
  "new-user": "border-sky-200 bg-sky-50 text-sky-800",
  legacy: "border-slate-200 bg-slate-50 text-slate-600",
};

function newestFirst(firstUser: UserOverviewRow, secondUser: UserOverviewRow) {
  return (
    new Date(secondUser.latestSubmissionAt).getTime() -
    new Date(firstUser.latestSubmissionAt).getTime()
  );
}

export default function UserOverviewTable({ users }: UserOverviewTableProps) {
  const [searchValue, setSearchValue] = useState("");
  const [activeStatus, setActiveStatus] = useState<UserTrustStatus | "all">("all");

  const statusCounts = useMemo(() => {
    return users.reduce(
      (counts, user) => {
        counts.all += 1;
        counts[user.status] += 1;
        return counts;
      },
      {
        all: 0,
        admin: 0,
        trusted: 0,
        "needs-review": 0,
        "new-user": 0,
        legacy: 0,
      } satisfies Record<UserTrustStatus | "all", number>,
    );
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return users
      .filter((user) => {
        const haystack = `${user.name} ${user.email} ${statusLabels[user.status]}`.toLowerCase();
        const matchesSearch = haystack.includes(query);
        const matchesStatus = activeStatus === "all" || user.status === activeStatus;

        return matchesSearch && matchesStatus;
      })
      .sort((firstUser, secondUser) => {
        if (firstUser.status === "needs-review" && secondUser.status !== "needs-review") {
          return -1;
        }

        if (secondUser.status === "needs-review" && firstUser.status !== "needs-review") {
          return 1;
        }

        return newestFirst(firstUser, secondUser);
      });
  }, [activeStatus, searchValue, users]);

  const statusOrder: Array<UserTrustStatus | "all"> = [
    "all",
    "needs-review",
    "trusted",
    "admin",
    "new-user",
    "legacy",
  ];

  return (
    <section id="users" className="settings-section-divider scroll-mt-32 space-y-6 py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-950">Users</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
            Track who is becoming trusted, who still needs manual review, and where moderation attention is building up.
          </p>
        </div>

        <label className="grid gap-2 self-end text-sm font-semibold text-slate-700 lg:justify-self-end">
          <span className="sr-only">Search users</span>
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search users"
            className="min-h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 text-sm font-normal text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-[#dc115e] focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 sm:min-w-[240px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="User status filters">
        {statusOrder.map((status) => {
          const isActive = activeStatus === status;
          const label = status === "all" ? "All" : statusLabels[status];

          return (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`admin-filter-control inline-flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 ${
                isActive
                  ? "border-slate-900 bg-slate-950 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {statusCounts[status]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <div className="hidden grid-cols-8 gap-4 border-b border-slate-200 bg-slate-100 px-5 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 lg:grid">
          <div className="col-span-2">User</div>
          <div>Status</div>
          <div>Total</div>
          <div>Approved</div>
          <div>Pending</div>
          <div>Rejected</div>
          <div>Latest</div>
        </div>
        <div className="divide-y divide-slate-200">
          {filteredUsers.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-600">
              No users match this search.
            </div>
          ) : (
            filteredUsers.map((user) => (
              <article
                key={user.id}
                className="grid gap-4 bg-white px-5 py-6 transition hover:bg-slate-50 lg:grid-cols-8 lg:items-center lg:px-6"
              >
                <div className="lg:col-span-2">
                  <p className="font-semibold text-slate-950">{user.name}</p>
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email || user.id}</p>
                  {user.reportedDeals > 0 ? (
                    <p className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {user.reportedDeals} reported deal{user.reportedDeals === 1 ? "" : "s"}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${statusStyles[user.status]}`}>
                    {statusLabels[user.status]}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  <span className="lg:hidden text-slate-500">Total: </span>
                  {user.totalDeals}
                </p>
                <p className="text-sm text-emerald-700">
                  <span className="lg:hidden text-slate-500">Approved: </span>
                  {user.approvedDeals}
                </p>
                <p className="text-sm text-amber-700">
                  <span className="lg:hidden text-slate-500">Pending: </span>
                  {user.pendingDeals}
                </p>
                <p className="text-sm text-rose-700">
                  <span className="lg:hidden text-slate-500">Rejected: </span>
                  {user.rejectedDeals}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="lg:hidden text-slate-500">Latest: </span>
                  {formatMalaysiaDateTime(user.latestSubmissionAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
