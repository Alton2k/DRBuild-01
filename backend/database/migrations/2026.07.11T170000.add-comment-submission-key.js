"use strict";

module.exports = {
  async up(knex) {
    if (!(await knex.schema.hasTable("comments")) || (await knex.schema.hasColumn("comments", "submission_key"))) return;
    await knex.schema.alterTable("comments", (table) => table.string("submission_key", 64).nullable());
  },
  async down(knex) {
    if ((await knex.schema.hasTable("comments")) && (await knex.schema.hasColumn("comments", "submission_key"))) {
      await knex.schema.alterTable("comments", (table) => table.dropColumn("submission_key"));
    }
  },
};
