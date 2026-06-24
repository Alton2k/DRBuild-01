import "server-only";

import {
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";
import { dataFetchErrorResult, logDataFetchError, type DataResult } from "./dataResult";

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
}

export interface ProfileComment {
  id: string;
  dealId: string;
  dealTitle: string;
  dealStatus: "pending" | "approved" | "rejected";
  dealPrice: number;
  dealCategory: string;
  dealSubCategory: string;
  dealImageUrl: string;
  dealUploadedImageUrl: string;
  dealImageGalleryUrls: string[];
  body: string;
  likeCount: number;
  viewerHasLiked: boolean;
  canDelete: boolean;
  createdAt: string;
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
    };
    moderationStatus?: "pending" | "approved" | "rejected";
    createdAt?: string;
    price?: number | string;
    category?: string;
    subCategory?: string;
    imageUrl?: string;
    uploadedImageUrl?: string;
    imageGalleryUrls?: string[];
  };
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

function toComment(entity: Parameters<typeof getStrapiEntityFields<StrapiComment>>[0]): Comment {
  const fields = getStrapiEntityFields(entity);
  const deal = fields.deal;

  return {
    id: getStrapiEntityId(entity),
    dealId: deal?.documentId ?? String(deal?.id ?? ""),
    parentId: fields.parentId ?? null,
    authorViewerId: fields.authorViewerId ?? null,
    authorUserId: fields.authorUserId ?? null,
    authorName: fields.authorName ?? "",
    body: fields.body ?? "",
    likeCount: fields.likeCount ?? 0,
    likedBy: Array.isArray(fields.likedBy) ? fields.likedBy : [],
    createdAt: fields.createdAt ?? new Date().toISOString(),
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

    return { ok: true, data: response.data.map(toComment) };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getCommentsForDealResult", endpoint: "/api/comments", query }, error);
  }
}

export async function getCommentsByAuthorUserIdResult(
  authorUserId: string,
  viewerId?: string,
): Promise<ProfileCommentListResult> {
  const query = new URLSearchParams({
    "filters[authorUserId][$eq]": authorUserId,
    sort: "createdAt:desc",
    populate: "deal",
  });

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

    return {
      ok: true,
      data: response.data.map((entity) => {
        const fields = getStrapiEntityFields(entity);
        const comment = toComment(entity);

        return {
          id: comment.id,
          dealId: comment.dealId,
          dealTitle: fields.deal?.title ?? fields.deal?.attributes?.title ?? "Deal",
          dealStatus:
            fields.deal?.moderationStatus ??
            fields.deal?.attributes?.moderationStatus ??
            "pending",
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
          body: comment.body,
          likeCount: comment.likeCount,
          viewerHasLiked: viewerId ? comment.likedBy.includes(viewerId) : false,
          canDelete: true,
          createdAt: comment.createdAt,
        };
      }),
    };
  } catch (error) {
    return dataFetchErrorResult(
      { functionName: "getCommentsByAuthorUserIdResult", endpoint: "/api/comments", query },
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

export async function getAdminCommentsResult(): Promise<AdminCommentListResult> {
  const query = new URLSearchParams({
    sort: "createdAt:desc",
    populate: "deal",
  });

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

    return {
      ok: true,
      data: response.data.map((entity) => {
        const fields = getStrapiEntityFields(entity);
        const comment = toComment(entity);

        return {
          id: comment.id,
          dealId: comment.dealId,
          dealTitle: fields.deal?.title ?? fields.deal?.attributes?.title ?? "",
          parentId: comment.parentId,
          authorName: comment.authorName,
          body: comment.body,
          likeCount: comment.likeCount,
          createdAt: comment.createdAt,
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
      },
    },
  });

  if (!response.data) {
    throw new Error("Strapi did not return the created comment.");
  }

  const comment = toComment(response.data);
  await syncStoredCommentCount(comment.dealId);

  return comment;
}

export async function hasDuplicateComment(dealId: string, viewerId: string, body: string) {
  const query = new URLSearchParams({
    "filters[deal][documentId][$eq]": dealId,
    "filters[authorViewerId][$eq]": viewerId,
    "filters[body][$eq]": body,
    "pagination[pageSize]": "1",
    populate: "deal",
  });

  const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "hasDuplicateComment", endpoint: "/api/comments", query }, error);
      return null;
    },
  );

  return Boolean(response?.data[0]);
}

export async function deleteComment(id: string): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "deleteComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  await strapiRequest(`/api/comments/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  if (comment) {
    await syncStoredCommentCount(comment.dealId);
  }

  return comment ? { dealId: comment.dealId } : null;
}

export async function deleteOwnComment(
  id: string,
  ownership: { viewerId?: string; authorUserId?: string },
): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch((error) => {
      logDataFetchError({ functionName: "deleteOwnComment", endpoint: `/api/comments/${id}` }, error);
      return null;
    });

  const ownsByViewer = Boolean(ownership.viewerId && comment?.authorViewerId === ownership.viewerId);
  const ownsByUser = Boolean(ownership.authorUserId && comment?.authorUserId === ownership.authorUserId);

  if (!comment || (!ownsByViewer && !ownsByUser)) {
    return null;
  }

  await strapiRequest(`/api/comments/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  await syncStoredCommentCount(comment.dealId);

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
