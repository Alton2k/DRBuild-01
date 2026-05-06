import "server-only";

import {
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";

export interface Comment {
  id: string;
  dealId: string;
  parentId: string | null;
  authorViewerId: string | null;
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

type StrapiComment = Omit<Comment, "id" | "dealId" | "createdAt"> & {
  createdAt?: string;
  deal?: {
    id?: number;
    documentId?: string;
    title?: string;
    attributes?: {
      title?: string;
    };
  };
};

function toComment(entity: Parameters<typeof getStrapiEntityFields<StrapiComment>>[0]): Comment {
  const fields = getStrapiEntityFields(entity);
  const deal = fields.deal;

  return {
    id: getStrapiEntityId(entity),
    dealId: deal?.documentId ?? String(deal?.id ?? ""),
    parentId: fields.parentId ?? null,
    authorViewerId: fields.authorViewerId ?? null,
    authorName: fields.authorName ?? "",
    body: fields.body ?? "",
    likeCount: fields.likeCount ?? 0,
    likedBy: Array.isArray(fields.likedBy) ? fields.likedBy : [],
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}

export async function getCommentsForDeal(dealId: string): Promise<Comment[]> {
  try {
    const query = new URLSearchParams({
      "filters[deal][documentId][$eq]": dealId,
      sort: "createdAt:asc",
      populate: "deal",
    });
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

    return response.data.map(toComment);
  } catch {
    return [];
  }
}

export async function getCommentCountsByDealIds(dealIds: string[]) {
  const counts = new Map(dealIds.map((dealId) => [dealId, 0]));

  await Promise.all(
    dealIds.map(async (dealId) => {
      const comments = await getCommentsForDeal(dealId);
      counts.set(dealId, comments.length);
    }),
  );

  return counts;
}

export async function getAdminComments(): Promise<AdminComment[]> {
  try {
    const query = new URLSearchParams({
      sort: "createdAt:desc",
      populate: "deal",
    });
    const response = await strapiRequest<StrapiListResponse<StrapiComment>>("/api/comments", { query });

    return response.data.map((entity) => {
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
    });
  } catch {
    return [];
  }
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

  return toComment(response.data);
}

export async function deleteComment(id: string): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch(() => null);

  await strapiRequest(`/api/comments/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  return comment ? { dealId: comment.dealId } : null;
}

export async function deleteOwnComment(
  id: string,
  viewerId: string,
): Promise<{ dealId: string } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch(() => null);

  if (!comment || comment.authorViewerId !== viewerId) {
    return null;
  }

  await strapiRequest(`/api/comments/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  return { dealId: comment.dealId };
}

export async function likeComment(
  dealId: string,
  id: string,
  viewerId: string,
): Promise<{ comment: Comment; didLike: boolean } | null> {
  const comment = await strapiRequest<StrapiSingleResponse<StrapiComment>>(`/api/comments/${id}`, {
    query: new URLSearchParams({ populate: "deal" }),
  })
    .then((response) => (response.data ? toComment(response.data) : null))
    .catch(() => null);

  if (!comment || comment.dealId !== dealId) {
    return null;
  }

  if (comment.likedBy.includes(viewerId)) {
    return { comment, didLike: false };
  }

  const likedBy = [...comment.likedBy, viewerId];
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

  return response.data ? { comment: toComment(response.data), didLike: true } : null;
}
