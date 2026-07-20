"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/lib/auth";
import { getAccountNotifications, markAccountNotificationRead } from "@/lib/notifications";
import {
  createNotificationActionOperations,
  type NotificationActionResult,
} from "@/lib/notificationOperations";

export type { NotificationActionResult };

const notificationActions = createNotificationActionOperations({
  requireCurrentUser,
  getNotifications: getAccountNotifications,
  markRead: markAccountNotificationRead,
  revalidate: revalidatePath,
});

export async function setNotificationReadAction(
  notificationId: string,
  read: boolean,
): Promise<NotificationActionResult> {
  return notificationActions.setNotificationRead(notificationId, read);
}

export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  return notificationActions.markAllNotificationsRead();
}
