import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDealsResult, type Deal } from "@/lib/deals";
import { getAdminCommentsResult } from "@/lib/comments";
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
  robots: {
    index: false,
    follow: false,
  },
};

async function getUnauthorizedReturnPath() {
  const requestHeaders = await headers();
  const referer = requestHeaders.get("referer");
  const requestHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!referer || !requestHost) return "/";

  try {
    const returnUrl = new URL(referer);
    const returnPath = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;

    if (returnUrl.host !== requestHost || returnUrl.pathname.startsWith("/admin")) {
      return "/";
    }

    return returnPath.startsWith("/") ? returnPath : "/";
  } catch {
    return "/";
  }
}

const moderationNotices: Record<string, string> = {
  "comment-deleted": "Comment and its replies were deleted.",
  "comment-reports-cleared": "Comment reports cleared; the comment remains visible.",
  "deal-approved": "Deal marked approved.",
  "deal-deleted": "Deal permanently deleted.",
  "deal-pending": "Deal marked pending.",
  "deal-rejected": "Deal marked rejected.",
  "deal-restored": "Deal restored and reports cleared.",
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

function getUserRows(deals: Deal[], adminEmails: string[]) {
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
export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice = "" } = await searchParams;
  const moderationNotice = moderationNotices[notice] ?? "";
  const user = await getCurrentUser();
  const isAdmin = isAdminUser(user);
  const adminEmails = getAdminEmails();

  if (!isAdmin) {
    redirect(await getUnauthorizedReturnPath());
  }

  const [dealsResult, commentsResult] = await Promise.all([getDealsResult(), getAdminCommentsResult()]);
  const deals = dealsResult.ok ? dealsResult.data : [];
  const comments = commentsResult.ok ? commentsResult.data : [];
  const dealsUnavailable = !dealsResult.ok;
  const commentsUnavailable = !commentsResult.ok;
  const userRows = getUserRows(deals, adminEmails);
  const pendingDealCount = deals.filter((deal) => deal.status === "pending").length;
  const approvedDealCount = deals.filter((deal) => deal.status === "approved").length;
  const rejectedDealCount = deals.filter((deal) => deal.status === "rejected").length;
  const reportedDealCount = deals.filter((deal) => deal.reportCount > 0).length;
  const reportedCommentCount = comments.filter((comment) => comment.reportCount > 0).length;
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
    reportCount: comment.reportCount,
    reportReasons: comment.reportReasons,
  }));

  return (
    <main className="admin-page home-page min-h-screen text-slate-900">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 py-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Admin</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Moderation
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Review queues, trust signals, and community reports.
            </p>
          </div>
          <p className="max-w-full truncate text-xs font-semibold text-slate-500" title={user?.email}>
            Signed in as {user?.email}
          </p>
        </header>

        <nav
          aria-label="Admin sections"
          className="admin-section-nav sticky top-16 z-20 -mx-4 mt-5 flex gap-1 overflow-x-auto border-y border-slate-200 bg-white/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-2"
        >
          {navigation.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <section className="mt-6 space-y-6">
            {moderationNotice ? (
              <p className="theme-alert theme-alert-success px-4 py-3 text-sm font-semibold" role="status">
                {moderationNotice}
              </p>
            ) : null}
            <div id="overview" className="scroll-mt-32 py-3">
              <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">Overview</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                    Start with items that need a person, then scan the wider marketplace health.
                  </p>
                </div>
                <div>
                  {dealsUnavailable || commentsUnavailable ? (
                    <div className="theme-alert theme-alert-warning mb-5 flex flex-wrap items-center justify-between gap-3 p-4 text-sm font-semibold" role="alert">
                      <span>{dealsUnavailable && commentsUnavailable
                        ? "Deals and comments are temporarily unavailable."
                        : dealsUnavailable
                          ? "Deals are temporarily unavailable."
                          : "Comments are temporarily unavailable."}</span>
                      <a href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-full border border-current px-4 text-xs font-bold">Try again</a>
                    </div>
                  ) : null}
                  <div className="grid border-y border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Pending", pendingDealCount, "Waiting for review", "text-amber-700"],
                      ["Reported", reportedDealCount + reportedCommentCount, "Deals and comments", "text-rose-700"],
                      ["Published", approvedDealCount, "Approved deals", "text-emerald-700"],
                      ["Users", userRows.length, `${trustedUserCount} trusted, ${reviewUserCount} review`, "text-sky-700"],
                    ].map(([label, value, description, tone]) => (
                      <div key={label} className="border-b border-slate-200 px-1 py-4 last:border-b-0 sm:border-r sm:px-4 sm:[&:nth-child(2)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2)]:border-r">
                        <p className={`text-xs font-bold uppercase tracking-[0.16em] ${tone}`}>{label}</p>
                        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
                        <p className="mt-1 text-xs text-slate-500">{description}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    <span><strong className="text-slate-950">{deals.length}</strong> total deals</span>
                    <span><strong className="text-slate-950">{rejectedDealCount}</strong> rejected</span>
                    <span><strong className="text-slate-950">{comments.length}</strong> comments</span>
                    <span><strong className="text-slate-950">{autoApprovalRate}%</strong> auto-approved</span>
                  </div>
                </div>
              </div>
            </div>

            <UserOverviewTable users={userRows} />
            <DealModerationTable initialDeals={moderationRows} />
            <CommentModerationTable initialComments={commentRows} />
        </section>
      </div>
    </main>
  );
}
