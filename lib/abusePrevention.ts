import "server-only";

import { cookies, headers } from "next/headers";

export type AbuseAction = "vote" | "report" | "comment" | "password";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const anonymousViewerIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const oneYearSeconds = 60 * 60 * 24 * 365;
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export const commentViewerCookieName = "dealmy_comment_viewer_id";
export const dealViewerCookieName = "dealmy_deal_viewer_id";

export function hashRateLimitPart(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(index) | 0;
  }

  return Math.abs(hash).toString(36);
}

function getRateLimitKey(action: AbuseAction, viewerId: string, ip: string) {
  return `${action}:viewer:${hashRateLimitPart(viewerId)}:ip:${hashRateLimitPart(ip || "unknown")}`;
}

function getIpRateLimitKey(action: AbuseAction, ip: string) {
  return `${action}:ip:${hashRateLimitPart(ip || "unknown")}`;
}

function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });

    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  return true;
}

export function checkViewerAndIpRateLimit(
  action: AbuseAction,
  viewerId: string,
  ip: string,
  limit: number,
  windowSeconds: number,
) {
  return (
    checkRateLimit(getRateLimitKey(action, viewerId, ip), limit, windowSeconds) &&
    checkRateLimit(getIpRateLimitKey(action, ip), limit, windowSeconds)
  );
}

export function logAbuseEvent(
  action: AbuseAction,
  reason: string,
  context: { viewerId?: string; ip?: string; dealId?: string; commentId?: string },
) {
  console.warn("Abuse prevention event", {
    action,
    reason,
    dealId: context.dealId,
    commentId: context.commentId,
    viewer: context.viewerId ? hashRateLimitPart(context.viewerId) : undefined,
    ip: context.ip ? hashRateLimitPart(context.ip) : undefined,
  });
}

export async function getClientIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for") ?? "";
  const firstForwardedIp = forwardedFor.split(",")[0]?.trim();

  return firstForwardedIp || headerStore.get("x-real-ip")?.trim() || "unknown";
}

export function isValidAnonymousViewerId(value: string | undefined): value is string {
  return Boolean(value && anonymousViewerIdPattern.test(value));
}

async function getOrCreateAnonymousViewerId(cookieName: string) {
  const cookieStore = await cookies();
  const existingViewerId = cookieStore.get(cookieName)?.value;

  if (isValidAnonymousViewerId(existingViewerId)) {
    return existingViewerId;
  }

  const viewerId = crypto.randomUUID();

  cookieStore.set(cookieName, viewerId, {
    httpOnly: true,
    maxAge: oneYearSeconds,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return viewerId;
}

export function getOrCreateCommentViewerId() {
  return getOrCreateAnonymousViewerId(commentViewerCookieName);
}

export function getOrCreateDealViewerId() {
  return getOrCreateAnonymousViewerId(dealViewerCookieName);
}
