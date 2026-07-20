import "server-only";

import {
  getStrapiEntityFields,
  getStrapiEntityId,
  StrapiRequestError,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";
import { dataFetchErrorResult, logDataFetchError, type DataResult } from "./dataResult";
import { isDealExpiredByDate } from "./deals";
import { isCommentOwnedBy } from "./commentOwnership";
import { getCommentTreeDeleteOrder } from "./commentTree";
import { createCommentSubmissionKey, resolveCreatedCommentDealId } from "./commentSubmission";

export interface Comment {
  id: string;
  dealId: string;
  parentId: string | null;
  authorViewerId: string | null;
  authorUserId: string | null;
  authorName: string;
  body: string;
  likeCount: number;
  likedBy: string[];
  createdAt: string;
  editedAt: string | null;
  reportCount: number;
}

export interface NewCommentInput {
  dealId: string;
  parentId?: string | null;
  authorViewerId?: string | null;
  authorUserId?: string | null;
  authorName: string;
  body: string;
}

export interface AdminComment {
  id: string;
  dealId: string;
  dealTitle: string;
  parentId: string | null;
  authorName: string;
  body: string;
  likeCount: number;
  createdAt: string;
  reportCount: number;
  reportReasons: string[];
}

export interface ProfileComment {
  id: string;
  dealId: string;
  dealTitle: string;
  dealStatus: "pending" | "approved" | "rejected";
  dealIsExpired: boolean;
  dealExpiredAt?: string;
  dealPrice: number;
  dealCategory: string;
  dealSubCategory: string;
  dealImageUrl: string;
  dealUploadedImageUrl: string;
  dealImageGalleryUrls: string[];
  dealAvailable: boolean;
  body: string;
  likeCount: number;
  viewerHasLiked: boolean;
  canDelete: boolean;
  createdAt: string;
  editedAt: string | null;
}

export type CommentListResult = DataResult<Comment[]>;
export type AdminCommentListResult = DataResult<AdminComment[]>;
export type ProfileCommentListResult = DataResult<ProfileComment[]>;
export type DealCommentCountListResult = DataResult<DealCommentCount[]>;

export interface DealCommentCount {
  dealId: string;
  count: number;
  dealCreatedAt: string;
}

type StrapiComment = Omit<Comment, "id" | "dealId" | "createdAt"> & {
  createdAt?: string;
  deal?: {
    id?: number;
    documentId?: string;
    title?: string;
    attributes?: {
      title?: string;
      moderationStatus?: "pending" | "approved" | "rejected";
      createdAt?: string;
      price?: number | string;
      category?: string;
      subCategory?: string;
      imageUrl?: string;
      uploadedImageUrl?: string;
      imageGalleryUrls?: string[];
      isExpired?: boolean;
      expiredAt?: string | null;
    };
    moderationStatus?: "pending" | "approved" | "rejected";
    createdAt?: string;
    price?: number | string;
    category?: string;
    subCategory?: string;
    imageUrl?: string;
    uploadedImageUrl?: string;
    imageGalleryUrls?: string[];
    isExpired?: boolean;
    expiredAt?: string | null;
  };
};

type StrapiCommentReport = {
  commentDocumentId?: string;
  viewerId?: string;
  reason?: string;
};

function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function toComment(
  entity: Parameters<typeof getStrapiEntityFields<StrapiComment>>[0],
  fallbackDealId = "",
): Comment {
  const fields = getStrapiEntityFields(entity);
  const deal = fields.deal;

  return {
    id: getStrapiEntityId(entity),
    dealId: resolveCreatedCommentDealId(deal, fallbackDealId),
    parentId: fields.parentId ?? null,
    authorViewerId: fields.authorViewerId ?? null,
    authorUserId: fields.authorUserId ?? null,
    authorName: fields.authorName ?? "",
    body: fields.body ?? "",
    likeCount: fields.likeCount ?? 0,
    likedBy: Array.isArray(fields.likedBy) ? fields.likedBy : [],
    createdAt: fields.createdAt ?? new Date().toISOString(),
    editedAt: fields.editedAt ?? null,
    reportCount: fields.reportCount ?? 0,
  };
}

export async function getCommentsForDealResult(dealId: string): Promise<CommentListResult> {
  const query = new URLSearchParams({
    "filters[deal][documentId][$eq]": dealId,
    sort: "createdAt:asc",
    populate: "deal",
  });

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

    return { ok: true, data: response.data.map((entity) => toComment(entity)) };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getCommentsForDealResult", endpoint: "/api/comments", query }, error);
  }
}

