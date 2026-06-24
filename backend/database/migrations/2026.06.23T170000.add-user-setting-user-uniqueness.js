"use strict";

const userSettingsTable = "user_settings";
const uniqueIndexName = "user_settings_user_id_uq";

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

async function removeDuplicateSettings(knex) {
  const duplicateGroups = await knex(userSettingsTable)
    .select("user_id")
    .whereNotNull("user_id")
    .groupBy("user_id")
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const rows = await knex(userSettingsTable)
      .select("id")
      .where({ user_id: group.user_id })
      .orderBy("updated_at", "desc")
      .orderBy("created_at", "desc")
      .orderBy("id", "desc");
    const duplicateIds = rows.slice(1).map((row) => row.id);

    if (duplicateIds.length > 0) {
      await knex(userSettingsTable).whereIn("id", duplicateIds).delete();
    }
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    if (!(await knex.schema.hasColumn(userSettingsTable, "user_id"))) {
      return;
    }

    await removeDuplicateSettings(knex);

    if (!(await hasIndex(knex, userSettingsTable, uniqueIndexName))) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.unique(["user_id"], uniqueIndexName);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    if (await hasIndex(knex, userSettingsTable, uniqueIndexName)) {
      await knex.schema.alterTable(userSettingsTable, (table) => {
        table.dropUnique(["user_id"], uniqueIndexName);
      });
    }
  },
};
