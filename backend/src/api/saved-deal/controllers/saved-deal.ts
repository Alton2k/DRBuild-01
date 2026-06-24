import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::saved-deal.saved-deal", ({ strapi }) => ({
  async create(ctx) {
    const data = ctx.request.body?.data;
    const userId = typeof data?.userId === "string" ? data.userId.trim() : "";
    const dealDocumentId =
      typeof data?.dealDocumentId === "string" ? data.dealDocumentId.trim() : "";

    if (!userId || !dealDocumentId) {
      return ctx.badRequest("userId and dealDocumentId are required.");
    }

    const existing = await strapi.db.query("api::saved-deal.saved-deal").findOne({
      where: { userId, dealDocumentId },
    });

    if (existing) {
      return ctx.conflict("This deal is already saved by this user.");
    }

    return super.create(ctx);
  },
}));
