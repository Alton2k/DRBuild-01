"use strict";

const followsTable = "follows";
const uniqueIndexName = "follows_follower_following_uq";
const followerIndexName = "follows_follower_user_id_idx";
const followingIndexName = "follows_following_user_id_idx";

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

async function removeDuplicateFollows(knex) {
  const duplicateGroups = await knex(followsTable)
    .select("follower_user_id", "following_user_id")
    .whereNotNull("follower_user_id")
    .whereNotNull("following_user_id")
    .groupBy("follower_user_id", "following_user_id")
    .havingRaw("COUNT(*) > 1");

  for (const group of duplicateGroups) {
    const rows = await knex(followsTable)
      .select("id")
      .where({
        follower_user_id: group.follower_user_id,
        following_user_id: group.following_user_id,
      })
      .orderBy("created_at", "asc")
      .orderBy("id", "asc");
    const duplicateIds = rows.slice(1).map((row) => row.id);

    if (duplicateIds.length > 0) {
      await knex(followsTable).whereIn("id", duplicateIds).delete();
    }
  }
}

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable(followsTable))) {
      return;
    }

    if (
      !(await knex.schema.hasColumn(followsTable, "follower_user_id")) ||
      !(await knex.schema.hasColumn(followsTable, "following_user_id"))
    ) {
      return;
    }

    await removeDuplicateFollows(knex);

    if (!(await hasIndex(knex, followsTable, uniqueIndexName))) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.unique(["follower_user_id", "following_user_id"], uniqueIndexName);
      });
    }

    if (!(await hasIndex(knex, followsTable, followerIndexName))) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.index(["follower_user_id"], followerIndexName);
      });
    }

    if (!(await hasIndex(knex, followsTable, followingIndexName))) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.index(["following_user_id"], followingIndexName);
      });
    }
  },

  async down(knex) {
    if (!(await knex.schema.hasTable(followsTable))) {
      return;
    }

    if (await hasIndex(knex, followsTable, followingIndexName)) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.dropIndex(["following_user_id"], followingIndexName);
      });
    }

    if (await hasIndex(knex, followsTable, followerIndexName)) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.dropIndex(["follower_user_id"], followerIndexName);
      });
    }

    if (await hasIndex(knex, followsTable, uniqueIndexName)) {
      await knex.schema.alterTable(followsTable, (table) => {
        table.dropUnique(["follower_user_id", "following_user_id"], uniqueIndexName);
      });
    }
  },
};
