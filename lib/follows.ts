import "server-only";

import {
  getStrapiEntityFields,
  getStrapiEntityId,
  StrapiRequestError,
  strapiRequest,
  type StrapiListResponse,
  type StrapiSingleResponse,
} from "./strapi";

type StrapiFollow = {
  followerUserId?: string;
  followingUserId?: string;
  createdAt?: string;
};

export type FollowCounts = {
  followers: number;
  following: number;
};

export type FollowSummary = FollowCounts & {
  viewerIsFollowing: boolean;
};

type StrapiFollowSummaryResponse = {
  data?: Partial<FollowSummary>;
};

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof StrapiRequestError &&
    (error.status === 409 || /unique|duplicate/i.test(error.message))
  );
}

async function findFollow(followerUserId: string, followingUserId: string) {
  const query = new URLSearchParams({
    "filters[followerUserId][$eq]": followerUserId,
    "filters[followingUserId][$eq]": followingUserId,
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiFollow>>("/api/follows", {
    query,
    requireToken: true,
  });

  return response.data[0] ?? null;
}

async function getFollowCount(fieldName: "followerUserId" | "followingUserId", userId: string) {
  const query = new URLSearchParams({
    [`filters[${fieldName}][$eq]`]: userId,
    "pagination[pageSize]": "1",
  });
  const response = await strapiRequest<StrapiListResponse<StrapiFollow>>("/api/follows", {
    query,
    requireToken: true,
  }).catch(() => null);

  return response?.meta?.pagination?.total ?? 0;
}

export async function getFollowCountsForUser(userId: string): Promise<FollowCounts> {
  const summary = await getFollowSummaryForUser(userId);

  return {
    followers: summary.followers,
    following: summary.following,
  };
}

export async function getFollowSummaryForUser(userId: string, viewerUserId?: string): Promise<FollowSummary> {
  if (!userId) {
    return { followers: 0, following: 0, viewerIsFollowing: false };
  }

  const query = new URLSearchParams({ userId });

  if (viewerUserId && viewerUserId !== userId) {
    query.set("viewerUserId", viewerUserId);
  }

  const response = await strapiRequest<StrapiFollowSummaryResponse>("/api/follow-summary", {
    query,
    requireToken: true,
  }).catch(() => null);

  if (!response?.data) {
    const [followers, following, viewerIsFollowing] = await Promise.all([
      getFollowCount("followingUserId", userId),
      getFollowCount("followerUserId", userId),
      isFollowingUser(viewerUserId, userId),
    ]);

    return { followers, following, viewerIsFollowing };
  }

  return {
    followers: Number(response.data.followers ?? 0),
    following: Number(response.data.following ?? 0),
    viewerIsFollowing: Boolean(response.data.viewerIsFollowing),
  };
}

export async function isFollowingUser(followerUserId: string | undefined, followingUserId: string) {
  if (!followerUserId || followerUserId === followingUserId) {
    return false;
  }

  return Boolean(await findFollow(followerUserId, followingUserId).catch(() => null));
}

export async function getFollowedUserIdsForUser(userId: string) {
  const followedUserIds = new Set<string>();
  const pageSize = 100;
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      "filters[followerUserId][$eq]": userId,
      "fields[0]": "followingUserId",
      sort: "createdAt:desc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
    });
    const response = await strapiRequest<StrapiListResponse<StrapiFollow>>("/api/follows", {
      query,
      requireToken: true,
    }).catch(() => null);

    if (!response) {
      return followedUserIds;
    }

    for (const entity of response.data) {
      const fields = getStrapiEntityFields(entity);

      if (fields.followingUserId) {
        followedUserIds.add(fields.followingUserId);
      }
    }

    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return followedUserIds;
}

export async function getFollowerUserIdsForUser(userId: string) {
  const followerUserIds = new Set<string>();
  const pageSize = 100;
  let page = 1;
  let pageCount = 1;

  do {
    const query = new URLSearchParams({
      "filters[followingUserId][$eq]": userId,
      "fields[0]": "followerUserId",
      sort: "createdAt:desc",
      "pagination[page]": String(page),
      "pagination[pageSize]": String(pageSize),
    });
    const response = await strapiRequest<StrapiListResponse<StrapiFollow>>("/api/follows", {
      query,
      requireToken: true,
    }).catch(() => null);

    if (!response) return followerUserIds;
    for (const entity of response.data) {
      const fields = getStrapiEntityFields(entity);
      if (fields.followerUserId) followerUserIds.add(fields.followerUserId);
    }
    pageCount = response.meta?.pagination?.pageCount ?? 1;
    page += 1;
  } while (page <= pageCount);

  return followerUserIds;
}

export async function followUser(followerUserId: string, followingUserId: string) {
  if (!followerUserId || !followingUserId || followerUserId === followingUserId) {
    return false;
  }

  try {
    await strapiRequest<StrapiSingleResponse<StrapiFollow>>("/api/follows", {
      method: "POST",
      requireToken: true,
      body: {
        data: {
          followerUserId,
          followingUserId,
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

export async function unfollowUser(followerUserId: string, followingUserId: string) {
  if (!followerUserId || !followingUserId || followerUserId === followingUserId) {
    return false;
  }

  const existing = await findFollow(followerUserId, followingUserId);

  if (!existing) {
    return false;
  }

  await strapiRequest(`/api/follows/${getStrapiEntityId(existing)}`, {
    method: "DELETE",
    requireToken: true,
  });

  return false;
}
