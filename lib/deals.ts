import "server-only";

import {
  getStrapiEntityFields,
  getStrapiEntityId,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";

export type DealStatus = "pending" | "approved" | "rejected";
export type DealVoteDirection = "up" | "down";
export type DealFeedMode = "hot" | "new" | "discussed";

export interface Deal {
  id: string;
  title: string;
  url: string;
  price: number;
  originalPrice: number | null;
  store: string;
  category: string;
  subCategory?: string;
  description: string;
  imageUrl: string;
  uploadedImageUrl: string;
  imageGalleryUrls: string[];
  score: number;
  status: DealStatus;
  moderationReason: string;
  isExpired: boolean;
  expiredAt?: string;
  duplicateOfDealId?: string;
  duplicateReason?: string;
  reportCount: number;
  authorUserId?: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

export interface NewDealInput {
  title: string;
  url: string;
  price: number;
  originalPrice?: number | null;
  store: string;
  category: string;
  subCategory?: string;
  description: string;
  imageUrl?: string;
  uploadedImageUrl?: string;
  imageGalleryUrls?: string[];
  status?: DealStatus;
  moderationReason?: string;
  duplicateOfDealId?: string | null;
  duplicateReason?: string;
  authorUserId?: string | null;
  authorEmail?: string;
  authorName?: string;
}

export interface DuplicateDealMatch {
  deal: Pick<Deal, "id" | "title" | "store" | "url" | "status" | "createdAt">;
  reason: string;
  score: number;
}

export interface ApprovedDealFilters {
  q?: string;
  category?: string;
  subCategory?: string;
  feed?: DealFeedMode;
}

type StrapiDeal = Omit<Deal, "id" | "originalPrice" | "createdAt" | "status"> & {
  originalPrice?: number | string | null;
  createdAt?: string;
  price: number | string;
  moderationStatus?: DealStatus;
};

function toNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toOptionalNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDeal(entity: Parameters<typeof getStrapiEntityFields<StrapiDeal>>[0]): Deal {
  const fields = getStrapiEntityFields(entity);

  return {
    id: getStrapiEntityId(entity),
    title: fields.title ?? "",
    url: fields.url ?? "",
    price: toNumber(fields.price),
    originalPrice: toOptionalNumber(fields.originalPrice),
    store: fields.store ?? "",
    category: fields.category ?? "",
    subCategory: fields.subCategory ?? "",
    description: fields.description ?? "",
    imageUrl: fields.imageUrl ?? "",
    uploadedImageUrl: fields.uploadedImageUrl ?? "",
    imageGalleryUrls: Array.isArray(fields.imageGalleryUrls) ? fields.imageGalleryUrls : [],
    score: fields.score ?? 0,
    status: fields.moderationStatus ?? "pending",
    moderationReason: fields.moderationReason ?? "",
    isExpired: Boolean(fields.isExpired),
    ...(fields.expiredAt ? { expiredAt: fields.expiredAt } : {}),
    ...(fields.duplicateOfDealId ? { duplicateOfDealId: fields.duplicateOfDealId } : {}),
    ...(fields.duplicateReason ? { duplicateReason: fields.duplicateReason } : {}),
    reportCount: fields.reportCount ?? 0,
    ...(fields.authorUserId ? { authorUserId: fields.authorUserId } : {}),
    authorEmail: fields.authorEmail ?? "",
    authorName: fields.authorName ?? "",
    createdAt: fields.createdAt ?? new Date().toISOString(),
  };
}

function getDealSort(feed: DealFeedMode = "hot") {
  if (feed === "new") {
    return "createdAt:desc";
  }

  if (feed === "discussed") {
    return "createdAt:desc";
  }

  return "score:desc";
}

function addApprovedFilters(params: URLSearchParams, filters: ApprovedDealFilters) {
  params.set("filters[moderationStatus][$eq]", "approved");
  params.set("filters[isExpired][$eq]", "false");

  if (filters.category) {
    params.set("filters[category][$eqi]", filters.category);
  }

  if (filters.subCategory) {
    params.set("filters[subCategory][$eqi]", filters.subCategory);
  }

  if (filters.q) {
    params.set("filters[$or][0][title][$containsi]", filters.q);
    params.set("filters[$or][1][description][$containsi]", filters.q);
    params.set("filters[$or][2][store][$containsi]", filters.q);
    params.set("filters[$or][3][category][$containsi]", filters.q);
    params.set("filters[$or][4][subCategory][$containsi]", filters.q);
  }
}

export async function getDeals(): Promise<Deal[]> {
  try {
    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", {
      query: new URLSearchParams({ sort: "createdAt:desc" }),
    });

    return response.data.map(toDeal);
  } catch {
    return [];
  }
}

