export function isCommentOwnedBy(
  comment: { authorViewerId?: string | null; authorUserId?: string | null },
  ownership: { viewerId?: string | null; authorUserId?: string | null },
) {
  const ownsByViewer = Boolean(ownership.viewerId && comment.authorViewerId === ownership.viewerId);
  const ownsByUser = Boolean(ownership.authorUserId && comment.authorUserId === ownership.authorUserId);
  return ownsByViewer || ownsByUser;
}
