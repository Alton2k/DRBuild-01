"use strict";

const indexDefinitions = [
  {
    tableName: "deals",
    columns: ["created_at"],
    indexName: "deals_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "is_expired", "score", "created_at"],
    indexName: "deals_mod_exp_score_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "is_expired", "comment_count", "created_at"],
    indexName: "deals_mod_exp_comments_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "is_expired", "created_at"],
    indexName: "deals_mod_exp_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "category", "score", "created_at"],
    indexName: "deals_mod_category_score_created_idx",
  },
  {
    tableName: "deals",
    columns: ["moderation_status", "category", "sub_category", "score", "created_at"],
    indexName: "deals_mod_category_sub_score_created_idx",
  },
  {
    tableName: "deals",
    columns: ["url", "moderation_status"],
    indexName: "deals_url_moderation_idx",
  },
  {
    tableName: "deals",
    columns: ["report_count", "created_at"],
    indexName: "deals_report_count_created_idx",
  },
  {
    tableName: "comments",
    columns: ["author_viewer_id", "created_at"],
    indexName: "comments_author_viewer_created_idx",
  },
  {
    tableName: "comments_deal_lnk",
    columns: ["comment_id"],
    indexName: "comments_deal_lnk_comment_idx",
  },
  {
    tableName: "deal_votes",
    columns: ["viewer_id", "deal_document_id"],
    indexName: "deal_votes_viewer_deal_document_idx",
  },
  {
    tableName: "deal_reports",
    columns: ["viewer_id", "deal_document_id"],
    indexName: "deal_reports_viewer_deal_document_idx",
  },
  {
    tableName: "saved_deals",
    columns: ["deal_document_id"],
    indexName: "saved_deals_deal_document_idx",
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
