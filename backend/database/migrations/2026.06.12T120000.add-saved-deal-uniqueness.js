"use strict";

const savedDealsTable = "saved_deals";
const uniqueIndexName = "saved_deals_user_deal_document_uq";

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

async function removeDuplicates(knex) {
  const duplicateGroups = await knex(savedDealsTable)
    .select("user_id", "deal_document_id")
    .groupBy("user_id", "deal_document_id")
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const rows = await knex(savedDealsTable)
      .select("id")
      .where({
        user_id: group.user_id,
        deal_document_id: group.deal_document_id,
      })
      .orderBy("created_at", "asc")
      .orderBy("id", "asc");
    const duplicateIds = rows.slice(1).map((row) => row.id);

    if (duplicateIds.length > 0) {
      await knex(savedDealsTable).whereIn("id", duplicateIds).delete();
    }
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(savedDealsTable))) {
      return;
    }

    await removeDuplicates(knex);

    if (!(await hasIndex(knex, savedDealsTable, uniqueIndexName))) {
      await knex.schema.alterTable(savedDealsTable, (table) => {
        table.unique(["user_id", "deal_document_id"], uniqueIndexName);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(savedDealsTable))) {
      return;
    }

    await knex.schema.alterTable(savedDealsTable, (table) => {
      table.dropUnique(["user_id", "deal_document_id"], uniqueIndexName);
    });
  },
};
