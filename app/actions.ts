"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createDeal,
  deleteDeal,
  findDuplicateDeal,
  getAuthorDealModerationStats,
  getDealById,
  hasDealReportForViewer,
  markDealExpired,
  reportDeal,
  restoreReportedDeal,
  updateDealStatus,
  voteDeal,
  type DealStatus,
} from "@/lib/deals";
import { createComment, deleteComment, deleteOwnComment, hasDuplicateComment, likeComment } from "@/lib/comments";
import {
  getCurrentUser,
  getPublicUserDisplayName,
  isAdminUser,
  requireAdminUser,
  requireCurrentUser,
} from "@/lib/auth";
import { followUser, isFollowingUser, unfollowUser } from "@/lib/follows";
import { saveDealForUser, unsaveDealForUser } from "@/lib/savedDeals";
import { getAccountSettingsForUser } from "@/lib/userSettings";
import { getDescriptionText, sanitizeDescriptionHtml } from "@/lib/description";
import { validateDealUrl } from "@/lib/dealUrlSecurity";
import {
  checkViewerAndIpRateLimit,
  commentViewerCookieName,
  getClientIp,
  getOrCreateCommentViewerId,
  getOrCreateDealViewerId,
  logAbuseEvent,
} from "@/lib/abusePrevention";
import {
  getString,
  isDealStatus,
  isReportReason,
  isValidActionId,
  isVoteDirection,
  parseFutureExpiration,
  parseNonNegativeNumber,
  parsePositiveNumber,
  validateCommentBody,
} from "@/lib/serverActionValidation";
import type { DealActionState } from "./dealActionState";

export type VoteDirection = "up" | "down";

export interface DuplicateDealCheckResult {
  ok: boolean;
  message: string;
  match?: {
    id: string;
    title: string;
    store: string;
    status: DealStatus;
    reason: string;
  };
}

export type ReportDealActionState = {
  ok: boolean;
  message: string;
};

export type CommentActionState = {
  ok: boolean;
  message: string;
};

export type SaveDealActionResult = {
  ok: boolean;
  isSaved: boolean;
  message?: string;
  loginRequired?: boolean;
};

export type FollowActionResult = {
  ok: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  message?: string;
  loginRequired?: boolean;
};

const trustedAuthorApprovedDealThreshold = 3;
const suspiciousShortDescriptionLength = 40;
const suspiciousTitleLength = 12;
const blockedDealTerms = [
  "18+",
  "adult",
  "casino",
  "gambling",
  "nude",
  "porn",
  "sex",
  "xxx",
];
const suspiciousDealTerms = [
  "free money",
  "guaranteed profit",
  "miracle cure",
  "no risk",
  "weight loss pill",
];
const suspiciousHostFragments = [
  "bit.ly",
  "cutt.ly",
  "is.gd",
  "tinyurl.com",
  "t.me",
  "telegram.me",
];

const emptyFollowCounts = { followers: 0, following: 0 };

function normalizeOptionalImageUrl(value: string, baseUrl: string) {
  if (!value) {
    return "";
  }

  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(value)) {
    return value.length <= 1_500_000 ? value : "";
  }

  try {
    const parsed = value.startsWith("//")
      ? new URL(`https:${value}`)
      : new URL(value, baseUrl);

    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function normalizeImageGalleryUrls(value: string, baseUrl: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === "string" ? normalizeOptionalImageUrl(item, baseUrl) : ""))
      .filter((item): item is string => Boolean(item))
      .slice(0, 5);
  } catch {
    return [];
  }
}

function getDealText(input: {
  title: string;
  description: string;
  store: string;
  category: string;
  subCategory: string;
}) {
  return [
    input.title,
    input.description,
    input.store,
    input.category,
    input.subCategory,
  ].join(" ").toLowerCase();
}

