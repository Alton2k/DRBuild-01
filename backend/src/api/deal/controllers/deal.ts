/**
 * deal controller
 */

import { factories } from "@strapi/strapi";
import { randomUUID } from "crypto";

type VoteDirection = "up" | "down";

const voteValueByDirection: Record<VoteDirection, number> = {
  up: 1,
  down: -1,
};

function getVoteDirectionFromBody(body: unknown): VoteDirection | null | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const value = (body as { direction?: unknown; voteType?: unknown; value?: unknown }).direction ??
    (body as { voteType?: unknown }).voteType ??
    (body as { value?: unknown }).value;

  if (value === "up" || value === 1 || value === "1") {
    return "up";
  }

  if (value === "down" || value === -1 || value === "-1") {
    return "down";
  }

  if (value === null || value === 0 || value === "0") {
    return null;
  }

  return undefined;
}

function getVoteValue(direction: VoteDirection | null | undefined) {
  return direction ? voteValueByDirection[direction] : 0;
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

export default factories.createCoreController("api::deal.deal", ({ strapi }) => ({
  async vote(ctx) {
    const dealParam = String(ctx.params.id ?? "").trim();
    const viewerId = typeof ctx.request.body?.viewerId === "string" ? ctx.request.body.viewerId.trim() : "";
    const userId = typeof ctx.request.body?.userId === "string" ? ctx.request.body.userId.trim() : "";
    const viewerAliases = Array.isArray(ctx.request.body?.viewerAliases)
      ? ctx.request.body.viewerAliases
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];
    const requestedDirection = getVoteDirectionFromBody(ctx.request.body);

    if (!dealParam) {
      return ctx.badRequest("Missing deal id.");
    }

    if (!viewerId) {
      return ctx.badRequest("Missing viewerId.");
    }

    if (requestedDirection === undefined) {
      return ctx.badRequest("Vote must be up, down, 1, -1, or 0.");
    }

    const result = await strapi.db.transaction(async ({ trx }) => {
      const dealQuery = strapi.db.connection("deals").where("document_id", dealParam);

      if (/^\d+$/.test(dealParam)) {
        dealQuery.orWhere("id", Number(dealParam));
      }

      const lockedDealQuery = dealQuery.transacting(trx).select("id", "document_id", "score").first();

      if (!["sqlite", "sqlite3", "better-sqlite3"].includes(strapi.db.dialect.client)) {
        lockedDealQuery.forUpdate();
      }

      const deal = await lockedDealQuery;

      if (!deal) {
        return null;
      }

      const dealDocumentId = String(deal.document_id);
      const viewerIds = Array.from(new Set([viewerId, ...viewerAliases].filter(Boolean)));
      const userVote = userId
        ? await strapi.db.query("api::deal-vote.deal-vote").findOne({
            where: {
              dealDocumentId,
              userId,
            },
          })
        : null;
      const viewerVote = userVote
        ? null
        : await strapi.db.query("api::deal-vote.deal-vote").findOne({
            where: {
              dealDocumentId,
              viewerId: { $in: viewerIds },
            },
          });
      const existingVote = userVote ?? viewerVote;
      const existingDirection =
        existingVote?.direction === "up" || existingVote?.direction === "down" ? existingVote.direction : null;
      const nextDirection = requestedDirection === null || existingDirection === requestedDirection
        ? null
        : requestedDirection;
      let currentVote = nextDirection;
      let scoreDelta = getVoteValue(nextDirection) - getVoteValue(existingDirection);

      if (existingVote && nextDirection === null) {
        await strapi.db.query("api::deal-vote.deal-vote").delete({
          where: { id: existingVote.id },
        });
      } else if (existingVote && nextDirection) {
        await strapi.db.query("api::deal-vote.deal-vote").update({
          where: { id: existingVote.id },
          data: {
            direction: nextDirection,
            viewerId,
            ...(userId ? { userId } : {}),
          },
        });
      } else if (nextDirection) {
        try {
          await strapi.db.query("api::deal-vote.deal-vote").create({
            data: {
              documentId: randomUUID(),
              deal: deal.id,
              dealDocumentId,
              viewerId,
              ...(userId ? { userId } : {}),
              direction: nextDirection,
            },
          });
        } catch (error) {
          if (!isUniqueConstraintError(error)) {
            throw error;
          }

          const duplicateVote = await strapi.db.query("api::deal-vote.deal-vote").findOne({
            where: {
              dealDocumentId,
              ...(userId ? { userId } : { viewerId }),
            },
          });

          currentVote =
            duplicateVote?.direction === "up" || duplicateVote?.direction === "down" ? duplicateVote.direction : null;
          scoreDelta = 0;
        }
      }

      if (scoreDelta !== 0) {
        await strapi.db
          .connection("deals")
          .where({ id: deal.id })
          .increment("score", scoreDelta)
          .update({ updated_at: new Date() })
          .transacting(trx);
      }

      const updatedDeal = await strapi.db
        .connection("deals")
        .where({ id: deal.id })
        .select("score")
        .first()
        .transacting(trx);

      return {
        score: Number(updatedDeal?.score ?? deal.score ?? 0),
        viewerVote: currentVote,
        didVote: currentVote !== null,
      };
    });

    if (!result) {
      return ctx.notFound("Deal not found.");
    }

    ctx.body = { data: result };
  },
}));
