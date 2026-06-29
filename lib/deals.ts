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

export type DealStatus = "pending" | "approved" | "rejected";
export type DealVoteDirection = "up" | "down";
export type DealFeedMode = "hot" | "new" | "discussed" | "following";

export interface Deal {
  id: string;
  title: string;
  url: string;
  price: number;
  originalPrice: number | null;
  voucherCode?: string;
  hasFreeShipping?: boolean;
  shippingCost?: number | null;
  store: string;
  category: string;
  subCategory?: string;
  description: string;
  imageUrl: string;
  uploadedImageUrl: string;
  imageGalleryUrls: string[];
  score: number;
  commentCount: number;
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
  voucherCode?: string;
  hasFreeShipping?: boolean;
  shippingCost?: number | null;
  store: string;
  category: string;
  subCategory?: string;
  description: string;
  imageUrl?: string;
  uploadedImageUrl?: string;
  imageGalleryUrls?: string[];
  expiredAt?: string | null;
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
  createdAfter?: string;
  createdBefore?: string;
  page?: number;
  pageSize?: number;
}

export interface StrapiPagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

export interface PaginatedDeals {
  deals: Deal[];
  pagination: StrapiPagination;
}

export type DealResult = DataResult<Deal>;
export type DealListResult = DataResult<Deal[]>;
export type PaginatedDealsResult = DataResult<PaginatedDeals>;

type StrapiDeal = Omit<Deal, "id" | "originalPrice" | "createdAt" | "status" | "commentCount"> & {
  originalPrice?: number | string | null;
  createdAt?: string;
  price: number | string;
  commentCount?: number | string | null;
  moderationStatus?: DealStatus;
};

type StrapiDealVote = {
  direction?: DealVoteDirection;
  viewerId?: string;
  userId?: string;
  dealDocumentId?: string;
  deal?: {
    id?: number;
    documentId?: string;
  };
};

type StrapiDealVoteResponse = {
  data: {
    score: number;
    viewerVote: DealVoteDirection | null;
    didVote: boolean;
  };
};

type StrapiDealReport = {
  viewerId?: string;
  reason?: string;
  dealDocumentId?: string;
  deal?: {
    id?: number;
    documentId?: string;
  };
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

export function isDealExpiredByDate(expiredAt: string | null | undefined) {
  return expiredAt ? new Date(expiredAt).getTime() <= Date.now() : false;
}

export function toDeal(entity: Parameters<typeof getStrapiEntityFields<StrapiDeal>>[0]): Deal {
  const fields = getStrapiEntityFields(entity);
  const expiredAt = fields.expiredAt ?? "";
  const isPastExpiration = isDealExpiredByDate(expiredAt);

  return {
    id: getStrapiEntityId(entity),
    title: fields.title ?? "",
    url: fields.url ?? "",
    price: toNumber(fields.price),
    originalPrice: toOptionalNumber(fields.originalPrice),
    ...(fields.voucherCode ? { voucherCode: fields.voucherCode } : {}),
    hasFreeShipping: Boolean(fields.hasFreeShipping),
    shippingCost: toOptionalNumber(fields.shippingCost),
    store: fields.store ?? "",
    category: fields.category ?? "",
    subCategory: fields.subCategory ?? "",
    description: fields.description ?? "",
    imageUrl: fields.imageUrl ?? "",
    uploadedImageUrl: fields.uploadedImageUrl ?? "",
    imageGalleryUrls: Array.isArray(fields.imageGalleryUrls) ? fields.imageGalleryUrls : [],
    score: fields.score ?? 0,
    commentCount: toNumber(fields.commentCount),
    status: fields.moderationStatus ?? "pending",
    moderationReason: fields.moderationReason ?? "",
    isExpired: Boolean(fields.isExpired) || isPastExpiration,
    ...(expiredAt ? { expiredAt } : {}),
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
    return "commentCount:desc";
  }

  if (feed === "following") {
    return "createdAt:desc";
  }

  return "score:desc";
}

function addApprovedFilters(params: URLSearchParams, filters: ApprovedDealFilters) {
  params.set("filters[moderationStatus][$eq]", "approved");

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

  if (filters.createdAfter) {
    params.set("filters[createdAt][$gte]", filters.createdAfter);
  }

  if (filters.createdBefore) {
    params.set("filters[createdAt][$lt]", filters.createdBefore);
  }
}

export async function getDealsResult(): Promise<DealListResult> {
  const query = new URLSearchParams({ sort: "createdAt:desc" });

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query });

    return { ok: true, data: response.data.map(toDeal) };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getDealsResult", endpoint: "/api/deals", query }, error);
  }
}

