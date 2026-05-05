import "server-only";

import { getDb } from "./db";

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

interface CommentRow {
  id: string;
  deal_id: string;
  parent_id: string | null;
  author_viewer_id: string | null;
  author_name: string;
  body: string;
  like_count: number;
  created_at: string;
}

interface CommentLikeRow {
  comment_id: string;
  viewer_id: string;
}

const commentColumns = `
  c.id,
  c.deal_id,
  c.parent_id,
  c.author_viewer_id,
  c.author_name,
  c.body,
  COUNT(cl.viewer_id) AS like_count,
  c.created_at
`;

function rowToComment(row: CommentRow, likedBy: string[] = []): Comment {
  return {
    id: row.id,
    dealId: row.deal_id,
    parentId: row.parent_id,
    authorViewerId: row.author_viewer_id,
    authorName: row.author_name,
    body: row.body,
    likeCount: row.like_count,
    likedBy,
    createdAt: row.created_at,
  };
}

function getCommentDealIdSync(id: string) {
  const row = getDb()
    .prepare("SELECT deal_id FROM comments WHERE id = ?")
    .get(id) as { deal_id: string } | undefined;

  return row?.deal_id ?? null;
}

function getCommentByIdSync(dealId: string, id: string) {
  const row = getDb()
    .prepare(`
      SELECT ${commentColumns}
      FROM comments c
      LEFT JOIN comment_likes cl ON cl.comment_id = c.id
      WHERE c.deal_id = ? AND c.id = ?
      GROUP BY c.id
    `)
    .get(dealId, id) as CommentRow | undefined;

  if (!row) {
    return null;
  }

  const likedBy = getDb()
    .prepare("SELECT viewer_id FROM comment_likes WHERE comment_id = ? ORDER BY created_at")
    .all(id) as Pick<CommentLikeRow, "viewer_id">[];

  return rowToComment(
    row,
    likedBy.map((like) => like.viewer_id),
  );
}

export async function getCommentsForDeal(dealId: string) {
  const rows = getDb()
    .prepare(`
      SELECT ${commentColumns}
      FROM comments c
      LEFT JOIN comment_likes cl ON cl.comment_id = c.id
      WHERE c.deal_id = ?
      GROUP BY c.id
      ORDER BY c.created_at
    `)
    .all(dealId) as CommentRow[];

  if (rows.length === 0) {
    return [];
  }

  const likes = getDb()
    .prepare(`
      SELECT cl.comment_id, cl.viewer_id
      FROM comment_likes cl
      INNER JOIN comments c ON c.id = cl.comment_id
      WHERE c.deal_id = ?
      ORDER BY cl.created_at
    `)
    .all(dealId) as CommentLikeRow[];
  const likesByCommentId = new Map<string, string[]>();

  for (const like of likes) {
    const likedBy = likesByCommentId.get(like.comment_id) ?? [];
    likedBy.push(like.viewer_id);
    likesByCommentId.set(like.comment_id, likedBy);
  }

  return rows.map((row) => rowToComment(row, likesByCommentId.get(row.id) ?? []));
}

export async function getCommentCountsByDealIds(dealIds: string[]) {
  const requestedDealIds = Array.from(new Set(dealIds));
  const counts = new Map<string, number>();

  for (const dealId of requestedDealIds) {
    counts.set(dealId, 0);
  }

  if (requestedDealIds.length === 0) {
    return counts;
  }

  const placeholders = requestedDealIds.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`
      SELECT deal_id, COUNT(*) AS count
      FROM comments
      WHERE deal_id IN (${placeholders})
      GROUP BY deal_id
    `)
    .all(...requestedDealIds) as { deal_id: string; count: number }[];

  for (const row of rows) {
    counts.set(row.deal_id, row.count);
  }

  return counts;
}

export async function getAdminComments() {
  const rows = getDb()
    .prepare(`
      SELECT
        c.id,
        c.deal_id,
        d.title AS deal_title,
        c.parent_id,
        c.author_name,
        c.body,
        COUNT(cl.viewer_id) AS like_count,
        c.created_at
      FROM comments c
      INNER JOIN deals d ON d.id = c.deal_id
      LEFT JOIN comment_likes cl ON cl.comment_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)
    .all() as {
    id: string;
    deal_id: string;
    deal_title: string;
    parent_id: string | null;
    author_name: string;
    body: string;
    like_count: number;
    created_at: string;
  }[];

  return rows.map((row) => ({
    id: row.id,
    dealId: row.deal_id,
    dealTitle: row.deal_title,
    parentId: row.parent_id,
    authorName: row.author_name,
    body: row.body,
    likeCount: row.like_count,
    createdAt: row.created_at,
  }));
}

export async function createComment(input: NewCommentInput) {
  const now = new Date().toISOString();
  const comment: Comment = {
    id: crypto.randomUUID(),
    dealId: input.dealId,
    parentId: input.parentId ?? null,
    authorViewerId: input.authorViewerId ?? null,
    authorName: input.authorName,
    body: input.body,
    likeCount: 0,
    likedBy: [],
    createdAt: now,
  };

  getDb()
    .prepare(`
      INSERT INTO comments (
        id,
        deal_id,
        parent_id,
        author_viewer_id,
        author_name,
        body,
        created_at
      ) VALUES (
        @id,
        @dealId,
        @parentId,
        @authorViewerId,
        @authorName,
        @body,
        @createdAt
      )
    `)
    .run(comment);

  return comment;
}

export async function deleteComment(id: string) {
  const dealId = getCommentDealIdSync(id);

  if (!dealId) {
    return null;
  }

  getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);

  return { dealId };
}

export async function deleteOwnComment(id: string, viewerId: string) {
  const row = getDb()
    .prepare("SELECT deal_id FROM comments WHERE id = ? AND author_viewer_id = ?")
    .get(id, viewerId) as { deal_id: string } | undefined;

  if (!row) {
    return null;
  }

  getDb().prepare("DELETE FROM comments WHERE id = ?").run(id);

  return { dealId: row.deal_id };
}

export async function likeComment(dealId: string, id: string, viewerId: string) {
  const db = getDb();
  const comment = getCommentByIdSync(dealId, id);

  if (!comment) {
    return null;
  }

  const result = db
    .prepare(`
      INSERT OR IGNORE INTO comment_likes (
        comment_id,
        viewer_id,
        created_at
      ) VALUES (
        ?,
        ?,
        ?
      )
    `)
    .run(id, viewerId, new Date().toISOString());

  if (result.changes === 0) {
    return {
      comment,
      didLike: false,
    };
  }

  return {
    comment: getCommentByIdSync(dealId, id) ?? comment,
    didLike: true,
  };
}