function getUrlHostname(value: string) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function getAutomatedModerationSignals(input: {
  title: string;
  description: string;
  store: string;
  category: string;
  subCategory: string;
  url: string;
  hasImage: boolean;
}) {
  const text = getDealText(input);
  const hostname = getUrlHostname(input.url);
  const signals: string[] = [];
  const hasBlockedTerm = blockedDealTerms.some((term) => text.includes(term));
  const hasSuspiciousTerm = suspiciousDealTerms.some((term) => text.includes(term));
  const hasSuspiciousHost = suspiciousHostFragments.some((host) => hostname === host || hostname.endsWith(`.${host}`));

  if (hasBlockedTerm) {
    signals.push("adult_or_restricted_keyword");
  }

  if (hasSuspiciousTerm) {
    signals.push("suspicious_marketing_claim");
  }

  if (hasSuspiciousHost) {
    signals.push("shortened_or_chat_link");
  }

  if (input.title.trim().length < suspiciousTitleLength) {
    signals.push("short_title");
  }

  if (input.description.trim().length < suspiciousShortDescriptionLength) {
    signals.push("short_description");
  }

  if (!input.hasImage) {
    signals.push("missing_product_image");
  }

  return signals;
}

function getPrimaryModerationSignal(signals: string[]) {
  if (signals.includes("adult_or_restricted_keyword")) {
    return "restricted_content_manual_review";
  }

  if (signals.includes("shortened_or_chat_link")) {
    return "suspicious_link_manual_review";
  }

  if (signals.includes("suspicious_marketing_claim")) {
    return "suspicious_claim_manual_review";
  }

  if (signals.includes("missing_product_image")) {
    return "missing_image_manual_review";
  }

  if (signals.length > 0) {
    return "quality_manual_review";
  }

  return "";
}

async function getInitialDealModeration(input: {
  authorUserId: string;
  isAdmin: boolean;
  hasDuplicateWarning: boolean;
  automatedSignals: string[];
}) {
  if (input.hasDuplicateWarning) {
    return {
      status: "pending" as DealStatus,
      reason: "duplicate_manual_review",
    };
  }

  const primarySignal = getPrimaryModerationSignal(input.automatedSignals);

  if (primarySignal) {
    return {
      status: "pending" as DealStatus,
      reason: primarySignal,
    };
  }

  if (input.isAdmin) {
    return {
      status: "approved" as DealStatus,
      reason: "admin_auto_approved",
    };
  }

  const stats = await getAuthorDealModerationStats(input.authorUserId);

  if (
    stats.approvedCount >= trustedAuthorApprovedDealThreshold &&
    stats.rejectedCount === 0
  ) {
    return {
      status: "approved" as DealStatus,
      reason: "trusted_user_auto_approved",
    };
  }

  if (stats.rejectedCount > 0) {
    return {
      status: "pending" as DealStatus,
      reason: "previous_rejection_manual_review",
    };
  }

  return {
    status: "pending" as DealStatus,
    reason: "new_user_manual_review",
  };
}