export async function getCommentsByAuthorUserIdResult(
  authorUserId: string,
  viewerId?: string,
): Promise<ProfileCommentListResult> {
  const pageSize = 100;
  const comments: ProfileComment[] = [];
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const query = new URLSearchParams({
        "filters[authorUserId][$eq]": authorUserId,
        sort: "createdAt:desc",
        populate: "deal",
        "pagination[page]": String(page),
        "pagination[pageSize]": String(pageSize),
      });
      const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

      comments.push(...response.data.map((entity) => {
        const fields = getStrapiEntityFields(entity);
        const comment = toComment(entity);
        const dealExpiredAt = fields.deal?.expiredAt ?? fields.deal?.attributes?.expiredAt ?? "";

        return {
          id: comment.id,
          dealId: comment.dealId,
          dealTitle: fields.deal?.title ?? fields.deal?.attributes?.title ?? "Unavailable deal",
          dealStatus:
            fields.deal?.moderationStatus ??
            fields.deal?.attributes?.moderationStatus ??
            "pending",
          dealIsExpired:
            Boolean(fields.deal?.isExpired ?? fields.deal?.attributes?.isExpired) ||
            isDealExpiredByDate(dealExpiredAt),
          ...(dealExpiredAt ? { dealExpiredAt } : {}),
          dealPrice: toNumber(fields.deal?.price ?? fields.deal?.attributes?.price),
          dealCategory: fields.deal?.category ?? fields.deal?.attributes?.category ?? "",
          dealSubCategory: fields.deal?.subCategory ?? fields.deal?.attributes?.subCategory ?? "",
          dealImageUrl: fields.deal?.imageUrl ?? fields.deal?.attributes?.imageUrl ?? "",
          dealUploadedImageUrl: fields.deal?.uploadedImageUrl ?? fields.deal?.attributes?.uploadedImageUrl ?? "",
          dealImageGalleryUrls: Array.isArray(fields.deal?.imageGalleryUrls)
            ? fields.deal.imageGalleryUrls
            : Array.isArray(fields.deal?.attributes?.imageGalleryUrls)
              ? fields.deal.attributes.imageGalleryUrls
              : [],
          dealAvailable: Boolean(comment.dealId),
          body: comment.body,
          likeCount: comment.likeCount,
          viewerHasLiked: viewerId ? comment.likedBy.includes(viewerId) : false,
          canDelete: true,
          createdAt: comment.createdAt,
          editedAt: comment.editedAt,
        };
      }));

      pageCount = response.meta?.pagination?.pageCount ?? 1;
      page += 1;
    } while (page <= pageCount);

    return { ok: true, data: comments };
  } catch (error) {
    return dataFetchErrorResult(
      { functionName: "getCommentsByAuthorUserIdResult", endpoint: "/api/comments" },
      error,
    );
  }
}

export async function getCommentsForDeal(dealId: string): Promise<Comment[]> {
  const result = await getCommentsForDealResult(dealId);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getCommentCountsByDealIds(
  dealIds: string[],
  filters: { createdAfter?: string; createdBefore?: string } = {},
) {
  const counts = new Map(dealIds.map((dealId) => [dealId, 0]));

  await Promise.all(
    dealIds.map(async (dealId) => {
      const query = new URLSearchParams({
        "filters[deal][documentId][$eq]": dealId,
        "pagination[pageSize]": "1",
      });
      if (filters.createdAfter) {
        query.set("filters[createdAt][$gte]", filters.createdAfter);
      }
      if (filters.createdBefore) {
        query.set("filters[createdAt][$lt]", filters.createdBefore);
      }
      const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query }).catch(
        (error) => {
          logDataFetchError({ functionName: "getCommentCountsByDealIds", endpoint: "/api/comments", query }, error);
          return null;
        },
      );
      counts.set(dealId, response?.meta?.pagination?.total ?? 0);
    }),
  );

  return counts;
}

function getDealCreatedAtFromComment(fields: StrapiComment) {
  return fields.deal?.createdAt ?? fields.deal?.attributes?.createdAt ?? "";
}

function sortDealCommentCounts(first: DealCommentCount, second: DealCommentCount) {
  const countDifference = second.count - first.count;

  if (countDifference !== 0) {
    return countDifference;
  }

  return new Date(second.dealCreatedAt).getTime() - new Date(first.dealCreatedAt).getTime();
}

