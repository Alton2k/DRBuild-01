"use strict";

const dealVotesTable = "deal_votes";
const dealsTable = "deals";
const dealVoteLinksTable = "deal_votes_deal_lnk";
const uniqueIndexName = "deal_votes_deal_document_viewer_uq";

async function hasIndex(knex, tableName, indexName) {
  if (typeof knex.schema.hasIndex === "function") {
    return knex.schema.hasIndex(tableName, indexName);
  }

  const client = knex.client.config.client;

  if (["sqlite", "sqlite3", "better-sqlite3"].includes(client)) {
    const rows = await knex.raw("PRAGMA index_list(??)", [tableName]);
    return (Array.isArray(rows) ? rows : rows.rows ?? []).some((row) => row.name === indexName);
  }

  return false;
}

async function backfillDealDocumentIds(knex) {
  const rows = await knex(dealVotesTable)
    .select(`${dealVotesTable}.id`, `${dealsTable}.document_id as dealDocumentId`)
    .join(dealVoteLinksTable, `${dealVoteLinksTable}.deal_vote_id`, `${dealVotesTable}.id`)
    .join(dealsTable, `${dealsTable}.id`, `${dealVoteLinksTable}.deal_id`)
    .whereNull(`${dealVotesTable}.deal_document_id`);

  for (const row of rows) {
    await knex(dealVotesTable)
      .where({ id: row.id })
      .update({ deal_document_id: row.dealDocumentId });
  }
}

async function removeDuplicateVotes(knex) {
  const duplicateGroups = await knex(dealVotesTable)
    .select("deal_document_id", "viewer_id")
    .whereNotNull("deal_document_id")
    .groupBy("deal_document_id", "viewer_id")
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const votes = await knex(dealVotesTable)
      .select("id")
      .where({
        deal_document_id: group.deal_document_id,
        viewer_id: group.viewer_id,
      })
      .orderBy("updated_at", "desc")
      .orderBy("id", "desc");

    const duplicateIds = votes.slice(1).map((vote) => vote.id);

    if (duplicateIds.length > 0) {
      await knex(dealVotesTable).whereIn("id", duplicateIds).delete();
    }
  }
}

async function resyncDealScores(knex) {
  const scores = await knex(dealVotesTable)
    .select("deal_document_id")
    .sum({
      score: knex.raw("CASE WHEN ?? = ? THEN 1 WHEN ?? = ? THEN -1 ELSE 0 END", [
        "direction",
        "up",
        "direction",
        "down",
      ]),
    })
    .whereNotNull("deal_document_id")
    .groupBy("deal_document_id");

  await knex(dealsTable).update({ score: 0 });

  for (const row of scores) {
    await knex(dealsTable)
      .where({ document_id: row.deal_document_id })
      .update({ score: Number(row.score ?? 0) });
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(dealVotesTable))) {
      return;
    }

    const hasDealDocumentId = await knex.schema.hasColumn(dealVotesTable, "deal_document_id");

    if (!hasDealDocumentId) {
      await knex.schema.alterTable(dealVotesTable, (table) => {
        table.string("deal_document_id");
      });
    }

    await backfillDealDocumentIds(knex);
    await removeDuplicateVotes(knex);
    await resyncDealScores(knex);

    if (!(await hasIndex(knex, dealVotesTable, uniqueIndexName))) {
      await knex.schema.alterTable(dealVotesTable, (table) => {
        table.unique(["deal_document_id", "viewer_id"], uniqueIndexName);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(dealVotesTable))) {
      return;
    }

    if (!(await hasIndex(knex, dealVotesTable, uniqueIndexName))) {
      return;
    }

    await knex.schema.alterTable(dealVotesTable, (table) => {
      table.dropUnique(["deal_document_id", "viewer_id"], uniqueIndexName);
    });
  },
};