export async function createDealAction(
  _previousState: DealActionState,
  formData: FormData,
): Promise<DealActionState> {
  let user;
  try {
    user = await requireCurrentUser();
  } catch {
    return {
      ok: false,
      message: "Please log in before posting a deal.",
    };
  }

  const title = getString(formData, "title");
  const url = getString(formData, "url");
  const priceValue = getString(formData, "price");
  const originalPriceValue = getString(formData, "originalPrice");
  const shippingMode = getString(formData, "shippingMode");
  const shippingCostValue = getString(formData, "shippingCost");
  const store = getString(formData, "store");
  const category = getString(formData, "category");
  const subCategory = getString(formData, "subCategory");
  const expiresAtValue = getString(formData, "expiresAt");
  const description = sanitizeDescriptionHtml(getString(formData, "description"));
  const descriptionText = getDescriptionText(description);
  const rawImageUrl = getString(formData, "imageUrl");
  const rawUploadedImageUrl = getString(formData, "uploadedImageUrl");
  const rawImageGalleryUrls = getString(formData, "imageGalleryUrls");

  const errors: DealActionState["errors"] = {};
  const price = parsePositiveNumber(priceValue);
  const originalPrice = originalPriceValue ? parsePositiveNumber(originalPriceValue) : null;
  const hasFreeShipping = shippingMode !== "paid";
  const shippingCost = hasFreeShipping ? 0 : parseNonNegativeNumber(shippingCostValue);
  const expiration = parseFutureExpiration(expiresAtValue);

  if (!title) {
    errors.title = "Deal title is required.";
  }

  const urlValidation = url ? validateDealUrl(url) : null;

  if (!url) {
    errors.url = "Deal URL is required.";
  } else if (!urlValidation?.ok) {
    errors.url = urlValidation?.error ?? "Enter a valid URL starting with http:// or https://.";
  }

  if (price === null) {
    errors.price = "Price must be greater than 0.";
  }

  if (originalPriceValue && originalPrice === null) {
    errors.originalPrice = "Original price must be a positive number.";
  } else if (price !== null && originalPrice !== null && originalPrice <= price) {
    errors.originalPrice = "Original price should be higher than current price.";
  }

  if (!hasFreeShipping && shippingCost === null) {
    errors.shippingCost = "Shipping cost must be 0 or more.";
  }

  if (!store) {
    errors.store = "Store or availability is required.";
  }

  if (!category) {
    errors.category = "Category is required.";
  }

  if (expiration.error) {
    errors.expiresAt = expiration.error;
  }

  if (!descriptionText) {
    errors.description = "Description is required.";
  }

  if (Object.keys(errors).length > 0 || price === null) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors,
    };
  }

  const normalizedUrl = urlValidation?.ok ? urlValidation.url : url;
  const imageGalleryUrls = normalizeImageGalleryUrls(rawImageGalleryUrls, normalizedUrl);
  const uploadedImageUrl = imageGalleryUrls[0] ?? normalizeOptionalImageUrl(rawUploadedImageUrl, normalizedUrl);
  const imageUrl = uploadedImageUrl || normalizeOptionalImageUrl(rawImageUrl, normalizedUrl);
  const duplicateMatch = await findDuplicateDeal({ title, url: normalizedUrl, store });
  const automatedSignals = getAutomatedModerationSignals({
    title,
    description: descriptionText,
    store,
    category,
    subCategory,
    url: normalizedUrl,
    hasImage: Boolean(imageUrl || uploadedImageUrl || imageGalleryUrls.length > 0),
  });
  const moderation = await getInitialDealModeration({
    authorUserId: user.id,
    isAdmin: isAdminUser(user),
    hasDuplicateWarning: Boolean(duplicateMatch),
    automatedSignals,
  });

  let deal;
  try {
    deal = await createDeal({
      title,
      url: normalizedUrl,
      price,
      originalPrice,
      hasFreeShipping,
      shippingCost,
      store,
      category,
      subCategory,
      expiredAt: expiration.expiresAt,
      description,
      imageUrl,
      uploadedImageUrl,
      imageGalleryUrls,
      status: moderation.status,
      moderationReason: moderation.reason,
      duplicateOfDealId: duplicateMatch?.deal.id,
      duplicateReason: duplicateMatch?.reason || automatedSignals.join(", "),
      authorUserId: user.id,
      authorEmail: user.email ?? "",
      authorName:
        (typeof user.user_metadata.name === "string" && user.user_metadata.name) ||
        (typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name) ||
        user.email ||
        "community",
    });
  } catch (error) {
    console.error("Could not create deal", error);
    return {
      ok: false,
      message: "Could not create the deal right now. Please try again.",
    };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return {
    ok: true,
    message:
      moderation.status === "approved"
        ? "Deal posted and published automatically."
        : duplicateMatch
          ? "Deal submitted for moderation with a possible duplicate warning for admins to review."
          : automatedSignals.length > 0
            ? "Deal submitted for moderation because automated checks found something for admins to review."
          : "Deal submitted for moderation. Approve it in admin to publish it.",
    dealId: deal.id,
  };
}

