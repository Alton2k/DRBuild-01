import {
  canReadNotification,
  createNotificationStorageData,
  isNotificationEnabled,
  type NotificationPreferenceKey,
  type NotificationType,
} from "./notificationRules.ts";

export type AccountNotification = {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  actorUserId?: string | null;
  dealDocumentId?: string | null;
  commentDocumentId?: string | null;
  message: string;
  readAt?: string | null;
  createdAt: string;
};

export type CreateAccountNotificationInput = {
  recipientUserId: string;
  type: NotificationType;
  actorUserId?: string;
  dealDocumentId?: string;
  commentDocumentId?: string;
  eventVersion?: string;
  message: string;
};

export type NotificationListOptions = {
  unreadOnly?: boolean;
  limit?: number;
  page?: number;
};

export type NotificationStorageData = ReturnType<typeof createNotificationStorageData>;

type NotificationRepository = {
  create: (data: NotificationStorageData) => Promise<AccountNotification | null>;
  list: (userId: string, options?: NotificationListOptions) => Promise<AccountNotification[]>;
  findForRecipient: (userId: string, notificationId: string) => Promise<AccountNotification | null>;
  updateRead: (
    notificationId: string,
    readAt: string | null,
  ) => Promise<AccountNotification | null>;
};

type NotificationOperationsDependencies = {
  getPreferences: (
    userId: string,
  ) => Promise<Partial<Record<NotificationPreferenceKey, boolean>> | null | undefined>;
  repository: NotificationRepository;
  isDuplicateError: (error: unknown) => boolean;
  now?: () => Date;
};

export function createNotificationOperations(dependencies: NotificationOperationsDependencies) {
  const now = dependencies.now ?? (() => new Date());

  return {
    async createAccountNotification(input: CreateAccountNotificationInput) {
      if (!input.recipientUserId || input.recipientUserId === input.actorUserId) {
        return null;
      }

      const preferences = await dependencies.getPreferences(input.recipientUserId);

      if (!isNotificationEnabled(input.type, preferences)) {
        return null;
      }

      try {
        return await dependencies.repository.create(createNotificationStorageData(input));
      } catch (error) {
        if (dependencies.isDuplicateError(error)) {
          return null;
        }

        throw error;
      }
    },

    getAccountNotifications(userId: string, options: NotificationListOptions = {}) {
      return dependencies.repository.list(userId, options);
    },

    async markAccountNotificationRead(userId: string, notificationId: string, read = true) {
      const existing = await dependencies.repository.findForRecipient(userId, notificationId);

      if (!existing || !canReadNotification(existing.recipientUserId, userId)) {
        return null;
      }

      return dependencies.repository.updateRead(
        existing.id,
        read ? now().toISOString() : null,
      );
    },
  };
}

export type NotificationActionResult = {
  ok: boolean;
  message: string;
};

type NotificationActionDependencies = {
  requireCurrentUser: () => Promise<{ id: string }>;
  getNotifications: (
    userId: string,
    options?: NotificationListOptions,
  ) => Promise<AccountNotification[]>;
  markRead: (
    userId: string,
    notificationId: string,
    read?: boolean,
  ) => Promise<AccountNotification | null>;
  revalidate: (path: string) => void;
};

export function createNotificationActionOperations(dependencies: NotificationActionDependencies) {
  return {
    async setNotificationRead(
      notificationId: string,
      read: boolean,
    ): Promise<NotificationActionResult> {
      if (!notificationId || typeof read !== "boolean") {
        return { ok: false, message: "Could not update that notification." };
      }

      try {
        const user = await dependencies.requireCurrentUser();
        const updated = await dependencies.markRead(user.id, notificationId, read);

        if (!updated) {
          return { ok: false, message: "That notification is no longer available." };
        }

        dependencies.revalidate("/notifications");
        return { ok: true, message: read ? "Marked as read." : "Marked as unread." };
      } catch {
        return { ok: false, message: "Could not update that notification. Try again." };
      }
    },

    async markAllNotificationsRead(): Promise<NotificationActionResult> {
      try {
        const user = await dependencies.requireCurrentUser();
        let updatedCount = 0;
        let failed = false;

        for (let batchNumber = 0; batchNumber < 100; batchNumber += 1) {
          const unread = await dependencies.getNotifications(user.id, {
            unreadOnly: true,
            limit: 100,
          });
          if (unread.length === 0) break;

          const results = await Promise.allSettled(
            unread.map((notification) =>
              dependencies.markRead(user.id, notification.id, true),
            ),
          );
          const updatedInBatch = results.filter(
            (result) => result.status === "fulfilled" && result.value,
          ).length;
          updatedCount += updatedInBatch;

          if (updatedInBatch !== unread.length) {
            failed = true;
            break;
          }
        }

        if (!failed) {
          const remaining = await dependencies.getNotifications(user.id, {
            unreadOnly: true,
            limit: 1,
          });
          failed = remaining.length > 0;
        }

        dependencies.revalidate("/notifications");
        return failed
          ? { ok: false, message: "Some notifications could not be updated. Try again." }
          : {
              ok: true,
              message: updatedCount
                ? "All notifications marked as read."
                : "You are already caught up.",
            };
      } catch {
        return { ok: false, message: "Could not update notifications. Try again." };
      }
    },
  };
}
