import "server-only";

import { toDeal, type Deal } from "./deals";
import {
  getStrapiEntityFields,
  getStrapiEntityId,
  StrapiRequestError,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";
import { dataFetchErrorResult, type DataResult } from "./dataResult";

export interface SavedDeal {
  id: string;
  userId: string;
  dealDocumentId: string;
  savedAt: string;
  deal: Deal;
}

type StrapiSavedDeal = {
  userId?: string;
  dealDocumentId?: string;
  createdAt?: string;
  deal?: Parameters<typeof toDeal>[0];
};

export type SavedDealListResult = DataResult<SavedDeal[]>;

function toSavedDeal(entity: Parameters<typeof getStrapiEntityFields<StrapiSavedDeal>>[0]): SavedDeal | null {
  const fields = getStrapiEntityFields(entity);

  if (!fields.deal) {
    return null;
  }

  return {
    id: getStrapiEntityId(entity),
    userId: fields.userId ?? "",
    dealDocumentId: fields.dealDocumentId ?? "",
    savedAt: fields.createdAt ?? new Date().toISOString(),
    deal: toDeal(fields.deal),
  };
}

function getSavedDealQuery(userId: string) {
  return new URLSearchParams({
    "filters[userId][$eq]": userId,
    sort: "createdAt:desc",
    populate: "deal",
  });
}

export async function getSavedDealsForUserResult(userId: string): Promise<SavedDealListResult> {
  const query = getSavedDealQuery(userId);

  try {
    const response = await strapiRequest<StrapiListResponse<StrapiSavedDeal>>("/api/saved-deals", { query });
    const savedDeals = response.data
      .map(toSavedDeal)
      .filter((savedDeal): savedDeal is SavedDeal => Boolean(savedDeal));

    return { ok: true, data: savedDeals };
  } catch (error) {
    return dataFetchErrorResult(
      { functionName: "getSavedDealsForUserResult", endpoint: "/api/saved-deals", query },
      error,
    );
  }
}

export async function getSavedDealIdsForUser(userId: string) {
  const pageSize = 100;
  const savedDealIds = new Set<string>();
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      "filters[userId][$eq]": userId,
      "fields[0]": "dealDocumentId",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
    });
    const response = await strapiRequest<StrapiListResponse<StrapiSavedDeal>>("/api/saved-deals", { query }).catch(
      () => null,
    );

    if (!response) {
      return savedDealIds;
    }

    for (const entity of response.data) {
      const fields = getStrapiEntityFields(entity);

      if (fields.dealDocumentId) {
        savedDealIds.add(fields.dealDocumentId);
      }
    }

    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return savedDealIds;
}

async function findSavedDeal(userId: string, dealDocumentId: string) {
  const query = new URLSearchParams({
    "filters[userId][$eq]": userId,
    "filters[dealDocumentId][$eq]": dealDocumentId,
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiSavedDeal>>("/api/saved-deals", { query });

  return response.data[0] ?? null;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof StrapiRequestError &&
    (error.status === 409 || /unique|duplicate/i.test(error.message))
  );
}

export async function saveDealForUser(userId: string, dealDocumentId: string) {
  const existing = await findSavedDeal(userId, dealDocumentId);

  if (existing) {
    return true;
  }

  try {
    await strapiRequest<StrapiSingleResponse<StrapiSavedDeal>>("/api/saved-deals", {
      method: "POST",
      requireToken: true,
      body: {
        data: {
          userId,
          dealDocumentId,
          deal: dealDocumentId,
        },
      },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }
  }

  return true;
}

export async function unsaveDealForUser(userId: string, dealDocumentId: string) {
  const existing = await findSavedDeal(userId, dealDocumentId);

  if (!existing) {
    return false;
  }

  await strapiRequest(`/api/saved-deals/${getStrapiEntityId(existing)}`, {
    method: "DELETE",
    requireToken: true,
  });

  return false;
}
