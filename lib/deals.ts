import "server-only";

import { getDb } from "./db";

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

interface DealRow {
  id: string;
  title: string;
  url: string;
  price: number;
  original_price: number | null;
  store: string;
  category: string;
  sub_category: string;
  description: string;
  image_url: string;
  uploaded_image_url: string;
  image_gallery_urls: string;
  score: number;
  status: DealStatus;
  moderation_reason: string;
  is_expired: 0 | 1;
  expired_at: string | null;
  duplicate_of_deal_id: string | null;
  duplicate_reason: string;
  report_count: number;
  author_user_id: string | null;
  author_email: string;
  author_name: string;
  created_at: string;
}

const dealColumns = `
  d.id,
  d.title,
  d.url,
  d.price,
  d.original_price,
  d.store,
  d.category,
  d.sub_category,
  d.description,
  d.image_url,
  d.uploaded_image_url,
  d.image_gallery_urls,
  (
    SELECT COUNT(*)
    FROM deal_votes dv
    WHERE dv.deal_id = d.id AND dv.direction = 'up'
  ) - (
    SELECT COUNT(*)
    FROM deal_votes dv
    WHERE dv.deal_id = d.id AND dv.direction = 'down'
  ) AS score,
  d.status,
  d.moderation_reason,
  d.is_expired,
  d.expired_at,
  d.duplicate_of_deal_id,
  d.duplicate_reason,
  (
    SELECT COUNT(*)
    FROM deal_reports dr
    WHERE dr.deal_id = d.id
  ) AS report_count,
  d.author_user_id,
  d.author_email,
  d.author_name,
  d.created_at
`;

function rowToDeal(row: DealRow): Deal {
  const imageGalleryUrls = parseImageGalleryUrls(row.image_gallery_urls);

  return {
    id: row.id,
    title: row.title,
    url: row.url,
    price: row.price,
    originalPrice: row.original_price,
    store: row.store,
    category: row.category,
    subCategory: row.sub_category,
    description: row.description,
    imageUrl: row.image_url,
    uploadedImageUrl: row.uploaded_image_url,
    imageGalleryUrls,
    score: row.score,
    status: row.status,
    moderationReason: row.moderation_reason,
    isExpired: Boolean(row.is_expired),
    ...(row.expired_at ? { expiredAt: row.expired_at } : {}),
    ...(row.duplicate_of_deal_id ? { duplicateOfDealId: row.duplicate_of_deal_id } : {}),
    ...(row.duplicate_reason ? { duplicateReason: row.duplicate_reason } : {}),
    reportCount: row.report_count,
    ...(row.author_user_id ? { authorUserId: row.author_user_id } : {}),
    authorEmail: row.author_email,
    authorName: row.author_name,
    createdAt: row.created_at,
  };
}

function parseImageGalleryUrls(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];
  } catch {
    return [];
  }
}

