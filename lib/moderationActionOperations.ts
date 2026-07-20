import { isDealStatus, isValidActionId } from "./actionInputValidation.ts";

export type ModerationDealStatus = "pending" | "approved" | "rejected";

type ModerationDeal = {
  id: string;
  title: string;
  status: ModerationDealStatus;
  authorUserId?: string | null;
  updatedAt?: string;
};

type NotificationInput = {
  recipientUserId: string;
  actorUserId?: string;
  type: "deal_approval" | "saved_deal_update";
  dealDocumentId: string;
  eventVersion?: string;
  message: string;
};

type ModerateDealDependencies = {
  requireAdmin: () => Promise<unknown>;
  getDealById: (id: string) => Promise<ModerationDeal | null>;
  updateDealStatus: (id: string, status: ModerationDealStatus, reason: string) => Promise<unknown>;
  getSavedDealUserIds: (id: string) => Promise<string[]>;
  createNotification: (input: NotificationInput) => Promise<unknown>;
};

type DeleteDealDependencies = {
  requireAdmin: () => Promise<unknown>;
  getUploadedMediaIds: (id: string) => Promise<number[]>;
  deleteDeal: (id: string) => Promise<unknown>;
  deleteUploadedMedia: (fileIds: number[]) => Promise<unknown>;
};

type CommentModerationDependencies = {
  requireAdmin: () => Promise<unknown>;
  mutateComment: (commentId: string) => Promise<{ dealId: string } | null>;
};

export async function moderateDealOperation(
  id: string,
  status: ModerationDealStatus,
  dependencies: ModerateDealDependencies,
) {
  await dependencies.requireAdmin();

  if (!isValidActionId(id) || !isDealStatus(status)) {
    throw new Error("Invalid moderation status.");
  }

  const existingDeal = status === "approved" ? await dependencies.getDealById(id) : null;
  await dependencies.updateDealStatus(id, status, `admin_manual_${status}`);

  if (status !== "approved" || !existingDeal || existingDeal.status === "approved") {
    return;
  }

  if (existingDeal.authorUserId) {
    await dependencies.createNotification({
      recipientUserId: existingDeal.authorUserId,
      type: "deal_approval",
      dealDocumentId: existingDeal.id,
      eventVersion: existingDeal.updatedAt,
      message: `Your deal “${existingDeal.title.slice(0, 140)}” was approved.`,
    }).catch(() => null);
  }

  const savedByUserIds = await dependencies.getSavedDealUserIds(id).catch(() => []);
  await Promise.allSettled(
    savedByUserIds.map((recipientUserId) =>
      dependencies.createNotification({
        recipientUserId,
        actorUserId: existingDeal.authorUserId ?? undefined,
        type: "saved_deal_update",
        dealDocumentId: id,
        eventVersion: existingDeal.updatedAt,
        message: `A saved deal is available again with updates: “${existingDeal.title.slice(0, 140)}”.`,
      }),
    ),
  );
}

export async function deleteDealOperation(id: string, dependencies: DeleteDealDependencies) {
  await dependencies.requireAdmin();

  if (!isValidActionId(id)) {
    throw new Error("Invalid deal id.");
  }

  const uploadedMediaIds = await dependencies.getUploadedMediaIds(id);
  await dependencies.deleteDeal(id);
  await dependencies.deleteUploadedMedia(uploadedMediaIds);
}

export async function moderateCommentOperation(
  commentId: string,
  dependencies: CommentModerationDependencies,
) {
  await dependencies.requireAdmin();

  if (!isValidActionId(commentId)) {
    return { ok: false } as const;
  }

  const result = await dependencies.mutateComment(commentId);

  if (!result) {
    return { ok: false } as const;
  }

  return {
    ok: true,
    dealId: result.dealId,
  } as const;
}
