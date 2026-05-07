"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  createDeal,
  deleteDeal,
  findDuplicateDeal,
  getAuthorDealModerationStats,
  getDealById,
  markDealExpired,
  reportDeal,
  restoreReportedDeal,
  updateDealStatus,
  voteDeal,
  type DealStatus,
} from "@/lib/deals";
import { createComment, deleteComment, deleteOwnComment, likeComment } from "@/lib/comments";
import { isAdminUser, requireAdminUser, requireCurrentUser } from "@/lib/auth";
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

const commentViewerCookieName = "dealmy_comment_viewer_id";
const dealViewerCookieName = "dealmy_deal_viewer_id";
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

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

async function getOrCreateCommentViewerId() {
  const cookieStore = await cookies();
  const existingViewerId = cookieStore.get(commentViewerCookieName)?.value;

  if (existingViewerId) {
    return existingViewerId;
  }

  const viewerId = crypto.randomUUID();

  cookieStore.set(commentViewerCookieName, viewerId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });

  return viewerId;
}

async function getOrCreateDealViewerId() {
  const cookieStore = await cookies();
  const existingViewerId = cookieStore.get(dealViewerCookieName)?.value;

  if (existingViewerId) {
    return existingViewerId;
  }

  const viewerId = crypto.randomUUID();

  cookieStore.set(dealViewerCookieName, viewerId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });

  return viewerId;
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
  const store = getString(formData, "store");
  const category = getString(formData, "category");
  const subCategory = getString(formData, "subCategory");
  const description = getString(formData, "description");
  const rawImageUrl = getString(formData, "imageUrl");
  const rawUploadedImageUrl = getString(formData, "uploadedImageUrl");
  const rawImageGalleryUrls = getString(formData, "imageGalleryUrls");

  const errors: DealActionState["errors"] = {};
  const price = parsePositiveNumber(priceValue);
  const originalPrice = originalPriceValue ? parsePositiveNumber(originalPriceValue) : null;

  if (!title) {
    errors.title = "Deal title is required.";
  }

  if (!url) {
    errors.url = "Deal URL is required.";
  } else if (!isValidHttpUrl(url)) {
    errors.url = "Enter a valid URL starting with http:// or https://.";
  }

  if (price === null) {
    errors.price = "Price must be greater than 0.";
  }

  if (originalPriceValue && originalPrice === null) {
    errors.originalPrice = "Original price must be a positive number.";
  } else if (price !== null && originalPrice !== null && originalPrice <= price) {
    errors.originalPrice = "Original price should be higher than current price.";
  }

  if (!store) {
    errors.store = "Store or availability is required.";
  }

  if (!category) {
    errors.category = "Category is required.";
  }

  if (!description) {
    errors.description = "Description is required.";
  }

  if (Object.keys(errors).length > 0 || price === null) {
    return {
      ok: false,
      message: "Please fix the highlighted fields.",
      errors,
    };
  }

  const imageGalleryUrls = normalizeImageGalleryUrls(rawImageGalleryUrls, url);
  const uploadedImageUrl = imageGalleryUrls[0] ?? normalizeOptionalImageUrl(rawUploadedImageUrl, url);
  const imageUrl = uploadedImageUrl || normalizeOptionalImageUrl(rawImageUrl, url);
  const duplicateMatch = await findDuplicateDeal({ title, url, store });
  const automatedSignals = getAutomatedModerationSignals({
    title,
    description,
    store,
    category,
    subCategory,
    url,
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
      url,
      price,
      originalPrice,
      store,
      category,
      subCategory,
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
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not create the deal in Strapi.",
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
  const title = input.title.trim();
  const url = input.url.trim();
  const store = input.store.trim();

  if (!title || !url || !store || !isValidHttpUrl(url)) {
    return {
      ok: true,
      message: "",
    };
  }

  const duplicateMatch = await findDuplicateDeal({ title, url, store });

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

  if (!["pending", "approved", "rejected"].includes(status)) {
    throw new Error("Invalid moderation status.");
  }

  await updateDealStatus(id, status, `admin_manual_${status}`);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function markDealExpiredAction(id: string) {
  await requireAdminUser();

  await markDealExpired(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function reportDealAction(id: string, formData: FormData) {
  const reason = getString(formData, "reason");

  if (!reason) {
    return;
  }

  const viewerId = await getOrCreateDealViewerId();
  await reportDeal(id, viewerId, reason);
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function restoreReportedDealAction(id: string) {
  await requireAdminUser();

  await restoreReportedDeal(id);
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/deal/${id}`);
}

export async function voteDealAction(
  id: string,
  direction: VoteDirection,
) {
  if (!["up", "down"].includes(direction)) {
    throw new Error("Invalid vote direction.");
  }

  const viewerId = await getOrCreateDealViewerId();
  const result = await voteDeal(id, viewerId, direction);

  if (!result) {
    return {
      ok: false,
      score: 0,
      viewerVote: null,
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

  await deleteDeal(id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function createCommentAction(dealId: string, formData: FormData): Promise<void> {
  const authorName = getString(formData, "authorName");
  const body = getString(formData, "body");
  const parentId = getString(formData, "parentId") || null;

  if (!authorName || !body) {
    return;
  }

  const deal = await getDealById(dealId);

  if (!deal) {
    return;
  }

  const viewerId = await getOrCreateCommentViewerId();

  await createComment({
    dealId,
    parentId,
    authorViewerId: viewerId,
    authorName,
    body,
  });

  revalidatePath(`/deal/${dealId}`);
}

export async function likeCommentAction(dealId: string, commentId: string) {
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
  const cookieStore = await cookies();
  const viewerId = cookieStore.get(commentViewerCookieName)?.value;

  if (!viewerId) {
    return { ok: false };
  }

  const result = await deleteOwnComment(commentId, viewerId);

  if (!result || result.dealId !== dealId) {
    return { ok: false };
  }

  revalidatePath("/");
  revalidatePath(`/deal/${dealId}`);

  return { ok: true };
}

export async function deleteCommentAsAdminAction(commentId: string) {
  await requireAdminUser();

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