export async function getDeals(): Promise<Deal[]> {
  const result = await getDealsResult();

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getDealsByAuthorUserIdResult(authorUserId: string): Promise<DealListResult> {
  const query = new URLSearchParams({
    "filters[authorUserId][$eq]": authorUserId,
    sort: "createdAt:desc",
  });

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query });

    return { ok: true, data: response.data.map(toDeal) };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getDealsByAuthorUserIdResult", endpoint: "/api/deals", query }, error);
  }
}

export async function getDealsByAuthorUserId(authorUserId: string): Promise<Deal[]> {
  const result = await getDealsByAuthorUserIdResult(authorUserId);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getAuthorDealModerationStats(authorUserId: string) {
  const authorDeals = await getDealsByAuthorUserId(authorUserId);

  return {
    approvedCount: authorDeals.filter((deal) => deal.status === "approved").length,
    rejectedCount: authorDeals.filter((deal) => deal.status === "rejected").length,
    totalCount: authorDeals.length,
  };
}

export async function getApprovedDeals(filters: ApprovedDealFilters = {}): Promise<Deal[]> {
  const response = await getApprovedDealsPage(filters);
  return response.deals;
}

function getPagination(meta: StrapiListResponse<StrapiDeal>["meta"], fallback: { page: number; pageSize: number }) {
  return (
    meta?.pagination ?? {
      page: fallback.page,
      pageSize: fallback.pageSize,
      pageCount: 1,
      total: 0,
    }
  );
}

export async function getApprovedDealsPageResult(filters: ApprovedDealFilters = {}): Promise<PaginatedDealsResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 12);
  const query = new URLSearchParams();
  addApprovedFilters(query, filters);

  try {
    query.set("sort", getDealSort(filters.feed));
    query.set("pagination[page]", String(page));
    query.set("pagination[pageSize]", String(pageSize));

    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query });

    return {
      ok: true,
      data: {
        deals: response.data.map(toDeal),
        pagination: getPagination(response.meta, { page, pageSize }),
      },
    };
  } catch (error) {
    return dataFetchErrorResult({ functionName: "getApprovedDealsPageResult", endpoint: "/api/deals", query }, error);
  }
}

export async function getApprovedDealsPage(filters: ApprovedDealFilters = {}): Promise<PaginatedDeals> {
  const result = await getApprovedDealsPageResult(filters);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getApprovedDealsByAuthorUserIdsPageResult(
  authorUserIds: string[],
  filters: ApprovedDealFilters = {},
): Promise<PaginatedDealsResult> {
  const uniqueAuthorUserIds = Array.from(new Set(authorUserIds.filter(Boolean)));
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 12);
  const query = new URLSearchParams();

  if (uniqueAuthorUserIds.length === 0) {
    return {
      ok: true,
      data: {
        deals: [],
        pagination: {
          page,
          pageSize,
          pageCount: 1,
          total: 0,
        },
      },
    };
  }

  addApprovedFilters(query, filters);
  uniqueAuthorUserIds.forEach((authorUserId, index) => {
    query.set(`filters[authorUserId][$in][${index}]`, authorUserId);
  });

  try {
    query.set("sort", getDealSort(filters.feed));
    query.set("pagination[page]", String(page));
    query.set("pagination[pageSize]", String(pageSize));

    const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query });

    return {
      ok: true,
      data: {
        deals: response.data.map(toDeal),
        pagination: getPagination(response.meta, { page, pageSize }),
      },
    };
  } catch (error) {
    return dataFetchErrorResult(
      { functionName: "getApprovedDealsByAuthorUserIdsPageResult", endpoint: "/api/deals", query },
      error,
    );
  }
}

export async function searchApprovedDeals(filters: ApprovedDealFilters): Promise<Deal[]> {
  return getApprovedDeals(filters);
}

