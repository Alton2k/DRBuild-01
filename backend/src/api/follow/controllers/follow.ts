import { factories } from "@strapi/strapi";

function getFirstQueryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function getQueryString(value: unknown) {
  const resolvedValue = getFirstQueryValue(value);

  return typeof resolvedValue === "string" ? resolvedValue.trim() : "";
}

function getCountValue(row: Record<string, unknown> | undefined) {
  const value = row?.count;
  const count = typeof value === "bigint" ? Number(value) : Number(value ?? 0);

  return Number.isFinite(count) ? count : 0;
}

export default factories.createCoreController("api::follow.follow", ({ strapi }) => ({
  async summary(ctx) {
    const userId = getQueryString(ctx.query.userId);
    const viewerUserId = getQueryString(ctx.query.viewerUserId);

    if (!userId) {
      return ctx.badRequest("userId is required.");
    }

    const follows = strapi.db.connection("follows");
    const [followersRow, followingRow, viewerFollow] = await Promise.all([
      follows.clone().where({ following_user_id: userId }).count({ count: "*" }).first(),
      follows.clone().where({ follower_user_id: userId }).count({ count: "*" }).first(),
      viewerUserId && viewerUserId !== userId
        ? follows
            .clone()
            .select("id")
            .where({ follower_user_id: viewerUserId, following_user_id: userId })
            .first()
        : Promise.resolve(null),
    ]);

    ctx.body = {
      data: {
        followers: getCountValue(followersRow),
        following: getCountValue(followingRow),
        viewerIsFollowing: Boolean(viewerFollow),
      },
    };
  },

  async create(ctx) {
    const data = ctx.request.body?.data;
    const followerUserId =
      typeof data?.followerUserId === "string" ? data.followerUserId.trim() : "";
    const followingUserId =
      typeof data?.followingUserId === "string" ? data.followingUserId.trim() : "";

    if (!followerUserId || !followingUserId) {
      return ctx.badRequest("followerUserId and followingUserId are required.");
    }

    if (followerUserId === followingUserId) {
      return ctx.badRequest("Users cannot follow themselves.");
    }

    const existing = await strapi.db.query("api::follow.follow").findOne({
      where: { followerUserId, followingUserId },
    });

    if (existing) {
      return ctx.conflict("This user is already followed.");
    }

    ctx.request.body.data = {
      ...data,
      followerUserId,
      followingUserId,
    };

    return super.create(ctx);
  },
}));
