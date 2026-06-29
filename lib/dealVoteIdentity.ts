export function getAuthenticatedDealVoteViewerId(userId: string | undefined) {
  return userId ? `user:${userId}` : undefined;
}

export function getAnonymousDealVoteViewerId(viewerId: string | undefined) {
  return viewerId ? `anon:${viewerId}` : undefined;
}

export function getDealVoteViewerId({
  userId,
  anonymousViewerId,
}: {
  userId?: string;
  anonymousViewerId?: string;
}) {
  return getAuthenticatedDealVoteViewerId(userId) ?? getAnonymousDealVoteViewerId(anonymousViewerId);
}

export function getDealVoteViewerAliases({
  userId,
  anonymousViewerId,
}: {
  userId?: string;
  anonymousViewerId?: string;
}) {
  return [
    getAuthenticatedDealVoteViewerId(userId),
    getAnonymousDealVoteViewerId(anonymousViewerId),
    anonymousViewerId,
  ].filter((value): value is string => Boolean(value));
}
