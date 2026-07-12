"use strict";

const userSettingsTable = "user_settings";
const uniqueIndexes = [
  {
    columns: ["user_id"],
    indexName: "user_settings_user_id_uq",
  },
  {
    columns: ["username"],
    indexName: "user_settings_username_uq",
  },
];

async function hasIndex(knex, tableName, indexName) {
  if (typeof knex.schema.hasIndex === "function") {
    return knex.schema.hasIndex(tableName, indexName);
  }

  const client = knex.client.config.client;

  if (["sqlite", "sqlite3", "better-sqlite3"].includes(client)) {
    const rows = await knex.raw("PRAGMA index_list(??)", [tableName]);
    return (Array.isArray(rows) ? rows : rows.rows ?? []).some((row) => row.name === indexName);
  }

  if (client === "pg" || client === "postgres" || client === "postgresql") {
    const result = await knex.raw(
      "select 1 from pg_indexes where schemaname = current_schema() and tablename = ? and indexname = ?",
      [tableName, indexName],
    );
    return (result.rows ?? []).length > 0;
  }

  return false;
}

async function hasColumns(knex, tableName, columns) {
  for (const column of columns) {
    if (!(await knex.schema.hasColumn(tableName, column))) {
      return false;
    }
  }

  return true;
}

async function deleteDuplicateRows(knex, columnName) {
  const duplicateGroups = await knex(userSettingsTable)
    .select(columnName)
    .whereNotNull(columnName)
    .groupBy(columnName)
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const value = group[columnName];
    const rows = await knex(userSettingsTable)
      .select("id")
      .where(columnName, value)
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

    await deleteDuplicateRows(knex, "user_id");
    await deleteDuplicateRows(knex, "username");

    for (const { columns, indexName } of uniqueIndexes) {
      if (!(await hasColumns(knex, userSettingsTable, columns))) {
        continue;
      }

      if (!(await hasIndex(knex, userSettingsTable, indexName))) {
        await knex.schema.alterTable(userSettingsTable, (table) => {
          table.unique(columns, indexName);
        });
      }
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(userSettingsTable))) {
      return;
    }

    for (const { columns, indexName } of uniqueIndexes.slice().reverse()) {
      if (await hasIndex(knex, userSettingsTable, indexName)) {
        await knex.schema.alterTable(userSettingsTable, (table) => {
          table.dropUnique(columns, indexName);
        });
      }
    }
  },
};
