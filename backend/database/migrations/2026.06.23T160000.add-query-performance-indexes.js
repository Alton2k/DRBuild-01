"use strict";

const indexDefinitions = [
  {
    tableName: "deals",
    columns: ["moderation_status", "score", "created_at"],
    indexName: "deals_moderation_score_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "comment_count", "created_at"],
    indexName: "deals_moderation_comments_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "created_at"],
    indexName: "deals_moderation_created_idx",
  },
  {
    tableName: "deals",
    columns: ["author_user_id", "created_at"],
    indexName: "deals_author_created_idx",
  },
  {
    tableName: "comments",
    columns: ["created_at"],
    indexName: "comments_created_idx",
  },
  {
    tableName: "comments",
    columns: ["author_user_id", "created_at"],
    indexName: "comments_author_created_idx",
  },
  {
    tableName: "comments_deal_lnk",
    columns: ["deal_id"],
    indexName: "comments_deal_lnk_deal_idx",
  },
  {
    tableName: "saved_deals",
    columns: ["user_id", "created_at"],
    indexName: "saved_deals_user_created_idx",
  },
  {
    tableName: "deal_votes",
    columns: ["viewer_id", "direction"],
    indexName: "deal_votes_viewer_direction_idx",
  },
  {
    tableName: "deal_votes",
    columns: ["deal_document_id", "direction"],
    indexName: "deal_votes_deal_direction_idx",
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

module.exports = {
  async up(knex) {
    for (const { tableName, columns, indexName } of indexDefinitions) {
      if (!(await knex.schema.hasTable(tableName))) {
        continue;
      }

      if (!(await hasColumns(knex, tableName, columns))) {
        continue;
      }

      if (!(await hasIndex(knex, tableName, indexName))) {
        await knex.schema.alterTable(tableName, (table) => {
          table.index(columns, indexName);
        });
      }
    }
  },

  async down(knex) {
    for (const { tableName, columns, indexName } of indexDefinitions.slice().reverse()) {
      if (!(await knex.schema.hasTable(tableName))) {
        continue;
      }

      if (await hasIndex(knex, tableName, indexName)) {
        await knex.schema.alterTable(tableName, (table) => {
          table.dropIndex(columns, indexName);
        });
      }
    }
  },
};
