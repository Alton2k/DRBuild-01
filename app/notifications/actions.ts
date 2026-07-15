"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { getAccountNotifications, markAccountNotificationRead } from "@/lib/notifications";

export type NotificationActionResult = {
  ok: boolean;
  message: string;
};

export async function setNotificationReadAction(
  notificationId: string,
  read: boolean,
): Promise<NotificationActionResult> {
  if (!notificationId || typeof read !== "boolean") {
    return { ok: false, message: "Could not update that notification." };
  }

  try {
    const user = await requireCurrentUser();
    const updated = await markAccountNotificationRead(user.id, notificationId, read);

    if (!updated) {
      return { ok: false, message: "That notification is no longer available." };
    }

    revalidatePath("/notifications");
    return { ok: true, message: read ? "Marked as read." : "Marked as unread." };
  } catch {
    return { ok: false, message: "Could not update that notification. Try again." };
  }
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  try {
    const user = await requireCurrentUser();
    let updatedCount = 0;
    let failed = false;

    for (let batchNumber = 0; batchNumber < 100; batchNumber += 1) {
      const unread = await getAccountNotifications(user.id, { unreadOnly: true, limit: 100 });
      if (unread.length === 0) break;

      const results = await Promise.allSettled(
        unread.map((notification) => markAccountNotificationRead(user.id, notification.id, true)),
      );
      const updatedInBatch = results.filter((result) => result.status === "fulfilled" && result.value).length;
      updatedCount += updatedInBatch;

      if (updatedInBatch !== unread.length) {
        failed = true;
        break;
      }
    }

    if (!failed) {
      const remaining = await getAccountNotifications(user.id, { unreadOnly: true, limit: 1 });
      failed = remaining.length > 0;
    }

    revalidatePath("/notifications");
    return failed
      ? { ok: false, message: "Some notifications could not be updated. Try again." }
      : { ok: true, message: updatedCount ? "All notifications marked as read." : "You are already caught up." };
  } catch {
    return { ok: false, message: "Could not update notifications. Try again." };
  }
}