export async function getApprovedDealCommentCountsInRangeResult(filters: {
  createdAfter: string;
  createdBefore: string;
}): Promise<DealCommentCountListResult> {
  const pageSize = 100;
  const counts = new Map<string, DealCommentCount>();
  let page = 1;
  let pageCount = 1;

  try {
    do {
      const query = new URLSearchParams({
        "filters[createdAt][$gte]": filters.createdAfter,
        "filters[createdAt][$lt]": filters.createdBefore,
        "filters[deal][moderationStatus][$eq]": "approved",
        sort: "createdAt:desc",
        "pagination[page]": String(page),
        "pagination[pageSize]": String(pageSize),
        populate: "deal",
      });
      const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

      for (const entity of response.data) {
        const fields = getStrapiEntityFields(entity);
        const comment = toComment(entity);

        if (!comment.dealId) {
          continue;
        }

        const existing = counts.get(comment.dealId);

        counts.set(comment.dealId, {
          dealId: comment.dealId,
          count: (existing?.count ?? 0) + 1,
          dealCreatedAt: existing?.dealCreatedAt || getDealCreatedAtFromComment(fields),
        });
      }

      pageCount = response.meta?.pagination?.pageCount ?? 1;
      page += 1;
    } while (page <= pageCount);

    return { ok: true, data: Array.from(counts.values()).sort(sortDealCommentCounts) };
  } catch (error) {
    return dataFetchErrorResult(
      { functionName: "getApprovedDealCommentCountsInRangeResult", endpoint: "/api/comments" },
      error,
    );
  }
}

async function getCommentCountForDeal(dealId: string) {
  const query = new URLSearchParams({
    "filters[deal][documentId][$eq]": dealId,
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "getCommentCountForDeal", endpoint: "/api/comments", query }, error);
      return null;
    },
  );

  return response?.meta?.pagination?.total ?? 0;
}

