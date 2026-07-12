import "server-only";

import type { DealStatus } from "./deals";
export { validateCommentBody } from "./commentValidation";

export const allowedReportReasons = ["expired", "bad-price", "bad-link", "spam"] as const;
export const allowedCommentReportReasons = ["spam", "harassment", "misinformation", "unsafe", "other"] as const;
export type ReportReason = (typeof allowedReportReasons)[number];
export type CommentReportReason = (typeof allowedCommentReportReasons)[number];

export const allowedModerationStatuses = ["pending", "approved", "rejected"] as const;

const allowedReportReasonSet = new Set<string>(allowedReportReasons);
const allowedCommentReportReasonSet = new Set<string>(allowedCommentReportReasons);
const allowedModerationStatusSet = new Set<string>(allowedModerationStatuses);
const actionIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;

export function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function isValidActionId(value: string | undefined | null): value is string {
  return Boolean(value && actionIdPattern.test(value));
}

export function isVoteDirection(value: unknown): value is "up" | "down" {
  return value === "up" || value === "down";
}

export function isReportReason(value: string): value is ReportReason {
  return allowedReportReasonSet.has(value);
}

export function isCommentReportReason(value: string): value is CommentReportReason {
  return allowedCommentReportReasonSet.has(value);
}

export function isDealStatus(value: string): value is DealStatus {
  return allowedModerationStatusSet.has(value);
}

export function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseNonNegativeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseFutureExpiration(value: string) {
  if (!value) {
    return { expiresAt: null, error: "" };
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return { expiresAt: null, error: "Choose a valid expiry date and time." };
  }

  if (parsed.getTime() <= Date.now()) {
    return { expiresAt: null, error: "Expiry should be in the future." };
  }

  return { expiresAt: parsed.toISOString(), error: "" };
}