export async function getDealByIdResult(id: string): Promise<DataResult<Deal | null>> {
  const endpoint = `/api/deals/${id}`;

  try {
    const response = await strapiRequest<StrapiSingleResponse<StrapiDeal>>(endpoint);

    return { ok: true, data: response.data ? toDeal(response.data) : null };
  } catch (error) {
    if (error instanceof StrapiRequestError && error.status === 404) {
      return { ok: true, data: null };
    }

    return dataFetchErrorResult({ functionName: "getDealByIdResult", endpoint }, error);
  }
}

export async function getDealById(id: string): Promise<Deal | null> {
  const result = await getDealByIdResult(id);

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

export async function getDealByIdOrNull(id: string): Promise<Deal | null> {
  const result = await getDealByIdResult(id);

  if (!result.ok) {
    return null;
  }

  return result.data;
}

export async function getDealVoteDirection(
  id: string,
  viewerId: string | undefined,
  userId?: string,
  viewerAliases: string[] = [],
): Promise<DealVoteDirection | null> {
  if (userId) {
    const vote = await getDealVoteForUser(id, userId);

    if (vote) {
      return vote.direction;
    }
  }

  const viewerIds = Array.from(new Set([viewerId, ...viewerAliases].filter((value): value is string => Boolean(value))));

  if (viewerIds.length === 0) {
    return null;
  }

  const vote = await getDealVoteForViewers(id, viewerIds);

  return vote?.direction ?? null;
}

export async function getDealVoteDirectionsByDealIds(
  dealIds: string[],
  viewerId: string | undefined,
  userId?: string,
  viewerAliases: string[] = [],
) {
  const viewerIds = Array.from(new Set([viewerId, ...viewerAliases].filter((value): value is string => Boolean(value))));

  if ((viewerIds.length === 0 && !userId) || dealIds.length === 0) {
    return new Map(dealIds.map((dealId) => [dealId, null as DealVoteDirection | null]));
  }

  const uniqueDealIds = Array.from(new Set(dealIds));
  const votes = new Map<string, DealVoteDirection | null>(uniqueDealIds.map((dealId) => [dealId, null]));

  if (userId) {
    const userVotes = await getDealVoteDirectionsByDealIdsForField(uniqueDealIds, "userId", userId);

    for (const [dealId, direction] of userVotes) {
      votes.set(dealId, direction);
    }
  }

  if (viewerIds.length === 0 || Array.from(votes.values()).every(Boolean)) {
    return votes;
  }

  const viewerVotes = await getDealVoteDirectionsByDealIdsForViewers(uniqueDealIds, viewerIds);

  for (const [dealId, direction] of viewerVotes) {
    if (!votes.get(dealId)) {
      votes.set(dealId, direction);
    }
  }

  return votes;
}

async function getDealVoteDirectionsByDealIdsForField(
  dealIds: string[],
  field: "viewerId" | "userId",
  value: string,
) {
  const query = new URLSearchParams({
    [`filters[${field}][$eq]`]: value,
    "pagination[pageSize]": String(dealIds.length),
  });

  dealIds.forEach((dealId, index) => {
    query.set(`filters[dealDocumentId][$in][${index}]`, dealId);
  });

  const response = await strapiRequest<StrapiListResponse<StrapiDealVote>>("/api/deal-votes", { query }).catch(
    (error) => {
      logDataFetchError({
        functionName: "getDealVoteDirectionsByDealIdsForField",
        endpoint: "/api/deal-votes",
        query,
      }, error);
      return null;
    },
  );

  return new Map(
    response?.data.flatMap((vote) => {
      const fields = getStrapiEntityFields(vote);
      const direction = fields.direction === "up" || fields.direction === "down" ? fields.direction : null;
      const dealId = fields.dealDocumentId ?? fields.deal?.documentId ?? (fields.deal?.id ? String(fields.deal.id) : "");

      return direction && dealId ? ([[dealId, direction] as const]) : [];
    }) ?? [],
  );
}

async function getDealVoteDirectionsByDealIdsForViewers(dealIds: string[], viewerIds: string[]) {
  const votes = new Map<string, DealVoteDirection>();

  for (const viewerId of viewerIds) {
    const viewerVotes = await getDealVoteDirectionsByDealIdsForField(dealIds, "viewerId", viewerId);

    for (const [dealId, direction] of viewerVotes) {
      if (!votes.has(dealId)) {
        votes.set(dealId, direction);
      }
    }
  }

  return votes;
}

async function getDealVoteCount(query: URLSearchParams) {
  const response = await strapiRequest<StrapiListResponse<StrapiDealVote>>("/api/deal-votes", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "getDealVoteCount", endpoint: "/api/deal-votes", query }, error);
      return null;
    },
  );

  return response?.meta?.pagination?.total ?? 0;
}