export async function getAuthorDealModerationStats(authorUserId: string) {
  const deals = await getDeals();
  const authorDeals = deals.filter((deal) => deal.authorUserId === authorUserId);

  return {
    approvedCount: authorDeals.filter((deal) => deal.status === "approved").length,
    rejectedCount: authorDeals.filter((deal) => deal.status === "rejected").length,
    totalCount: authorDeals.length,
  };
}

export async function getApprovedDeals(filters: ApprovedDealFilters = {}): Promise<Deal[]> {
  try {
    const query = new URLSearchParams();
    addApprovedFilters(query, filters);
    query.set("sort", getDealSort(filters.feed));

    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query });

    return response.data.map(toDeal);
  } catch {
    return [];
  }
}

export async function searchApprovedDeals(filters: ApprovedDealFilters): Promise<Deal[]> {
  return getApprovedDeals(filters);
}

export async function getDealById(id: string): Promise<Deal | null> {
  try {
    const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>(`/api/deals/${id}`);

    return response.data ? toDeal(response.data) : null;
  } catch {
    return null;
  }
}

export async function getDealVoteDirection(
  id: string,
  viewerId: string | undefined,
): Promise<DealVoteDirection | null> {
  void id;
  void viewerId;

  return null;
}

export async function getDealVoteDirectionsByDealIds(dealIds: string[], viewerId: string | undefined) {
  void viewerId;

  return new Map(dealIds.map((dealId) => [dealId, null as DealVoteDirection | null]));
}

export async function findDuplicateDeal(
  input: Pick<NewDealInput, "title" | "url" | "store">,
): Promise<DuplicateDealMatch | null> {
  const query = new URLSearchParams({
    "filters[url][$eq]": input.url,
    "filters[moderationStatus][$ne]": "rejected",
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query }).catch(() => null);
  const match = response?.data[0];

  if (!match) {
    return null;
  }

  const deal = toDeal(match);

  return {
    deal: {
      id: deal.id,
      title: deal.title,
      store: deal.store,
      url: deal.url,
      status: deal.status,
      createdAt: deal.createdAt,
    },
    reason: "Someone already posted this product. Try sharing a different deal.",
    score: 1,
  };
}

export async function createDeal(input: NewDealInput): Promise<Deal> {
  const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>("/api/deals", {
    method: "POST",
    requireToken: true,
    body: {
      data: {
        title: input.title,
        url: input.url,
        price: input.price,
        originalPrice: input.originalPrice ?? null,
        store: input.store,
        category: input.category,
        subCategory: input.subCategory ?? "",
        description: input.description,
        imageUrl: input.imageUrl ?? "",
        uploadedImageUrl: input.uploadedImageUrl ?? "",
        imageGalleryUrls: input.imageGalleryUrls ?? [],
        score: 0,
        moderationStatus: input.status ?? "pending",
        moderationReason: input.moderationReason ?? "new_user_manual_review",
        isExpired: false,
        duplicateOfDealId: input.duplicateOfDealId ?? "",
        duplicateReason: input.duplicateReason ?? "",
        reportCount: 0,
        authorUserId: input.authorUserId ?? "",
        authorEmail: input.authorEmail ?? "",
        authorName: input.authorName ?? "",
      },
    },
  });

  if (!response.data) {
    throw new Error("Strapi did not return the created deal.");
  }

  return toDeal(response.data);
}

export async function updateDealStatus(id: string, status: DealStatus, moderationReason = "admin_manual_update") {
  const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>(`/api/deals/${id}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        moderationStatus: status,
        moderationReason,
      },
    },
  });

  return response.data ? toDeal(response.data) : null;
}

export async function markDealExpired(id: string) {
  const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>(`/api/deals/${id}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        isExpired: true,
        expiredAt: new Date().toISOString(),
      },
    },
  });

  return response.data ? toDeal(response.data) : null;
}

export async function reportDeal(id: string, viewerId: string, reason: string) {
  const deal = await getDealById(id);

  if (!deal) {
    return null;
  }

  await strapiRequest("/api/deal-reports", {
    method: "POST",
    requireToken: true,
    body: {
      data: {
        deal: id,
        viewerId,
        reason,
      },
    },
  });

  return { deal, didReport: true };
}

export async function restoreReportedDeal(id: string) {
  const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>(`/api/deals/${id}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        moderationStatus: "approved",
        moderationReason: "admin_restored_reported",
        isExpired: false,
        expiredAt: null,
        reportCount: 0,
      },
    },
  });

  return response.data ? toDeal(response.data) : null;
}

export async function voteDeal(id: string, viewerId: string, direction: DealVoteDirection) {
  const deal = await getDealById(id);

  if (!deal) {
    return null;
  }

  await strapiRequest("/api/deal-votes", {
    method: "POST",
    requireToken: true,
    body: {
      data: {
        deal: id,
        viewerId,
        direction,
      },
    },
  });

  return {
    deal,
    didVote: true,
    viewerVote: direction,
  };
}

export async function deleteDeal(id: string) {
  await strapiRequest(`/api/deals/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  return true;
}
