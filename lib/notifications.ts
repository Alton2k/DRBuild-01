import "server-only";

import { getAccountSettingsForUser } from "./userSettings";
import { NotificationType, canReadNotification, createNotificationStorageData, isNotificationEnabled } from "./notificationRules";
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

export type AccountNotification = Omit<StrapiNotification, "dedupeKey"> & {
  id: string;
  createdAt: string;
};

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

export async function createAccountNotification(input: {
  recipientUserId: string;
  type: NotificationType;
  actorUserId?: string;
  dealDocumentId?: string;
  commentDocumentId?: string;
  eventVersion?: string;
  message: string;
}) {
  if (!input.recipientUserId || input.recipientUserId === input.actorUserId) {
    return null;
  }

  const settings = await getAccountSettingsForUser(input.recipientUserId);

  if (!isNotificationEnabled(input.type, settings.toggles)) {
    return null;
  }

  const notificationData = createNotificationStorageData(input);

  try {
    const response = await strapiRequest<StrapiSingleResponse<StrapiNotification>>("/api/notifications", {
      method: "POST",
      body: { data: notificationData },
      requireToken: true,
    });

    return response.data ? toAccountNotification(response.data) : null;
  } catch (error) {
    if (
      error instanceof StrapiRequestError &&
      (error.status === 409 || (error.status === 400 && /unique|duplicate|dedupe/i.test(error.message)))
    ) {
      return null;
    }

    throw error;
  }
}

export async function getAccountNotifications(
  userId: string,
  options: { unreadOnly?: boolean; limit?: number; page?: number } = {},
) {
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
}

export async function markAccountNotificationRead(userId: string, notificationId: string, read = true) {
  const query = new URLSearchParams();
  query.set("filters[recipientUserId][$eq]", userId);
  query.set("filters[documentId][$eq]", notificationId);
  query.set("pagination[pageSize]", "1");

  const lookup = await strapiRequest<StrapiListResponse<StrapiNotification>>("/api/notifications", {
    query,
    requireToken: true,
  });
  const existing = lookup.data[0];

  if (!existing || !canReadNotification(getStrapiEntityFields(existing).recipientUserId, userId)) {
    return null;
  }

  const response = await strapiRequest<StrapiSingleResponse<StrapiNotification>>(
    `/api/notifications/${getStrapiEntityId(existing)}`,
    {
      method: "PUT",
      body: { data: { readAt: read ? new Date().toISOString() : null } },
      requireToken: true,
    },
  );

  return response.data ? toAccountNotification(response.data) : null;
}
