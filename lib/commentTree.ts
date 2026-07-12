export function getCommentTreeDeleteOrder(
  rootId: string,
  comments: Array<{ id: string; parentId?: string | null }>,
) {
  const childrenByParentId = new Map<string, string[]>();
  for (const comment of comments) {
    if (!comment.parentId) continue;
    childrenByParentId.set(comment.parentId, [...(childrenByParentId.get(comment.parentId) ?? []), comment.id]);
  }

  const order: string[] = [];
  const visited = new Set<string>();
  const visit = (commentId: string) => {
    if (visited.has(commentId)) return;
    visited.add(commentId);
    for (const childId of childrenByParentId.get(commentId) ?? []) visit(childId);
    order.push(commentId);
  };
  visit(rootId);
  return order;
}