async function syncStoredCommentCount(dealId: string) {
  const commentCount = await getCommentCountForDeal(dealId);

  await strapiRequest(`/api/deals/${dealId}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        commentCount,
      },
    },
  }).catch((error) => {
    logDataFetchError({ functionName: "syncStoredCommentCount", endpoint: `/api/deals/${dealId}` }, error);
    return null;
  });
}

async function getAllStrapiPages<T extends object>(path: string, baseQuery: URLSearchParams) {
  const data: Array<Parameters<typeof getStrapiEntityFields<T>>[0]> = [];
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams(baseQuery);
    query.set("pagination[page]", String(page));
    query.set("pagination[pageSize]", "100");
    const response = await strapiRequest<StrapiListResponse<T>>(path, { query });
    data.push(...response.data);
    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return data;
}

export async function getAdminCommentsResult(): Promise<AdminCommentListResult> {
  const query = new URLSearchParams({
    sort: "createdAt:desc",
    populate: "deal",
  });

  try {
    const reportQuery = new URLSearchParams({ sort: "createdAt:desc" });
    const [commentEntities, reportEntities] = await Promise.all([
      getAllStrapiPages<StrapiComment>("/api/comments", query),
      getAllStrapiPages<StrapiCommentReport>("/api/comment-reports", reportQuery),
    ]);
    const reportReasons = new Map<string, string[]>();
    for (const entity of reportEntities) {
      const report = getStrapiEntityFields(entity);
      if (!report.commentDocumentId || !report.reason) continue;
      reportReasons.set(report.commentDocumentId, [...(reportReasons.get(report.commentDocumentId) ?? []), report.reason]);
    }

    return {
      ok: true,
      data: commentEntities.map((entity) => {
        const fields = getStrapiEntityFields(entity);
        const comment = toComment(entity);

        return {
          id: comment.id,
          dealId: comment.dealId,
          dealTitle: fields.deal?.title ?? fields.deal?.attributes?.title ?? "Unavailable deal",
          parentId: comment.parentId,
          authorName: comment.authorName,
          body: comment.body,
          likeCount: comment.likeCount,
          createdAt: comment.createdAt,
          reportCount: reportReasons.get(comment.id)?.length ?? comment.reportCount,
          reportReasons: reportReasons.get(comment.id) ?? [],
        };
      }),
    };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getAdminCommentsResult", endpoint: "/api/comments", query }, error);
  }
}

export async function getAdminComments(): Promise<AdminComment[]> {
  const result = await getAdminCommentsResult();

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function createComment(input: NewCommentInput): Promise<Comment> {
  const submissionKey = createCommentSubmissionKey(input);
  const response = await strapiRequest<StrapiSingleResponse<StrapiComment>>("/api/comments", {
    method: "POST",
    requireToken: true,
    body: {
      data: {
        deal: input.dealId,
        parentId: input.parentId ?? null,
        authorViewerId: input.authorViewerId ?? null,
        authorUserId: input.authorUserId ?? null,
        authorName: input.authorName,
        body: input.body,
        likeCount: 0,
        likedBy: [],
        reportCount: 0,
        submissionKey,
      },
    },
  });

  if (!response.data) {
    throw new Error("Strapi did not return the created comment.");
  }

  // Strapi does not populate relations in create responses by default. The
  // validated input remains the authoritative deal id for both the returned
  // model and the denormalized comment-count update.
  const comment = toComment(response.data, input.dealId);
  await syncStoredCommentCount(input.dealId);

  return comment;
}

export async function hasDuplicateComment(dealId: string, viewerId: string, body: string, authorUserId?: string) {
  const query = new URLSearchParams({
    "filters[deal][documentId][$eq]": dealId,
    "filters[body][$eq]": body,
    "pagination[pageSize]": "1",
    populate: "deal",
  });
  query.set(authorUserId ? "filters[authorUserId][$eq]" : "filters[authorViewerId][$eq]", authorUserId || viewerId);

  const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "hasDuplicateComment", endpoint: "/api/comments", query }, error);
      return null;
    },
  );

  return Boolean(response?.data[0]);
}

async function loadCommentTreeDeleteOrder(dealId: string, rootId: string) {
  const comments: Array<{ id: string; parentId: string | null }> = [];
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      "filters[deal][documentId][$eq]": dealId,
      "fields[0]": "parentId",
      "pagination[page]": String(page),
      "pagination[pageSize]": "100",
    });
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", {
      query,
      requireToken: true,
    }).catch((error) => {
      logDataFetchError(
        { functionName: "deleteCommentTree.loadComments", endpoint: "/api/comments", query },
        error,
      );
      throw error;
    });
    for (const entity of response.data) {
      const fields = getStrapiEntityFields(entity);
      comments.push({ id: getStrapiEntityId(entity), parentId: fields.parentId ?? null });
    }
    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return getCommentTreeDeleteOrder(rootId, comments);
}

async function deleteReportsForComments(commentIds: string[]) {
  for (let offset = 0; offset < commentIds.length; offset += 50) {
    const chunk = commentIds.slice(offset, offset + 50);
    while (true) {
      const query = new URLSearchParams({ "pagination[pageSize]": "100" });
      chunk.forEach((commentId, index) => query.set(`filters[commentDocumentId][$in][${index}]`, commentId));
      const reports = await strapiRequest<StrapiListResponse<StrapiCommentReport>>("/api/comment-reports", {
        query,
        requireToken: true,
      }).catch((error) => {
        logDataFetchError(
          { functionName: "deleteCommentTree.loadReports", endpoint: "/api/comment-reports", query },
          error,
        );
        throw error;
      });
      if (reports.data.length === 0) break;
      for (const report of reports.data) {
        const endpoint = `/api/comment-reports/${getStrapiEntityId(report)}`;
        await strapiRequest(endpoint, { method: "DELETE", requireToken: true }).catch((error) => {
          logDataFetchError({ functionName: "deleteCommentTree.deleteReport", endpoint }, error);
          throw error;
        });
      }
    }
  }
}

async function deleteCommentTree(rootId: string, dealId: string) {
  const deleteOrder = dealId ? await loadCommentTreeDeleteOrder(dealId, rootId) : [rootId];
  await deleteReportsForComments(deleteOrder);
  for (const commentId of deleteOrder) {
    const endpoint = `/api/comments/${commentId}`;
    await strapiRequest(endpoint, { method: "DELETE", requireToken: true }).catch((error) => {
      logDataFetchError({ functionName: "deleteCommentTree.deleteComment", endpoint }, error);
      throw error;
    });
  }
}

export async function deleteComment(id: string): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
    requireToken: true,
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "deleteComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  if (!comment) return null;
  await deleteCommentTree(id, comment.dealId);

  if (comment.dealId) {
    await syncStoredCommentCount(comment.dealId);
  }

  return { dealId: comment.dealId };
}

export async function deleteOwnComment(
  id: string,
  ownership: { viewerId?: string; authorUserId?: string },
): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
    requireToken: true,
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "deleteOwnComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  if (!comment || !isCommentOwnedBy(comment, ownership)) {
    return null;
  }

  await deleteCommentTree(id, comment.dealId);

  if (comment.dealId) {
    await syncStoredCommentCount(comment.dealId);
  }

  return { dealId: comment.dealId };
}

export async function updateOwnComment(
  id: string,
  dealId: string,
  body: string,
  ownership: { viewerId?: string; authorUserId?: string },
): Promise<Comment | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "updateOwnComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  if (!comment || comment.dealId !== dealId || !isCommentOwnedBy(comment, ownership)) {
    return null;
  }

  const editedAt = new Date().toISOString();
  const response = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    method: "PUT",
    requireToken: true,
    body: { data: { body, editedAt } },
  });

  return response.data ? toComment(response.data) : { ...comment, body, editedAt };
}

export async function hasCommentReportForViewer(commentId: string, viewerId: string) {
  const query = new URLSearchParams({
    "filters[commentDocumentId][$eq]": commentId,
    "filters[viewerId][$eq]": viewerId,
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiCommentReport>>("/api/comment-reports", { query })
    .catch((error) => {
      logDataFetchError({ functionName: "hasCommentReportForViewer", endpoint: "/api/comment-reports", query }, error);
      return null;
    });

  return Boolean(response?.data[0]);
}

export async function reportComment(
  dealId: string,
  commentId: string,
  viewerId: string,
  reason: string,
  reporterUserId?: string,
): Promise<{ didReport: boolean; reportCount: number; isOwnComment?: boolean } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${commentId}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch(() => null);

  if (!comment || comment.dealId !== dealId) {
    return null;
  }

  if (isCommentOwnedBy(comment, { viewerId, authorUserId: reporterUserId })) {
    return { didReport: false, reportCount: comment.reportCount, isOwnComment: true };
  }

  try {
    await strapiRequest("/api/comment-reports", {
      method: "POST",
      requireToken: true,
      body: {
        data: {
          comment: commentId,
          commentDocumentId: commentId,
          viewerId,
          reason,
          reportKey: `${commentId}:${viewerId}`,
        },
      },
    });
  } catch (error) {
    if (error instanceof StrapiRequestError && error.status === 400 && /unique|already|duplicate/i.test(error.message)) {
      return { didReport: false, reportCount: comment.reportCount };
    }
    throw error;
  }

  const countQuery = new URLSearchParams({
    "filters[commentDocumentId][$eq]": commentId,
    "pagination[pageSize]": "1",
  });
  const countResponse = await strapiRequest<StrapiListResponse<StrapiCommentReport>>("/api/comment-reports", { query: countQuery });
  const reportCount = countResponse.meta?.pagination?.total ?? comment.reportCount + 1;

  await strapiRequest(`/api/comments/${commentId}`, {
    method: "PUT",
    requireToken: true,
    body: { data: { reportCount } },
  });

  return { didReport: true, reportCount };
}

export async function clearCommentReports(commentId: string): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${commentId}`, {
    query: new URLSearchParams({ populate: "deal" }),
    requireToken: true,
  }).then((response) => (response.data ? toComment(response.data) : null));
  if (!comment) return null;

  while (true) {
    const query = new URLSearchParams({
      "filters[commentDocumentId][$eq]": commentId,
      "pagination[pageSize]": "100",
    });
    const reports = await strapiRequest<StrapiListResponse<StrapiCommentReport>>("/api/comment-reports", {
      query,
      requireToken: true,
    });
    if (reports.data.length === 0) break;
    for (const report of reports.data) {
      await strapiRequest(`/api/comment-reports/${getStrapiEntityId(report)}`, {
        method: "DELETE",
        requireToken: true,
      });
    }
  }

  await strapiRequest(`/api/comments/${commentId}`, {
    method: "PUT",
    requireToken: true,
    body: { data: { reportCount: 0 } },
  });
  return { dealId: comment.dealId };
}

export async function likeComment(
  dealId: string,
  id: string,
  viewerId: string,
): Promise<{ comment: Comment; viewerHasLiked: boolean; didChange: boolean } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "likeComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  if (!comment || comment.dealId !== dealId) {
    return null;
  }

  const viewerHasLiked = comment.likedBy.includes(viewerId);
  const likedBy = viewerHasLiked
    ? comment.likedBy.filter((likedViewerId) => likedViewerId !== viewerId)
    : [...comment.likedBy, viewerId];
  const response = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        likedBy,
        likeCount: likedBy.length,
      },
    },
  });

  return response.data
    ? { comment: toComment(response.data), viewerHasLiked: !viewerHasLiked, didChange: true }
    : null;
}