function normalizeSearchValue(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function escapeLikeValue(value: string) {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function normalizeDealUrl(value: string) {
  try {
    const parsed = new URL(value.trim());
    parsed.hash = "";
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");

    const keptParams = Array.from(parsed.searchParams.entries())
      .filter(([key]) => {
        const lowerKey = key.toLowerCase();
        return (
          !lowerKey.startsWith("utm_") &&
          !["fbclid", "gclid", "msclkid", "ref", "referrer", "spm"].includes(lowerKey)
        );
      })
      .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey));

    parsed.search = "";
    for (const [key, paramValue] of keptParams) {
      parsed.searchParams.append(key, paramValue);
    }

    const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.hostname}${pathname}${parsed.search}`.toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function normalizeStore(value: string) {
  return value.trim().toLowerCase();
}

function getTitleTokens(value: string) {
  const stopWords = new Set([
    "a",
    "an",
    "and",
    "deal",
    "for",
    "free",
    "in",
    "myr",
    "off",
    "only",
    "rm",
    "sale",
    "the",
    "with",
  ]);

  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function getTokenSimilarity(firstTitle: string, secondTitle: string) {
  const firstTokens = getTitleTokens(firstTitle);
  const secondTokens = getTitleTokens(secondTitle);

  if (firstTokens.size === 0 || secondTokens.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const token of firstTokens) {
    if (secondTokens.has(token)) {
      shared += 1;
    }
  }

  return (2 * shared) / (firstTokens.size + secondTokens.size);
}

function getApprovedDealsOrderBy(feed: DealFeedMode = "hot") {
  if (feed === "new") {
    return "d.created_at DESC";
  }

  if (feed === "discussed") {
    return `
      (
        SELECT COUNT(*)
        FROM comments c
        WHERE c.deal_id = d.id
      ) DESC,
      d.created_at DESC
    `;
  }

  return "score DESC, d.created_at DESC";
}

function getDealByIdSync(id: string) {
  const row = getDb()
    .prepare(`SELECT ${dealColumns} FROM deals d WHERE d.id = ?`)
    .get(id) as DealRow | undefined;

  return row ? rowToDeal(row) : null;
}

export async function getDeals() {
  const rows = getDb()
    .prepare(`SELECT ${dealColumns} FROM deals d ORDER BY d.created_at DESC`)
    .all() as DealRow[];

  return rows.map(rowToDeal);
}

export async function getAuthorDealModerationStats(authorUserId: string) {
  const row = getDb()
    .prepare(`
      SELECT
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_count,
        COUNT(*) AS total_count
      FROM deals
      WHERE author_user_id = ?
    `)
    .get(authorUserId) as {
    approved_count: number | null;
    rejected_count: number | null;
    total_count: number;
  };

  return {
    approvedCount: row.approved_count ?? 0,
    rejectedCount: row.rejected_count ?? 0,
    totalCount: row.total_count,
  };
}

export async function getApprovedDeals(filters: ApprovedDealFilters = {}) {
  const where = ["d.status = 'approved'", "d.is_expired = 0"];
  const params: Record<string, string> = {};
  const orderBy = getApprovedDealsOrderBy(filters.feed);

  const category = normalizeSearchValue(filters.category);
  const subCategory = normalizeSearchValue(filters.subCategory);
  const query = normalizeSearchValue(filters.q);

  if (category) {
    where.push("lower(d.category) = @category");
    params.category = category;
  }

  if (subCategory) {
    where.push("lower(d.sub_category) = @subCategory");
    params.subCategory = subCategory;
  }

  if (query) {
    where.push(`(
      lower(d.title) LIKE @query ESCAPE '\\' OR
      lower(d.description) LIKE @query ESCAPE '\\' OR
      lower(d.store) LIKE @query ESCAPE '\\' OR
      lower(d.category) LIKE @query ESCAPE '\\' OR
      lower(d.sub_category) LIKE @query ESCAPE '\\'
    )`);
    params.query = `%${escapeLikeValue(query)}%`;
  }

  const rows = getDb()
    .prepare(`
      SELECT ${dealColumns}
      FROM deals d
      WHERE ${where.join(" AND ")}
      ORDER BY ${orderBy}
    `)
    .all(params) as DealRow[];

  return rows.map(rowToDeal);
}

export async function searchApprovedDeals(filters: ApprovedDealFilters) {
  return getApprovedDeals(filters);
}

export async function getDealById(id: string) {
  return getDealByIdSync(id);
}

export async function getDealVoteDirection(id: string, viewerId: string | undefined) {
  if (!viewerId) {
    return null;
  }

  const row = getDb()
    .prepare("SELECT direction FROM deal_votes WHERE deal_id = ? AND viewer_id = ?")
    .get(id, viewerId) as { direction: DealVoteDirection } | undefined;

  return row?.direction ?? null;
}

export async function getDealVoteDirectionsByDealIds(
  dealIds: string[],
  viewerId: string | undefined,
) {
  const requestedDealIds = Array.from(new Set(dealIds));
  const votes = new Map<string, DealVoteDirection | null>();

  for (const dealId of requestedDealIds) {
    votes.set(dealId, null);
  }

  if (!viewerId || requestedDealIds.length === 0) {
    return votes;
  }

  const placeholders = requestedDealIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`
      SELECT deal_id, direction
      FROM deal_votes
      WHERE viewer_id = ? AND deal_id IN (${placeholders})
    `)
    .all(viewerId, ...requestedDealIds) as {
    deal_id: string;
    direction: DealVoteDirection;
  }[];

  for (const row of rows) {
    votes.set(row.deal_id, row.direction);
  }

  return votes;
}

export async function findDuplicateDeal(input: Pick<NewDealInput, "title" | "url" | "store">) {
  const normalizedUrl = normalizeDealUrl(input.url);
  const normalizedStore = normalizeStore(input.store);
  const rows = getDb()
    .prepare(`
      SELECT ${dealColumns}
      FROM deals d
      WHERE d.status <> 'rejected' AND d.is_expired = 0
      ORDER BY d.created_at DESC
    `)
    .all() as DealRow[];

  let bestMatch: DuplicateDealMatch | null = null;

  for (const row of rows) {
    const deal = rowToDeal(row);
    const sameUrl = normalizeDealUrl(deal.url) === normalizedUrl;
    const titleSimilarity = getTokenSimilarity(input.title, deal.title);
    const sameStore = normalizeStore(deal.store) === normalizedStore;

    let score = 0;
    let reason = "";

    if (sameUrl) {
      score = 1;
      reason = "Someone already posted this product. Try sharing a different deal.";
    } else if (titleSimilarity >= 0.82) {
      score = titleSimilarity;
      reason = `Very similar title to "${deal.title}".`;
    } else if (sameStore && titleSimilarity >= 0.68) {
      score = titleSimilarity;
      reason = `Same store and similar title to "${deal.title}".`;
    }

    if (reason && (!bestMatch || score > bestMatch.score)) {
      bestMatch = {
        deal: {
          id: deal.id,
          title: deal.title,
          store: deal.store,
          url: deal.url,
          status: deal.status,
          createdAt: deal.createdAt,
        },
        reason,
        score,
      };
    }
  }

  return bestMatch;
}

export async function createDeal(input: NewDealInput) {
  const now = new Date().toISOString();
  const deal: Deal = {
    id: crypto.randomUUID(),
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
    status: input.status ?? "pending",
    moderationReason: input.moderationReason ?? "new_user_manual_review",
    isExpired: false,
    ...(input.duplicateOfDealId ? { duplicateOfDealId: input.duplicateOfDealId } : {}),
    ...(input.duplicateReason ? { duplicateReason: input.duplicateReason } : {}),
    reportCount: 0,
    ...(input.authorUserId ? { authorUserId: input.authorUserId } : {}),
    authorEmail: input.authorEmail ?? "",
    authorName: input.authorName ?? "",
    createdAt: now,
  };

  getDb()
    .prepare(`
      INSERT INTO deals (
        id,
        title,
        url,
        price,
        original_price,
        store,
        category,
        sub_category,
        description,
        image_url,
        uploaded_image_url,
        image_gallery_urls,
        score,
        status,
        moderation_reason,
        is_expired,
        expired_at,
        duplicate_of_deal_id,
        duplicate_reason,
        report_count,
        author_user_id,
        author_email,
        author_name,
        created_at
      ) VALUES (
        @id,
        @title,
        @url,
        @price,
        @originalPrice,
        @store,
        @category,
        @subCategory,
        @description,
        @imageUrl,
        @uploadedImageUrl,
        @imageGalleryUrls,
        @score,
        @status,
        @moderationReason,
        @isExpired,
        @expiredAt,
        @duplicateOfDealId,
        @duplicateReason,
        @reportCount,
        @authorUserId,
        @authorEmail,
        @authorName,
        @createdAt
      )
    `)
    .run({
      ...deal,
      isExpired: 0,
      expiredAt: null,
      duplicateOfDealId: input.duplicateOfDealId ?? null,
      duplicateReason: input.duplicateReason ?? "",
      authorUserId: input.authorUserId ?? null,
      imageGalleryUrls: JSON.stringify(input.imageGalleryUrls ?? []),
    });

  return deal;
}

export async function updateDealStatus(id: string, status: DealStatus, moderationReason = "admin_manual_update") {
  const result = getDb()
    .prepare("UPDATE deals SET status = ?, moderation_reason = ? WHERE id = ?")
    .run(status, moderationReason, id);

  return result.changes > 0 ? getDealByIdSync(id) : null;
}

export async function markDealExpired(id: string) {
  const expiredAt = new Date().toISOString();
  const result = getDb()
    .prepare("UPDATE deals SET is_expired = 1, expired_at = ? WHERE id = ?")
    .run(expiredAt, id);

  return result.changes > 0 ? getDealByIdSync(id) : null;
}

export async function reportDeal(id: string, viewerId: string, reason: string) {
  const db = getDb();
  const deal = getDealByIdSync(id);

  if (!deal) {
    return null;
  }

  const result = db
    .prepare(`
      INSERT OR IGNORE INTO deal_reports (
        id,
        deal_id,
        viewer_id,
        reason,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `)
    .run(crypto.randomUUID(), id, viewerId, reason, new Date().toISOString());

  return {
    deal: getDealByIdSync(id) ?? deal,
    didReport: result.changes > 0,
  };
}

export async function restoreReportedDeal(id: string) {
  const db = getDb();
  const restoreTransaction = db.transaction((dealId: string) => {
    const result = db
      .prepare(`
      UPDATE deals
      SET status = 'approved',
          moderation_reason = 'admin_restored_reported',
          is_expired = 0,
          expired_at = NULL,
          report_count = 0
      WHERE id = ?
    `)
      .run(dealId);

    if (result.changes > 0) {
      db.prepare("DELETE FROM deal_reports WHERE deal_id = ?").run(dealId);
    }

    return result.changes;
  });

  return restoreTransaction(id) > 0 ? getDealByIdSync(id) : null;
}

export async function voteDeal(id: string, viewerId: string, direction: DealVoteDirection) {
  const db = getDb();
  const deal = getDealByIdSync(id);

  if (!deal) {
    return null;
  }

  const result = db
    .prepare(`
      INSERT INTO deal_votes (
        id,
        deal_id,
        viewer_id,
        direction,
        created_at
      ) VALUES (
        ?,
        ?,
        ?,
        ?,
        ?
      )
      ON CONFLICT (deal_id, viewer_id) DO UPDATE
      SET direction = excluded.direction
      WHERE deal_votes.direction <> excluded.direction
    `)
    .run(crypto.randomUUID(), id, viewerId, direction, new Date().toISOString());

  return {
    deal: getDealByIdSync(id) ?? deal,
    didVote: result.changes > 0,
  };
}

export async function deleteDeal(id: string) {
  const result = getDb().prepare("DELETE FROM deals WHERE id = ?").run(id);

  return result.changes > 0;
}