export async function getProfileVoteStats(dealIds: string[], viewerId: string | undefined, userId?: string) {
  const upvotesGivenQuery = new URLSearchParams({
    "filters[direction][$eq]": "up",
    "pagination[pageSize]": "1",
  });
  const upvotesReceivedQuery = new URLSearchParams({
    "filters[direction][$eq]": "up",
    "pagination[pageSize]": "1",
  });

  if (userId) {
    upvotesGivenQuery.set("filters[userId][$eq]", userId);
  } else if (viewerId) {
    upvotesGivenQuery.set("filters[viewerId][$eq]", viewerId);
  }

  dealIds.forEach((dealId, index) => {
    upvotesReceivedQuery.set(`filters[dealDocumentId][$in][${index}]`, dealId);
  });

  const [upvotesGiven, upvotesReceived] = await Promise.all([
    userId || viewerId ? getDealVoteCount(upvotesGivenQuery) : Promise.resolve(0),
    dealIds.length > 0 ? getDealVoteCount(upvotesReceivedQuery) : Promise.resolve(0),
  ]);

  return { upvotesGiven, upvotesReceived };
}

export async function findDuplicateDeal(
  input: Pick<NewDealInput, "title" | "url" | "store">,
): Promise<DuplicateDealMatch | null> {
  const query = new URLSearchParams({
    "filters[url][$eq]": input.url,
    "filters[moderationStatus][$ne]": "rejected",
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiDeal>>("/api/deals", { query }).catch((error) => {
    logDataFetchError({ functionName: "findDuplicateDeal", endpoint: "/api/deals", query }, error);
    return null;
  });
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
  const baseData = {
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
    expiredAt: input.expiredAt ?? null,
    score: 0,
    commentCount: 0,
    moderationStatus: input.status ?? "pending",
    moderationReason: input.moderationReason ?? "new_user_manual_review",
    isExpired: false,
    duplicateOfDealId: input.duplicateOfDealId ?? "",
    duplicateReason: input.duplicateReason ?? "",
    reportCount: 0,
    authorUserId: input.authorUserId ?? "",
    authorEmail: input.authorEmail ?? "",
    authorName: input.authorName ?? "",
  };
  const commercialData = {
    hasFreeShipping: Boolean(input.hasFreeShipping),
    shippingCost: input.shippingCost ?? null,
  };
  const createWithData = (data: typeof baseData & Partial<typeof commercialData>) =>
    strapiRequest<StrapiSingleResponse<StrapiDeal>>("/api/deals", {
      method: "POST",
      requireToken: true,
      body: { data },
    });

  let response;
  try {
    response = await createWithData({ ...baseData, ...commercialData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const likelyMissingCommercialFields =
      error instanceof StrapiRequestError &&
      error.status === 400 &&
      /hasFreeShipping|shippingCost|Invalid key/i.test(message);

    if (!likelyMissingCommercialFields) {
      throw error;
    }

    response = await createWithData(baseData);
  }

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

  if (await hasDealReportForViewer(id, viewerId)) {
    return { deal, didReport: false };
  }

  const reportResponse = await strapiRequest("/api/deal-reports", {
    method: "POST",
    requireToken: true,
    body: {
      data: {
        deal: id,
        dealDocumentId: id,
        viewerId,
        reason,
      },
    },
  }).catch((error) => {
    if (isUniqueConstraintError(error)) {
      return null;
    }

    throw error;
  });

  if (!reportResponse) {
    return { deal, didReport: false };
  }

  const reportCount = await getDealReportCount(id);

  await strapiRequest(`/api/deals/${id}`, {
    method: "PUT",
    requireToken: true,
    body: {
      data: {
        reportCount,
      },
    },
  }).catch((error) => {
    logDataFetchError({ functionName: "reportDeal", endpoint: `/api/deals/${id}` }, error);
    return null;
  });

  return { deal, didReport: true };
}

export async function hasDealReportForViewer(dealId: string, viewerId: string) {
  const query = new URLSearchParams({
    "filters[viewerId][$eq]": viewerId,
    "filters[dealDocumentId][$eq]": dealId,
    "pagination[pageSize]": "1",
  });

  const response = await strapiRequest<StrapiListResponse<StrapiDealReport>>("/api/deal-reports", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "hasDealReportForViewer", endpoint: "/api/deal-reports", query }, error);
      return null;
    },
  );

  return Boolean(response?.data[0]);
}

async function getDealReportCount(dealId: string) {
  const query = new URLSearchParams({
    "filters[dealDocumentId][$eq]": dealId,
    "pagination[pageSize]": "1",
  });

  const response = await strapiRequest<StrapiListResponse<StrapiDealReport>>("/api/deal-reports", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "getDealReportCount", endpoint: "/api/deal-reports", query }, error);
      return null;
    },
  );

  return response?.meta?.pagination?.total ?? 0;
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

