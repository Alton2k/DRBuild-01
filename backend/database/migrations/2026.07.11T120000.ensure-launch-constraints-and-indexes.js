"use strict";

const uniqueDefinitions = [
  { tableName: "deal_votes", columns: ["deal_document_id", "viewer_id"], indexName: "deal_votes_deal_document_viewer_uq" },
  { tableName: "deal_reports", columns: ["deal_document_id", "viewer_id"], indexName: "deal_reports_deal_document_viewer_uq" },
  { tableName: "saved_deals", columns: ["user_id", "deal_document_id"], indexName: "saved_deals_user_deal_document_uq" },
  { tableName: "user_settings", columns: ["user_id"], indexName: "user_settings_user_id_uq" },
  { tableName: "user_settings", columns: ["username"], indexName: "user_settings_username_uq" },
  { tableName: "follows", columns: ["follower_user_id", "following_user_id"], indexName: "follows_follower_following_uq" },
];

const indexDefinitions = [
  { tableName: "deals", columns: ["created_at"], indexName: "deals_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "score", "created_at"], indexName: "deals_moderation_score_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "comment_count", "created_at"], indexName: "deals_moderation_comments_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "created_at"], indexName: "deals_moderation_created_idx" },
  { tableName: "deals", columns: ["author_user_id", "created_at"], indexName: "deals_author_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "is_expired", "score", "created_at"], indexName: "deals_mod_exp_score_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "is_expired", "comment_count", "created_at"], indexName: "deals_mod_exp_comments_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "is_expired", "created_at"], indexName: "deals_mod_exp_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "category", "score", "created_at"], indexName: "deals_mod_category_score_created_idx" },
  { tableName: "deals", columns: ["moderation_status", "category", "sub_category", "score", "created_at"], indexName: "deals_mod_category_sub_score_created_idx" },
  { tableName: "deals", columns: ["url", "moderation_status"], indexName: "deals_url_moderation_idx" },
  { tableName: "deals", columns: ["report_count", "created_at"], indexName: "deals_report_count_created_idx" },
  { tableName: "comments", columns: ["created_at"], indexName: "comments_created_idx" },
  { tableName: "comments", columns: ["author_user_id", "created_at"], indexName: "comments_author_created_idx" },
  { tableName: "comments", columns: ["author_viewer_id", "created_at"], indexName: "comments_author_viewer_created_idx" },
  { tableName: "comments_deal_lnk", columns: ["deal_id"], indexName: "comments_deal_lnk_deal_idx" },
  { tableName: "comments_deal_lnk", columns: ["comment_id"], indexName: "comments_deal_lnk_comment_idx" },
  { tableName: "saved_deals", columns: ["user_id", "created_at"], indexName: "saved_deals_user_created_idx" },
  { tableName: "saved_deals", columns: ["deal_document_id"], indexName: "saved_deals_deal_document_idx" },
  { tableName: "deal_votes", columns: ["viewer_id", "direction"], indexName: "deal_votes_viewer_direction_idx" },
  { tableName: "deal_votes", columns: ["deal_document_id", "direction"], indexName: "deal_votes_deal_direction_idx" },
  { tableName: "deal_votes", columns: ["viewer_id", "deal_document_id"], indexName: "deal_votes_viewer_deal_document_idx" },
  { tableName: "deal_reports", columns: ["viewer_id", "deal_document_id"], indexName: "deal_reports_viewer_deal_document_idx" },
  { tableName: "follows", columns: ["follower_user_id"], indexName: "follows_follower_user_id_idx" },
  { tableName: "follows", columns: ["following_user_id"], indexName: "follows_following_user_id_idx" },
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

  if (["pg", "postgres", "postgresql"].includes(client)) {
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

async function removeDuplicates(knex, tableName, columns) {
  const duplicateGroups = await knex(tableName)
    .select(columns)
    .whereNotNull(columns[0])
    .modify((query) => {
      for (const column of columns.slice(1)) {
        query.whereNotNull(column);
      }
    })
    .groupBy(columns)
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const where = Object.fromEntries(columns.map((column) => [column, group[column]]));
    const rows = await knex(tableName)
      .select("id")
      .where(where)
      .orderBy("updated_at", "desc")
      .orderBy("created_at", "desc")
      .orderBy("id", "desc");
    const duplicateIds = rows.slice(1).map((row) => row.id);

    if (duplicateIds.length > 0) {
      await knex(tableName).whereIn("id", duplicateIds).delete();
    }
  }
}

module.exports = {
  async up(knex) {
    for (const definition of uniqueDefinitions) {
      const { tableName, columns, indexName } = definition;
      if (!(await knex.schema.hasTable(tableName)) || !(await hasColumns(knex, tableName, columns))) {
        continue;
      }

      await removeDuplicates(knex, tableName, columns);
      if (!(await hasIndex(knex, tableName, indexName))) {
        await knex.schema.alterTable(tableName, (table) => {
          table.unique(columns, indexName);
        });
      }
    }

    for (const definition of indexDefinitions) {
      const { tableName, columns, indexName } = definition;
      if (!(await knex.schema.hasTable(tableName)) || !(await hasColumns(knex, tableName, columns))) {
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
    for (const definition of indexDefinitions.slice().reverse()) {
      const { tableName, columns, indexName } = definition;
      if ((await knex.schema.hasTable(tableName)) && (await hasIndex(knex, tableName, indexName))) {
        await knex.schema.alterTable(tableName, (table) => {
          table.dropIndex(columns, indexName);
        });
      }
    }

    for (const definition of uniqueDefinitions.slice().reverse()) {
      const { tableName, columns, indexName } = definition;
      if ((await knex.schema.hasTable(tableName)) && (await hasIndex(knex, tableName, indexName))) {
        await knex.schema.alterTable(tableName, (table) => {
          table.dropUnique(columns, indexName);
        });
      }
    }
  },
};