export async function checkDuplicateDealAction(input: {
  title: string;
  url: string;
  store: string;
}): Promise<DuplicateDealCheckResult> {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const url = typeof input.url === "string" ? input.url.trim() : "";
  const store = typeof input.store === "string" ? input.store.trim() : "";
  const urlValidation = url ? validateDealUrl(url) : null;

  if (!url || !urlValidation?.ok) {
    return {
      ok: true,
      message: "",
    };
  }

  const duplicateMatch = await findDuplicateDeal({ title, url: urlValidation.url, store });

  if (!duplicateMatch) {
    return {
      ok: true,
      message: "No obvious duplicate found.",
    };
  }

  return {
    ok: false,
    message: "This may already be in the queue or live on the site.",
    match: {
      id: duplicateMatch.deal.id,
      title: duplicateMatch.deal.title,
      store: duplicateMatch.deal.store,
      status: duplicateMatch.deal.status,
      reason: duplicateMatch.reason,
    },
  };
}

export async function moderateDealAction(id: string, status: DealStatus) {
  await requireAdminUser();

  if (!isValidActionId(id) || !isDealStatus(status)) {
    throw new Error("Invalid moderation status.");
  }

  await updateDealStatus(id, status, `admin_manual_${status}`);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function markDealExpiredAction(id: string) {
  await requireAdminUser();

  if (!isValidActionId(id)) {
    throw new Error("Invalid deal id.");
  }

  await markDealExpired(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function reportDealAction(
  id: string,
  _previousState: ReportDealActionState,
  formData: FormData,
): Promise<ReportDealActionState> {
  if (!isValidActionId(id)) {
    return {
      ok: false,
      message: "Could not report this deal right now. Please try again.",
    };
  }

  const reason = getString(formData, "reason");

  if (!isReportReason(reason)) {
    return {
      ok: false,
      message: "Please choose a report reason.",
    };
  }

  const viewerId = await getOrCreateDealViewerId();
  const ip = await getClientIp();

  if (!checkViewerAndIpRateLimit("report", viewerId, ip, 5, 60 * 60)) {
    logAbuseEvent("report", "rate_limited", { viewerId, ip, dealId: id });
    return {
      ok: false,
      message: "You’re reporting too quickly. Please try again later.",
    };
  }

  if (await hasDealReportForViewer(id, viewerId)) {
    logAbuseEvent("report", "duplicate_report", { viewerId, ip, dealId: id });
    return {
      ok: false,
      message: "You’ve already reported this deal. Thanks for helping keep the community safe.",
    };
  }

  const result = await reportDeal(id, viewerId, reason);

  if (!result) {
    return {
      ok: false,
      message: "Could not report this deal right now. Please try again.",
    };
  }

  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);

  return {
    ok: result.didReport,
    message: result.didReport
      ? "Thanks for the report. Our moderators will take a look."
      : "You’ve already reported this deal. Thanks for helping keep the community safe.",
  };
}

export async function restoreReportedDealAction(id: string) {
  await requireAdminUser();

  if (!isValidActionId(id)) {
    throw new Error("Invalid deal id.");
  }

  await restoreReportedDeal(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function voteDealAction(
  id: string,
  direction: VoteDirection,
) {
  if (!isValidActionId(id) || !isVoteDirection(direction)) {
    return {
      ok: false,
      score: 0,
      viewerVote: null,
      message: "Could not save your vote right now. Please try again.",
    };
  }

  const deal = await getDealById(id);

  if (!deal) {
    return {
      ok: false,
      score: 0,
      viewerVote: null,
      message: "Could not find this deal. Please refresh and try again.",
    };
  }

  if (deal.isExpired) {
    return {
      ok: false,
      score: deal.score,
      viewerVote: null,
      message: "Voting is closed because this deal has expired.",
    };
  }

  const viewerId = await getOrCreateDealViewerId();
  const ip = await getClientIp();

  // TODO: Consider a LOGIN_REQUIRED_FOR_VOTING feature flag once public usage grows.
  if (!checkViewerAndIpRateLimit("vote", viewerId, ip, 30, 10 * 60)) {
    logAbuseEvent("vote", "rate_limited", { viewerId, ip, dealId: id });

    return {
      ok: false,
      score: 0,
      viewerVote: null,
      message: "You’re voting too quickly. Please try again later.",
    };
  }

  const result = await voteDeal(id, viewerId, direction);

  if (!result) {
    return {
      ok: false,
      score: 0,
      viewerVote: null,
      message: "Could not save your vote right now. Please try again.",
    };
  }

  revalidatePath("/");
  revalidatePath(`/deal/${id}`);

  return {
    ok: true,
    score: result.deal.score,
    viewerVote: result.viewerVote,
  };
}

export async function deleteDealAction(id: string) {
  await requireAdminUser();

  if (!isValidActionId(id)) {
    throw new Error("Invalid deal id.");
  }

  await deleteDeal(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createCommentAction(
  dealId: string,
  _previousState: CommentActionState,
  formData: FormData,
): Promise<CommentActionState> {
  if (!isValidActionId(dealId)) {
    return {
      ok: false,
      message: "Could not find this deal. Please refresh and try again.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      message: "Please log in to comment.",
    };
  }

  const fallbackAuthorName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email ?? "Deal Rakyat member";
  const authorSettings = await getAccountSettingsForUser(user.id, fallbackAuthorName).catch(() => null);
  const authorName = authorSettings?.profile.userName || fallbackAuthorName;
  const commentValidation = validateCommentBody(getString(formData, "body"));
  const parentId = getString(formData, "parentId") || null;

  if (parentId && !isValidActionId(parentId)) {
    return {
      ok: false,
      message: "Could not post this reply. Please refresh and try again.",
    };
  }

  if (!commentValidation.ok) {
    return {
      ok: false,
      message: commentValidation.message,
    };
  }

  const deal = await getDealById(dealId);

  if (!deal) {
    return {
      ok: false,
      message: "Could not find this deal. Please refresh and try again.",
    };
  }

  if (deal.isExpired) {
    return {
      ok: false,
      message: "Comments are closed because this deal has expired.",
    };
  }

  const viewerId = await getOrCreateCommentViewerId();
  const ip = await getClientIp();

  if (!checkViewerAndIpRateLimit("comment", viewerId, ip, 10, 10 * 60)) {
    logAbuseEvent("comment", "rate_limited", { viewerId, ip, dealId });

    return {
      ok: false,
      message: "You’re commenting too quickly. Please try again later.",
    };
  }

  if (await hasDuplicateComment(dealId, viewerId, commentValidation.body)) {
    logAbuseEvent("comment", "duplicate_comment", { viewerId, ip, dealId });

    return {
      ok: false,
      message: "You’ve already posted that comment.",
    };
  }

  await createComment({
    dealId,
    parentId,
    authorViewerId: viewerId,
    authorUserId: user.id,
    authorName,
    body: commentValidation.body,
  });

  revalidatePath("/");
  revalidatePath(`/deal/${dealId}`);
  revalidatePath("/profile");

  return {
    ok: true,
    message: "Comment posted.",
  };
}

export async function likeCommentAction(dealId: string, commentId: string) {
  if (!isValidActionId(dealId) || !isValidActionId(commentId)) {
    return {
      ok: false,
      likeCount: 0,
      viewerHasLiked: false,
    };
  }

  const deal = await getDealById(dealId);

  if (!deal || deal.isExpired) {
    return {
      ok: false,
      likeCount: 0,
      viewerHasLiked: false,
    };
  }

  const viewerId = await getOrCreateCommentViewerId();
  const result = await likeComment(dealId, commentId, viewerId);

  if (!result) {
    return {
      ok: false,
      likeCount: 0,
      viewerHasLiked: false,
    };
  }

  if (result.didChange) {
    revalidatePath(`/deal/${dealId}`);
  }

  return {
    ok: true,
    likeCount: result.comment.likeCount,
    viewerHasLiked: result.viewerHasLiked,
  };
}

export async function deleteOwnCommentAction(dealId: string, commentId: string) {
  if (!isValidActionId(dealId) || !isValidActionId(commentId)) {
    return { ok: false };
  }

  const cookieStore = await cookies();
  const viewerId = cookieStore.get(commentViewerCookieName)?.value;
  const user = await getCurrentUser();

  if (!viewerId && !user) {
    return { ok: false };
  }

  const result = await deleteOwnComment(commentId, {
    viewerId,
    authorUserId: user?.id,
  });

  if (!result || result.dealId !== dealId) {
    return { ok: false };
  }

  revalidatePath("/");
  revalidatePath(`/deal/${dealId}`);
  revalidatePath("/profile");

  return { ok: true };
}

export async function toggleSavedDealAction(
  dealId: string,
  shouldSave: boolean,
): Promise<SaveDealActionResult> {
  if (!isValidActionId(dealId) || typeof shouldSave !== "boolean") {
    return {
      ok: false,
      isSaved: false,
      message: "Could not update this saved deal. Please try again.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      isSaved: false,
      loginRequired: true,
      message: "Please log in to save deals.",
    };
  }

  const deal = await getDealById(dealId);

  if (!deal || deal.status !== "approved") {
    return {
      ok: false,
      isSaved: false,
      message: "This deal is not available to save.",
    };
  }

  try {
    const isSaved = shouldSave
      ? await saveDealForUser(user.id, deal.id)
      : await unsaveDealForUser(user.id, deal.id);

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath(`/deal/${deal.id}`);

    return { ok: true, isSaved };
  } catch {
    return {
      ok: false,
      isSaved: !shouldSave,
      message: "Could not update this saved deal. Please try again.",
    };
  }
}

export async function toggleFollowUserAction(
  followingUserId: string,
  shouldFollow: boolean,
): Promise<FollowActionResult> {
  const targetUserId = typeof followingUserId === "string" ? followingUserId.trim() : "";

  if (!targetUserId || typeof shouldFollow !== "boolean") {
    return {
      ok: false,
      isFollowing: false,
      followerCount: 0,
      followingCount: 0,
      message: "Could not update this follow. Please try again.",
    };
  }

  const user = await getCurrentUser();

  if (!user) {
    return {
      ok: false,
      isFollowing: false,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      loginRequired: true,
      message: "Please log in to follow members.",
    };
  }

  if (user.id === targetUserId) {
    return {
      ok: false,
      isFollowing: false,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      message: "You cannot follow yourself.",
    };
  }

  const currentFollowingPromise = isFollowingUser(user.id, targetUserId).catch(() => false);

  if (!shouldFollow) {
    try {
      const isFollowing = await unfollowUser(user.id, targetUserId);

      revalidatePath("/profile");
      revalidatePath(`/profile/${targetUserId}`);

      return {
        ok: true,
        isFollowing,
        followerCount: emptyFollowCounts.followers,
        followingCount: emptyFollowCounts.following,
      };
    } catch {
      return {
        ok: false,
        isFollowing: await currentFollowingPromise,
        followerCount: emptyFollowCounts.followers,
        followingCount: emptyFollowCounts.following,
        message: "Could not update this follow. Please try again.",
      };
    }
  }

  const [currentFollowing, fallbackDisplayName, settings] = await Promise.all([
    currentFollowingPromise,
    getPublicUserDisplayName(targetUserId),
    getAccountSettingsForUser(targetUserId, "").catch(() => null),
  ]);

  if (!fallbackDisplayName) {
    return {
      ok: false,
      isFollowing: currentFollowing,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      message: "This profile is not available to follow.",
    };
  }

  if (!settings?.toggles.publicProfile) {
    return {
      ok: false,
      isFollowing: currentFollowing,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      message: "This profile is not available to follow.",
    };
  }

  if (shouldFollow && !settings.toggles.allowFollowers) {
    return {
      ok: false,
      isFollowing: currentFollowing,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      message: "This member is not accepting followers.",
    };
  }

  try {
    const isFollowing = await followUser(user.id, targetUserId);

    revalidatePath("/profile");
    revalidatePath(`/profile/${targetUserId}`);

    return {
      ok: true,
      isFollowing,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
    };
  } catch {
    return {
      ok: false,
      isFollowing: currentFollowing,
      followerCount: emptyFollowCounts.followers,
      followingCount: emptyFollowCounts.following,
      message: "Could not update this follow. Please try again.",
    };
  }
}

export async function deleteCommentAsAdminAction(commentId: string) {
  await requireAdminUser();

  if (!isValidActionId(commentId)) {
    return { ok: false };
  }

  const result = await deleteComment(commentId);

  if (!result) {
    return { ok: false };
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${result.dealId}`);

  return {
    ok: true,
    dealId: result.dealId,
  };
}
