import { getDeals } from "@/lib/deals";
import { getAdminComments } from "@/lib/comments";
import { getAdminEmails, getCurrentUser, isAdminUser } from "@/lib/auth";
import CommentModerationTable, { CommentModerationRow } from "@/components/admin/CommentModerationTable";
import DealModerationTable, { DealModerationRow } from "@/components/admin/DealModerationTable";
import UserOverviewTable, {
  type UserOverviewRow,
  type UserTrustStatus,
} from "@/components/admin/UserOverviewTable";

export const dynamic = "force-dynamic";

const trustedAuthorApprovedDealThreshold = 3;

const navigation = [
  { label: "Overview", href: "#overview" },
  { label: "Users", href: "#users" },
  { label: "Deals", href: "#deals" },
  { label: "Comments", href: "#comments" },
];

export const metadata = {
  title: "Admin Dashboard - Moderate Deals",
  description: "Admin dashboard for deal moderation and review.",
};

function getUserStatus(input: {
  email: string;
  approvedDeals: number;
  rejectedDeals: number;
  reportedDeals: number;
  totalDeals: number;
  adminEmails: string[];
}): UserTrustStatus {
  if (input.email && input.adminEmails.includes(input.email.toLowerCase())) {
    return "admin";
  }

  if (!input.email) {
    return "legacy";
  }

  if (input.rejectedDeals > 0 || input.reportedDeals > 0) {
    return "needs-review";
  }

  if (input.approvedDeals >= trustedAuthorApprovedDealThreshold) {
    return "trusted";
  }

  return "new-user";
}

function getUserRows(deals: Awaited<ReturnType<typeof getDeals>>, adminEmails: string[]) {
  const users = new Map<string, UserOverviewRow>();

  for (const deal of deals) {
    const key = deal.authorUserId || deal.authorEmail || "legacy-community";
    const existing = users.get(key);
    const latestSubmissionAt =
      existing && new Date(existing.latestSubmissionAt) > new Date(deal.createdAt)
        ? existing.latestSubmissionAt
        : deal.createdAt;

    const nextUser: UserOverviewRow = {
      id: key,
      name: existing?.name ?? deal.authorName ?? deal.authorEmail ?? "Community poster",
      email: existing?.email ?? deal.authorEmail,
      status: "new-user",
      totalDeals: (existing?.totalDeals ?? 0) + 1,
      approvedDeals: (existing?.approvedDeals ?? 0) + (deal.status === "approved" ? 1 : 0),
      pendingDeals: (existing?.pendingDeals ?? 0) + (deal.status === "pending" ? 1 : 0),
      rejectedDeals: (existing?.rejectedDeals ?? 0) + (deal.status === "rejected" ? 1 : 0),
      reportedDeals: (existing?.reportedDeals ?? 0) + (deal.reportCount > 0 ? 1 : 0),
      latestSubmissionAt,
    };

    nextUser.status = getUserStatus({ ...nextUser, adminEmails });
    users.set(key, nextUser);
  }

  return Array.from(users.values()).sort(
    (firstUser, secondUser) =>
      new Date(secondUser.latestSubmissionAt).getTime() -
      new Date(firstUser.latestSubmissionAt).getTime(),
  );
}

function getPercent(numerator: number, denominator: number) {
  if (denominator === 0) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

/**
 * Renders the admin dashboard shell and moderation table for submitted deals.
 */
export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);
  const adminEmails = getAdminEmails();
  const hasAdminConfig = adminEmails.length > 0;
  const deals = await getDeals();
  const comments = await getAdminComments();
  const userRows = getUserRows(deals, adminEmails);
  const pendingDealCount = deals.filter((deal) => deal.status === "pending").length;
  const approvedDealCount = deals.filter((deal) => deal.status === "approved").length;
  const rejectedDealCount = deals.filter((deal) => deal.status === "rejected").length;
  const reportedDealCount = deals.filter((deal) => deal.reportCount > 0).length;
  const trustedUserCount = userRows.filter((row) => row.status === "trusted").length;
  const reviewUserCount = userRows.filter((row) => row.status === "needs-review").length;
  const autoApprovedDealCount = deals.filter((deal) =>
    ["admin_auto_approved", "trusted_user_auto_approved"].includes(deal.moderationReason),
  ).length;
  const autoApprovalRate = getPercent(autoApprovedDealCount, deals.length);
  const moderationRows: DealModerationRow[] = deals.map((deal) => ({
    id: deal.id,
    title: deal.title,
    price: deal.price,
    store: deal.store,
    user: deal.authorName || deal.authorEmail || "community",
    status: deal.status,
    moderationReason: deal.moderationReason,
    isExpired: deal.isExpired,
    expiredAt: deal.expiredAt,
    duplicateOfDealId: deal.duplicateOfDealId,
    duplicateReason: deal.duplicateReason,
    reportCount: deal.reportCount,
    submittedAt: deal.createdAt,
  }));
  const commentRows: CommentModerationRow[] = comments.map((comment) => ({
    id: comment.id,
    dealId: comment.dealId,
    dealTitle: comment.dealTitle,
    parentId: comment.parentId,
    authorName: comment.authorName,
    body: comment.body,
    likeCount: comment.likeCount,
    createdAt: comment.createdAt,
  }));

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-16 text-center text-slate-900 sm:px-6 lg:px-8">
        <div className="mx-auto inline-flex max-w-xl flex-col items-center rounded-3xl border border-slate-200 bg-white p-16 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">Access Denied</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">
            {user ? "You do not have permission to view this page." : "Please sign in with an admin account."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {hasAdminConfig
              ? "This section is restricted to administrators only."
              : "Set ADMIN_EMAILS in .env.local with comma-separated admin email addresses, then restart the dev server."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-start">
          <aside className="w-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:w-[280px]">
            <div className="mb-7">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">Admin</p>
              <h1 className="mt-3 text-2xl font-semibold text-slate-950">Dashboard</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Moderate submissions, inspect trust signals, and keep the public feed clean.
              </p>
            </div>
            <nav className="space-y-2">
              {navigation.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Signed in
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-950">{user?.email}</p>
            </div>
          </aside>

          <section className="flex-1 space-y-6">
            <div id="overview" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Moderation
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                    Admin Overview
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                    Review deal quality, watch user trust signals, and intervene where automation has held something for a human decision.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {autoApprovalRate}% auto-approved
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Pending
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-amber-950">{pendingDealCount}</p>
                  <p className="mt-1 text-sm text-amber-800">Deals waiting for review</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Published
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-emerald-950">{approvedDealCount}</p>
                  <p className="mt-1 text-sm text-emerald-800">Approved deals in the feed</p>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                    Rejected
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-rose-950">{rejectedDealCount}</p>
                  <p className="mt-1 text-sm text-rose-800">Deals blocked from feed</p>
                </div>
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Users
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-sky-950">{userRows.length}</p>
                  <p className="mt-1 text-sm text-sky-800">
                    {trustedUserCount} trusted, {reviewUserCount} need review
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{deals.length} total deals</p>
                  <p className="mt-1 text-sm text-slate-600">All submitted deal records.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{reportedDealCount} reported deals</p>
                  <p className="mt-1 text-sm text-slate-600">Prioritized in the moderation queue.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{comments.length} comments</p>
                  <p className="mt-1 text-sm text-slate-600">Available for discussion cleanup.</p>
                </div>
              </div>
            </div>

            <UserOverviewTable users={userRows} />
            <DealModerationTable initialDeals={moderationRows} />
            <CommentModerationTable initialComments={commentRows} />
          </section>
        </div>
      </div>
    </main>
  );
}
