import "server-only";

import type { DealStatus } from "./deals";

export const allowedReportReasons = ["expired", "bad-price", "bad-link", "spam"] as const;
export type ReportReason = (typeof allowedReportReasons)[number];

export const allowedModerationStatuses = ["pending", "approved", "rejected"] as const;

const allowedReportReasonSet = new Set<string>(allowedReportReasons);
const allowedModerationStatusSet = new Set<string>(allowedModerationStatuses);
const actionIdPattern = /^[a-zA-Z0-9_-]{1,128}$/;
const commentMinLength = 3;
const commentMaxLength = 1000;

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

export function validateCommentBody(value: string) {
  const body = value.trim();
  const compactBody = body.replace(/\s+/g, "").toLowerCase();

  if (body.length < commentMinLength) {
    return {
      ok: false as const,
      message: "Your comment is too short.",
      body,
    };
  }

  if (body.length > commentMaxLength) {
    return {
      ok: false as const,
      message: "Your comment is too long.",
      body,
    };
  }

  if (compactBody.length >= 8 && new Set(compactBody).size <= 2) {
    return {
      ok: false as const,
      message: "Please write a more detailed comment.",
      body,
    };
  }

  return {
    ok: true as const,
    body,
  };
}
