export const notificationTypes = [
  "new_comment",
  "comment_reply",
  "deal_approval",
  "saved_deal_update",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationPreferenceKey = "newComments" | "commentReplies" | "dealApproval" | "savedDealUpdates";

const preferenceByNotificationType: Record<NotificationType, NotificationPreferenceKey> = {
  new_comment: "newComments",
  comment_reply: "commentReplies",
  deal_approval: "dealApproval",
  saved_deal_update: "savedDealUpdates",
};

export function isNotificationEnabled(
  type: NotificationType,
  preferences?: Partial<Record<NotificationPreferenceKey, boolean>> | null,
) {
  const preference = preferenceByNotificationType[type];
  return typeof preferences?.[preference] === "boolean" ? preferences[preference] : true;
}

export function canReadNotification(recipientUserId: string, requestingUserId: string) {
  return Boolean(recipientUserId && requestingUserId && recipientUserId === requestingUserId);
}

export function createNotificationDedupeKey(input: {
  type: NotificationType;
  recipientUserId: string;
  dealDocumentId?: string;
  commentDocumentId?: string;
  eventVersion?: string;
}) {
  return [
    input.type,
    input.recipientUserId,
    input.dealDocumentId ?? "",
    input.commentDocumentId ?? "",
    input.eventVersion ?? "",
  ].join(":");
}

export function createNotificationStorageData(input: {
  type: NotificationType;
  recipientUserId: string;
  actorUserId?: string;
  dealDocumentId?: string;
  commentDocumentId?: string;
  eventVersion?: string;
  message: string;
}) {
  return {
    recipientUserId: input.recipientUserId,
    type: input.type,
    actorUserId: input.actorUserId,
    dealDocumentId: input.dealDocumentId,
    commentDocumentId: input.commentDocumentId,
    message: input.message,
    dedupeKey: createNotificationDedupeKey(input),
  };
}
