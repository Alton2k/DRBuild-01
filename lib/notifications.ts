import "server-only";

import {
  createNotificationOperations,
  type AccountNotification,
  type NotificationListOptions,
} from "./notificationOperations";
import type { NotificationType } from "./notificationRules";
import { getAccountSettingsForUser } from "./userSettings";
import {
  StrapiEntity,
  StrapiListResponse,
  StrapiRequestError,
  StrapiSingleResponse,
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
} from "./strapi";

type StrapiNotification = {
  recipientUserId: string;
  type: NotificationType;
  actorUserId?: string | null;
  dealDocumentId?: string | null;
  commentDocumentId?: string | null;
  message: string;
  readAt?: string | null;
  dedupeKey: string;
};

export type { AccountNotification } from "./notificationOperations";

function toAccountNotification(entity: StrapiEntity<StrapiNotification>): AccountNotification {
  const fields = getStrapiEntityFields(entity);

  return {
    id: getStrapiEntityId(entity),
    recipientUserId: fields.recipientUserId,
    type: fields.type,
    actorUserId: fields.actorUserId ?? null,
    dealDocumentId: fields.dealDocumentId ?? null,
    commentDocumentId: fields.commentDocumentId ?? null,
    message: fields.message,
    readAt: fields.readAt ?? null,
    createdAt: entity.createdAt ?? "",
  };
}

const notificationOperations = createNotificationOperations({
  getPreferences: async (userId) => (await getAccountSettingsForUser(userId)).toggles,
  repository: {
    async create(notificationData) {
      const response = await strapiRequest<StrapiSingleResponse<StrapiNotification>>("/api/notifications", {
        method: "POST",
        body: { data: notificationData },
        requireToken: true,
      });

      return response.data ? toAccountNotification(response.data) : null;
    },
    async list(userId, options: NotificationListOptions = {}) {
      const query = new URLSearchParams();
      query.set("filters[recipientUserId][$eq]", userId);
      if (options.unreadOnly) query.set("filters[readAt][$null]", "true");
      query.set("sort", "createdAt:desc");
      query.set("pagination[page]", String(Math.max(options.page ?? 1, 1)));
      query.set("pagination[pageSize]", String(Math.min(Math.max(options.limit ?? 50, 1), 100)));

      const response = await strapiRequest<StrapiListResponse<StrapiNotification>>("/api/notifications", {
        query,
        requireToken: true,
      });

      return response.data.map(toAccountNotification);
    },
    async findForRecipient(userId, notificationId) {
      const query = new URLSearchParams();
      query.set("filters[recipientUserId][$eq]", userId);
      query.set("filters[documentId][$eq]", notificationId);
      query.set("pagination[pageSize]", "1");

      const response = await strapiRequest<StrapiListResponse<StrapiNotification>>("/api/notifications", {
        query,
        requireToken: true,
      });

      return response.data[0] ? toAccountNotification(response.data[0]) : null;
    },
    async updateRead(notificationId, readAt) {
      const response = await strapiRequest<StrapiSingleResponse<StrapiNotification>>(
        `/api/notifications/${notificationId}`,
        {
          method: "PUT",
          body: { data: { readAt } },
          requireToken: true,
        },
      );

      return response.data ? toAccountNotification(response.data) : null;
    },
  },
  isDuplicateError: (error) =>
    error instanceof StrapiRequestError &&
    (error.status === 409 ||
      (error.status === 400 && /unique|duplicate|dedupe/i.test(error.message))),
});

export const {
  createAccountNotification,
  getAccountNotifications,
  markAccountNotificationRead,
} = notificationOperations;
