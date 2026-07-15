import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getAccountNotifications } from "@/lib/notifications";
import NotificationsClient from "./NotificationsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications | Deal Rakyat",
  description: "Review account and community updates.",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth?mode=login&next=/notifications");
  }

  const requestedPage = Number.parseInt((await searchParams).page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;
  const result = await getAccountNotifications(user.id, { limit: pageSize + 1, page })
    .then((notifications) => ({ ok: true as const, notifications }))
    .catch(() => ({ ok: false as const, notifications: [] }));
  const hasNextPage = result.notifications.length > pageSize;
  const visibleNotifications = result.notifications.slice(0, pageSize);

  if (result.ok && page > 1 && visibleNotifications.length === 0) {
    redirect("/notifications");
  }

  return (
    <main className="home-page min-h-screen text-slate-900">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="py-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Comment, moderation, and saved-deal updates that match your preferences.
          </p>
        </header>

        {!result.ok ? (
          <div className="theme-alert theme-alert-warning mt-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm font-semibold" role="alert">
            <span>Notifications are temporarily unavailable.</span>
            <a href="/notifications" className="inline-flex min-h-11 items-center justify-center rounded-full border border-current px-4 text-xs font-bold">Try again</a>
          </div>
        ) : visibleNotifications.length > 0 ? (
          <>
            <NotificationsClient initialNotifications={visibleNotifications} />
            {(page > 1 || hasNextPage) ? (
              <nav className="mt-6 flex items-center justify-between border-t border-slate-200 pt-5" aria-label="Notification pages">
                {page > 1 ? (
                  <Link href={page === 2 ? "/notifications" : `/notifications?page=${page - 1}`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15">
                    Previous
                  </Link>
                ) : <span />}
                {hasNextPage ? (
                  <Link href={`/notifications?page=${page + 1}`} className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15">
                    Next
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </>
        ) : (
          <section className="mt-8 border-y border-slate-200 py-12 text-center">
            <h2 className="text-lg font-black text-slate-950">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-600">New comments, replies, approvals, and saved-deal updates will appear here.</p>
          </section>
        )}
      </div>
    </main>
  );
}
