"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { AccountNotification } from "@/lib/notifications";
import { formatMalaysiaDateTime } from "@/lib/formatters";
import { markAllNotificationsReadAction, setNotificationReadAction } from "./actions";

const typeLabels: Record<AccountNotification["type"], string> = {
  new_comment: "New comment",
  comment_reply: "Reply",
  deal_approval: "Deal approved",
  saved_deal_update: "Saved deal update",
};

export default function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: AccountNotification[];
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [statusMessage, setStatusMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  function updateReadState(notificationId: string, read: boolean) {
    setPendingId(notificationId);
    setStatusMessage("");
    startTransition(async () => {
      const result = await setNotificationReadAction(notificationId, read);
      if (result.ok) {
        setNotifications((current) =>
          current.map((notification) =>
            notification.id === notificationId
              ? { ...notification, readAt: read ? new Date().toISOString() : null }
              : notification,
          ),
        );
      }
      setStatusMessage(result.message);
      setPendingId(null);
    });
  }

  function markAllRead() {
    setPendingId("all");
    setStatusMessage("");
    startTransition(async () => {
      const result = await markAllNotificationsReadAction();
      if (result.ok) {
        const readAt = new Date().toISOString();
        setNotifications((current) => current.map((notification) => ({ ...notification, readAt })));
      }
      setStatusMessage(result.message);
      setPendingId(null);
    });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          {unreadCount === 0 ? "You’re all caught up." : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
        </p>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllRead}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingId === "all" ? "Updating…" : "Mark all as read"}
          </button>
        ) : null}
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm font-semibold text-slate-600" role="status">{statusMessage}</p>
      ) : null}

      <div className="divide-y divide-slate-200">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt;
          const content = (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#dc115e]">
                  {typeLabels[notification.type]}
                </span>
                {isUnread ? <span className="h-2 w-2 rounded-full bg-[#dc115e]" aria-label="Unread" /> : null}
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">{notification.message}</p>
              <p className="mt-1 text-xs text-slate-500">{formatMalaysiaDateTime(notification.createdAt)}</p>
            </>
          );

          return (
            <article key={notification.id} className={`grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${isUnread ? "bg-[#dc115e]/[0.035]" : ""}`}>
              {notification.dealDocumentId ? (
                <Link
                  href={`/deal/${notification.dealDocumentId}${notification.commentDocumentId ? `#comment-${notification.commentDocumentId}` : ""}`}
                  onClick={() => { if (isUnread) updateReadState(notification.id, true); }}
                  className="min-w-0 rounded-md px-2 py-1 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15"
                >
                  {content}
                </Link>
              ) : <div className="px-2 py-1">{content}</div>}
              <button
                type="button"
                onClick={() => updateReadState(notification.id, isUnread)}
                disabled={isPending && pendingId === notification.id}
                className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#dc115e]/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending && pendingId === notification.id ? "Updating…" : isUnread ? "Mark read" : "Mark unread"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