async function getDealVoteForViewers(dealId: string, viewerIds: string[]) {
  for (const viewerId of viewerIds) {
    const vote = await getDealVoteForViewer(dealId, viewerId);

    if (vote) {
      return vote;
    }
  }

  return null;
}

async function getDealVoteForViewer(dealId: string, viewerId: string) {
  const query = new URLSearchParams({
    "filters[dealDocumentId][$eq]": dealId,
    "filters[viewerId][$eq]": viewerId,
    "pagination[pageSize]": "1",
  });

  const response = await strapiRequest<StrapiListResponse<StrapiDealVote>>("/api/deal-votes", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "getDealVoteForViewer", endpoint: "/api/deal-votes", query }, error);
      return null;
    },
  );
  const vote = response?.data[0];

  if (!vote) {
    return null;
  }

  const fields = getStrapiEntityFields(vote);
  const direction = fields.direction === "up" || fields.direction === "down" ? fields.direction : null;

  if (!direction) {
    return null;
  }

  return {
    id: getStrapiEntityId(vote),
    direction,
  };
}

async function getDealVoteForUser(dealId: string, userId: string) {
  const query = new URLSearchParams({
    "filters[dealDocumentId][$eq]": dealId,
    "filters[userId][$eq]": userId,
    "pagination[pageSize]": "1",
  });

  const response = await strapiRequest<StrapiListResponse<StrapiDealVote>>("/api/deal-votes", { query }).catch(
    (error) => {
      logDataFetchError({ functionName: "getDealVoteForUser", endpoint: "/api/deal-votes", query }, error);
      return null;
    },
  );
  const vote = response?.data[0];

  if (!vote) {
    return null;
  }

  const fields = getStrapiEntityFields(vote);
  const direction = fields.direction === "up" || fields.direction === "down" ? fields.direction : null;

  if (!direction) {
    return null;
  }

  return {
    id: getStrapiEntityId(vote),
    direction,
  };
}

function isUniqueConstraintError(error: unknown) {
  const candidate = error as { code?: string; errno?: number; message?: string };

  return (
    candidate?.code === "23505" ||
    candidate?.code === "SQLITE_CONSTRAINT" ||
    candidate?.errno === 1062 ||
    /unique|duplicate/i.test(candidate?.message ?? "")
  );
}

export async function voteDeal(
  id: string,
  viewerId: string,
  direction: DealVoteDirection,
  userId?: string,
  viewerAliases: string[] = [],
) {
  // Voting is handled by Strapi so the vote row and score update share one database transaction.
  const response = await strapiRequest<StrapiDealVoteResponse>(`/api/deals/${id}/vote`, {
    method: "POST",
    requireToken: true,
    body: {
      viewerId,
      ...(userId ? { userId } : {}),
      ...(viewerAliases.length > 0 ? { viewerAliases } : {}),
      direction,
    },
  }).catch((error) => {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) {
      return null;
    }

    throw error;
  });

  if (!response) {
    return null;
  }

  const deal = await getDealById(id);

  return {
    deal: deal ?? ({ id, score: response.data.score } as Deal),
    didVote: response.data.didVote,
    viewerVote: response.data.viewerVote,
  };
}

export async function deleteDeal(id: string) {
  await strapiRequest(`/api/deals/${id}`, {
    method: "DELETE",
    requireToken: true,
  });

  return true;
}
