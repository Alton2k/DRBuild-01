import { createHash } from "node:crypto";

export function createCommentSubmissionKey(input: {
  dealId: string;
  body: string;
  authorUserId?: string | null;
  authorViewerId?: string | null;
}) {
  const identity = input.authorUserId
    ? `user:${input.authorUserId}`
    : input.authorViewerId
      ? `viewer:${input.authorViewerId}`
      : "";
  if (!identity) return undefined;
  return createHash("sha256").update(`${input.dealId}\u0000${identity}\u0000${input.body}`).digest("hex");
}

export function resolveCreatedCommentDealId(
  deal: { documentId?: string; id?: number } | null | undefined,
  submittedDealId: string,
) {
  return deal?.documentId ?? (deal?.id == null ? submittedDealId : String(deal.id));
}
